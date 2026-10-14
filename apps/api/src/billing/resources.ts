import { z } from 'zod'
import { isDeepStrictEqual } from 'node:util'

const id = z
  .union([z.string().regex(/^[1-9]\d*$/), z.number().int().positive().safe()])
  .transform(String)
const instant = z.iso.datetime({ offset: true })
const common = {
  store_id: id,
  customer_id: id,
  test_mode: z.literal(true),
  created_at: instant,
  updated_at: instant,
}
const subscription = z.object({
  type: z.literal('subscriptions'),
  id,
  attributes: z.object({
    ...common,
    variant_id: id,
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
    total: z.number().int().nonnegative().safe(),
    refunded_amount: z.number().int().nonnegative().safe(),
  }),
})
export type SubscriptionResource = z.infer<typeof subscription>
export type InvoiceResource = z.infer<typeof invoice>
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
  expected: { kind: ResourceKind; id: string; storeId: string; variantIds: string[] },
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
    a.store_id !== expected.storeId
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
  if (delta === 0) {
    if (!isDeepStrictEqual(previous, next)) throw new ReconciliationError('same_version_conflict')
    return 'ignore'
  }
  if (previous.type === 'subscription-invoices' && next.type === 'subscription-invoices') {
    const old = previous.attributes,
      current = next.attributes
    if (
      old.subscription_id !== current.subscription_id ||
      old.currency !== current.currency ||
      old.total !== current.total ||
      old.billing_reason !== current.billing_reason ||
      current.refunded_amount < old.refunded_amount ||
      (['paid', 'refunded', 'partial_refund'].includes(old.status) &&
        ['pending', 'void'].includes(current.status))
    ) {
      throw new ReconciliationError('invoice_history_conflict')
    }
  }
  return 'apply'
}
