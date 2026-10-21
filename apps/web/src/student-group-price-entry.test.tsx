// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import type { Student, StudentDetail } from './api'
import { StudentDetailPage } from './coach-workspace'

const members = [
  { id: 'person-1', name: '學生甲' },
  { id: 'person-2', name: '學生乙' }
].map(
  (person): Student => ({
    ...person,
    kind: 'person',
    phone: '',
    goal: '',
    privateNote: '',
    ageRange: null,
    defaultVenueId: null,
    singleLessonPrice: null,
    active: true,
    lineLinked: false,
    version: 1,
    createdAt: '2026-10-21T00:00:00Z',
    updatedAt: '2026-10-21T00:00:00Z'
  })
)
const detail: StudentDetail = {
  student: {
    ...members[0]!,
    id: 'group-1',
    kind: 'group',
    name: '一起上課',
    privateNote: '',
    lessonSummary: { purchased: 0, completed: 0, remaining: 0 }
  },
  members,
  purchases: [],
  lessonSummary: { purchased: 0, completed: 0, remaining: 0 }
}
const saveRequest = vi.hoisted(() => vi.fn())
const mutation = (mutate = vi.fn()) => ({
  reset: vi.fn(),
  mutate,
  isPending: false,
  isError: false
})

vi.mock('./config', () => ({
  loadWebConfig: () => ({
    supabaseUrl: 'https://example.supabase.co',
    supabasePublishableKey: 'test-publishable-key'
  })
}))
vi.mock('./beta-admission/usePlanAccess', () => ({
  usePlanAccess: () => ({ data: { tier: 'advanced', overCapacity: false }, isLoading: false }),
  planAccessKey: () => ['plan']
}))
vi.mock('./pages/students/queries', () => ({
  useStudentDetailRouteQuery: () => ({
    data: detail,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn()
  }),
  useStudentsRouteQuery: () => ({ students: { data: members } }),
  useStudentRouteMutations: () => ({
    save: mutation(saveRequest),
    purchase: mutation(),
    remove: mutation(),
    updatePurchase: mutation(),
    removePurchase: mutation()
  })
}))
vi.mock('./pages/students/finance-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./pages/students/finance-api')>()),
  useVenues: () => ({ data: undefined }),
  useFinanceMutation: () => mutation()
}))
vi.mock('./pages/calendar/queries', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./pages/calendar/queries')>()),
  useSchedulingMutations: () => ({})
}))
vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  getStudentPerformance: async () => [],
  listScheduleSeries: async () => []
}))

afterEach(() => {
  saveRequest.mockClear()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

it.each([
  ['/students/group-1?from=finances&edit=price&month=2026-10', false],
  ['/students/group-1', true]
])('retains group members when opening profile from %s', async (route, clickEdit) => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route
                path="/students/:studentId"
                element={
                  <StudentDetailPage
                    session={{ access_token: 'test', user: { id: 'coach' } } as Session}
                  />
                }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    if (clickEdit) {
      await act(async () =>
        host.querySelector<HTMLButtonElement>('.student-detail-profile-heading button')!.click()
      )
    }
    const dialog = host.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain('編輯群組')
    expect(
      [...dialog.querySelectorAll<HTMLButtonElement>('.student-group-member-choice')]
        .filter((button) => button.getAttribute('aria-pressed') === 'true')
        .map((button) => button.querySelectorAll('span').item(1)?.textContent?.trim())
    ).toEqual(['學生甲', '學生乙'])
    expect(dialog.querySelector<HTMLButtonElement>('.ui-action-save')?.disabled).toBe(false)
    if (!clickEdit) {
      const price = dialog.querySelector<HTMLInputElement>('input[aria-label="學生課堂單價"]')!
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
          price,
          '1500'
        )
        price.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await act(async () => dialog.querySelector<HTMLFormElement>('form')!.requestSubmit())
      expect(saveRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          singleLessonPrice: { amountMinor: 1500, currency: 'TWD' }
        }),
        expect.any(Object)
      )
      expect(saveRequest.mock.calls[0]?.[0]).not.toHaveProperty('memberIds')
    }
  } finally {
    await act(async () => root.unmount())
    queryClient.clear()
    host.remove()
  }
})
