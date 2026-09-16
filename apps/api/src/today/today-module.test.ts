import { describe, expect, it } from 'vitest'
import { MemoryStudentRepository } from '../adapters/memory-student-repository.js'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import { StudentModule } from '../students/student-module.js'
import { TodayModule } from './today-module.js'
import { localMonthPeriod } from './today.js'

const coach: AuthenticatedIdentity = { userId: 'coach-a' }

describe('TodayModule', () => {
  it('turns local month boundaries into UTC instants across DST and UTC date edges', () => {
    expect(
      localMonthPeriod(new Date('2026-03-15T12:00:00.000Z'), 'America/New_York'),
    ).toMatchObject({
      date: '2026-03-15',
      startsOn: '2026-03-01',
      endsOn: '2026-04-01',
      startsAt: new Date('2026-03-01T05:00:00.000Z'),
      endsAt: new Date('2026-04-01T04:00:00.000Z'),
    })
    expect(localMonthPeriod(new Date('2026-08-31T16:30:00.000Z'), 'Asia/Taipei')).toMatchObject({
      date: '2026-09-01',
      startsAt: new Date('2026-08-31T16:00:00.000Z'),
      endsAt: new Date('2026-09-30T16:00:00.000Z'),
    })
  })

  it('derives month-scoped, allowlisted signals and excludes inactive Students', async () => {
    const repository = new MemoryStudentRepository()
    const students = new StudentModule({
      repository,
      createId: (() => {
        let id = 0
        return () => `student-${++id}`
      })(),
    })
    const alice = await students.create(coach, { name: 'Alice' })
    const twoLessons = await students.create(coach, { name: 'Two lessons' })
    const archived = await students.create(coach, { name: 'Archived' })
    await students.update(coach, archived.id, {
      name: 'Archived',
      active: false,
      version: archived.version,
    })
    await students.createLessonPurchase(coach, alice.id, {
      purchasedAt: '2026-08-31T16:30:00.000Z',
      lessonCount: 1,
      amountMinor: 4000,
      currency: 'TWD',
    })
    await students.createLessonPurchase(coach, archived.id, {
      purchasedAt: '2026-09-10T00:00:00.000Z',
      lessonCount: 1,
      amountMinor: 3000,
      currency: 'USD',
    })
    await students.createLessonPurchase(coach, twoLessons.id, {
      purchasedAt: '2026-09-10T00:00:00.000Z',
      lessonCount: 2,
      amountMinor: 0,
      currency: 'TWD',
    })

    const today = await new TodayModule(repository, () => new Date('2026-09-10T00:00:00.000Z')).get(
      coach,
    )

    expect(today).toEqual({
      date: '2026-09-10',
      timeZone: 'Asia/Taipei',
      summary: {
        activeStudents: 2,
        incomePeriod: { startsOn: '2026-09-01', endsOn: '2026-10-01' },
        incomeByCurrency: [
          { currency: 'TWD', amountMinor: 4000 },
          { currency: 'USD', amountMinor: 3000 },
        ],
        attentionCount: 1,
      },
      attention: [
        {
          kind: 'low_lesson_balance',
          student: { id: alice.id, name: 'Alice' },
          lessonSummary: { purchased: 1, completed: 0, remaining: 1 },
          targetRoute: `/students/${alice.id}`,
        },
      ],
    })
  })
})
