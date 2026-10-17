// @vitest-environment jsdom
import type { Session } from '@supabase/supabase-js'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import type { LessonPurchase } from './api'
import {
  PurchaseEditor,
  PurchaseLedgerRows,
  singleLessonPurchaseEditRequest
} from './coach-workspace'

const purchase = (id: string, sourceSessionId: string, amountMinor: number): LessonPurchase => ({
  id,
  sourceKind: 'pending_single',
  sourceSessionId,
  sourceSessionVersion: 2,
  sourceVersion: 1,
  priceUnset: true,
  amountModified: amountMinor !== 0,
  purchasedAt: '2026-10-19T03:00:00.000Z',
  lessonCount: 1,
  amountMinor,
  currency: 'TWD',
  privateNote: '',
  version: amountMinor === 0 ? 0 : 1,
  createdAt: '2026-10-19T03:00:00.000Z',
  updatedAt: '2026-10-19T03:00:00.000Z'
})

it('edits an unpriced purchase-history row through the same Finance entry used by the ledger', () => {
  const row = purchase('single-lesson:session-1', 'session-1', 0)
  expect(singleLessonPurchaseEditRequest(row, 600)).toEqual({
    path: '/finances/entries/single-lesson%3Asession-1',
    method: 'PATCH',
    body: { version: 0, amountMinor: 600 }
  })
})

it('shows unpriced completed lessons in the existing purchase list, including a ledger-edited amount', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <MemoryRouter>
          <PurchaseLedgerRows
            purchases={[
              purchase('single-lesson:session-1', 'session-1', 0),
              purchase('single-lesson:session-2', 'session-2', 600)
            ]}
            timeZone="Asia/Taipei"
            venues={[]}
            submitting={false}
            canCorrectSingle
            onEdit={() => undefined}
            onDelete={() => undefined}
          />
        </MemoryRouter>
      )
    )
    expect(host.querySelectorAll('.purchase-ledger-row')).toHaveLength(2)
    expect(host.textContent).toContain('尚未設定學生課堂單價')
    expect(host.textContent).toContain('已修改（來源 $0）')
    expect(host.textContent).toContain('$600')
    expect(host.textContent).not.toContain('查看課堂')
  } finally {
    await act(async () => root.unmount())
    vi.unstubAllGlobals()
  }
})

it('reuses the purchase editor for a single lesson with one locked lesson and no currency selector', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const onSave = vi.fn()
  const onUsePackage = vi.fn()
  try {
    await act(async () =>
      root.render(
        <MemoryRouter>
          <PurchaseEditor
            session={{} as Session}
            timeZone="Asia/Taipei"
            initialVenueId={null}
            purchase={purchase('single-lesson:session-1', 'session-1', 0)}
            conflict={null}
            error={null}
            disabled={false}
            saving={false}
            onCancel={() => undefined}
            onUsePackage={onUsePackage}
            onSave={onSave}
          />
        </MemoryRouter>
      )
    )
    const form = document.querySelector<HTMLFormElement>('.purchase-create-form')!
    expect(form).toBeTruthy()
    expect(document.body.textContent).toContain('編輯購課紀錄')
    expect(form.textContent).not.toContain('幣別')
    expect(form.textContent).not.toContain('每堂參考價')
    expect(form.querySelector<HTMLInputElement>('input[type="number"]')).toBeNull()
    expect(form.querySelector('.single-lesson-fixed-count')?.textContent).toContain('1 堂')
    expect(form.querySelector('.single-lesson-purchase-money .finance-money-fields')).toBeTruthy()
    expect(
      form.querySelector<HTMLAnchorElement>('.single-lesson-source-link')?.getAttribute('href')
    ).toBe('/sessions/session-1')
    expect(document.body.textContent).not.toContain('FORM / ACTION')
    const packageSwitch = form.querySelector<HTMLInputElement>('[role="switch"]')!
    expect(packageSwitch).toBeTruthy()
    expect(packageSwitch.checked).toBe(false)
    expect(form.querySelector('.single-lesson-billing-choice')?.textContent).toContain('單堂計費')
    const amount = form.querySelector<HTMLInputElement>('[aria-label="單堂金額"]')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(amount, '600')
      amount.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () =>
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    )
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ lessonCount: 1, amountMinor: 600, currency: 'TWD' })
    )
    await act(async () => packageSwitch.click())
    expect(packageSwitch.checked).toBe(true)
    expect(form.textContent).toContain('儲存後將扣除 1 堂剩餘堂數')
    expect(amount.disabled).toBe(true)
    await act(async () =>
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    )
    expect(onUsePackage).toHaveBeenCalledOnce()
    expect(onSave).toHaveBeenCalledOnce()
  } finally {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  }
})

it('keeps save fields in place when a dismissible purchase error appears', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const common = {
    session: {} as Session,
    timeZone: 'Asia/Taipei',
    initialVenueId: null,
    purchase: purchase('single-lesson:session-1', 'session-1', 0),
    conflict: null,
    disabled: false,
    saving: false,
    onCancel: () => undefined,
    onSave: () => undefined
  }
  try {
    await act(async () =>
      root.render(
        <MemoryRouter>
          <PurchaseEditor {...common} error={null} />
        </MemoryRouter>
      )
    )
    const amount = document.querySelector<HTMLInputElement>('[aria-label="單堂金額"]')
    await act(async () =>
      root.render(
        <MemoryRouter>
          <PurchaseEditor {...common} error={new Error('雲端服務暫時無法完成要求')} />
        </MemoryRouter>
      )
    )
    expect(document.querySelector<HTMLInputElement>('[aria-label="單堂金額"]')).toBe(amount)
    expect(
      document.querySelector('.purchase-editor-feedback[role="alert"]')?.textContent
    ).toContain('雲端服務暫時無法完成要求')
    await act(async () =>
      document.querySelector<HTMLButtonElement>('[aria-label="關閉錯誤提示"]')!.click()
    )
    expect(document.querySelector('.purchase-editor-feedback')).toBeNull()
  } finally {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  }
})
