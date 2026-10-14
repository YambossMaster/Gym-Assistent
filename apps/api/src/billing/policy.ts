export type BillingSelection = { tier: 'basic' | 'advanced'; interval: 'month' | 'year' }
export type BillingFacts = {
  hasEverSubscribed: boolean
  hasCurrentSubscription: boolean
  hasUnresolvedCheckout: boolean
  hasPermanentAccess: boolean
}
export class BillingPolicyError extends Error {
  constructor(
    readonly code:
      | 'already_subscribed'
      | 'checkout_pending'
      | 'permanent_access'
      | 'promotion_ineligible',
  ) {
    super(code)
  }
}
/** Facts and validated promotion must come from the verified account's server repository. */
export function checkoutPolicy(
  selection: BillingSelection,
  facts: BillingFacts,
  primeTrial60 = false,
) {
  if (facts.hasPermanentAccess) throw new BillingPolicyError('permanent_access')
  if (facts.hasCurrentSubscription) throw new BillingPolicyError('already_subscribed')
  if (facts.hasUnresolvedCheckout) throw new BillingPolicyError('checkout_pending')
  // PO decision: general and 60-day trials share the account's first-subscription eligibility.
  if (primeTrial60 && facts.hasEverSubscribed) throw new BillingPolicyError('promotion_ineligible')
  const tier = primeTrial60 ? 'advanced' : selection.tier
  const monthly = tier === 'basic' ? 11500 : 14500
  const recurringMinor = monthly * (selection.interval === 'year' ? 10 : 1)
  const trial = facts.hasEverSubscribed
    ? null
    : primeTrial60
      ? { unit: 'day' as const, quantity: 60 }
      : { unit: 'month' as const, quantity: 1 }
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
