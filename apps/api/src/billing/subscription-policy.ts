import type { BillingSelection } from './policy.js'

export type SubscriptionChange =
  | { kind: 'unchanged' }
  | { kind: 'unavailable'; reason: 'annual_to_monthly' }
  | { kind: 'at_period_end' }
  | { kind: 'immediate'; creditUnusedTime: true; restartPeriod: true }

/** Classifies a change to a paid subscription; does not authorize or dispatch a provider mutation. */
export function subscriptionChangePolicy(
  current: BillingSelection,
  requested: BillingSelection,
): SubscriptionChange {
  if (current.interval === 'year' && requested.interval === 'month') {
    return { kind: 'unavailable', reason: 'annual_to_monthly' }
  }
  if (current.tier === requested.tier && current.interval === requested.interval) {
    return { kind: 'unchanged' }
  }
  // A tier downgrade takes precedence even when the requested interval is longer.
  if (current.tier === 'advanced' && requested.tier === 'basic') {
    return { kind: 'at_period_end' }
  }
  return { kind: 'immediate', creditUnusedTime: true, restartPeriod: true }
}

type Money = { currency: string; amountMinor: number }
export class SubscriptionPolicyError extends Error {
  constructor(
    readonly code: 'invalid_period' | 'invalid_money' | 'currency_mismatch' | 'excess_credit',
  ) {
    super(code)
  }
}

/** Internal reference only: reconcile against a verified provider quote/invoice before charging. */
export function upgradeSettlementReference(input: {
  creditablePaid: Money
  newPeriodPrice: Money
  periodStartedAt: Date
  periodEndsAt: Date
  changeAt: Date
}) {
  const { creditablePaid, newPeriodPrice } = input
  for (const money of [creditablePaid, newPeriodPrice]) {
    if (
      !/^[A-Z]{3}$/.test(money.currency) ||
      !Number.isSafeInteger(money.amountMinor) ||
      money.amountMinor < 0
    ) {
      throw new SubscriptionPolicyError('invalid_money')
    }
  }
  if (creditablePaid.currency !== newPeriodPrice.currency) {
    throw new SubscriptionPolicyError('currency_mismatch')
  }
  const start = input.periodStartedAt.getTime()
  const end = input.periodEndsAt.getTime()
  const change = input.changeAt.getTime()
  if (
    ![start, end, change].every(Number.isSafeInteger) ||
    end <= start ||
    change < start ||
    change >= end
  ) {
    throw new SubscriptionPolicyError('invalid_period')
  }
  // BigInt avoids floating-point multiplication/rounding drift for currency and long periods.
  const duration = BigInt(end) - BigInt(start)
  const remaining = BigInt(end) - BigInt(change)
  const numerator = BigInt(creditablePaid.amountMinor) * remaining
  const creditMinor = Number((numerator * 2n + duration) / (duration * 2n))
  if (creditMinor > newPeriodPrice.amountMinor) {
    throw new SubscriptionPolicyError('excess_credit')
  }
  return {
    currency: newPeriodPrice.currency,
    newPeriodAmountMinor: newPeriodPrice.amountMinor,
    creditMinor,
    dueNowMinor: newPeriodPrice.amountMinor - creditMinor,
  }
}

export type FailedRenewalAccess =
  | { kind: 'grace'; until: string }
  | { kind: 'ended'; reason: 'provider_ended' | 'grace_elapsed' }
  | { kind: 'reconcile'; reason: 'invalid_renewal_time' }

/**
 * Only reconciled failed-renewal facts belong here. originalDueAt is the persisted invoice's due
 * time, never webhook receivedAt, subscription updatedAt or a retry's rescheduled renews_at.
 * This returns the paid source's result, not the account's final tier or a data-deletion command.
 */
export function failedRenewalAccess(input: {
  status: 'past_due' | 'unpaid' | 'expired'
  originalDueAt: Date | null
  now: Date
}): FailedRenewalAccess {
  if (input.status === 'unpaid' || input.status === 'expired') {
    return { kind: 'ended', reason: 'provider_ended' }
  }
  const due = input.originalDueAt?.getTime() ?? NaN
  const now = input.now.getTime()
  const until = new Date(due + 7 * 24 * 60 * 60 * 1000)
  if (![due, now, until.getTime()].every(Number.isSafeInteger) || due > now) {
    return { kind: 'reconcile', reason: 'invalid_renewal_time' }
  }
  return now < until.getTime()
    ? { kind: 'grace', until: until.toISOString() }
    : { kind: 'ended', reason: 'grace_elapsed' }
}
