// @vitest-environment jsdom
import type { Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import LocalCheckoutPage from './LocalCheckoutPage'

const current = vi.fn(async () => ({ current: null }))
const billing = vi.fn(async () => ({
  pendingCheckout: false,
  subscription: {
    tier: 'advanced' as const,
    interval: 'month' as const,
    status: 'trial' as const,
    endsAt: '2026-11-15T09:09:08.000Z',
    renewal: { amount: 14500, currency: 'TWD' }
  },
  invoices: []
}))
vi.mock('./http-gateway', () => ({
  createHttpBillingGateway: () => ({ current, billing })
}))
vi.mock('../../../config', () => ({ localBillingServiceEnabled: true }))

const session = {
  user: { id: 'isolated-coach', email: 'coach@example.invalid' },
  access_token: 'local-test'
} as Session

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
  current.mockClear()
  billing.mockClear()
})

async function mount(path: string) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/settings/checkout" element={<LocalCheckoutPage session={session} />} />
            <Route
              path="/settings/checkout/status"
              element={<LocalCheckoutPage session={session} />}
            />
            <Route path="/settings" element={<p>方案與帳單</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30))
  })
  cleanups.push(async () => {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
  })
  return host
}

it('shows confirmed subscription on provider return when current intent has disappeared', async () => {
  const host = await mount('/settings/checkout/status')
  expect(host.textContent).toContain('Prime 訂閱已啟用')
  expect(host.textContent).toContain('查看我的方案與帳單')
  expect(host.textContent).not.toContain('付款並訂閱')
  expect(current).toHaveBeenCalledOnce()
  expect(billing).toHaveBeenCalledOnce()
})

it('keeps an already subscribed coach out of a new checkout', async () => {
  const host = await mount('/settings/checkout?tier=basic&interval=month')
  expect(host.textContent).toContain('方案與帳單')
  expect(host.textContent).not.toContain('付款並訂閱')
})
