import type { InvoiceResource, SubscriptionResource } from './resources.js'
import { ReconciliationError } from './resources.js'

export type InitialPeriod = {
  origin: 'trial' | 'payment'
  startsAt: string
  endsAt: string
  subscriptionVersion: string
  invoiceId: string | null
  invoiceVersion: string | null
  originalDueAt: string
}

export type RenewalPeriod = {
  origin: 'renewal'
  startsAt: string
  endsAt: string
  subscriptionVersion: string
  invoiceId: string
  invoiceVersion: string
  originalDueAt: string
}

export type PaidUpgradeEvidence = {
  invoiceId: string
  subscriptionVersion: string
  periodEndsAt: string
}

export type PaidAnnualSwitchEvidence = PaidUpgradeEvidence & {
  startsAt: string
}

/** A positive paid update starts a new annual period after a monthly-to-annual switch. */
export function paidMonthlyToAnnualSwitch(
  previous: SubscriptionResource,
  current: SubscriptionResource,
  invoice: InvoiceResource,
  period: { tier: string; billingInterval: string; startsAt: string; endsAt: string },
  variants: { currentMonth: string; targetYear: string },
): PaidAnnualSwitchEvidence | null {
  const old = previous.attributes
  const next = current.attributes
  const paid = invoice.attributes
  const oldVersion = Date.parse(old.updated_at)
  const newVersion = Date.parse(next.updated_at)
  const invoiceCreated = Date.parse(paid.created_at)
  const starts = Date.parse(period.startsAt)
  const ends = Date.parse(period.endsAt)
  const newEnd = Date.parse(next.renews_at ?? '')
  const rate = Number(paid.currency_rate)
  const fractionRemaining = (ends - invoiceCreated) / (ends - starts)
  const monthlyPrice = period.tier === 'advanced' ? 14500 : 11500
  const annualPrice = monthlyPrice * 10
  const expectedSubtotal = annualPrice - Math.round(monthlyPrice * fractionRemaining)
  const tolerance = Math.max(Math.ceil(annualPrice * 0.02), Math.ceil(1 / rate) + 2)
  if (
    ![
      oldVersion,
      newVersion,
      invoiceCreated,
      starts,
      ends,
      newEnd,
      rate,
      expectedSubtotal,
      tolerance,
    ].every(Number.isFinite) ||
    rate <= 0 ||
    oldVersion >= newVersion ||
    invoiceCreated < oldVersion ||
    invoiceCreated > newVersion + 300000 ||
    invoiceCreated < starts ||
    invoiceCreated >= ends ||
    newEnd <= ends ||
    newEnd - newVersion < 360 * 86400000 ||
    newEnd - newVersion > 367 * 86400000 ||
    period.billingInterval !== 'month' ||
    !['basic', 'advanced'].includes(period.tier) ||
    old.variant_id !== variants.currentMonth ||
    next.variant_id !== variants.targetYear ||
    previous.id !== current.id ||
    old.store_id !== next.store_id ||
    old.customer_id !== next.customer_id ||
    old.status !== 'active' ||
    next.status !== 'active' ||
    old.cancelled ||
    next.cancelled ||
    old.trial_ends_at !== null ||
    next.trial_ends_at !== null ||
    Date.parse(old.renews_at ?? '') !== ends ||
    paid.store_id !== next.store_id ||
    paid.customer_id !== next.customer_id ||
    paid.subscription_id !== current.id ||
    paid.billing_reason !== 'updated' ||
    paid.status !== 'paid' ||
    paid.currency !== 'TWD' ||
    paid.refunded_amount !== 0 ||
    paid.total < paid.subtotal ||
    paid.subtotal <= 0 ||
    paid.subtotal_usd <= 0 ||
    Math.abs(paid.subtotal - Math.round(paid.subtotal_usd / rate)) > 2 ||
    Math.abs(paid.subtotal - expectedSubtotal) > tolerance
  )
    return null
  return {
    invoiceId: invoice.id,
    subscriptionVersion: next.updated_at,
    startsAt: paid.created_at,
    periodEndsAt: next.renews_at!,
  }
}

/** The observed same-cadence Pro-month to Prime-month change retains the paid period end. */
export function paidMonthlyTierUpgrade(
  previous: SubscriptionResource,
  current: SubscriptionResource,
  invoice: InvoiceResource,
  period: { tier: string; billingInterval: string; startsAt: string; endsAt: string },
  variants: { basicMonth: string; advancedMonth: string },
): PaidUpgradeEvidence | null {
  const old = previous.attributes
  const next = current.attributes
  const paid = invoice.attributes
  const oldVersion = Date.parse(old.updated_at)
  const newVersion = Date.parse(next.updated_at)
  const invoiceCreated = Date.parse(paid.created_at)
  const starts = Date.parse(period.startsAt)
  const ends = Date.parse(period.endsAt)
  const rate = Number(paid.currency_rate)
  if (
    ![oldVersion, newVersion, invoiceCreated, starts, ends, rate].every(Number.isFinite) ||
    rate <= 0 ||
    oldVersion >= newVersion ||
    invoiceCreated < oldVersion ||
    invoiceCreated > newVersion + 300000 ||
    invoiceCreated < starts ||
    invoiceCreated >= ends ||
    period.tier !== 'basic' ||
    period.billingInterval !== 'month' ||
    old.variant_id !== variants.basicMonth ||
    next.variant_id !== variants.advancedMonth ||
    previous.id !== current.id ||
    old.store_id !== next.store_id ||
    old.customer_id !== next.customer_id ||
    old.status !== 'active' ||
    next.status !== 'active' ||
    old.cancelled ||
    next.cancelled ||
    old.trial_ends_at !== null ||
    next.trial_ends_at !== null ||
    Date.parse(old.renews_at ?? '') !== ends ||
    Date.parse(next.renews_at ?? '') !== ends ||
    paid.store_id !== next.store_id ||
    paid.customer_id !== next.customer_id ||
    paid.subscription_id !== current.id ||
    paid.billing_reason !== 'updated' ||
    paid.status !== 'paid' ||
    paid.currency !== 'TWD' ||
    paid.total <= 0 ||
    paid.subtotal <= 0 ||
    paid.subtotal_usd <= 0 ||
    Math.abs(paid.subtotal - Math.round(paid.subtotal_usd / rate)) > 2
  )
    return null
  return {
    invoiceId: invoice.id,
    subscriptionVersion: next.updated_at,
    periodEndsAt: period.endsAt,
  }
}

/** Lemon charges USD cents, then reports a converted store-currency subtotal. */
export function invoiceMatchesCatalogPrice(
  invoice: InvoiceResource,
  expected: { currency: string; total: number },
): boolean {
  const i = invoice.attributes
  const rate = Number(i.currency_rate)
  if (
    i.currency !== expected.currency ||
    !Number.isSafeInteger(expected.total) ||
    expected.total <= 0 ||
    !Number.isFinite(rate) ||
    rate <= 0 ||
    i.total <= 0 ||
    i.subtotal <= 0 ||
    i.subtotal_usd <= 0
  )
    return false
  const convertedBack = Math.round(i.subtotal_usd / rate)
  const catalogTolerance = Math.max(Math.ceil(expected.total * 0.02), Math.ceil(1 / rate) + 2)
  return (
    Number.isSafeInteger(convertedBack) &&
    Number.isSafeInteger(catalogTolerance) &&
    Math.abs(i.subtotal - convertedBack) <= 2 &&
    Math.abs(i.subtotal - expected.total) <= catalogTolerance
  )
}

/** Only the provider's initial cycle is derivable from the observed Test Mode objects. */
export function initialPeriod(
  subscription: SubscriptionResource,
  invoice: InvoiceResource | null,
  expectedTrial: boolean,
  expected: { currency: string; total: number },
): InitialPeriod | null {
  const s = subscription.attributes
  const start = Date.parse(s.created_at)
  if (!Number.isFinite(start)) throw new ReconciliationError('invalid_period_start')
  const initialCycleCancelled =
    s.status === 'cancelled' && s.cancelled && !!s.ends_at && s.ends_at === s.renews_at
  if (expectedTrial) {
    if (
      (s.status !== 'on_trial' && !initialCycleCancelled) ||
      !s.trial_ends_at ||
      s.renews_at !== s.trial_ends_at
    )
      return null
    const end = Date.parse(s.trial_ends_at)
    if (!Number.isFinite(end) || end <= start) throw new ReconciliationError('invalid_trial_period')
    return {
      origin: 'trial',
      startsAt: s.created_at,
      endsAt: s.trial_ends_at,
      subscriptionVersion: s.updated_at,
      invoiceId: null,
      invoiceVersion: null,
      originalDueAt: s.trial_ends_at,
    }
  }
  if ((s.status !== 'active' && !initialCycleCancelled) || !s.renews_at || !invoice) return null
  const i = invoice.attributes
  if (
    i.subscription_id !== subscription.id ||
    i.store_id !== s.store_id ||
    i.customer_id !== s.customer_id ||
    i.billing_reason !== 'initial' ||
    !['paid', 'partial_refund', 'refunded'].includes(i.status) ||
    i.total <= 0 ||
    !invoiceMatchesCatalogPrice(invoice, expected) ||
    Date.parse(i.created_at) < start
  )
    return null
  const end = Date.parse(s.renews_at)
  if (!Number.isFinite(end) || end <= start || Date.parse(i.created_at) >= end)
    throw new ReconciliationError('invalid_initial_period')
  return {
    origin: 'payment',
    startsAt: s.created_at,
    endsAt: s.renews_at,
    subscriptionVersion: s.updated_at,
    invoiceId: invoice.id,
    invoiceVersion: i.updated_at,
    originalDueAt: s.renews_at,
  }
}

/**
 * A subscription status or a moved `renews_at` is never renewal payment proof. The next period is
 * derived only from the matching provider invoice after it is paid at the expected price.
 */
export function renewalPeriod(
  subscription: SubscriptionResource,
  invoice: InvoiceResource,
  previousEndsAt: string,
  expected: { variantId: string; currency: string; total: number },
): RenewalPeriod | null {
  const s = subscription.attributes
  const i = invoice.attributes
  const starts = Date.parse(previousEndsAt)
  const ends = Date.parse(s.renews_at ?? '')
  const invoiceCreated = Date.parse(i.created_at)
  if (
    !Number.isFinite(starts) ||
    !Number.isFinite(ends) ||
    !Number.isFinite(invoiceCreated) ||
    !/^[A-Z]{3}$/.test(expected.currency) ||
    !Number.isSafeInteger(expected.total) ||
    expected.total <= 0
  ) {
    throw new ReconciliationError('invalid_renewal_period')
  }
  if (
    s.status !== 'active' ||
    s.cancelled ||
    s.variant_id !== expected.variantId ||
    !s.renews_at ||
    ends <= starts ||
    invoice.type !== 'subscription-invoices' ||
    i.subscription_id !== subscription.id ||
    i.store_id !== s.store_id ||
    i.customer_id !== s.customer_id ||
    i.billing_reason !== 'renewal' ||
    i.status !== 'paid' ||
    i.currency !== expected.currency ||
    !invoiceMatchesCatalogPrice(invoice, expected) ||
    invoiceCreated < starts ||
    invoiceCreated >= ends
  ) {
    return null
  }
  return {
    origin: 'renewal',
    startsAt: previousEndsAt,
    endsAt: s.renews_at,
    subscriptionVersion: s.updated_at,
    invoiceId: invoice.id,
    invoiceVersion: i.updated_at,
    originalDueAt: previousEndsAt,
  }
}
