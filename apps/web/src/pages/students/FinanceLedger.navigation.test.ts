import { expect, it } from 'vitest'
import { financeMoney, financeReturnPath, type MonthlyFinance } from './finance-api'
import { financeSourceRoute, modifiedFinanceFields, sourceExplanation } from './FinanceLedger'

type Row = MonthlyFinance['rows'][number]

it('marks only Finance fields whose saved value differs from the source', () => {
  const base = {
    status: 'modified',
    date: '2026-09-04',
    originalDate: '2026-09-04',
    occurredAt: '2026-09-04T04:00:00.000Z',
    originalOccurredAt: '2026-09-04T03:00:00.000Z',
    label: '調整後名稱',
    originalLabel: '來源名稱',
    amountMinor: 52,
    originalAmountMinor: 51
  } as Row
  expect(modifiedFinanceFields(base, 'Asia/Taipei')).toEqual({
    date: false,
    time: true,
    label: true,
    amount: true
  })
  expect(
    modifiedFinanceFields(
      {
        ...base,
        date: '2026-09-05',
        occurredAt: '2026-09-05T03:00:00.000Z',
        label: '來源名稱',
        amountMinor: 51
      },
      'Asia/Taipei'
    )
  ).toEqual({ date: true, time: false, label: false, amount: false })
  expect(modifiedFinanceFields({ ...base, originalOccurredAt: null }, 'Asia/Taipei').time).toBe(
    true
  )
})

it('shows source details as one structured plain-text explanation', () => {
  expect(
    sourceExplanation({
      kind: 'commission',
      detail: '補扣抽成差額 · 固定抽成 45% → 固定抽成 48% · $1,700／堂',
      originalAmountMinor: 5100,
      amountMinor: 5100,
      currency: 'USD',
      originalDate: '2026-09-04',
      date: '2026-09-04'
    } as Row)
  ).toBe(
    [
      '補扣抽成差額：固定抽成 45% → 48% ($1,700／堂)',
      `來源金額：${financeMoney(5100, 'USD')}`,
      '來源日期：2026-09-04'
    ].join('\n')
  )
})

it('opens purchase income at the Student purchase card and returns to the same ledger entry', () => {
  const route = financeSourceRoute(
    {
      id: 'purchase:purchase-1',
      kind: 'purchase',
      targetRoute: '/students/student-1'
    } as Row,
    new URLSearchParams('month=2026-09&entry=purchase%3Apurchase-1')
  )
  expect(route).toBe(
    '/students/student-1?from=finances&entry=purchase%3Apurchase-1&month=2026-09#purchase-history'
  )
  expect(financeReturnPath(new URL(route, 'http://localhost').searchParams)).toBe(
    '/students/finances?month=2026-09&entry=purchase%3Apurchase-1'
  )
})

it('preserves the ledger entry for a prepaid Venue source', () => {
  const route = financeSourceRoute(
    {
      id: 'credit:credit-1',
      kind: 'prepaid',
      targetRoute: '/students/venues?venue=venue-1&credit=credit-1'
    } as Row,
    new URLSearchParams('entry=credit%3Acredit-1')
  )
  expect(route).toBe(
    '/students/venues?venue=venue-1&credit=credit-1&from=finances&entry=credit%3Acredit-1'
  )
  expect(financeReturnPath(new URL(route, 'http://localhost').searchParams)).toBe(
    '/students/finances?entry=credit%3Acredit-1'
  )
})
