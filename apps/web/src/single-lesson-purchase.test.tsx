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
    expect(form.querySelector<HTMLInputElement>('input[type="number"]')?.value).toBe('1')
    expect(form.querySelector<HTMLInputElement>('input[type="number"]')?.disabled).toBe(true)
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
  } finally {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  }
})
