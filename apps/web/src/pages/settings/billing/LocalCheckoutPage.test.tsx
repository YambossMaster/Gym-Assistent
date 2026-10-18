// @vitest-environment jsdom
import type { Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { PlansPage } from '../PlansPage'
import { PlanSummary } from '../SettingsPage'
import LocalCheckoutPage from './LocalCheckoutPage'

vi.mock('../../../supabase', () => ({ supabase: { auth: {} } }))
vi.mock('../../../api', async (original) => ({
  ...(await original<typeof import('../../../api')>()),
  readBetaGrant: vi.fn(async () => ({ state: 'permanent' }))
}))
const plan = {
  tier: 'advanced' as const,
  source: 'permanent' as const,
  activeStudents: 0,
  activeVenues: 0,
  studentLimit: null,
  venueLimit: null,
  overCapacity: false
}
vi.mock('../../../beta-admission/usePlanAccess', () => ({
  usePlanAccess: () => ({ data: plan, isPending: false, isError: false }),
  planAccessKey: (id: string) => ['plan-access', id]
}))
// Exercise the default local frontend with no billing env override.
vi.mock('../../../config', async (original) => ({
  ...(await original<typeof import('../../../config')>()),
  localBillingEnabled: true,
  localBillingServiceEnabled: false
}))
const session = {
  user: { id: 'local-owner', email: 'coach@example.invalid' },
  access_token: 'unused'
} as Session
const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
  vi.unstubAllGlobals()
})
async function mount(path = '/plans') {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const fetch = vi.fn(() => {
    throw new Error('No billing network allowed')
  })
  vi.stubGlobal('fetch', fetch)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/plans" element={<PlansPage session={session} />} />
            <Route path="/settings/checkout" element={<LocalCheckoutPage session={session} />} />
            <Route
              path="/settings"
              element={<PlanSummary plan={plan} loading={false} error={false} onRetry={() => {}} />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  )
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
  cleanups.push(async () => {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
  })
  const click = async (element: Element) => act(async () => (element as HTMLElement).click())
  const button = (label: string) =>
    Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes(label))!
  return { host, fetch, click, button }
}

it('opens the normal plan selection and standalone checkout, retaining annual selection without billing requests', async () => {
  const view = await mount()
  expect(view.host.textContent).toContain('目前方案 · 永久')
  await view.click(view.button('年費方案'))
  await view.click(view.button('查看 Prime 訂閱'))
  expect(view.host.querySelector('h1')?.textContent).toBe('確認你的訂閱')
  expect(view.host.textContent).toContain('NT$1,450')
  expect(view.host.textContent).toContain('每年一次')
  expect(view.host.querySelector('.settings-category-nav')).toBeNull()
  expect(view.button('訂閱尚未開放').disabled).toBe(true)
  expect(view.host.textContent).not.toContain('今天應付')
  expect(view.host.textContent).toContain('首次訂閱可享 1 個月免費體驗')
  await view.click(view.button('返回方案選擇'))
  expect(view.host.querySelector('h1')?.textContent).toBe('比較方案與價格')
  expect(view.fetch).not.toHaveBeenCalled()
})

it('keeps consent interactive, links legal pages and never starts payment', async () => {
  const view = await mount('/settings/checkout?tier=basic&interval=month')
  const checkbox = view.host.querySelector<HTMLInputElement>('#billing-consent')!
  await view.click(checkbox)
  expect(checkbox.checked).toBe(true)
  expect(view.host.querySelector('#billing-code')).toBeNull()
  expect(view.host.querySelector('.billing-consent a')?.getAttribute('href')).toBe(
    '/payment-notice'
  )
  expect(
    [...view.host.querySelectorAll('.billing-consent a')].map((a) => a.getAttribute('href'))
  ).toEqual(['/payment-notice', '/billing/privacy', '/billing/terms'])
  await view.click(view.button('年繳'))
  expect(checkbox.checked).toBe(false)
  expect(view.host.textContent).toContain('NT$1,150')
  await view.click(view.button('訂閱尚未開放'))
  expect(view.fetch).not.toHaveBeenCalled()
  expect(view.host.querySelector('[role="dialog"]')).toBeNull()
})

it('preserves actual permanent access and comparison link without invented invoices or duplicate Settings', async () => {
  const view = await mount('/settings?category=plans')
  expect(view.host.textContent).toContain('永久 Prime 資格')
  expect(view.host.textContent).toContain('無期限')
  expect(view.host.querySelector('.settings-plans-banner')?.getAttribute('href')).toBe('/plans')
  expect(view.host.textContent).toContain('帳單服務尚未開放')
  expect(view.button('退款')).toBeUndefined()
  expect(view.host.querySelector('[aria-pressed="true"]')?.textContent).toBe('全部')
  expect(view.host.textContent).not.toContain('沒有符合的帳單')
  expect(view.host.querySelector('.billing-invoice-list')).toBeNull()
  expect(view.host.textContent).not.toContain('取消續訂')
  expect(view.fetch).not.toHaveBeenCalled()
})
