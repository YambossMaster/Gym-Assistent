// @vitest-environment jsdom
import type { Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { MultiMetricTrend } from './MultiMetricTrend'
import { queryKeys } from '../../query-keys'
import { setProgressMetrics } from '../../api'

vi.mock('../../api', async (original) => ({
  ...(await original<typeof import('../../api')>()),
  setProgressMetrics: vi.fn(async (_token, id, input) => ({
    id,
    version: input.version + 1,
    recording: { type: 'weight_reps', metrics: input.metrics }
  }))
}))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('renders one primary line with quiet secondary bars and persists lock or primary switches', async () => {
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
  const session = { user: { id: 'coach-a' }, access_token: 'test-token' } as Session
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } }
  })
  client.setQueryData(queryKeys.exerciseLibrary('coach-a'), {
    definitions: [
      { id: 'squat', version: 3, recording: { type: 'weight_reps', metrics: ['weight', 'reps'] } }
    ]
  })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const series = [
    {
      metric: 'weight' as const,
      unit: 'kg',
      direction: 'higher' as const,
      points: [
        { sessionId: 'a', startsAt: '2026-09-01', value: 60 },
        { sessionId: 'b', startsAt: '2026-09-08', value: 62 },
        { sessionId: 'c', startsAt: '2026-09-15', value: 65 }
      ]
    },
    {
      metric: 'reps' as const,
      unit: '次',
      direction: 'higher' as const,
      points: [
        { sessionId: 'a', startsAt: '2026-09-01', value: 5 },
        { sessionId: 'b', startsAt: '2026-09-08', value: 5 },
        { sessionId: 'c', startsAt: '2026-09-15', value: 1 }
      ]
    }
  ]
  const render = () =>
    root.render(
      <QueryClientProvider client={client}>
        <MultiMetricTrend
          session={session}
          definitionId="squat"
          name="深蹲"
          studentName="學生甲"
          recording={{ type: 'weight_reps', metrics: ['weight', 'reps'] }}
          series={series}
          onClose={() => {}}
        />
      </QueryClientProvider>
    )
  try {
    await act(async () => render())
    expect(host.querySelectorAll('.primary-line-series circle')).toHaveLength(3)
    expect(host.querySelectorAll('.secondary-bar-series rect')).toHaveLength(3)
    expect(host.querySelectorAll('.secondary-bar-label')).toHaveLength(3)
    expect(
      host.querySelector('.trajectory-chart svg[role="img"]')?.getAttribute('aria-label')
    ).toContain('主要指標 重量以折線呈現，次要指標 次數以底部長條呈現')
    expect(host.querySelector('.metric-history')?.textContent).toContain('60')
    expect(host.querySelector('.metric-history')?.textContent).not.toContain('次數')
    expect(host.querySelector('.metric-series-stats')).toBeNull()
    expect(host.querySelector('.trajectory-chart-note')).toBeNull()
    const button = [
      ...host.querySelectorAll<HTMLButtonElement>('.progress-metric-selector button')
    ].find((b) => b.textContent?.includes('重量'))!
    await act(async () => {
      button.click()
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(setProgressMetrics).toHaveBeenCalledWith(
      'test-token',
      'squat',
      expect.objectContaining({ metrics: ['weight'], version: 3, operationId: expect.any(String) })
    )
    expect(host.querySelectorAll('.primary-line-series circle')).toHaveLength(3)
    expect(host.querySelectorAll('.secondary-bar-series rect')).toHaveLength(0)
    expect(button.disabled).toBe(false)
    expect(button.dataset.locked).toBe('true')
    expect(series[1]!.points[0]!.value).toBe(5)
    await act(async () => render())
    expect(host.querySelectorAll('.secondary-bar-series rect')).toHaveLength(0)

    const reps = [
      ...host.querySelectorAll<HTMLButtonElement>('.progress-metric-selector button')
    ].find((item) => item.textContent?.includes('次數'))!
    await act(async () => {
      reps.click()
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(setProgressMetrics).toHaveBeenLastCalledWith(
      'test-token',
      'squat',
      expect.objectContaining({ metrics: ['reps', 'weight'], version: 4 })
    )
    expect(host.querySelectorAll('.primary-line-series circle')).toHaveLength(3)
    expect(host.querySelectorAll('.secondary-bar-series rect')).toHaveLength(3)
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
  }
})
