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
})
