import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '../../query-keys'
import { invalidateTodayRoute, todayRefreshOptions } from './queries'

describe('Today query boundary', () => {
  it('quietly checks for new notices only while Today is active and visible', () => {
    expect(todayRefreshOptions).toMatchObject({
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
      refetchOnMount: 'always',
      refetchOnWindowFocus: 'always',
      refetchOnReconnect: 'always'
    })
  })
  it('scopes keys by Coach and invalidates only that Today projection', () => {
    expect(queryKeys.today('coach-a')).not.toEqual(queryKeys.today('coach-b'))
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue()

    invalidateTodayRoute(queryClient, 'coach-a')

    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.today('coach-a') })
  })
})
