import { z } from 'zod'
import { isDeepStrictEqual } from 'node:util'
import type { BillingEnvironment } from './billing-sql.js'

const id = z
  .union([z.string().regex(/^[1-9]\d*$/), z.number().int().positive().safe()])
  .transform(String)
const instant = z.iso.datetime({ offset: true })
const common = {
  store_id: id,
  customer_id: id,
  test_mode: z.boolean(),
  created_at: instant,
  updated_at: instant,
}
const subscription = z.object({
  type: z.literal('subscriptions'),
  id,
  attributes: z.object({
    ...common,
    variant_id: id,
    payment_processor: z.enum(['stripe', 'paypal']).optional(),
    status: z.enum(['on_trial', 'active', 'paused', 'past_due', 'unpaid', 'cancelled', 'expired']),
    cancelled: z.boolean(),
    trial_ends_at: instant.nullable(),
    renews_at: instant.nullable(),
    ends_at: instant.nullable(),
  }),
})
const invoice = z.object({
  type: z.literal('subscription-invoices'),
  id,
  attributes: z.object({
    ...common,
    subscription_id: id,
    billing_reason: z.enum(['initial', 'renewal', 'updated']),
    currency: z.string().regex(/^[A-Z]{3}$/),
    status: z.enum(['pending', 'paid', 'void', 'refunded', 'partial_refund']),
    subtotal: z.number().int().nonnegative().safe(),
    subtotal_usd: z.number().int().nonnegative().safe(),
    currency_rate: z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,12})?$/),
    total: z.number().int().nonnegative().safe(),
    refunded_amount: z.number().int().nonnegative().safe(),
  }),
})
export type SubscriptionResource = z.infer<typeof subscription>
export type InvoiceResource = z.infer<typeof invoice> & {
  attributes: {
    refund_rounding?: {
      reported_refunded_amount: number
      total_usd: number
      refunded_amount_usd: number
    }
  }
}
export type BillingResource = SubscriptionResource | InvoiceResource
export type ResourceKind = BillingResource['type']

export class ReconciliationError extends Error {
  constructor(
    readonly code: string,
    readonly retryable = false,
  ) {
    super(code)
  }
}

/** Strips names, email, card data, URLs, relationships and all unneeded provider fields. */
export function parseBillingResource(
  raw: unknown,
  expected: {
    kind: ResourceKind
    id: string
    storeId: string
    variantIds: string[]
    environment?: BillingEnvironment
  },
): BillingResource {
  const parsed = z
    .object({ data: z.discriminatedUnion('type', [subscription, invoice]) })
    .safeParse(raw)
  if (!parsed.success) throw new ReconciliationError('invalid_provider_resource')
  const resource = parsed.data.data
  const a = resource.attributes
  if (
    resource.type !== expected.kind ||
    resource.id !== expected.id ||
    a.store_id !== expected.storeId ||
    a.test_mode !== (expected.environment !== 'live')
  ) {
    throw new ReconciliationError('provider_scope_mismatch')
  }
  if (Date.parse(a.updated_at) < Date.parse(a.created_at))
    throw new ReconciliationError('invalid_resource_time')
  if (resource.type === 'subscriptions') {
    const s = resource.attributes
    if (!expected.variantIds.includes(s.variant_id))
      throw new ReconciliationError('unknown_variant')
    if (
      (s.status === 'on_trial' && !s.trial_ends_at) ||
      (['cancelled', 'expired'].includes(s.status) && !s.ends_at)
    ) {
      throw new ReconciliationError('missing_subscription_boundary')
    }
  } else {
    const i = resource.attributes
    if (i.status === 'refunded' && i.refunded_amount === i.total + 1 && i.currency === 'TWD') {
      const evidence = z
        .object({
          data: z.object({
            attributes: z.object({
              refunded: z.literal(true),
              total_usd: z.number().int().positive().safe(),
              refunded_amount_usd: z.number().int().positive().safe(),
            }),
          }),
        })
        .safeParse(raw)
      if (
        !evidence.success ||
        evidence.data.data.attributes.total_usd !==
          evidence.data.data.attributes.refunded_amount_usd
      ) {
        throw new ReconciliationError('invalid_refund_amount')
      }
      // The provider can report one TWD cent above its own invoice total after
      // USD settlement rounding. Preserve that raw fact for audit while the
      // effective full refund is capped at the original invoice amount.
      return {
        ...resource,
        attributes: {
          ...i,
          refunded_amount: i.total,
          refund_rounding: {
            reported_refunded_amount: i.refunded_amount,
            total_usd: evidence.data.data.attributes.total_usd,
            refunded_amount_usd: evidence.data.data.attributes.refunded_amount_usd,
          },
        },
      }
    }
    if (
      i.refunded_amount > i.total ||
      (i.status === 'refunded' && i.refunded_amount !== i.total) ||
      (i.status === 'partial_refund' && (i.refunded_amount <= 0 || i.refunded_amount >= i.total)) ||
      (!['refunded', 'partial_refund'].includes(i.status) && i.refunded_amount !== 0)
    ) {
      throw new ReconciliationError('invalid_refund_amount')
    }
  }
  return resource
}

/** Called under the owning subscription lock, independently of event arrival order. */
export function resourceUpdate(
  previous: BillingResource | null,
  next: BillingResource,
): 'apply' | 'ignore' {
  if (!previous) return 'apply'
  if (
    previous.type !== next.type ||
    previous.id !== next.id ||
    previous.attributes.store_id !== next.attributes.store_id ||
    previous.attributes.customer_id !== next.attributes.customer_id ||
    previous.attributes.created_at !== next.attributes.created_at
  ) {
    throw new ReconciliationError('immutable_resource_changed')
  }
  const delta = Date.parse(next.attributes.updated_at) - Date.parse(previous.attributes.updated_at)
  if (delta < 0) return 'ignore'
  if (previous.type === 'subscription-invoices' && next.type === 'subscription-invoices') {
    const old = previous.attributes,
      current = next.attributes
    const legacyPriceProofMissing =
      old.subtotal === undefined &&
      old.subtotal_usd === undefined &&
      old.currency_rate === undefined
    if (
      old.subscription_id !== current.subscription_id ||
      old.currency !== current.currency ||
      (!legacyPriceProofMissing &&
        (old.subtotal !== current.subtotal ||
          old.subtotal_usd !== current.subtotal_usd ||
          old.currency_rate !== current.currency_rate)) ||
      old.total !== current.total ||
      old.billing_reason !== current.billing_reason ||
      current.refunded_amount < old.refunded_amount ||
      (['paid', 'refunded', 'partial_refund'].includes(old.status) &&
        ['pending', 'void'].includes(current.status))
    ) {
      throw new ReconciliationError('invoice_history_conflict')
    }
    if (delta === 0 && current.refunded_amount > old.refunded_amount) {
      // Lemon Test Mode has returned a higher cumulative refund with unchanged
      // updated_at. The verified invoice ID, ownership and immutable totals are
      // checked above, so this one-way refund progression remains unambiguous.
      if (
        ['paid', 'partial_refund'].includes(old.status) &&
        ['partial_refund', 'refunded'].includes(current.status)
      )
        return 'apply'
    }
    if (
      delta === 0 &&
      legacyPriceProofMissing &&
      old.status === current.status &&
      old.refunded_amount === current.refunded_amount
    )
      return 'apply'
  }
  if (delta === 0) {
    if (
      previous.type === 'subscriptions' &&
      next.type === 'subscriptions' &&
      previous.attributes.payment_processor === undefined &&
      next.attributes.payment_processor !== undefined
    ) {
      const { payment_processor: _processor, ...nextWithoutProcessor } = next.attributes
      if (isDeepStrictEqual(previous.attributes, nextWithoutProcessor)) return 'apply'
    }
    if (!isDeepStrictEqual(previous, next)) throw new ReconciliationError('same_version_conflict')
    return 'ignore'
  }
  return 'apply'
}
