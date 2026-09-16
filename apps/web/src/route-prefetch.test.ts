import type { Session } from '@supabase/supabase-js'
import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from './api'
import { createAppQueryClient } from './query-client'
import { prefetchPrimaryCoachRoutes } from './route-prefetch'

vi.mock('./api', () => ({
  getAccountLifecycle: vi.fn().mockResolvedValue({}),
  getCalendar: vi.fn().mockResolvedValue({}),
  getExerciseLibrary: vi.fn().mockResolvedValue({ definitions: [] }),
  getLessonPurchaseIncome: vi.fn().mockResolvedValue([]),
  getToday: vi.fn().mockResolvedValue({}),
  getTrainingPreference: vi.fn().mockResolvedValue({}),
  listStudents: vi.fn().mockResolvedValue([])
}))

const session = {
  access_token: 'token',
  user: { id: 'coach-1' }
} as Session

describe('primary Coach route prefetch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads each primary route data source once and reuses the fresh cache', async () => {
    const client = createAppQueryClient()
    const now = new Date('2026-09-16T04:00:00.000Z')

    await prefetchPrimaryCoachRoutes(client, session, 'Asia/Taipei', now)
    await prefetchPrimaryCoachRoutes(client, session, 'Asia/Taipei', now)

    expect(api.getToday).toHaveBeenCalledTimes(1)
    expect(api.getCalendar).toHaveBeenCalledTimes(1)
    expect(api.listStudents).toHaveBeenCalledTimes(1)
    expect(api.getLessonPurchaseIncome).toHaveBeenCalledTimes(1)
    expect(api.getExerciseLibrary).toHaveBeenCalledTimes(1)
    expect(api.getAccountLifecycle).toHaveBeenCalledTimes(1)
    expect(api.getTrainingPreference).toHaveBeenCalledTimes(1)
  })

  it('isolates prefetch failures so one unavailable page does not stop the others', async () => {
    vi.mocked(api.getCalendar).mockRejectedValueOnce(new Error('offline'))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    await expect(
      prefetchPrimaryCoachRoutes(client, session, 'Asia/Taipei', new Date('2026-09-16T04:00:00Z'))
    ).resolves.toBeUndefined()
    expect(api.getExerciseLibrary).toHaveBeenCalledOnce()
  })
})
