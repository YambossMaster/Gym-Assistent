import { describe, expect, it } from 'vitest'
import { checkoutPolicy, withinRefundRequestWindow } from './policy.js'

const first = {
  hasEverSubscribed: false,
  hasCurrentSubscription: false,
  hasUnresolvedCheckout: false,
  hasPermanentAccess: false,
}
describe('paid checkout policy', () => {
  it('gives the provider trial only to the first subscription across tiers and intervals', () => {
    for (const tier of ['basic', 'advanced'] as const)
      for (const interval of ['month', 'year'] as const) {
        const initial = checkoutPolicy({ tier, interval }, first)
        const returning = checkoutPolicy({ tier, interval }, { ...first, hasEverSubscribed: true })
        expect(initial.trial).toBe('one_month')
        expect(initial.dueNowMinor).toBe(0)
        expect(returning.trial).toBeNull()
        expect(returning.dueNowMinor).toBe(returning.recurringMinor)
      }
  })
  it('blocks duplicate, unresolved and permanent-access purchases', () => {
    expect(() =>
      checkoutPolicy(
        { tier: 'basic', interval: 'month' },
        { ...first, hasCurrentSubscription: true },
      ),
    ).toThrow('already_subscribed')
    expect(() =>
      checkoutPolicy(
        { tier: 'basic', interval: 'month' },
        { ...first, hasUnresolvedCheckout: true },
      ),
    ).toThrow('checkout_pending')
    expect(() =>
      checkoutPolicy({ tier: 'basic', interval: 'month' }, { ...first, hasPermanentAccess: true }),
    ).toThrow('permanent_access')
  })
  it('counts 45 days from each completed payment to the receipt of the request', () => {
    const paid = new Date('2026-10-14T04:00:00Z')
    const deadline = paid.getTime() + 45 * 86400000
    expect(withinRefundRequestWindow(paid, new Date(deadline))).toBe(true)
    expect(withinRefundRequestWindow(paid, new Date(deadline + 1))).toBe(false)
    expect(withinRefundRequestWindow(paid, new Date(paid.getTime() - 1))).toBe(false)
    expect(withinRefundRequestWindow(new Date('invalid'), new Date())).toBe(false)
  })
})
