import { describe, expect, it } from 'vitest'
import type { BillingSelection } from './policy.js'
import {
  failedRenewalAccess,
  subscriptionChangePolicy,
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
    ['primeMonth', 'proMonth', 'at_period_end'],
    ['primeMonth', 'proYear', 'at_period_end'],
    ['primeMonth', 'primeMonth', 'unchanged'],
    ['primeMonth', 'primeYear', 'immediate'],
    ['primeYear', 'proMonth', 'unavailable'],
    ['primeYear', 'proYear', 'at_period_end'],
    ['primeYear', 'primeMonth', 'unavailable'],
    ['primeYear', 'primeYear', 'unchanged'],
  ])('%s → %s is %s', (from, to, kind) => {
    const result = subscriptionChangePolicy(selections[from]!, selections[to]!)
    expect(result.kind).toBe(kind)
    if (kind === 'immediate') {
      expect(result).toEqual({ kind, creditUnusedTime: true, restartPeriod: true })
    }
    if (kind === 'unavailable') expect(result).toEqual({ kind, reason: 'annual_to_monthly' })
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

const due = new Date('2026-10-14T04:00:00Z')
const deadline = new Date('2026-10-21T04:00:00Z')
describe('failed-renewal access source', () => {
  it('uses one fixed deadline through retries and delayed processing', () => {
    for (const daysAfterDue of [0, 1, 3, 6]) {
      expect(
        failedRenewalAccess({
          status: 'past_due',
          originalDueAt: due,
          now: new Date(due.getTime() + daysAfterDue * 86400000),
        }),
      ).toEqual({ kind: 'grace', until: deadline.toISOString() })
    }
  })
  it('ends exactly at seven days, even if no later webhook arrives', () => {
    expect(
      failedRenewalAccess({
        status: 'past_due',
        originalDueAt: due,
        now: new Date(deadline.getTime() - 1),
      }).kind,
    ).toBe('grace')
    for (const now of [deadline, new Date('2026-11-01')]) {
      expect(failedRenewalAccess({ status: 'past_due', originalDueAt: due, now })).toEqual({
        kind: 'ended',
        reason: 'grace_elapsed',
      })
    }
  })
  it.each(['unpaid', 'expired'] as const)(
    'ends immediately on verified %s without needing a due date',
    (status) => {
      expect(failedRenewalAccess({ status, originalDueAt: null, now: due })).toEqual({
        kind: 'ended',
        reason: 'provider_ended',
      })
    },
  )
  it('cannot extend access using missing, invalid or future invoice timestamps', () => {
    for (const originalDueAt of [null, new Date('invalid'), new Date(due.getTime() + 1)]) {
      expect(failedRenewalAccess({ status: 'past_due', originalDueAt, now: due }).kind).toBe(
        'reconcile',
      )
    }
    expect(
      failedRenewalAccess({ status: 'past_due', originalDueAt: due, now: new Date('invalid') })
        .kind,
    ).toBe('reconcile')
    expect(
      failedRenewalAccess({
        status: 'past_due',
        originalDueAt: new Date(8640000000000000),
        now: new Date(8640000000000000),
      }).kind,
    ).toBe('reconcile')
  })
})
