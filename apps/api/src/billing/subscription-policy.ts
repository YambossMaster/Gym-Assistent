import type { BillingSelection } from './policy.js'

export type SubscriptionChange =
  | { kind: 'unchanged' }
  | { kind: 'unavailable'; reason: 'downgrade_unavailable' }
  | { kind: 'immediate' }

/** Classifies a change to a paid subscription; does not authorize or dispatch a provider mutation. */
export function subscriptionChangePolicy(
  current: BillingSelection,
  requested: BillingSelection,
): SubscriptionChange {
  if (current.tier === requested.tier && current.interval === requested.interval) {
    return { kind: 'unchanged' }
  }
  // Lemon applies variant changes immediately; deferred paid downgrades are not offered.
  if (
    (current.interval === 'year' && requested.interval === 'month') ||
    (current.tier === 'advanced' && requested.tier === 'basic')
  ) {
    return { kind: 'unavailable', reason: 'downgrade_unavailable' }
  }
  // This classifies the requested timing only. Lemon determines the actual
  // invoice, credit and renewal anchor; none is guaranteed by this policy.
  return { kind: 'immediate' }
}

export type TrialSubscriptionChange =
  | { kind: 'unchanged' }
  | {
      kind: 'unavailable'
      reason: 'invalid_trial_boundary' | 'trial_ended' | 'downgrade_unavailable'
    }
  | { kind: 'same_subscription'; trialEndsAt: string; chargeNowMinor: 0 }

/** A trial switch changes one existing subscription, keeping its original first-charge date. */
export function trialSubscriptionChangePolicy(
  current: BillingSelection,
  requested: BillingSelection,
  originalTrialEndsAt: string,
  now: Date,
): TrialSubscriptionChange {
  const end = Date.parse(originalTrialEndsAt)
  if (!Number.isFinite(end) || !Number.isFinite(+now))
    return { kind: 'unavailable', reason: 'invalid_trial_boundary' }
  if (+now >= end) return { kind: 'unavailable', reason: 'trial_ended' }
  if (current.tier === requested.tier && current.interval === requested.interval)
    return { kind: 'unchanged' }
  // Do not dispatch an immediate Lemon variant change for a lower tier or shorter cadence.
  if (
    (current.tier === 'advanced' && requested.tier === 'basic') ||
    (current.interval === 'year' && requested.interval === 'month')
  )
    return { kind: 'unavailable', reason: 'downgrade_unavailable' }
  return { kind: 'same_subscription', trialEndsAt: originalTrialEndsAt, chargeNowMinor: 0 }
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

/** A recovered renewal pays the original invoice period; payment time cannot reset its anchor. */
export function recoveredRenewalPeriod(input: {
  originalDueAt: Date
  scheduledEndsAt: Date
  paidAt: Date
  verifiedStartsAt: Date
  verifiedEndsAt: Date
}): { startsAt: Date; endsAt: Date } | null {
  const { originalDueAt, scheduledEndsAt, paidAt, verifiedStartsAt, verifiedEndsAt } = input
  if (
    ![originalDueAt, scheduledEndsAt, paidAt, verifiedStartsAt, verifiedEndsAt].every((d) =>
      Number.isSafeInteger(+d),
    ) ||
    +scheduledEndsAt <= +originalDueAt ||
    +paidAt < +originalDueAt ||
    +paidAt >= +scheduledEndsAt ||
    +verifiedStartsAt !== +originalDueAt ||
    +verifiedEndsAt !== +scheduledEndsAt
  )
    return null
  return { startsAt: new Date(originalDueAt), endsAt: new Date(scheduledEndsAt) }
}
