import { expect, it } from 'vitest'
import { MemoryStudentRepository } from '../adapters/memory-student-repository.js'
import { StudentModule } from '../students/student-module.js'
import { PlanAccessModule } from './plan-access.js'
import { reconcileFreeGroupPlans } from './group-plan-reconciliation.js'

it('archives expired Pro groups without a Web or HTTP request', async () => {
  const repository = new MemoryStudentRepository()
  const students = new StudentModule({ repository })
  const owner = { userId: 'expired-owner' }
  const person = await students.create(owner, { name: '甲', kind: 'person' })
  const group = await students.create(owner, {
    name: '共課',
    kind: 'group',
    memberIds: [person.id],
  })
  const plan = new PlanAccessModule(
    {
      get: async () => ({
        grant: { kind: 'promotional', endsAt: new Date('2026-10-20T00:00:00.000Z') },
        activeStudents: 1,
        activeVenues: 0,
      }),
    },
    () => new Date('2026-10-21T00:00:00.000Z'),
  )

  expect(await reconcileFreeGroupPlans([owner], plan, students)).toBe(1)
  expect((await students.detail(owner, group.id))?.student.active).toBe(false)
  expect((await students.detail(owner, person.id))?.student.active).toBe(true)
  expect(await reconcileFreeGroupPlans([owner], plan, students)).toBe(0)
})
