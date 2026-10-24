// @vitest-environment jsdom
import type { Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { SessionPage } from './SessionPage'

const requests = vi.hoisted(() => ({
  getSession: vi.fn(),
  getSessionTraining: vi.fn(),
  listStudents: vi.fn()
}))

vi.mock('../../api', async (original) => ({
  ...(await original<typeof import('../../api')>()),
  getSession: requests.getSession,
  getSessionTraining: requests.getSessionTraining,
  listStudents: requests.listStudents
}))
vi.mock('../calendar/queries', () => ({
  useSchedulingMutations: () => ({ transitionSession: { isPending: false } })
}))
vi.mock('../public/CapabilityLinkManager', () => ({ CapabilityLinkActions: () => null }))
vi.mock('../training/TrainingWorkspace', () => ({
  formatAdjacentLessonTime: () => '9/7 · 15:30',
  TrainingLoading: () => <div>載入課堂中</div>,
  TrainingWorkspace: ({ query, adjacent, onSwitchAdjacent, onAdjacentReady }: any) => {
    useEffect(() => {
      if (query.data) onAdjacentReady?.(query.data.session.id)
    }, [query.data, onAdjacentReady])
    return (
      <section>
        <p>目前課堂 {query.data?.session.id}</p>
        {adjacent?.previous && (
          <button onClick={() => void onSwitchAdjacent(adjacent.previous)}>前次課堂</button>
        )}
      </section>
    )
  }
}))

const session = { user: { id: 'coach' }, access_token: 'test-token' } as Session

afterEach(() => {
  document.body.innerHTML = ''
  requests.getSession.mockReset()
  requests.getSessionTraining.mockReset()
  requests.listStudents.mockReset()
  vi.unstubAllGlobals()
})

it('keeps one transition over the old lesson until destination data and view are ready', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  let resolvePrevious: (value: unknown) => void = () => {}
  const previousRead = new Promise((resolve) => {
    resolvePrevious = resolve
  })
  const detail = (id: string) => ({
    session: {
      id,
      studentId: 'student-1',
      studentName: '學生甲',
      status: 'completed',
      startsAt: '2026-09-07T07:30:00Z',
      endsAt: '2026-09-07T08:30:00Z',
      version: 1,
      isLegacy: false
    },
    lessonSummary: null,
    conflicts: [],
    adjacent:
      id === 'current'
        ? { previous: { id: 'previous', startsAt: '2026-09-07T07:30:00Z' }, next: null }
        : { previous: null, next: null }
  })
  requests.getSession.mockImplementation((_token: string, id: string) =>
    id === 'previous' ? previousRead : Promise.resolve(detail(id))
  )
  requests.getSessionTraining.mockImplementation((_token: string, id: string) =>
    Promise.resolve({ session: { id } })
  )
  requests.listStudents.mockResolvedValue([])
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  function LocationProbe() {
    return <output data-testid="route">{useLocation().pathname}</output>
  }
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/sessions/current']}>
            <LocationProbe />
            <Routes>
              <Route
                path="/sessions/:sessionId"
                element={<SessionPage session={session} timeZone="Asia/Taipei" />}
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    await vi.waitFor(() => expect(host.textContent).toContain('目前課堂 current'))
    await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
    expect(host.querySelector('[data-testid="route"]')?.textContent).toBe('/sessions/current')
    expect(host.textContent).toContain('目前課堂 current')
    expect(host.querySelector('.session-switch-transition')?.textContent).toContain('前次課堂')
    await act(async () => resolvePrevious(detail('previous')))
    await vi.waitFor(() =>
      expect(host.querySelector('[data-testid="route"]')?.textContent).toBe('/sessions/previous')
    )
    await vi.waitFor(() => expect(host.querySelector('.session-switch-transition')).toBeNull())
    expect(host.textContent).toContain('目前課堂 previous')
  } finally {
    await act(async () => root.unmount())
    client.clear()
  }
})
