// @vitest-environment jsdom
import type { Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import type { SessionTraining } from '../../api'
import { queryKeys } from '../../query-keys'
import { useSchedulingMutations } from './queries'

const requests = vi.hoisted(() => ({ transitionSession: vi.fn() }))

vi.mock('../../api', async (original) => ({
  ...(await original<typeof import('../../api')>()),
  transitionSession: requests.transitionSession
}))

const auth = { user: { id: 'coach' }, access_token: 'test-token' } as Session
const completedTraining = {
  session: {
    id: 'session-1',
    studentId: 'student-1',
    studentName: '學生甲',
    seriesId: null,
    startsAt: '2026-09-14T02:00:00.000Z',
    endsAt: '2026-09-14T03:00:00.000Z',
    location: 'FORM A 區',
    status: 'completed',
    completedAt: '2026-09-14T03:00:00.000Z',
    version: 4,
    isLegacy: false
  },
  lessonSummary: { purchased: 10, completed: 4, remaining: 6 },
  record: { id: 'record-1', version: 2, privateNote: '', exercises: [], updatedAt: null },
  defaultWeightUnit: 'kg',
  exerciseSummaries: [],
  allowedActions: { canEditTraining: true, canComplete: false, canReopen: true }
} satisfies SessionTraining

afterEach(() => {
  document.body.innerHTML = ''
  requests.transitionSession.mockReset()
  vi.unstubAllGlobals()
})

it('immediately turns a reopened Training workspace back into the completable state', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  requests.transitionSession.mockResolvedValue({
    session: {
      ...completedTraining.session,
      status: 'scheduled',
      completedAt: null,
      version: 5
    },
    conflicts: []
  })
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const key = queryKeys.sessionTraining('coach', 'session-1')
  client.setQueryData(key, completedTraining)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  let mutations!: ReturnType<typeof useSchedulingMutations>
  function Harness() {
    mutations = useSchedulingMutations(auth)
    return null
  }
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>
      )
    )
    await act(async () => {
      await mutations.transitionSession.mutateAsync({
        sessionId: 'session-1',
        input: { action: 'reopen', version: 4 }
      })
    })
    expect(client.getQueryData<SessionTraining>(key)).toMatchObject({
      session: { status: 'scheduled', completedAt: null, version: 5 },
      allowedActions: { canComplete: true, canReopen: false }
    })
  } finally {
    await act(async () => root.unmount())
    client.clear()
  }
})
