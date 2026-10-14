import { expect, it, vi } from 'vitest'
import { billingAccessSource, type BillingAccessFacts } from './access-source.js'
import { PlanAccessModule } from '../plan-access/plan-access.js'

const start = new Date('2026-10-01T00:00:00Z')
const end = new Date('2026-11-01T00:00:00Z')
const during = new Date('2026-10-14T00:00:00Z')
const facts = (): BillingAccessFacts => ({
  status: 'active',
  period: { tier: 'basic', origin: 'payment', startsAt: start, endsAt: end },
  cancellationEndsAt: null,
  failedRenewalDueAt: null,
  accessRevoked: false,
})
it('requires period evidence and never extrapolates a paid renewal from active status', () => {
  expect(billingAccessSource({ ...facts(), period: null }, during)).toBeNull()
  expect(billingAccessSource(facts(), during)).toEqual({ tier: 'basic', endsAt: end })
  expect(billingAccessSource(facts(), end)).toBeNull()
  expect(billingAccessSource(facts(), new Date('invalid'))).toBeNull()
  expect(billingAccessSource(facts(), new Date('2026-09-30'))).toBeNull()
})
it('limits cancellation to the earlier of the paid/trial boundary and confirmed end date', () => {
  const cancelled = {
    ...facts(),
    status: 'cancelled' as const,
    cancellationEndsAt: new Date('2027-01-01'),
  }
  expect(billingAccessSource(cancelled, during)?.endsAt).toEqual(end)
  cancelled.cancellationEndsAt = during
  expect(billingAccessSource(cancelled, during)).toBeNull()
})
it('permits only a paid renewal to use the fixed seven-day grace', () => {
  const failed = { ...facts(), status: 'past_due' as const, failedRenewalDueAt: end }
  const deadline = new Date('2026-11-08T00:00:00Z')
  expect(billingAccessSource(failed, end)?.endsAt).toEqual(deadline)
  expect(billingAccessSource(failed, deadline)).toBeNull()
  expect(
    billingAccessSource({ ...failed, period: { ...failed.period!, origin: 'trial' } }, end),
  ).toBeNull()
  expect(
    billingAccessSource(
      { ...failed, failedRenewalDueAt: new Date(+end + 86400000) },
      new Date(+end + 86400000),
    ),
  ).toBeNull()
})
it.each(['unpaid', 'expired'] as const)(
  'ends a source on %s even before its cached paid-through date',
  (status) => {
    expect(billingAccessSource({ ...facts(), status }, during)).toBeNull()
  },
)
it('honors an audited internal access revocation without deriving it from any refund amount', () => {
  expect(billingAccessSource({ ...facts(), accessRevoked: true }, during)).toBeNull()
})
it('combines a verified source with existing limits and re-evaluates expiry without deleting counts', async () => {
  let now = during
  const billing = { get: vi.fn(async () => billingAccessSource(facts(), now)) }
  const module = new PlanAccessModule(
    { get: async () => ({ grant: null, activeStudents: 12, activeVenues: 3 }) },
    () => now,
    billing,
  )
  await expect(module.get({ userId: 'coach' })).resolves.toMatchObject({
    tier: 'basic',
    source: 'subscription',
    studentLimit: 15,
    venueLimit: null,
    overCapacity: false,
  })
  now = end
  await expect(module.get({ userId: 'coach' })).resolves.toMatchObject({
    tier: 'free',
    activeStudents: 12,
    activeVenues: 3,
    overCapacity: true,
  })
})
it.each(['permanent', 'promotional'] as const)(
  'preserves an independent %s grant even if billing is unavailable',
  async (kind) => {
    const billing = {
      get: vi.fn(async () => {
        throw new Error('billing unavailable')
      }),
    }
    const module = new PlanAccessModule(
      {
        get: async () => ({
          grant: { kind, endsAt: kind === 'permanent' ? null : end },
          activeStudents: 30,
          activeVenues: 3,
        }),
      },
      () => during,
      billing,
    )
    await expect(module.get({ userId: 'coach' })).resolves.toMatchObject({
      tier: 'advanced',
      source: kind,
      overCapacity: false,
    })
    expect(billing.get).not.toHaveBeenCalled()
  },
)
