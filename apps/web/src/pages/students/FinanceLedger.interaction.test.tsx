// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import type { MonthlyFinance } from './finance-api'
import { FinanceLedger } from './FinanceLedger'
import { FinanceCurrencyProvider } from '../settings/finance-currency'

const mutation = vi.hoisted(() => ({
  mutate: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  isError: false
}))
const deletedRequest = vi.hoisted(() => vi.fn())
vi.mock('../../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api')>()),
  request: (...args: unknown[]) => deletedRequest(...args)
}))
vi.mock('./finance-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./finance-api')>()),
  useFinanceMutation: () => mutation
}))

afterEach(() => {
  mutation.mutate.mockClear()
  mutation.reset.mockClear()
  deletedRequest.mockReset()
  document.body.innerHTML = ''
})

it('uses the Settings currency for a new ledger entry without a currency field', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={queryClient}>
          <FinanceCurrencyProvider currency="USD">
            <MemoryRouter>
              <FinanceLedger
                session={{ access_token: 'test', user: { id: 'coach' } } as Session}
                data={
                  {
                    month: '2026-09',
                    timeZone: 'Asia/Taipei',
                    coverage: 'complete',
                    totals: [
                      { currency: 'TWD', incomeMinor: 100, expenseMinor: 0, differenceMinor: 100 }
                    ],
                    missing: [],
                    venues: [],
                    rows: []
                  } as MonthlyFinance
                }
              />
            </MemoryRouter>
          </FinanceCurrencyProvider>
        </QueryClientProvider>
      )
    )
    await act(async () =>
      host.querySelector<HTMLButtonElement>('.finance-ledger header button')!.click()
    )
    const form = host.querySelector<HTMLFormElement>('.finance-ledger-editor form')!
    await act(async () =>
      form.querySelector<HTMLButtonElement>('.time-select .form-select-trigger')!.click()
    )
    const timeChoices = [...document.querySelectorAll('[role="option"]')].map(
      (item) => item.querySelector('.option-item-label')?.textContent
    )
    expect(timeChoices).toContain('00:00')
    expect(timeChoices).toContain('05:45')
    expect(timeChoices).toContain('23:45')
    const midnightChoice = [
      ...document.querySelectorAll<HTMLButtonElement>('[role="option"]')
    ].find((item) => item.querySelector('.option-item-label')?.textContent === '00:15')!
    await act(async () => midnightChoice.click())
    expect(form.querySelector('.time-select .form-select-trigger')?.textContent).toContain('00:15')
    expect(form.textContent).not.toContain('幣別')
    expect(form.querySelector('input[pattern="[A-Z]{3}"]')).toBeNull()
    const amountInput = form.querySelector<HTMLInputElement>('input[type="number"]')!
    expect(amountInput.step).toBe('0.01')
    const nameInput = form.querySelector<HTMLInputElement>('input[maxlength="160"]')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        nameInput,
        '測試支出'
      )
      nameInput.dispatchEvent(new Event('input', { bubbles: true }))
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        amountInput,
        '12.34'
      )
      amountInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => form.requestSubmit())
    expect(mutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/finances/entries',
        method: 'POST',
        body: expect.objectContaining({ currency: 'USD', amountMinor: 1234 })
      }),
      expect.any(Object)
    )
  } finally {
    await act(async () => root.unmount())
    queryClient.clear()
  }
})

it('keeps deleted rows in the ledger scroll area and places restore beside cancel and save', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const row = {
    id: 'salary:v1:2026-09',
    date: '2026-09-05',
    occurredAt: null,
    kind: 'salary',
    label: '場地底薪',
    detail: '每月 5 日發放',
    direction: 'income',
    amountMinor: 550000,
    currency: 'TWD',
    targetRoute: '/students/venues',
    status: 'original',
    version: 1
  } as MonthlyFinance['rows'][number]
  deletedRequest.mockResolvedValue({ rows: [row], nextCursor: null })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <FinanceLedger
              session={{ access_token: 'test', user: { id: 'coach' } } as Session}
              data={
                {
                  month: '2026-09',
                  timeZone: 'Asia/Taipei',
                  coverage: 'complete',
                  totals: [
                    { currency: 'TWD', incomeMinor: 0, expenseMinor: 0, differenceMinor: 0 }
                  ],
                  missing: [],
                  venues: [],
                  rows: [
                    { ...row, id: 'salary:v2:2026-09', status: 'original', label: '其他底薪' }
                  ],
                  deletedCount: 1
                } as MonthlyFinance
              }
            />
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    await act(async () => host.querySelector<HTMLButtonElement>('.finance-text-button')!.click())
    await vi.waitFor(() =>
      expect(host.querySelectorAll('.finance-ledger-deleted .finance-ledger-row')).toHaveLength(1)
    )
    expect(host.querySelectorAll('.finance-ledger-rows')).toHaveLength(1)
    const rows = host.querySelector('.finance-ledger-rows')!
    expect(
      rows.querySelector('.finance-ledger-total + .finance-ledger-deleted h3')?.textContent
    ).toBe('已刪除明細')
    expect(rows.querySelectorAll('.finance-ledger-deleted .finance-ledger-row')).toHaveLength(1)
    expect(host.querySelector('.finance-ledger > .finance-text-button')).not.toBeNull()

    await act(async () =>
      host.querySelector<HTMLButtonElement>('.finance-ledger-deleted .finance-ledger-row')!.click()
    )
    const footer = host.querySelector('.finance-ledger-footer')!
    expect(footer.firstElementChild?.textContent).toBe('恢復明細')
    expect(footer.firstElementChild?.classList.contains('secondary-button')).toBe(true)
    expect(footer.textContent).toContain('恢復明細取消儲存')
    await act(async () =>
      footer.querySelector<HTMLButtonElement>('.finance-ledger-restore')!.click()
    )
    expect(host.querySelector('.finance-ledger-confirm-actions')?.textContent).toContain('取消確認')
  } finally {
    await act(async () => root.unmount())
    queryClient.clear()
  }
})

it('marks the changed field and supports confirmation cancel and submit shortcuts', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const data = {
    month: '2026-09',
    timeZone: 'Asia/Taipei',
    coverage: 'complete',
    totals: [],
    missing: [],
    venues: [],
    rows: [
      {
        id: 'session:s1',
        date: '2026-09-04',
        originalDate: '2026-09-04',
        occurredAt: '2026-09-04T04:00:00.000Z',
        originalOccurredAt: '2026-09-04T04:00:00.000Z',
        kind: 'commission',
        label: '場地抽成',
        originalLabel: '場地抽成',
        detail: '補扣抽成差額',
        direction: 'expense',
        amountMinor: 52,
        originalAmountMinor: 51,
        currency: 'USD',
        targetRoute: '/students/venues',
        status: 'modified',
        version: 1
      }
    ]
  } satisfies MonthlyFinance
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/students/finances?month=2026-09']}>
            <FinanceLedger
              session={{ access_token: 'test', user: { id: 'coach' } } as Session}
              data={data}
            />
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    await act(async () => host.querySelector<HTMLButtonElement>('.finance-ledger-row')!.click())
    const footer = host.querySelector('.finance-ledger-footer')!
    expect(footer.textContent).toContain('刪除取消修改取消儲存')
    expect(host.querySelector('.finance-ledger-field-title')?.textContent).toBe('名稱*')
    expect(
      host
        .querySelector('.finance-ledger-field-title .ui-required-mark')
        ?.getAttribute('aria-label')
    ).toBe('必填')
    expect(host.querySelectorAll('.finance-ledger-field-modified')).toHaveLength(1)
    expect(host.querySelector('label:has(input[type="number"])')?.textContent).toContain(
      '金額*（已修改）'
    )

    const amountInput = host.querySelector<HTMLInputElement>('input[type="number"]')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        amountInput,
        '53'
      )
      amountInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () =>
      host.querySelector<HTMLFormElement>('.finance-ledger-editor form')!.requestSubmit()
    )
    const submittedEdit = mutation.mutate.mock.calls[0]?.[0] as { body: Record<string, unknown> }
    expect(submittedEdit.body.amountMinor).toBe(5300)
    expect(submittedEdit.body).not.toHaveProperty('occurredAt')
    mutation.mutate.mockClear()

    await act(async () => footer.querySelector<HTMLButtonElement>('.finance-ledger-reset')!.click())
    expect(host.querySelector('.finance-ledger-confirm-actions .primary-button')?.textContent).toBe(
      '確認'
    )
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
    expect(host.querySelector('.finance-ledger-confirm-actions')).toBeNull()
    expect(host.querySelector('.finance-ledger-footer')).not.toBeNull()

    await act(async () => host.querySelector<HTMLButtonElement>('.finance-ledger-reset')!.click())
    const confirmButton = host.querySelector<HTMLButtonElement>(
      '.finance-ledger-confirm-actions .primary-button'
    )!
    expect(document.activeElement).toBe(confirmButton)
    await act(async () =>
      confirmButton.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true
        })
      )
    )
    expect(mutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/finances/entries/session%3As1/adjustment',
        method: 'DELETE'
      }),
      expect.any(Object)
    )
  } finally {
    await act(async () => root.unmount())
    queryClient.clear()
  }
})
