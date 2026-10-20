import { expect, it, vi } from 'vitest'
import {
  LemonTestCheckoutProvider,
  localBillingConfiguration,
  type LemonTestConfiguration,
} from './lemon-checkout.js'
import type { CheckoutQuote } from './checkout.js'
const config: LemonTestConfiguration = {
  key: 'test-only-fake-key',
  storeId: '1',
  returnUrl: 'http://127.0.0.1:4177/settings/checkout',
  variants: {
    basic_month: '2',
    basic_year: '3',
    advanced_month: '4',
    advanced_year: '5',
  },
}
const quote: CheckoutQuote = {
  id: 'q',
  expiresAt: '2030-01-01T00:00:00Z',
  termsVersion: 'local',
  tier: 'basic',
  interval: 'month',
  today: { amount: 0, currency: 'TWD' },
  renewal: { amount: 11500, currency: 'TWD' },
  trial: 'one_month',
  chargeAt: null,
}
it('checks the complete provider subscription page before releasing an expired checkout', async () => {
  const request = vi.fn<typeof fetch>(
    async () =>
      new Response(
        JSON.stringify({
          data: [
            {
              type: 'subscriptions',
              attributes: {
                created_at: '2026-10-14T08:10:00Z',
                test_mode: true,
                store_id: 1,
              },
            },
          ],
          meta: { page: { lastPage: 1 } },
        }),
      ),
  )
  const provider = new LemonTestCheckoutProvider(config, request)
  expect(
    await provider.hasSubscriptionSince({
      email: 'coach@example.invalid',
      since: '2026-10-14T08:00:00Z',
    }),
  ).toBe(true)
  expect(String(request.mock.calls[0]?.[0])).toContain(
    'filter%5Buser_email%5D=coach%40example.invalid',
  )
  request.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        data: [],
        meta: { page: { lastPage: 2 } },
      }),
    ),
  )
  await expect(
    provider.hasSubscriptionSince({
      email: 'coach@example.invalid',
      since: '2026-10-14T08:00:00Z',
    }),
  ).rejects.toThrow('provider_subscription_check_incomplete')
})
it.each([
  ['basic', 'month', '2'],
  ['basic', 'year', '3'],
  ['advanced', 'month', '4'],
  ['advanced', 'year', '5'],
] as const)('maps ordinary %s %s checkout to its own variant', async (tier, interval, id) => {
  const request = vi.fn<typeof fetch>(
    async () =>
      new Response(
        JSON.stringify({
          data: {
            type: 'checkouts',
            id: 'test-1',
            attributes: { test_mode: true, url: 'https://store.lemonsqueezy.com/checkout/test-1' },
          },
        }),
      ),
  )
  const selected: CheckoutQuote = { ...quote, tier, interval }
  await new LemonTestCheckoutProvider(config, request).create({
    intentId: 'intent',
    quote: selected,
    email: 'coach@example.invalid',
    expiresAt: selected.expiresAt,
  })
  const payload = JSON.parse(String(request.mock.calls[0]?.[1]?.body))
  expect(payload.data.relationships.variant.data.id).toBe(id)
  expect(payload.data.attributes.checkout_options.skip_trial).toBe(false)
  expect(payload.data.attributes.checkout_data.custom).toEqual({ intent_id: 'intent' })
})
it('defaults off, rejects production opt-in and blocks incomplete merchant setup', () => {
  expect(localBillingConfiguration({})).toBeNull()
  expect(localBillingConfiguration({ BILLING_LOCAL_CHECKOUT: 'true' })).toBeNull()
  expect(() =>
    localBillingConfiguration({ BILLING_LOCAL_CHECKOUT: 'true', DEPLOYMENT_TARGET: 'production' }),
  ).toThrow()
  expect(() =>
    localBillingConfiguration({ BILLING_LOCAL_CHECKOUT: 'true', NODE_ENV: 'production' }),
  ).toThrow()
  expect(new LemonTestCheckoutProvider(null).ready(quote)).toBe(false)
  expect(
    localBillingConfiguration({
      BILLING_LOCAL_CHECKOUT: 'true',
      LEMON_SQUEEZY_API_KEY: 'fake',
      LEMON_SQUEEZY_STORE_ID: '1',
      BILLING_RETURN_URL: 'http://127.0.0.1:4178/settings/checkout',
      LEMON_PRO_MONTH_VARIANT: '2',
      LEMON_PRO_YEAR_VARIANT: '3',
      LEMON_PRIME_MONTH_VARIANT: '4',
      LEMON_PRIME_YEAR_VARIANT: '5',
    }),
  ).toBeNull()
})
it('requires the four paid variants and hides Lemon discount entry', async () => {
  const environment = {
    BILLING_LOCAL_CHECKOUT: 'true',
    BILLING_PROVIDER_TESTS_APPROVED: 'true',
    LEMON_SQUEEZY_API_KEY: 'fake',
    LEMON_SQUEEZY_STORE_ID: '1',
    BILLING_RETURN_URL: 'http://127.0.0.1:4178/settings/checkout',
    LEMON_PRO_MONTH_VARIANT: '2',
    LEMON_PRO_YEAR_VARIANT: '3',
    LEMON_PRIME_MONTH_VARIANT: '4',
    LEMON_PRIME_YEAR_VARIANT: '5',
  }
  expect(localBillingConfiguration({ ...environment, LEMON_PRIME_YEAR_VARIANT: '' })).toBeNull()
  expect(localBillingConfiguration(environment)?.variants.advanced_year).toBe('5')
  const request = vi.fn<typeof fetch>(
    async () =>
      new Response(
        JSON.stringify({
          data: {
            type: 'checkouts',
            id: 'test-1',
            attributes: { test_mode: true, url: 'https://store.lemonsqueezy.com/checkout/test-1' },
          },
        }),
      ),
  )
  const provider = new LemonTestCheckoutProvider(config, request)
  const selected = { ...quote, tier: 'advanced' as const, interval: 'year' as const }
  await provider.create({
    intentId: 'i',
    quote: selected,
    email: 'coach@example.invalid',
    expiresAt: selected.expiresAt,
  })
  const payload = JSON.parse(String(request.mock.calls[0]?.[1]?.body))
  expect(payload.data.relationships.variant.data.id).toBe('5')
  expect(payload.data.attributes.checkout_options.skip_trial).toBe(false)
  expect(payload.data.attributes.checkout_options.discount).toBe(false)
  expect(payload.data.attributes.checkout_data.custom).toEqual({ intent_id: 'i' })
})
it('asks Lemon to skip the native trial for a returning subscriber', async () => {
  const request = vi.fn<typeof fetch>(
    async () =>
      new Response(
        JSON.stringify({
          data: {
            type: 'checkouts',
            id: 'returning',
            attributes: {
              test_mode: true,
              url: 'https://store.lemonsqueezy.com/checkout/returning',
            },
          },
        }),
      ),
  )
  const returning: CheckoutQuote = {
    ...quote,
    trial: null,
    today: { amount: 11500, currency: 'TWD' },
    chargeAt: '2026-10-18T00:00:00Z',
  }
  await new LemonTestCheckoutProvider(config, request).create({
    intentId: 'returning-intent',
    quote: returning,
    email: 'coach@example.invalid',
    expiresAt: returning.expiresAt,
  })
  const payload = JSON.parse(String(request.mock.calls[0]?.[1]?.body))
  expect(payload.data.attributes.checkout_options.skip_trial).toBe(true)
  expect(payload.data.attributes.checkout_options.discount).toBe(false)
})
it('uses only server-mapped Test Mode checkout and keeps the native trial', async () => {
  const request = vi.fn<typeof fetch>(
    async () =>
      new Response(
        JSON.stringify({
          data: {
            type: 'checkouts',
            id: 'checkout-1',
            attributes: {
              test_mode: true,
              url: 'https://store.lemonsqueezy.com/checkout/custom/1',
            },
          },
        }),
      ),
  )
  const provider = new LemonTestCheckoutProvider(config, request)
  expect(
    await provider.create({
      intentId: 'i',
      quote,
      email: 'coach@example.invalid',
      expiresAt: quote.expiresAt,
    }),
  ).toMatchObject({ id: 'checkout-1' })
  const payload = JSON.parse(String(request.mock.calls[0]?.[1]?.body))
  expect(payload.data.attributes.test_mode).toBe(true)
  expect(payload.data.attributes.checkout_options.skip_trial).toBe(false)
  expect(payload.data.relationships.variant.data.id).toBe('2')
  expect(payload.data.attributes.checkout_data.custom).toEqual({ intent_id: 'i' })
})
it('does not accept live-mode or unsafe provider URLs and does not retry failures', async () => {
  for (const attributes of [
    { test_mode: false, url: 'https://store.lemonsqueezy.com/checkout/1' },
    { test_mode: true, url: 'https://attacker.example/checkout/1' },
  ]) {
    const request = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: { type: 'checkouts', id: '1', attributes } })),
    )
    await expect(
      new LemonTestCheckoutProvider(config, request).create({
        intentId: 'i',
        quote,
        email: 'coach@example.invalid',
        expiresAt: quote.expiresAt,
      }),
    ).rejects.toThrow()
    expect(request).toHaveBeenCalledTimes(1)
  }
})

it('requires a Live checkout response for a Live configuration', async () => {
  const live = {
    ...config,
    environment: 'live' as const,
    returnUrl: 'https://formcoachdesk.example/settings/checkout/status',
  }
  const request = vi.fn<typeof fetch>(
    async () =>
      new Response(
        JSON.stringify({
          data: {
            type: 'checkouts',
            id: '1',
            attributes: { test_mode: true, url: 'https://store.lemonsqueezy.com/checkout/1' },
          },
        }),
      ),
  )
  await expect(
    new LemonTestCheckoutProvider(live, request).create({
      intentId: 'i',
      quote,
      email: 'coach@example.invalid',
      expiresAt: quote.expiresAt,
    }),
  ).rejects.toThrow('provider_scope_mismatch')
  const payload = JSON.parse(String(request.mock.calls[0]?.[1]?.body))
  expect(payload.data.attributes.test_mode).toBe(false)
})
