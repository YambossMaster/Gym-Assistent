import { afterEach, expect, it, vi } from 'vitest'
import { createHttpBillingGateway } from './http-gateway'
afterEach(() => vi.unstubAllGlobals())
it('uses authenticated no-store HTTP and keeps server error codes for recovery', async () => {
  const request = vi.fn(
    async () => new Response(JSON.stringify({ error: 'billing_unavailable' }), { status: 503 })
  )
  vi.stubGlobal('fetch', request)
  const gateway = createHttpBillingGateway('local-test-token')
  await expect(gateway.begin({ quoteId: 'q', termsVersion: 'v' })).rejects.toThrow(
    'billing_unavailable'
  )
  expect(request).toHaveBeenCalledWith(
    '/api/v1/billing/checkouts',
    expect.objectContaining({
      method: 'POST',
      cache: 'no-store',
      headers: expect.objectContaining({ authorization: 'Bearer local-test-token' }),
      body: JSON.stringify({ quoteId: 'q', termsVersion: 'v' })
    })
  )
  expect(request).toHaveBeenCalledTimes(1)
})
it('recovers a server-owned intent without relying on local storage', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            current: { intent: { id: 'i', status: 'pending' }, quote: { id: 'q' } }
          })
        )
    )
  )
  expect(
    await createHttpBillingGateway('test').current(new AbortController().signal)
  ).toMatchObject({ current: { intent: { id: 'i', status: 'pending' } } })
})

it('sends valid empty JSON for authenticated abandon and submitted commands', async () => {
  const fetchMock = vi.fn<typeof fetch>(
    async () =>
      new Response(JSON.stringify({ id: 'one', status: 'pending' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
  )
  vi.stubGlobal('fetch', fetchMock)
  const gateway = createHttpBillingGateway('isolated-test-token')
  await gateway.abandon('one')
  await gateway.submitted('one')
  expect(fetchMock).toHaveBeenCalledTimes(2)
  for (const [, options] of fetchMock.mock.calls) {
    expect(options).toBeDefined()
    expect(options!.method).toBe('POST')
    expect(options!.body).toBe('{}')
    expect((options!.headers as Record<string, string>).authorization).toBe(
      'Bearer isolated-test-token'
    )
  }
})
