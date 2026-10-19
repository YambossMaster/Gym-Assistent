// @vitest-environment jsdom
import type { Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import LocalCheckoutPage from './LocalCheckoutPage'

const current = vi.fn(async () => ({ current: null }))
const abandon = vi.fn(async () => ({
  id: 'prior-intent',
  status: 'abandoned'
}))
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
  createHttpBillingGateway: () => ({
    current,
    abandon,
    billing,
    intent: async () => ({
      id: 'prior-intent',
      status: 'open',
      url: 'https://store.lemonsqueezy.com/checkout/custom/old'
    })
  })
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
  abandon.mockClear()
  window.sessionStorage.clear()
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
            <Route path="/plans" element={<p>所有方案</p>} />
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

it('reopens an unfinished provider checkout on the checkout page, not the confirmation page', async () => {
  current.mockResolvedValueOnce({
    current: {
      intent: {
        id: 'prior-intent',
        status: 'open',
        url: 'https://store.lemonsqueezy.com/checkout/custom/old'
      },
      quote: {
        id: 'prior-quote',
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
        termsVersion: 'v1',
        tier: 'advanced',
        interval: 'year',
        today: { amount: 0, currency: 'TWD' },
        renewal: { amount: 145000, currency: 'TWD' },
        trial: 'one_month',
        chargeAt: '2026-11-19T08:45:00Z'
      }
    }
  } as never)
  billing.mockResolvedValueOnce({
    subscription: null,
    invoices: [],
    pendingCheckout: true
  } as never)
  const host = await mount('/settings/checkout?tier=basic&interval=month')
  expect(host.textContent).toContain('確認你的訂閱')
  expect(host.textContent).toContain('重新開啟 Lemon 付款介面')
  expect(host.querySelector('.checkout-existing-note')).toBeNull()
  expect(host.textContent).not.toContain('正在確認你的訂閱')
})

it('shows one pending-checkout explanation beside the unavailable payment action', async () => {
  current.mockResolvedValueOnce({
    current: {
      intent: { id: 'prior-intent', status: 'pending' },
      quote: {
        id: 'prior-quote',
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
        termsVersion: 'v1',
        tier: 'advanced',
        interval: 'year',
        today: { amount: 0, currency: 'TWD' },
        renewal: { amount: 145000, currency: 'TWD' },
        trial: 'one_month',
        chargeAt: '2026-11-19T08:45:00Z'
      }
    }
  } as never)
  billing.mockResolvedValueOnce({
    subscription: null,
    invoices: [],
    pendingCheckout: true
  } as never)
  const host = await mount('/settings/checkout')
  expect(host.querySelector('.checkout-existing-note')).toBeNull()
  expect(host.querySelector('#checkout-feedback')?.textContent).toContain('先前結帳狀態尚待確認')
  expect(host.textContent?.match(/先前結帳/g)).toHaveLength(1)
})
it('keeps a provider-submitted checkout in confirmation on re-entry', async () => {
  window.sessionStorage.setItem('billing-provider-submitted:isolated-coach:prior-intent', 'true')
  current.mockResolvedValueOnce({
    current: {
      intent: {
        id: 'prior-intent',
        status: 'open',
        url: 'https://store.lemonsqueezy.com/checkout/custom/old'
      },
      quote: {
        id: 'prior-quote',
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
        termsVersion: 'v1',
        tier: 'advanced',
        interval: 'year',
        today: { amount: 0, currency: 'TWD' },
        renewal: { amount: 145000, currency: 'TWD' },
        trial: 'one_month',
        chargeAt: '2026-11-19T08:45:00Z'
      }
    }
  } as never)
  billing.mockResolvedValueOnce({
    subscription: null,
    invoices: [],
    pendingCheckout: true
  } as never)
  const host = await mount('/settings/checkout?tier=basic&interval=month')
  expect(host.textContent).toContain('正在確認你的訂閱')
  expect(host.textContent).not.toContain('重新開啟 Lemon 付款介面')
})

it('requests server abandonment before returning to plans and never resumes that link', async () => {
  current.mockResolvedValue({
    current: {
      intent: {
        id: 'prior-intent',
        status: 'open',
        url: 'https://store.lemonsqueezy.com/checkout/custom/old'
      },
      quote: {
        id: 'prior-quote',
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
        termsVersion: 'v1',
        tier: 'advanced',
        interval: 'year',
        today: { amount: 0, currency: 'TWD' },
        renewal: { amount: 145000, currency: 'TWD' },
        trial: 'one_month',
        chargeAt: '2026-11-19T08:45:00Z'
      }
    }
  } as never)
  billing.mockResolvedValue({ subscription: null, invoices: [], pendingCheckout: true } as never)
  const host = await mount('/settings/checkout')
  const back = host.querySelector<HTMLButtonElement>('button.billing-back')!
  await act(async () => {
    back.click()
    await new Promise((resolve) => setTimeout(resolve, 30))
  })
  expect(abandon).toHaveBeenCalledExactlyOnceWith('prior-intent')
  expect(host.textContent).toContain('所有方案')
  expect(host.textContent).not.toContain('重新開啟 Lemon 付款介面')
})
