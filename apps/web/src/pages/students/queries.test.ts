import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '../../query-keys'
import { invalidateStudentPurchaseQueries } from './queries'

describe('Student Purchase cache invalidation', () => {
  it('invalidates only the current Coach roster, detail, and income projections', () => {
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue()

    invalidateStudentPurchaseQueries(queryClient, 'coach-1', 'student-1')

    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      queryKeys.student('coach-1', 'student-1'),
      queryKeys.students('coach-1'),
      queryKeys.income('coach-1')
    ])
  })
})
