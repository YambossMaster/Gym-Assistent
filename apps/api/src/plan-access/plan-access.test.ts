import { describe, expect, it } from 'vitest'
import { PlanAccessModule } from './plan-access.js'

const coach = { userId: '11111111-1111-4111-8111-111111111111' }
const endsAt = new Date('2026-12-02T02:00:00.000Z')

describe('plan access', () => {
  it.each([
    { students: 5, venues: 1, overCapacity: false },
    { students: 6, venues: 1, overCapacity: true },
    { students: 3, venues: 2, overCapacity: true },
  ])(
    'counts $students active Students and $venues active Venues',
    async ({ students, venues, overCapacity }) => {
      const policy = new PlanAccessModule({
        get: async () => ({ grant: null, activeStudents: students, activeVenues: venues }),
      })
      await expect(policy.get(coach)).resolves.toMatchObject({
        tier: 'free',
        studentLimit: 5,
        venueLimit: 1,
        overCapacity,
      })
    },
  )

  it('transitions at the exact offer expiry without losing existing counts', async () => {
    let now = new Date(endsAt.getTime() - 1)
    const policy = new PlanAccessModule(
      {
        get: async () => ({
          grant: { kind: 'promotional', endsAt },
          activeStudents: 12,
          activeVenues: 2,
        }),
      },
      () => now,
    )
    await expect(policy.get(coach)).resolves.toMatchObject({
      tier: 'advanced',
      source: 'promotional',
      overCapacity: false,
    })
    now = endsAt
    await expect(policy.get(coach)).resolves.toMatchObject({
      tier: 'free',
      activeStudents: 12,
      activeVenues: 2,
      overCapacity: true,
    })
  })

  it('keeps permanent Advanced access regardless of counts', async () => {
    const policy = new PlanAccessModule({
      get: async () => ({
        grant: { kind: 'permanent', endsAt: null },
        activeStudents: 50,
        activeVenues: 4,
      }),
    })
    await expect(policy.get(coach)).resolves.toMatchObject({
      tier: 'advanced',
      source: 'permanent',
      studentLimit: null,
      venueLimit: null,
      overCapacity: false,
    })
  })
})
