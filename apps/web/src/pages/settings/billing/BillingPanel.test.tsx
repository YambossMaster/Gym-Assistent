// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { BillingPanel } from './BillingPanel'
import { createReviewGateway } from './review/review-gateway'
import type { BillingGateway } from './types'
import { formatDate } from './types'

const cleanups: Array<() => Promise<void>> = []

it('explains pending cancellation and preserves the original plan until recovery', async () => {
  const { gateway } = createReviewGateway('cancel_error')
  const view = await mount(gateway)
  await view.click(view.button('取消續訂'))
  await view.click(view.button('確認取消續訂'))
  expect(view.host.textContent).toContain('正在確認取消結果')
  expect(view.host.textContent).not.toContain('已取消續訂')
  await view.click(view.button('確認取消續訂'))
  expect(view.host.textContent).toContain('已取消續訂')
})

it('shows the paid-through end for a failed renewal and preserves invoices on Free', async () => {
  const overdue = await mount(createReviewGateway('past_due').gateway)
  expect(overdue.host.textContent).toContain('已付款權限至')
  expect(overdue.host.textContent).toContain('到期前若未確認付款，將改用 Free')
  expect(overdue.host.textContent).toContain('FCD-104')
  const expired = await mount(createReviewGateway('expired').gateway)
  expect(expired.host.textContent).toContain('Free 方案')
  expect(expired.host.textContent).toContain('FCD-103')
})
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
  vi.unstubAllGlobals()
})
async function mount(gateway: BillingGateway, onViewCheckout = vi.fn()) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <BillingPanel
            accountId="test"
            gateway={gateway}
            onChoosePlan={() => {}}
            onViewCheckout={onViewCheckout}
          />
        </MemoryRouter>
      </QueryClientProvider>
    )
  )
  const flush = async () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25))
    })
  await flush()
  const button = (text: string) =>
    Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes(text))!
  const click = async (element: HTMLElement) => {
    await act(async () => element.click())
    await flush()
  }
  cleanups.push(async () => {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
  })
  return { host, client, button, click, flush, onViewCheckout }
}

it('dismisses paid subscription management without submitting cancellation', async () => {
  const { gateway } = createReviewGateway('invoices')
  const cancel = vi.spyOn(gateway, 'cancel')
  const view = await mount(gateway)
  await view.click(view.button('取消續訂'))
  expect(view.host.querySelector('[role="dialog"]')?.textContent).toContain('取消自動續訂')
  await view.click(view.button('保留訂閱'))
  expect(view.host.querySelector('[role="dialog"]')).toBeNull()
  expect(cancel).not.toHaveBeenCalled()
})

it('preserves original and refunded totals, rejects unsafe receipts and offers a safe link after retry', async () => {
  const { gateway } = createReviewGateway('invoices')
  gateway.receipt = vi
    .fn()
    .mockResolvedValueOnce('https://evil.test/invoice')
    .mockResolvedValueOnce('https://app.lemonsqueezy.com/my-orders/receipt')
  const view = await mount(gateway)
  await view.click(view.host.querySelector('[aria-label="查看 FCD-102 明細"]')!)
  const dialog = () => view.host.querySelector('[role="dialog"]')!
  expect(dialog().textContent).toContain('NT$145')
  expect(dialog().textContent).toContain('−NT$45')
  expect(dialog().textContent).toContain('NT$100')
  await view.click(view.button('取得付款憑證'))
  expect(dialog().textContent).toContain('暫時無法取得憑證')
  expect(dialog().querySelector('a[target="_blank"]')).toBeNull()
  await view.click(view.button('取得付款憑證'))
  expect(dialog().querySelector('a[target="_blank"]')?.getAttribute('href')).toBe(
    'https://app.lemonsqueezy.com/my-orders/receipt'
  )
  expect(gateway.receipt).toHaveBeenCalledWith('review-2')
})

it('retains the active subscription when cancellation fails and shows expiry only after success', async () => {
  const { gateway } = createReviewGateway('invoices')
  const originalEnd = (await gateway.billing(new AbortController().signal)).subscription!.endsAt
  const cancel = gateway.cancel
  gateway.cancel = vi
    .fn()
    .mockRejectedValueOnce(new Error('network'))
    .mockImplementationOnce(cancel)
  const view = await mount(gateway)
  await view.click(view.button('取消續訂'))
  await view.click(view.button('確認取消續訂'))
  expect(view.host.textContent).toContain('取消尚未完成')
  expect(view.host.textContent).not.toContain('已取消續訂')
  await view.click(view.button('確認取消續訂'))
  expect(view.host.textContent).toContain('已取消續訂')
  expect(view.host.textContent).toContain('Prime 方案')
  expect(view.host.textContent).toContain('回到 Free，不再扣款')
  expect(view.host.textContent).toContain(formatDate(originalEnd))
  expect(view.host.querySelector('[role="dialog"]')).toBeNull()
})

it('does not offer a new checkout while an earlier intent is unresolved', async () => {
  const { gateway } = createReviewGateway('pending')
  const quote = await gateway.quote(
    { tier: 'basic', interval: 'month' },
    new AbortController().signal
  )
  await gateway.begin({ quoteId: quote.id, termsVersion: quote.termsVersion })
  const view = await mount(gateway)
  expect(view.host.textContent).toContain('訂閱尚待確認，請勿重新付款')
  expect(view.button('重新確認')).toBeUndefined()
  expect(view.button('查看訂閱進度')).toBeTruthy()
  await view.click(view.button('查看訂閱進度'))
  expect(view.onViewCheckout).toHaveBeenCalledOnce()
  expect(view.button('查看方案')).toBeUndefined()
})

it('only exposes refund filtering when refunds exist and uses one help destination', async () => {
  const fixture = createReviewGateway('first')
  const view = await mount(fixture.gateway)
  expect(view.button('退款')).toBeUndefined()
  expect(view.button('查看方案')).toBeUndefined()
  expect(view.button('付款須知')).toBeUndefined()
  expect(
    view.host.querySelector('a[href="/settings?category=feedback#help-contact"]')
  ).not.toBeNull()
  const refunded = await mount(createReviewGateway('invoices').gateway)
  expect(refunded.button('退款')).toBeDefined()
  const row = refunded.host.querySelector<HTMLButtonElement>('.billing-invoice-hit')!
  await refunded.click(row)
  expect(refunded.host.querySelector('[role="dialog"]')?.textContent).toContain('帳單明細')
  expect(refunded.host.querySelector('[role="dialog"] a[href^="mailto:"]')).toBeNull()
})
