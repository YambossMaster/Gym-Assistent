import { z } from 'zod'
import { lemonCheckoutPayload } from './provider-boundary.js'
import type { CheckoutProvider, CheckoutQuote } from './checkout.js'

export type LemonTestConfiguration = {
  key: string
  storeId: string
  returnUrl: string
  variants: Record<'basic_month' | 'basic_year' | 'advanced_month' | 'advanced_year', string>
}
export function localBillingConfiguration(env: NodeJS.ProcessEnv): LemonTestConfiguration | null {
  if (env.BILLING_LOCAL_CHECKOUT !== 'true') return null
  if (env.DEPLOYMENT_TARGET === 'production' || env.NODE_ENV === 'production')
    throw new Error('Local billing cannot run in Production')
  if (env.BILLING_PROVIDER_TESTS_APPROVED !== 'true') return null
  const values = [
    env.LEMON_SQUEEZY_API_KEY,
    env.LEMON_SQUEEZY_STORE_ID,
    env.BILLING_RETURN_URL,
    env.LEMON_PRO_MONTH_VARIANT,
    env.LEMON_PRO_YEAR_VARIANT,
    env.LEMON_PRIME_MONTH_VARIANT,
    env.LEMON_PRIME_YEAR_VARIANT,
  ]
  if (values.some((v) => !v)) return null
  const [key, storeId, returnUrl, proMonth, proYear, primeMonth, primeYear] = values as string[]
  return {
    key: key!,
    storeId: storeId!,
    returnUrl: returnUrl!,
    variants: {
      basic_month: proMonth!,
      basic_year: proYear!,
      advanced_month: primeMonth!,
      advanced_year: primeYear!,
    },
  }
}
const responseSchema = z.object({
  data: z.object({
    type: z.literal('checkouts'),
    id: z.string().min(1),
    attributes: z.object({ test_mode: z.literal(true), url: z.string().url() }),
  }),
})
export class LemonTestCheckoutProvider implements CheckoutProvider {
  constructor(
    private readonly config: LemonTestConfiguration | null,
    private readonly request: typeof fetch = fetch,
  ) {}
  ready(quote: CheckoutQuote): boolean {
    if (!this.config || quote.trial === '60_days') return false
    try {
      lemonCheckoutPayload({
        storeId: this.config.storeId,
        variantId: this.config.variants[`${quote.tier}_${quote.interval}`],
        intentId: quote.id,
        email: 'configuration@example.invalid',
        skipTrial: !quote.trial,
        testMode: true,
        returnUrl: this.config.returnUrl,
        expiresAt: quote.expiresAt,
      })
      return true
    } catch {
      return false
    }
  }
  async create(input: {
    intentId: string
    quote: CheckoutQuote
    email: string
    expiresAt: string
  }) {
    if (!this.config || !this.ready(input.quote)) throw new Error('billing_unavailable')
    const payload = lemonCheckoutPayload({
      storeId: this.config.storeId,
      variantId: this.config.variants[`${input.quote.tier}_${input.quote.interval}`],
      intentId: input.intentId,
      email: input.email,
      skipTrial: !input.quote.trial,
      testMode: true,
      returnUrl: this.config.returnUrl,
      expiresAt: input.expiresAt,
    })
    // No automatic retries: a lost response may still have created a checkout remotely.
    const response = await this.request('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.key}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
      redirect: 'error',
    })
    if (!response.ok) throw new Error('provider_checkout_unconfirmed')
    const result = responseSchema.parse(await response.json()).data
    const url = new URL(result.attributes.url)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      !url.hostname.endsWith('.lemonsqueezy.com') ||
      !url.pathname.startsWith('/checkout/')
    )
      throw new Error('unsafe_checkout_url')
    return { id: result.id, url: url.href }
  }
}
