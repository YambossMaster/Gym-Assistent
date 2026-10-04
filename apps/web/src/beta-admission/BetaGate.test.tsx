// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import type { TodayProjection } from '../api'
import { queryKeys } from '../query-keys'
import { useTodayRouteQuery } from '../pages/today/queries'
import { BetaGate } from './BetaGate'

const mocks = vi.hoisted(() => ({
  getToday: vi.fn(),
  readBetaGrant: vi.fn(async () => ({ state: 'free' }))
}))

vi.mock('../api', () => ({ getToday: mocks.getToday, readBetaGrant: mocks.readBetaGrant }))
vi.mock('./usePlanAccess', () => ({
  planAccessKey: (coachId: string) => ['coach', coachId, 'plan-access'],
  usePlanAccess: () => ({ data: { tier: 'free', overCapacity: false } })
}))

const session = { user: { id: 'coach-a' }, access_token: 'test-token' } as Session
const today: TodayProjection = {
  date: '2026-10-04',
  timeZone: 'Asia/Taipei',
  summary: {
    activeStudents: 3,
    incomePeriod: { startsOn: '2026-10-01', endsOn: '2026-11-01' },
    incomeByCurrency: [{ currency: 'TWD', amountMinor: 100 }],
    attentionCount: 0
  },
  attention: []
}

function TodayProbe() {
  const query = useTodayRouteQuery(session)
  return <p>{query.data?.date ?? 'loading'}</p>
}

afterEach(() => {
  mocks.getToday.mockReset()
  mocks.readBetaGrant.mockClear()
  vi.unstubAllGlobals()
})

it('keeps an in-flight Today read connected when Free access arrives', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  let complete!: (value: TodayProjection) => void
  const pending = new Promise<TodayProjection>((resolve) => {
    complete = resolve
  })
  mocks.getToday.mockReturnValue(pending)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <BetaGate session={session}>
              <TodayProbe />
            </BetaGate>
          </MemoryRouter>
        </QueryClientProvider>
      )
    })
    expect(host.textContent).toContain('loading')
    await act(async () => {
      complete(today)
      await pending
    })
    expect(host.textContent).toContain('2026-10-04')
  } finally {
    await act(async () => root.unmount())
    host.remove()
    client.clear()
  }
})

it('removes cached income without blanking the Today projection on downgrade', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  mocks.getToday.mockResolvedValue({
    ...today,
    summary: { ...today.summary, incomeByCurrency: [] }
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(queryKeys.today(session.user.id), today)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <BetaGate session={session}>
              <TodayProbe />
            </BetaGate>
          </MemoryRouter>
        </QueryClientProvider>
      )
    })
    expect(host.textContent).toContain('2026-10-04')
    expect(
      client.getQueryData<TodayProjection>(queryKeys.today(session.user.id))?.summary
        .incomeByCurrency
    ).toEqual([])
  } finally {
    await act(async () => root.unmount())
    host.remove()
    client.clear()
  }
})
