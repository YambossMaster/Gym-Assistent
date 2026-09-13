import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '../../query-keys'
import { invalidateTodayRoute } from './queries'

describe('Today query boundary', () => {
  it('scopes keys by Coach and invalidates only that Today projection', () => {
    expect(queryKeys.today('coach-a')).not.toEqual(queryKeys.today('coach-b'))
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue()

    invalidateTodayRoute(queryClient, 'coach-a')

    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.today('coach-a') })
  })
})
