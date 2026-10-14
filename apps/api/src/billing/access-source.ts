import { failedRenewalAccess } from './subscription-policy.js'
import type { BillingSelection } from './policy.js'

/** Server reconciliation evidence, never a provider status alone or a browser request DTO. */
export type VerifiedBillingPeriod = {
  tier: BillingSelection['tier']
  origin: 'trial' | 'payment'
  startsAt: Date
  endsAt: Date
}
export type BillingAccessFacts = {
  status: 'on_trial' | 'active' | 'cancelled' | 'past_due' | 'unpaid' | 'expired' | 'paused'
  period: VerifiedBillingPeriod | null
  cancellationEndsAt: Date | null
  failedRenewalDueAt: Date | null
  accessRevoked: boolean
}

/** Resolves only this subscription's source. PlanAccess combines it with independent grants. */
export function billingAccessSource(
  facts: BillingAccessFacts,
  now: Date,
): { tier: 'basic' | 'advanced'; endsAt: Date } | null {
  const period = facts.period
  if (
    !Number.isFinite(+now) ||
    facts.accessRevoked ||
    !period ||
    !Number.isFinite(+period.startsAt) ||
    !Number.isFinite(+period.endsAt) ||
    period.startsAt > now ||
    period.endsAt <= period.startsAt ||
    facts.status === 'unpaid' ||
    facts.status === 'expired'
  )
    return null
  let endsAt = period.endsAt
  if (facts.status === 'past_due') {
    // Only a renewal of a previously paid period has this grace, not an unpaid first purchase.
    if (
      period.origin !== 'payment' ||
      !facts.failedRenewalDueAt ||
      +facts.failedRenewalDueAt !== +period.endsAt
    )
      return null
    const grace = failedRenewalAccess({
      status: 'past_due',
      originalDueAt: facts.failedRenewalDueAt,
      now,
    })
    if (grace.kind !== 'grace') return null
    endsAt = new Date(grace.until)
  } else if (facts.status === 'cancelled') {
    if (!facts.cancellationEndsAt || !Number.isFinite(+facts.cancellationEndsAt)) return null
    endsAt = new Date(Math.min(+period.endsAt, +facts.cancellationEndsAt))
  }
  return endsAt > now ? { tier: period.tier, endsAt } : null
}
