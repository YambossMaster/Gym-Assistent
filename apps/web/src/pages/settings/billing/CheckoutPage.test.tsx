// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { CheckoutPage } from './CheckoutPage'
import { billingQuoteKey } from './quote-query'
import { PaymentStatusPage } from './PaymentStatusPage'
import { validateCheckoutUrl } from './lemon-overlay'
import type { BillingGateway, CheckoutIntent, Quote } from './types'

const quote: Quote = {
  id: 'q1',
  expiresAt: new Date(Date.now() + 600000).toISOString(),
  termsVersion: 'v1',
  tier: 'basic',
  interval: 'month',
  today: { amount: 0, currency: 'TWD' },
  renewal: { amount: 11500, currency: 'TWD' },
  trial: 'one_month',
  chargeAt: '2026-11-18T08:00:00Z'
}
const cleanups: Array<() => Promise<void>> = []
it('renders a prepared quote immediately without requesting it again after navigation', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const selection = { tier: 'basic' as const, interval: 'month' as const }
  const prepared = { ...quote, expiresAt: new Date(Date.now() + 600000).toISOString() }
  client.setQueryData(billingQuoteKey('prepared-account', selection), prepared)
  const gateway = { quote: vi.fn() } as unknown as BillingGateway
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <CheckoutPage
              accountId="prepared-account"
              email="test@example.invalid"
              gateway={gateway}
              initialSelection={selection}
              onStarted={() => {}}
              onBack={() => {}}
            />
          </MemoryRouter>
        </QueryClientProvider>
      )
    })
    expect(host.textContent).toContain('NT$115')
    expect(host.textContent).not.toContain('正在取得訂閱金額')
    expect(gateway.quote).not.toHaveBeenCalled()
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
  }
})
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
  vi.unstubAllGlobals()
})
async function mount(
  overrides: Partial<BillingGateway> = {},
  restored?: CheckoutIntent,
  overlayFails = false
) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  let state: CheckoutIntent = {
    id: 'intent1',
    status: 'open',
    url: 'https://store.lemonsqueezy.com/checkout/custom/id'
  }
  let providerSuccess = () => {}
  const gateway: BillingGateway = {
    quote: vi.fn(async (selection) => ({
      ...quote,
      id: selection.interval,
      interval: selection.interval
    })),
    begin: vi.fn(async () => ({
      id: 'intent1',
      status: 'open' as const,
      url: 'https://store.lemonsqueezy.com/checkout/custom/id'
    })),
    intent: vi.fn(async () => state),
    billing: vi.fn(),
    cancel: vi.fn(),
    changeTrial: vi.fn(),
    previewPaid: vi.fn(),
    confirmPaid: vi.fn(),
    receipt: vi.fn(),
    ...overrides
  }
  const onComplete = vi.fn()
  const openCheckout = vi.fn(async (_url, callback) => {
    if (overlayFails) throw new Error('overlay_failed')
    providerSuccess = callback
  })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  function TestFlow() {
    const [started, setStarted] = useState<{ intent: CheckoutIntent; quote: Quote } | null>(
      restored ? { intent: restored, quote } : null
    )
    return started ? (
      <PaymentStatusPage
        accountId="isolated"
        gateway={gateway}
        intent={started.intent}
        quote={started.quote}
        openCheckout={openCheckout}
        autoOpen={!restored}
        onComplete={onComplete}
        onBack={() => {}}
      />
    ) : (
      <CheckoutPage
        accountId="isolated"
        email="test@example.invalid"
        gateway={gateway}
        initialSelection={{ tier: 'basic', interval: 'month' }}
        onStarted={(intent, nextQuote) => setStarted({ intent, quote: nextQuote })}
        onBack={() => {}}
      />
    )
  }
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <TestFlow />
        </MemoryRouter>
      </QueryClientProvider>
    )
  })
  const flush = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25))
    })
  }
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
  return {
    host,
    gateway,
    onComplete,
    button,
    click,
    flush,
    success: () => providerSuccess(),
    confirm: () => {
      state = { id: 'intent1', status: 'confirmed', activation: 'trial' }
    }
  }
}

it('invalidates consent when interval changes and does not infer success from the provider callback', async () => {
  const view = await mount()
  await view.click(view.host.querySelector('input[type=checkbox]')!)
  expect(view.button('開始體驗').disabled).toBe(false)
  await view.click(view.button('年繳'))
  expect(view.host.querySelector<HTMLInputElement>('input[type=checkbox]')!.checked).toBe(false)
  expect(view.host.querySelector<HTMLButtonElement>('.billing-submit')!.disabled).toBe(true)
  await view.click(view.host.querySelector('input[type=checkbox]')!)
  await view.click(view.button('開始體驗'))
  await act(async () => view.success())
  await view.flush()
  expect(view.host.textContent).toContain('付款尚未完成')
  expect(view.host.textContent).not.toContain('體驗已開始')
  expect(view.gateway.begin).toHaveBeenCalledTimes(1)
  view.confirm()
  await view.click(view.button('查詢付款結果'))
  expect(view.host.textContent).toContain('Pro 體驗已開始')
  await view.click(view.button('完成，查看我的方案'))
  expect(view.onComplete).toHaveBeenCalledTimes(1)
})

it('does not show the previous interval price while the replacement quote is pending', async () => {
  let completeAnnual!: (value: Quote) => void
  const view = await mount({
    quote: vi.fn(async (selection) =>
      selection.interval === 'month'
        ? quote
        : new Promise<Quote>((resolve) => {
            completeAnnual = resolve
          })
    )
  })
  expect(view.host.textContent).toContain('NT$115')
  await view.click(view.button('年繳'))
  expect(view.host.textContent).not.toContain('NT$115')
  expect(view.host.textContent).toContain('正在取得訂閱資訊')
  expect(view.host.querySelector<HTMLButtonElement>('.billing-submit')!.disabled).toBe(true)
  await act(async () =>
    completeAnnual({
      ...quote,
      id: 'annual',
      interval: 'year',
      renewal: { amount: 115000, currency: 'TWD' }
    })
  )
  await view.flush()
  expect(view.host.textContent).toContain('NT$1,150')
})

it('shows the provider-configured one-month trial and no site discount entry', async () => {
  const view = await mount()
  expect(view.host.querySelector('#checkout-code')).toBeNull()
  expect(view.host.textContent).toContain('1 個月')
  expect(view.host.textContent).toContain('預計首次扣款')
  expect(view.host.textContent).toContain('2026/11/18')
  expect(view.host.textContent).not.toContain('優惠碼')
  expect(view.host.textContent).not.toContain('以 Lemon 結帳確認頁為準')
})
it('shows full payment now and no trial for a returning subscriber', async () => {
  const view = await mount({
    quote: vi.fn(async () => ({
      ...quote,
      trial: null,
      today: { amount: 11500, currency: 'TWD' },
      chargeAt: '2026-10-18T08:00:00Z'
    }))
  })
  expect(view.host.textContent).toContain('本次扣款')
  expect(view.host.textContent).toContain('今天應付NT$115')
  expect(view.host.textContent).not.toContain('免費體驗1 個月')
  expect(view.button('付款並訂閱')).toBeTruthy()
})

it('shows the renewal policy once beside the price and payment dates', async () => {
  const view = await mount()
  expect(view.host.textContent).toContain('可隨時取消續訂')
  expect(view.host.textContent).toContain(
    '可於體驗期間取消續訂，將保留體驗資格至期限結束。期限結束後將不進行扣款。'
  )
  expect(view.host.textContent).not.toContain('前往「方案與帳單」管理。')
  expect(view.host.textContent).not.toContain('續訂由你決定')
  expect(view.host.textContent).not.toContain('每月自動續訂')
  expect(view.host.textContent!.match(/可隨時取消續訂/g)).toHaveLength(1)
})

it('keeps consent interactive on an expired quote and explains recovery before payment', async () => {
  const view = await mount({
    quote: vi
      .fn()
      .mockResolvedValueOnce({ ...quote, expiresAt: new Date(Date.now() - 1000).toISOString() })
      .mockResolvedValue({
        ...quote,
        id: 'fresh',
        expiresAt: new Date(Date.now() + 600000).toISOString()
      })
  })
  await view.click(view.host.querySelector('input[type=checkbox]')!)
  expect(view.host.querySelector<HTMLInputElement>('input[type=checkbox]')!.checked).toBe(true)
  expect(view.button('開始體驗').disabled).toBe(true)
  expect(view.host.querySelector('#checkout-feedback')!.textContent).toContain('已逾時')
  await view.click(view.button('更新資訊'))
  expect(view.host.querySelector<HTMLInputElement>('input[type=checkbox]')!.checked).toBe(false)
  await view.click(view.host.querySelector('input[type=checkbox]')!)
  expect(view.button('開始體驗').disabled).toBe(false)
  expect(view.gateway.begin).not.toHaveBeenCalled()
})

it('rejects unsafe or unrelated checkout origins before loading a payment SDK', () => {
  for (const url of [
    'javascript:alert(1)',
    'https://lemonsqueezy.com.evil.test/checkout/id',
    'https://store.lemonsqueezy.com/not-checkout',
    'https://user:password@store.lemonsqueezy.com/checkout/id'
  ])
    expect(() => validateCheckoutUrl(url)).toThrow()
  expect(validateCheckoutUrl('https://store.lemonsqueezy.com/checkout/custom/1')).toBe(
    'https://store.lemonsqueezy.com/checkout/custom/1'
  )
})

it('restores a server-owned checkout without quoting or creating a second checkout', async () => {
  const restored: CheckoutIntent = { id: 'persisted-intent', status: 'pending' }
  const view = await mount({ intent: vi.fn(async () => restored) }, restored)
  expect(view.gateway.quote).not.toHaveBeenCalled()
  expect(view.gateway.begin).not.toHaveBeenCalled()
  expect(view.gateway.intent).toHaveBeenCalledWith('persisted-intent')
  expect(view.host.querySelector('.payment-status-main')).not.toBeNull()
  expect(view.host.querySelector('.billing-summary')).toBeNull()
  expect(view.host.textContent).toContain('NT$115')
  expect(view.host.textContent).toContain('正在確認你的訂閱')
  expect(view.button('查詢訂閱結果')).toBeTruthy()
})

it('reports an unchanged checkout result after an explicit query', async () => {
  const view = await mount(
    {},
    {
      id: 'persisted-intent',
      status: 'open',
      url: 'https://store.lemonsqueezy.com/checkout/custom/id'
    }
  )
  await view.click(view.button('查詢付款結果'))
  expect(view.host.textContent).toContain('已查詢：這筆付款尚未完成，可繼續原付款。')
})

it('recovers the same checkout when the payment overlay cannot open', async () => {
  const view = await mount({}, undefined, true)
  await view.click(view.host.querySelector('input[type=checkbox]')!)
  await view.click(view.button('開始體驗'))
  expect(view.host.querySelector('.payment-status-main')).not.toBeNull()
  expect(view.host.textContent).toContain('付款視窗未能開啟')
  expect(view.button('重新開啟付款視窗')).toBeTruthy()
  expect(view.host.textContent).toContain('新分頁付款')
  expect(view.gateway.begin).toHaveBeenCalledTimes(1)
  await view.click(view.button('重新開啟付款視窗'))
  expect(view.gateway.begin).toHaveBeenCalledTimes(1)
})
