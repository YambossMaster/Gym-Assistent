import { describe, expect, it } from 'vitest'
import { MemoryStudentRepository } from '../adapters/memory-student-repository.js'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import { StudentModule } from './student-module.js'

const coachA: AuthenticatedIdentity = { userId: '00000000-0000-4000-8000-000000000001' }
const coachB: AuthenticatedIdentity = { userId: '00000000-0000-4000-8000-000000000002' }

describe('StudentModule', () => {
  it('keeps students isolated by the workspace derived from identity', async () => {
    const repository = new MemoryStudentRepository()
    const students = new StudentModule({
      repository,
      createId: () => 'student-a',
      now: () => new Date('2026-09-07T10:00:00.000Z'),
    })

    await students.create(coachA, { name: 'Alice' })

    await expect(students.list(coachA)).resolves.toMatchObject([
      { id: 'student-a', name: 'Alice', version: 1 },
    ])
    await expect(students.list(coachB)).resolves.toEqual([])
  })

  it('normalizes input and preserves the demo student defaults', async () => {
    const students = new StudentModule({
      repository: new MemoryStudentRepository(),
      createId: () => 'student-a',
      now: () => new Date('2026-09-07T10:00:00.000Z'),
    })

    const student = await students.create(coachA, { name: '  Alice  ' })

    expect(student).toEqual({
      id: 'student-a',
      name: 'Alice',
      phone: '',
      goal: '',
      privateNote: '',
      active: true,
      lineLinked: false,
      version: 1,
      createdAt: '2026-09-07T10:00:00.000Z',
      updatedAt: '2026-09-07T10:00:00.000Z',
    })
  })

  it('derives remaining lessons from purchases and completed sessions without repairing a negative balance', async () => {
    const repository = new MemoryStudentRepository()
    const students = new StudentModule({
      repository,
      createId: (() => {
        let next = 0
        return () => `id-${++next}`
      })(),
      now: () => new Date('2026-09-10T10:00:00.000Z'),
    })
    const student = await students.create(coachA, { name: 'Alice' })
    await students.createLessonPurchase(coachA, student.id, {
      purchasedAt: '2026-09-01T00:00:00.000Z',
      lessonCount: 2,
      amountMinor: 4000,
      currency: 'TWD',
      privateNote: 'Coach only',
    })
    const workspaceId = await repository.resolveWorkspace(coachA)
    repository.recordCompletedSessionForTest(workspaceId, student.id)
    repository.recordCompletedSessionForTest(workspaceId, student.id)
    repository.recordCompletedSessionForTest(workspaceId, student.id)

    await expect(students.detail(coachA, student.id)).resolves.toMatchObject({
      student: { id: student.id },
      purchases: [
        { lessonCount: 2, amountMinor: 4000, currency: 'TWD', privateNote: 'Coach only' },
      ],
      lessonSummary: { purchased: 2, completed: 3, remaining: -1 },
    })
    await expect(students.incomeSummary(coachA)).resolves.toEqual([
      { currency: 'TWD', amountMinor: 4000 },
    ])
    await expect(students.detail(coachB, student.id)).resolves.toBeNull()
  })

  it('requires the current version to edit or permanently delete a student', async () => {
    const students = new StudentModule({
      repository: new MemoryStudentRepository(),
      createId: () => 'student-a',
      now: () => new Date('2026-09-10T10:00:00.000Z'),
    })
    const created = await students.create(coachA, { name: 'Alice' })
    const updated = await students.update(coachA, created.id, {
      name: 'Alice',
      active: false,
      version: 1,
    })
    expect(updated).toMatchObject({ active: false, version: 2 })
    await expect(students.delete(coachA, created.id, 1)).rejects.toMatchObject({
      name: 'StudentVersionConflictError',
    })
    await expect(students.delete(coachA, created.id, 2)).resolves.toBe(true)
  })

  it('returns roster summaries and rejects stale lesson-purchase corrections', async () => {
    const students = new StudentModule({
      repository: new MemoryStudentRepository(),
      createId: (() => {
        let value = 0
        return () => `id-${++value}`
      })(),
      now: () => new Date('2026-09-10T10:00:00.000Z'),
    })
    const student = await students.create(coachA, { name: 'Alice' })
    const purchase = await students.createLessonPurchase(coachA, student.id, {
      purchasedAt: '2026-09-01T00:00:00.000Z',
      lessonCount: 2,
      amountMinor: 4000,
      currency: 'TWD',
      privateNote: '',
    })
    expect(await students.list(coachA)).toMatchObject([
      { id: student.id, lessonSummary: { purchased: 2, completed: 0, remaining: 2 } },
    ])
    const updated = await students.updateLessonPurchase(coachA, student.id, purchase!.id, {
      purchasedAt: '2026-09-02T00:00:00.000Z',
      lessonCount: 3,
      amountMinor: 6000,
      currency: 'TWD',
      privateNote: 'corrected',
      version: 1,
    })
    expect(updated).toMatchObject({ lessonCount: 3, version: 2 })
    await expect(
      students.deleteLessonPurchase(coachA, student.id, purchase!.id, 1),
    ).rejects.toMatchObject({ name: 'LessonPurchaseVersionConflictError' })
  })
})
