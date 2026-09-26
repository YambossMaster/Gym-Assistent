// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { expect, it, vi } from 'vitest'
import type { CalendarSession } from './api'
import { StudentCourseRecord, StudentPerformance } from './coach-workspace'

vi.mock('./pages/training/queries', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./pages/training/queries')>()),
  useStudentPerformance: () => ({
    data: [
      {
        definitionId: 'squat',
        metric: 'weight',
        name: '深蹲',
        sessionCount: 1,
        latest: 55.5,
        personal: 55.5,
        unit: 'kg',
        latestAt: '2026-09-23T10:00:00Z'
      }
    ],
    isLoading: false,
    isError: false
  }),
  useStudentTrend: () => ({
    data: {
      points: [
        { sessionId: 'session-1', startsAt: '2026-09-23T10:00:00Z', value: 55.5, unit: 'kg' }
      ]
    },
    isLoading: false,
    isError: false,
    isFetching: false
  })
}))

function RouteResult() {
  const location = useLocation()
  return <p data-testid="route-result">{location.pathname + location.search}</p>
}

it('opens a Student trajectory history row in its original class and exercise', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {}
  }))
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <MemoryRouter initialEntries={['/students/student-1']}>
          <Routes>
            <Route
              path="/students/:studentId"
              element={
                <StudentPerformance
                  session={{ user: { id: 'coach' } } as Session}
                  studentId="student-1"
                  studentName="學生甲"
                />
              }
            />
            <Route path="/sessions/:sessionId" element={<RouteResult />} />
          </Routes>
        </MemoryRouter>
      )
    )
    await act(async () => host.querySelector<HTMLButtonElement>('.performance-portal')!.click())
    await act(async () => host.querySelector<HTMLButtonElement>('.performance-row')!.click())
    const row = host.querySelector<HTMLButtonElement>('.trajectory-history-link')!
    expect(row.disabled).toBe(false)
    await act(async () => row.click())
    expect(host.querySelector('[data-testid="route-result"]')?.textContent).toBe(
      '/sessions/session-1?exercise=squat'
    )
  } finally {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  }
})

it('shows ten classes on the Student page and opens the complete history in a scrollable dialog', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const history = Array.from({ length: 11 }, (_, i) => ({
    id: `session-${i}`,
    startsAt: new Date(Date.UTC(2026, 8, i + 1)).toISOString(),
    endsAt: new Date(Date.UTC(2026, 8, i + 1, 1)).toISOString(),
    status: 'completed',
    location: '場地'
  })) as CalendarSession[]
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <MemoryRouter>
          <StudentCourseRecord schedule={{ nearestFuture: null, history }} />
        </MemoryRouter>
      )
    )
    expect(host.querySelectorAll('.student-course-record-row')).toHaveLength(10)
    await act(async () =>
      host.querySelector<HTMLButtonElement>('.student-course-record-more')!.click()
    )
    expect(host.querySelector('[role="dialog"]')).not.toBeNull()
    expect(
      host.querySelectorAll(
        '.student-course-record > .student-course-record-list .student-course-record-row'
      )
    ).toHaveLength(21)
    expect(
      host.querySelectorAll('.student-course-record-dialog .student-course-record-row')
    ).toHaveLength(11)
  } finally {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  }
})
