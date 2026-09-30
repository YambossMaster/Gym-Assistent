// @vitest-environment jsdom
import type { Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { ResilienceStatus } from './ResilienceStatus'

const local = vi.hoisted(() => ({ replay: vi.fn(), list: vi.fn() }))

vi.mock('../local-resilience', () => ({
  CoachLocalStore: class {
    list = local.list
  },
  OperationQueue: class {
    replay = local.replay
  }
}))

const session = { user: { id: 'coach' }, access_token: 'token' } as Session

afterEach(() => {
  document.body.innerHTML = ''
  local.list.mockReset()
  local.replay.mockReset()
  vi.unstubAllGlobals()
})

it('refreshes failed Coach data and queued work after the local API returns', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  let available = false
  const fetch = vi.fn(async () => ({ ok: available, json: async () => ({ status: 'ok' }) }))
  vi.stubGlobal('fetch', fetch)
  local.list.mockResolvedValue([])
  local.replay.mockResolvedValue(undefined)
  const coachRead = vi.fn(async () => {
    if (!available) throw new Error('service_unavailable')
    return 'ready'
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)

  function CoachRoute() {
    const result = useQuery({ queryKey: ['coach', 'coach', 'route'], queryFn: coachRead })
    return <div>{result.data ?? (result.isError ? 'failed' : 'loading')}</div>
  }

  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <ResilienceStatus session={session} queryClient={client} />
          <CoachRoute />
        </QueryClientProvider>
      )
    })
    await vi.waitFor(() => expect(host.textContent).toContain('本機資料服務暫時無法連線'))
    expect(host.textContent).toContain('failed')

    available = true
    await act(async () => {
      await client.refetchQueries({ queryKey: ['local-api-health'] })
    })
    await vi.waitFor(() => expect(host.textContent).toContain('ready'))
    expect(host.textContent).not.toContain('本機資料服務暫時無法連線')
    expect(coachRead).toHaveBeenCalledTimes(2)
    expect(local.replay).toHaveBeenCalledTimes(2)
  } finally {
    await act(async () => root.unmount())
    client.clear()
  }
})
