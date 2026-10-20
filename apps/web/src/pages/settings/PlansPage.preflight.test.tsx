// @vitest-environment jsdom
import type { Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { PlansPage } from './PlansPage'

const billing = vi.hoisted(() => ({
  current: vi.fn(
    async () =>
      ({ current: null }) as {
        current: null | { intent: { id: string; status: string }; quote: { id: string } }
      }
  ),
  overview: vi.fn(
    async () =>
      ({ subscription: null, invoices: [] }) as {
        subscription: null
        invoices: []
        pendingCheckout?: boolean
      }
  ),
  quote: vi.fn()
}))

vi.mock('../../config', () => ({ localBillingEnabled: true, localBillingServiceEnabled: true }))
vi.mock('../../supabase', () => ({ supabase: { auth: {} } }))
vi.mock('../../api', () => ({
  ApiError: class extends Error {},
  readBetaGrant: async () => ({ state: 'free' }),
  redeemBetaCode: vi.fn()
}))
vi.mock('../../beta-admission/BetaGate', () => ({ betaGrantKey: (id: string) => ['grant', id] }))
vi.mock('../../beta-admission/usePlanAccess', () => ({
  planAccessKey: (id: string) => ['plan', id],
  usePlanAccess: () => ({
    data: {
      tier: 'free',
      source: 'free',
      activeStudents: 0,
      activeVenues: 0,
      studentLimit: 5,
      venueLimit: 1,
      overCapacity: false
    },
    isPending: false,
    isError: false,
    refetch: vi.fn()
  })
}))
vi.mock('./billing/http-gateway', () => ({
  createHttpBillingGateway: () => ({
    current: billing.current,
    billing: billing.overview,
    quote: billing.quote
  })
}))

afterEach(() => {
  billing.current.mockReset()
  billing.overview.mockReset()
  billing.quote.mockReset()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

it('stays on plans until current state and the chosen quote are prepared', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  billing.current.mockResolvedValue({ current: null })
  billing.overview.mockResolvedValue({ subscription: null, invoices: [] })
  let releaseQuote!: (value: unknown) => void
  billing.quote.mockImplementation(
    () =>
      new Promise((resolve) => {
        releaseQuote = resolve
      })
  )
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/plans']}>
            <Routes>
              <Route
                path="/plans"
                element={
                  <PlansPage
                    session={{ user: { id: 'coach' }, access_token: 'token' } as Session}
                  />
                }
              />
              <Route path="/settings/checkout" element={<p>prepared checkout</p>} />
              <Route path="/settings/checkout/status" element={<p>existing checkout</p>} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    await act(async () => vi.waitFor(() => expect(host.textContent).toContain('選擇 Pro')))
    const choose = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent === '選擇 Pro'
    )!
    await act(async () => choose.click())
    await act(async () => vi.waitFor(() => expect(billing.quote).toHaveBeenCalledTimes(1)))
    expect(host.textContent).toContain('正在準備方案')
    expect(host.textContent).not.toContain('prepared checkout')
    await act(async () => releaseQuote({ id: 'prepared' }))
    expect(host.textContent).toContain('prepared checkout')
    expect(billing.current).toHaveBeenCalledTimes(1)
    expect(billing.overview).toHaveBeenCalledTimes(2)
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
  }
})

it('returns an unfinished checkout to the checkout page without quoting a second purchase', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  billing.current.mockResolvedValue({
    current: {
      intent: { id: 'existing', status: 'pending' },
      quote: { id: 'old-quote' }
    }
  })
  billing.overview.mockResolvedValue({ subscription: null, invoices: [], pendingCheckout: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/plans']}>
            <Routes>
              <Route
                path="/plans"
                element={
                  <PlansPage
                    session={{ user: { id: 'coach' }, access_token: 'token' } as Session}
                  />
                }
              />
              <Route path="/settings/checkout" element={<p>existing checkout</p>} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    await act(async () => vi.waitFor(() => expect(host.textContent).toContain('選擇 Pro')))
    const choose = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent === '選擇 Pro'
    )!
    await act(async () => choose.click())
    expect(host.textContent).toContain('existing checkout')
    expect(billing.quote).not.toHaveBeenCalled()
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
  }
})
