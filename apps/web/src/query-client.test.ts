import { focusManager, QueryObserver } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { financeReadRecovery } from './pages/students/finance-api'
import { createAppQueryClient } from './query-client'

afterEach(() => focusManager.setFocused(undefined))

describe('formal route query cache', () => {
  it('keeps prefetched route data fresh across ordinary navigation', () => {
    const client = createAppQueryClient()

    expect(client.getDefaultOptions().queries?.staleTime).toBe(5 * 60_000)
    expect(client.getDefaultOptions().queries?.gcTime).toBe(30 * 60_000)
    expect(client.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false)
  })

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

it('retries a failed finance read when the page becomes active again', async () => {
  const client = createAppQueryClient()
  client.mount()
  const read = vi
    .fn()
    .mockRejectedValueOnce(new Error('service unavailable'))
    .mockResolvedValue('ready')
  const observer = new QueryObserver(client, {
    queryKey: ['finances', 'coach-1', 'current'],
    queryFn: read,
    ...financeReadRecovery,
    retry: false
  })
  const unsubscribe = observer.subscribe(() => {})
  try {
    await vi.waitFor(() => expect(observer.getCurrentResult().isError).toBe(true))
    focusManager.setFocused(false)
    focusManager.setFocused(true)
    await vi.waitFor(() => expect(observer.getCurrentResult().data).toBe('ready'))
    expect(read).toHaveBeenCalledTimes(2)
  } finally {
    unsubscribe()
    client.clear()
    client.unmount()
  }
})
