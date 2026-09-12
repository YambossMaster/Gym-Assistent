import { describe, expect, it, vi } from 'vitest'
import { createAppQueryClient } from './query-client'

describe('formal route query cache', () => {
  it('serves a prefetched student detail from in-memory cache without a second request', async () => {
    const client = createAppQueryClient()
    const request = vi.fn().mockResolvedValue({ id: 'student-1', name: '品妤' })
    const options = { queryKey: ['student', 'coach-1', 'student-1'] as const, queryFn: request }

    await client.prefetchQuery(options)
    await expect(client.fetchQuery(options)).resolves.toEqual({ id: 'student-1', name: '品妤' })

    expect(request).toHaveBeenCalledTimes(1)
  })

  it('retains cached data while an invalidated query is ready for background revalidation', async () => {
    const client = createAppQueryClient()
    const key = ['students', 'coach-1'] as const
    client.setQueryData(key, [{ id: 'student-1' }])

    await client.invalidateQueries({ queryKey: key })

    expect(client.getQueryData(key)).toEqual([{ id: 'student-1' }])
  })

  it('removes private route data when the authenticated session ends', () => {
    const client = createAppQueryClient()
    const key = ['student', 'coach-1', 'student-1'] as const
    client.setQueryData(key, { id: 'student-1' })

    client.clear()

    expect(client.getQueryData(key)).toBeUndefined()
  })
})
