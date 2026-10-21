import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '../../query-keys'
import { invalidateStudentPurchaseQueries, refreshStudentAfterSave } from './queries'
import type { Student, StudentDetail } from '../../api'

describe('Student Purchase cache invalidation', () => {
  it('invalidates only the current Coach roster, detail, and income projections', () => {
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue()

    invalidateStudentPurchaseQueries(queryClient, 'coach-1', 'student-1')

    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      ['finances', 'coach-1'],
      ['venues', 'coach-1'],
      queryKeys.student('coach-1', 'student-1'),
      queryKeys.students('coach-1'),
      queryKeys.income('coach-1'),
      queryKeys.today('coach-1')
    ])
  })
})

describe('Student group profile save', () => {
  it('reads back current members after a successful edit instead of retaining the old detail projection', async () => {
    const queryClient = new QueryClient()
    const key = queryKeys.student('coach-1', 'group-1')
    const student = { id: 'group-1', kind: 'group', version: 2 } as Student
    let members = [{ id: 'person-1' }, { id: 'person-2' }]
    const queryFn = vi.fn(async () => ({ student, members }) as StudentDetail)
    await queryClient.fetchQuery({ queryKey: key, queryFn })

    members = [{ id: 'person-1' }, { id: 'person-2' }, { id: 'person-3' }]
    await refreshStudentAfterSave(queryClient, 'coach-1', 'group-1', { ...student, version: 3 })

    expect(queryFn).toHaveBeenCalledTimes(2)
    expect(
      queryClient.getQueryData<StudentDetail>(key)?.members?.map((member) => member.id)
    ).toEqual(['person-1', 'person-2', 'person-3'])
  })
})
