import { describe, expect, it } from 'vitest'
import { activeSubscription, nextSubscription, PlanSelectionError } from './plan-subscription.js'

const now = new Date('2026-10-05T10:00:00Z')

describe('zero-price subscription lifecycle', () => {
  it('activates Pro immediately and upgrades to Prime without resetting the monthly end', () => {
    const pro = nextSubscription(
      null,
      { kind: 'select', tier: 'basic', interval: 'month', version: 0 },
      now,
    )
    expect(pro).toMatchObject({
      tier: 'basic',
      interval: 'month',
      version: 1,
      pendingTier: null,
    })
    expect(pro.periodEnd.toISOString()).toBe('2026-11-05T10:00:00.000Z')
    const prime = nextSubscription(
      pro,
      { kind: 'select', tier: 'advanced', interval: 'month', version: 1 },
      new Date('2026-10-15T10:00:00Z'),
    )
    expect(prime.tier).toBe('advanced')
    expect(prime.periodEnd).toEqual(pro.periodEnd)
  })

  it('schedules downgrade and cancellation at the period boundary', () => {
    const prime = nextSubscription(
      null,
      { kind: 'select', tier: 'advanced', interval: 'year', version: 0 },
      now,
    )
    const downgrade = nextSubscription(
      prime,
      { kind: 'select', tier: 'basic', interval: 'month', version: 1 },
      new Date('2026-11-01T10:00:00Z'),
    )
    expect(activeSubscription(downgrade, new Date(prime.periodEnd.getTime() - 1))?.tier).toBe(
      'advanced',
    )
    expect(activeSubscription(downgrade, prime.periodEnd)).toMatchObject({
      tier: 'basic',
      interval: 'month',
      pendingTier: null,
    })
    const cancelled = nextSubscription(
      prime,
      { kind: 'cancel', version: 1 },
      new Date('2026-11-01T10:00:00Z'),
    )
    expect(activeSubscription(cancelled, new Date(prime.periodEnd.getTime() - 1))?.tier).toBe(
      'advanced',
    )
    expect(activeSubscription(cancelled, prime.periodEnd)).toBeNull()
  })

  it('lets a Coach withdraw a pending change and rejects a stale version', () => {
    const prime = nextSubscription(
      null,
      { kind: 'select', tier: 'advanced', interval: 'month', version: 0 },
      now,
    )
    const cancelled = nextSubscription(prime, { kind: 'cancel', version: 1 }, now)
    const resumed = nextSubscription(
      cancelled,
      { kind: 'select', tier: 'advanced', interval: 'month', version: 2 },
      now,
    )
    expect(resumed.pendingTier).toBeNull()
    expect(() => nextSubscription(resumed, { kind: 'cancel', version: 2 }, now)).toThrow(
      PlanSelectionError,
    )
  })

  it('rolls a zero-price monthly plan forward and keeps the original month-end day', () => {
    const start = new Date('2026-01-31T10:00:00Z')
    const choice = nextSubscription(
      null,
      { kind: 'select', tier: 'basic', interval: 'month', version: 0 },
      start,
    )
    expect(choice.periodEnd.toISOString()).toBe('2026-02-28T10:00:00.000Z')
    expect(
      activeSubscription(choice, new Date('2026-03-01T10:00:00Z'))?.periodEnd.toISOString(),
    ).toBe('2026-03-31T10:00:00.000Z')
  })
})
