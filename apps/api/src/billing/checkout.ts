import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import { checkoutPolicy, type BillingFacts, type BillingSelection } from './policy.js'

export class BillingError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
  ) {
    super(code)
  }
}
export const selectionSchema = z
  .object({
    tier: z.enum(['basic', 'advanced']),
    interval: z.enum(['month', 'year']),
  })
  .strict()
const beginSchema = z.object({ quoteId: z.uuid(), termsVersion: z.string().max(80) }).strict()
export type CheckoutQuote = {
  id: string
  expiresAt: string
  termsVersion: string
  tier: BillingSelection['tier']
  interval: BillingSelection['interval']
  today: { amount: number; currency: 'TWD' }
  renewal: { amount: number; currency: 'TWD' }
  trial: 'one_month' | null
  chargeAt: string | null
}
export type StoredQuote = CheckoutQuote & {
  eligibilityVersion: number
}
export type StoredIntent = {
  id: string
  quoteId: string
  status: 'creating' | 'open' | 'pending' | 'confirmed'
  activation?: 'trial' | 'paid' | null
  url: string | null
  providerId: string | null
  createdAt: string
  expiresAt: string
}
export type IntentView =
  | { id: string; status: 'pending' }
  | { id: string; status: 'open'; url: string }
  | { id: string; status: 'confirmed'; activation: 'trial' | 'paid' }
export type AccountFacts = BillingFacts & { eligibilityVersion: number; hasLegacyOffer: boolean }
export interface CheckoutTransaction {
  facts(): Promise<AccountFacts>
  quote(id: string): Promise<StoredQuote | null>
  saveQuote(quote: StoredQuote): Promise<void>
  unresolved(): Promise<StoredIntent | null>
  intent(id: string): Promise<StoredIntent | null>
  saveIntent(intent: StoredIntent): Promise<void>
}
export interface CheckoutRepository {
  transaction<T>(
    identity: AuthenticatedIdentity,
    work: (tx: CheckoutTransaction) => Promise<T>,
  ): Promise<T>
}
export interface CheckoutProvider {
  ready(quote: CheckoutQuote): boolean
  create(input: {
    intentId: string
    quote: CheckoutQuote
    email: string
    expiresAt: string
  }): Promise<{ id: string; url: string }>
}

function publicQuote({ eligibilityVersion: _version, ...quote }: StoredQuote): CheckoutQuote {
  return quote
}
/** Display estimate only. Lemon's confirmed subscription remains the billing authority. */
function estimatedFirstChargeAt(now: Date): string {
  const next = new Date(now)
  const day = next.getUTCDate()
  next.setUTCDate(1)
  next.setUTCMonth(next.getUTCMonth() + 1)
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate()
  next.setUTCDate(Math.min(day, lastDay))
  return next.toISOString()
}
function view(intent: StoredIntent, now: Date): IntentView {
  // Expiry alone cannot prove an external checkout did not create a subscription.
  if (intent.status === 'confirmed' && intent.activation)
    return { id: intent.id, status: 'confirmed', activation: intent.activation }
  return intent.status === 'open' && intent.url && Date.parse(intent.expiresAt) > now.getTime()
    ? { id: intent.id, status: 'open', url: intent.url }
    : { id: intent.id, status: 'pending' }
}
export class CheckoutModule {
  constructor(
    private readonly repository: CheckoutRepository,
    private readonly provider: CheckoutProvider,
    private readonly termsVersion = 'billing-first-trial-2026-10-18',
    private readonly now = () => new Date(),
  ) {}
  async quote(identity: AuthenticatedIdentity, raw: unknown): Promise<CheckoutQuote> {
    const selection = selectionSchema.parse(raw)
    return this.repository.transaction(identity, async (tx) => {
      const facts = await tx.facts()
      if (facts.hasLegacyOffer) throw new BillingError(409, 'existing_offer')
      const now = this.now()
      const price = checkoutPolicy(selection, facts)
      const quote: StoredQuote = {
        id: randomUUID(),
        expiresAt: new Date(now.getTime() + 300_000).toISOString(),
        termsVersion: this.termsVersion,
        tier: price.tier,
        interval: price.interval,
        today: { amount: price.dueNowMinor, currency: 'TWD' },
        renewal: { amount: price.recurringMinor, currency: 'TWD' },
        trial: price.trial,
        chargeAt: price.trial ? estimatedFirstChargeAt(now) : now.toISOString(),
        eligibilityVersion: facts.eligibilityVersion,
      }
      await tx.saveQuote(quote)
      return publicQuote(quote)
    })
  }
  async begin(identity: AuthenticatedIdentity, raw: unknown): Promise<IntentView> {
    const input = beginSchema.parse(raw)
    if (!identity.email) throw new BillingError(409, 'email_required')
    const claimed = await this.repository.transaction(identity, async (tx) => {
      const quote = await tx.quote(input.quoteId)
      if (!quote) throw new BillingError(404, 'quote_not_found')
      const existing = await tx.unresolved()
      if (existing) {
        if (existing.quoteId !== quote.id) throw new BillingError(409, 'checkout_pending')
        return { intent: existing, quote, dispatch: false }
      }
      const now = this.now()
      if (Date.parse(quote.expiresAt) <= now.getTime()) throw new BillingError(409, 'quote_expired')
      if (input.termsVersion !== quote.termsVersion || quote.termsVersion !== this.termsVersion)
        throw new BillingError(409, 'terms_changed')
      const facts = await tx.facts()
      if (facts.hasLegacyOffer) throw new BillingError(409, 'existing_offer')
      const price = checkoutPolicy(quote, facts)
      if (
        facts.eligibilityVersion !== quote.eligibilityVersion ||
        price.dueNowMinor !== quote.today.amount ||
        price.recurringMinor !== quote.renewal.amount ||
        quote.trial !== price.trial
      )
        throw new BillingError(409, 'quote_expired')
      if (!this.provider.ready(quote)) throw new BillingError(503, 'billing_unavailable')
      const intent: StoredIntent = {
        id: randomUUID(),
        quoteId: quote.id,
        status: 'creating',
        url: null,
        providerId: null,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 900_000).toISOString(),
      }
      // Persist the claim/consent BEFORE any network request. Only this claimant may dispatch.
      await tx.saveIntent(intent)
      return { intent, quote, dispatch: true }
    })
    if (!claimed.dispatch) return view(claimed.intent, this.now())
    let created: { id: string; url: string }
    try {
      created = await this.provider.create({
        intentId: claimed.intent.id,
        quote: publicQuote(claimed.quote),
        email: identity.email,
        expiresAt: claimed.intent.expiresAt,
      })
    } catch {
      await this.repository.transaction(identity, (tx) =>
        tx.saveIntent({ ...claimed.intent, status: 'pending' }),
      )
      return { id: claimed.intent.id, status: 'pending' }
    }
    const intent: StoredIntent = {
      ...claimed.intent,
      status: 'open',
      url: created.url,
      providerId: created.id,
    }
    await this.repository.transaction(identity, (tx) => tx.saveIntent(intent))
    return view(intent, this.now())
  }
  async intent(identity: AuthenticatedIdentity, id: string): Promise<IntentView> {
    z.uuid().parse(id)
    return this.repository.transaction(identity, async (tx) => {
      const intent = await tx.intent(id)
      if (!intent) throw new BillingError(404, 'not_found')
      return view(intent, this.now())
    })
  }
  async pending(
    identity: AuthenticatedIdentity,
  ): Promise<{ intent: IntentView; quote: CheckoutQuote } | null> {
    return this.repository.transaction(identity, async (tx) => {
      const intent = await tx.unresolved()
      if (!intent) return null
      const quote = await tx.quote(intent.quoteId)
      if (!quote) throw new BillingError(503, 'checkout_recovery_unavailable')
      return { intent: view(intent, this.now()), quote: publicQuote(quote) }
    })
  }
}
