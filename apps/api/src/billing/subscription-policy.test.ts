import { describe, expect, it } from 'vitest'
import type { BillingSelection } from './policy.js'
import {
  recoveredRenewalPeriod,
  subscriptionChangePolicy,
  trialSubscriptionChangePolicy,
  upgradeSettlementReference,
} from './subscription-policy.js'

const selections: Record<string, BillingSelection> = {
  proMonth: { tier: 'basic', interval: 'month' },
  proYear: { tier: 'basic', interval: 'year' },
  primeMonth: { tier: 'advanced', interval: 'month' },
  primeYear: { tier: 'advanced', interval: 'year' },
}

describe('subscription changes', () => {
  it.each([
    ['proMonth', 'proMonth', 'unchanged'],
    ['proMonth', 'proYear', 'immediate'],
    ['proMonth', 'primeMonth', 'immediate'],
    ['proMonth', 'primeYear', 'immediate'],
    ['proYear', 'proMonth', 'unavailable'],
    ['proYear', 'proYear', 'unchanged'],
    ['proYear', 'primeMonth', 'unavailable'],
    ['proYear', 'primeYear', 'immediate'],
    ['primeMonth', 'proMonth', 'unavailable'],
    ['primeMonth', 'proYear', 'unavailable'],
    ['primeMonth', 'primeMonth', 'unchanged'],
    ['primeMonth', 'primeYear', 'immediate'],
    ['primeYear', 'proMonth', 'unavailable'],
    ['primeYear', 'proYear', 'unavailable'],
    ['primeYear', 'primeMonth', 'unavailable'],
    ['primeYear', 'primeYear', 'unchanged'],
  ])('%s → %s is %s', (from, to, kind) => {
    const result = subscriptionChangePolicy(selections[from]!, selections[to]!)
    expect(result.kind).toBe(kind)
    if (kind === 'immediate') {
      expect(result).toEqual({ kind })
    }
    if (kind === 'unavailable') expect(result).toEqual({ kind, reason: 'downgrade_unavailable' })
  })
})

describe('trial subscription changes', () => {
  const end = '2026-11-15T09:09:08.000Z'
  const now = new Date('2026-10-15T09:09:08.000Z')
  it.each([
    ['proMonth', 'proMonth', 'unchanged'],
    ['proMonth', 'proYear', 'same_subscription'],
    ['proMonth', 'primeMonth', 'same_subscription'],
    ['proMonth', 'primeYear', 'same_subscription'],
    ['proYear', 'proMonth', 'unavailable'],
    ['proYear', 'proYear', 'unchanged'],
    ['proYear', 'primeMonth', 'unavailable'],
    ['proYear', 'primeYear', 'same_subscription'],
    ['primeMonth', 'proMonth', 'unavailable'],
    ['primeMonth', 'proYear', 'unavailable'],
    ['primeMonth', 'primeMonth', 'unchanged'],
    ['primeMonth', 'primeYear', 'same_subscription'],
    ['primeYear', 'proMonth', 'unavailable'],
    ['primeYear', 'proYear', 'unavailable'],
    ['primeYear', 'primeMonth', 'unavailable'],
    ['primeYear', 'primeYear', 'unchanged'],
  ])('%s → %s stays on the first trial: %s', (from, to, kind) => {
    const result = trialSubscriptionChangePolicy(selections[from]!, selections[to]!, end, now)
    expect(result.kind).toBe(kind)
    if (kind === 'same_subscription')
      expect(result).toEqual({ kind, trialEndsAt: end, chargeNowMinor: 0 })
    if (kind === 'unavailable') expect(result).toEqual({ kind, reason: 'downgrade_unavailable' })
  })
  it('fails closed at and after the original deadline or without a valid deadline', () => {
    expect(
      trialSubscriptionChangePolicy(
        selections.proMonth!,
        selections.primeYear!,
        end,
        new Date(end),
      ),
    ).toEqual({ kind: 'unavailable', reason: 'trial_ended' })
    expect(
      trialSubscriptionChangePolicy(selections.proMonth!, selections.primeYear!, 'invalid', now),
    ).toEqual({ kind: 'unavailable', reason: 'invalid_trial_boundary' })
  })
})

const settlement = {
  creditablePaid: { currency: 'TWD', amountMinor: 11500 },
  newPeriodPrice: { currency: 'TWD', amountMinor: 14500 },
  periodStartedAt: new Date('2026-04-01T00:00:00Z'),
  periodEndsAt: new Date('2026-05-01T00:00:00Z'),
  changeAt: new Date('2026-04-16T00:00:00Z'),
}
describe('upgrade settlement reference (not a provider charge)', () => {
  it('tracks the observed Prime monthly-to-annual charge while remaining only an estimate', () => {
    const estimate = upgradeSettlementReference({
      creditablePaid: { currency: 'TWD', amountMinor: 11489 + 3018 },
      newPeriodPrice: { currency: 'TWD', amountMinor: 145000 },
      periodStartedAt: new Date('2026-10-17T07:06:27Z'),
      periodEndsAt: new Date('2026-11-17T07:06:26Z'),
      changeAt: new Date('2026-10-17T08:21:42Z'),
    })
    expect(estimate.dueNowMinor).toBe(130517)
    expect(130528 - estimate.dueNowMinor).toBe(11)
  })
  it('credits half the paid month against a full new period, not just the remaining-price difference', () => {
    expect(upgradeSettlementReference(settlement)).toEqual({
      currency: 'TWD',
      newPeriodAmountMinor: 14500,
      creditMinor: 5750,
      dueNowMinor: 8750,
    })
  })
  it('uses actual paid annual value and a leap-year duration', () => {
    expect(
      upgradeSettlementReference({
        ...settlement,
        creditablePaid: { currency: 'TWD', amountMinor: 115000 },
        newPeriodPrice: { currency: 'TWD', amountMinor: 145000 },
        periodStartedAt: new Date('2028-01-01T00:00:00Z'),
        periodEndsAt: new Date('2029-01-01T00:00:00Z'),
        changeAt: new Date('2028-07-02T00:00:00Z'),
      }),
    ).toMatchObject({ creditMinor: 57500, dueNowMinor: 87500 })
  })
  it('never recreates credit from the catalog when paid value is discounted or zero', () => {
    expect(
      upgradeSettlementReference({
        ...settlement,
        creditablePaid: { currency: 'TWD', amountMinor: 9000 },
      }).creditMinor,
    ).toBe(4500)
    expect(
      upgradeSettlementReference({
        ...settlement,
        creditablePaid: { currency: 'TWD', amountMinor: 0 },
      }).dueNowMinor,
    ).toBe(14500)
  })
  it('rounds once at half a minor unit and preserves charge plus credit', () => {
    const result = upgradeSettlementReference({
      ...settlement,
      creditablePaid: { currency: 'TWD', amountMinor: 11501 },
    })
    expect(result.creditMinor).toBe(5751)
    expect(result.creditMinor + result.dueNowMinor).toBe(result.newPeriodAmountMinor)
    expect(
      upgradeSettlementReference({
        ...settlement,
        changeAt: settlement.periodStartedAt,
      }).creditMinor,
    ).toBe(11500)
    expect(
      upgradeSettlementReference({
        ...settlement,
        changeAt: new Date(settlement.periodEndsAt.getTime() - 1),
      }).creditMinor,
    ).toBe(0)
  })
  it('rejects invalid periods instead of manufacturing a refund or renewal credit', () => {
    for (const changeAt of [new Date('invalid'), new Date('2026-03-31'), settlement.periodEndsAt]) {
      expect(() => upgradeSettlementReference({ ...settlement, changeAt })).toThrow(
        'invalid_period',
      )
    }
    expect(() =>
      upgradeSettlementReference({
        ...settlement,
        periodEndsAt: settlement.periodStartedAt,
      }),
    ).toThrow('invalid_period')
  })
  it('requires one currency and valid integer amounts; excess credit requires reconciliation', () => {
    expect(() =>
      upgradeSettlementReference({
        ...settlement,
        newPeriodPrice: { currency: 'USD', amountMinor: 500 },
      }),
    ).toThrow('currency_mismatch')
    for (const amountMinor of [-1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() =>
        upgradeSettlementReference({
          ...settlement,
          creditablePaid: { currency: 'TWD', amountMinor },
        }),
      ).toThrow('invalid_money')
    }
    expect(() =>
      upgradeSettlementReference({
        ...settlement,
        newPeriodPrice: { currency: 'TWD', amountMinor: 100 },
      }),
    ).toThrow('excess_credit')
  })
})

it('keeps the original renewal anchor after a late payment and rejects a restarted period', () => {
  const originalDueAt = new Date('2026-10-15T00:00:00Z')
  const scheduledEndsAt = new Date('2026-11-15T00:00:00Z')
  for (const day of [15, 16, 20, 21]) {
    const paidAt = new Date(`2026-10-${day}T00:00:00Z`)
    expect(
      recoveredRenewalPeriod({
        originalDueAt,
        scheduledEndsAt,
        paidAt,
        verifiedStartsAt: originalDueAt,
        verifiedEndsAt: scheduledEndsAt,
      }),
    ).toEqual({ startsAt: originalDueAt, endsAt: scheduledEndsAt })
  }
  expect(
    recoveredRenewalPeriod({
      originalDueAt,
      scheduledEndsAt,
      paidAt: new Date('2026-10-20'),
      verifiedStartsAt: new Date('2026-10-20'),
      verifiedEndsAt: new Date('2026-11-20'),
    }),
  ).toBeNull()
  expect(
    recoveredRenewalPeriod({
      originalDueAt,
      scheduledEndsAt,
      paidAt: new Date('invalid'),
      verifiedStartsAt: originalDueAt,
      verifiedEndsAt: scheduledEndsAt,
    }),
  ).toBeNull()
})
