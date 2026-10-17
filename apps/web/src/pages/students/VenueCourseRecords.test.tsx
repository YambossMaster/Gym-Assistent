// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { formatVenueRecordDateTime, VenueCourseRecords } from './VenueCourseRecords'
import type { Venue } from './finance-api'

it('uses 24-hour times in Venue course records', () => {
  expect(
    formatVenueRecordDateTime('2026-06-01T07:30:00Z', 'Asia/Taipei', { timeStyle: 'short' })
  ).toBe('15:30')
  expect(
    formatVenueRecordDateTime('2026-06-01T16:00:00Z', 'Asia/Taipei', { timeStyle: 'short' })
  ).toBe('00:00')
})

it('shows zero commission and the effective single-lesson ledger amount instead of a missing-data label', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
  const record = {
    sessionId: 'session-1',
    sessionVersion: 1,
    recordVersion: 0,
    startsAt: '2026-09-04T04:00:00Z',
    endsAt: '2026-09-04T05:00:00Z',
    studentName: '學生',
    customerSource: 'venue' as const,
    rule: {
      id: 'rule-1',
      venueId: 'venue-1',
      effectiveFrom: '2026-01-01',
      kind: 'commission' as const,
      collectionMode: 'coach' as const,
      rate: 70,
      coachRate: null,
      venueRate: null,
      amountMinor: null,
      currency: null
    },
    status: 'expense' as const,
    creditId: null,
    credit: null,
    remainingAfterDeduction: null,
    purchaseId: null,
    purchaseRoute: null,
    purchase: null,
    calculation: null,
    singleLesson: {
      entryId: 'single-lesson:session-1',
      priceUnset: true,
      amountMinor: 0,
      originalAmountMinor: 0,
      currency: 'TWD',
      modified: false
    },
    expense: {
      amountMinor: 0,
      originalAmountMinor: 0,
      currency: 'TWD',
      status: 'original' as const
    },
    adjustment: null,
    targetRoute: '/sessions/session-1'
  }
  const setRecord = (next: typeof record) =>
    client.setQueryData(['venues', 'coach', 'venue-1', 'course-records'], {
      pages: [{ records: [next], nextCursor: null }],
      pageParams: ['']
    })
  setRecord(record)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <VenueCourseRecords
              session={{ user: { id: 'coach' }, access_token: 'test' } as Session}
              venue={{ id: 'venue-1', name: '場地', active: true } as Venue}
              credits={[]}
              timeZone="Asia/Taipei"
              onClose={() => {}}
              onRuleHistory={() => {}}
            />
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    await act(async () => host.querySelector<HTMLButtonElement>('.venue-record')!.click())
    expect(host.querySelector('.venue-course-detail')?.textContent).toContain('逐堂抽成 · $0')
    expect(host.querySelector('.venue-course-detail')?.textContent).toContain(
      '尚未設定學生課堂單價'
    )
    expect(host.querySelector('.venue-course-detail')?.textContent).not.toContain('待補資料')
    await act(async () => {
      setRecord({
        ...record,
        singleLesson: { ...record.singleLesson, amountMinor: 600, modified: true },
        expense: { ...record.expense, amountMinor: 420, originalAmountMinor: 420 }
      })
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await vi.waitFor(() => {
      expect(host.querySelector('.venue-course-detail')?.textContent).toContain('逐堂抽成 · $420')
      expect(host.querySelector('.venue-course-detail')?.textContent).toContain(
        '收入明細 +$600（已修改；來源 $0）'
      )
    })
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
    vi.unstubAllGlobals()
  }
})
