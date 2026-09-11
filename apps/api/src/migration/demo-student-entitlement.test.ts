import { describe, expect, it } from 'vitest'
import { previewDemoStudentEntitlement } from './demo-student-entitlement.js'

const source = {
  students: [
    {
      id: 's2',
      name: ' Beta ',
      phone: '',
      goal: '',
      privateNote: 'private',
      active: true,
      lineLinked: false,
      createdAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 's1',
      name: 'Alpha',
      phone: '',
      goal: '',
      privateNote: '',
      active: false,
      lineLinked: true,
      createdAt: '2026-09-02T00:00:00.000Z',
    },
  ],
  purchases: [
    {
      id: 'p1',
      studentId: 's1',
      purchasedAt: '2026-09-03T00:00:00.000Z',
      amount: 12000,
      lessonCount: 6,
      note: 'legacy note',
    },
    {
      id: 'orphan',
      studentId: 'missing',
      purchasedAt: '2026-09-03T00:00:00.000Z',
      amount: 0,
      lessonCount: 1,
      note: '',
    },
  ],
}

describe('Demo Student and Lesson Purchase preview', () => {
  it('is deterministic and maps valid entitlement records with their manual income', () => {
    const first = previewDemoStudentEntitlement(source)
    const second = previewDemoStudentEntitlement(source)
    expect(first).toEqual(second)
    expect(first.mapped.students.map((student) => student.sourceId)).toEqual(['s1', 's2'])
    expect(first.mapped.purchases).toMatchObject([
      {
        sourceId: 'p1',
        studentSourceId: 's1',
        lessonCount: 6,
        amountMinor: 12000,
        currency: 'TWD',
        privateNote: 'legacy note',
      },
    ])
    expect(first.mapped.students[0]?.targetId).toMatch(/^[0-9a-f-]{36}$/)
    expect(first.rejected).toEqual([
      { source: 'purchase', id: 'orphan', reason: 'student is absent from source mapping' },
    ])
    expect(first.warnings).toEqual([])
  })
})
