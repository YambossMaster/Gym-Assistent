export type BillingSelection = { tier: 'basic' | 'advanced'; interval: 'month' | 'year' }
export type BillingFacts = {
  hasEverSubscribed: boolean
  hasCurrentSubscription: boolean
  hasUnresolvedCheckout: boolean
  hasPermanentAccess: boolean
}
export class BillingPolicyError extends Error {
  constructor(readonly code: 'already_subscribed' | 'checkout_pending' | 'permanent_access') {
    super(code)
  }
}
/** Account eligibility is local; trial timing and collection belong to Lemon. */
export function checkoutPolicy(selection: BillingSelection, facts: BillingFacts) {
  if (facts.hasPermanentAccess) throw new BillingPolicyError('permanent_access')
  if (facts.hasCurrentSubscription) throw new BillingPolicyError('already_subscribed')
  if (facts.hasUnresolvedCheckout) throw new BillingPolicyError('checkout_pending')
  const tier = selection.tier
  const monthly = tier === 'basic' ? 11500 : 14500
  const recurringMinor = monthly * (selection.interval === 'year' ? 10 : 1)
  const trial = facts.hasEverSubscribed ? null : ('one_month' as const)
  return {
    tier,
    interval: selection.interval,
    currency: 'TWD' as const,
    recurringMinor,
    dueNowMinor: trial ? 0 : recurringMinor,
    trial,
  }
}
/** A timely application remains timely even if review occurs later. Not a refund guarantee. */
export function withinRefundRequestWindow(paidAt: Date, receivedAt: Date): boolean {
  const elapsed = receivedAt.getTime() - paidAt.getTime()
  return Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= 45 * 24 * 60 * 60 * 1000
}
