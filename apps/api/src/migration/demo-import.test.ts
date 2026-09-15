import { describe, expect, it } from 'vitest'
import { prepareDemoImport, safeDemoImportPreview } from './demo-import.js'

function source() {
  return {
    settings: {
      displayName: 'Coach',
      timezone: 'Asia/Taipei',
      defaultWeightUnit: 'kg',
      calendarStartHour: 7,
    },
    students: [
      {
        id: 's1',
        name: 'Student',
        phone: '',
        goal: '',
        privateNote: 'private',
        active: true,
        lineLinked: true,
        createdAt: '2026-09-01T00:00:00+08:00',
      },
    ],
    purchases: [
      {
        id: 'p1',
        studentId: 's1',
        purchasedAt: '2026-09-01T00:00:00+08:00',
        amount: 1200,
        lessonCount: 4,
        note: '',
      },
    ],
    exercises: [
      {
        id: 'd1',
        name: '深蹲',
        equipment: '槓鈴',
        bodyParts: ['腿'],
        movementType: '系統動作',
        performanceMetric: 'weight',
        isSystem: true,
        favorite: true,
      },
    ],
    sessions: [
      {
        id: 'session1',
        studentId: 's1',
        startsAt: '2026-09-20T02:00:00Z',
        endsAt: '2026-09-20T03:00:00Z',
        status: 'completed',
        completedAt: '2026-09-20T03:00:00Z',
        location: 'Studio',
      },
    ],
    records: [
      {
        sessionId: 'session1',
        privateNote: 'note',
        updatedAt: '2026-09-20T03:00:00Z',
        exercises: [
          {
            id: 'e1',
            definitionId: 'd1',
            name: '深蹲',
            region: '腿',
            performanceMetric: 'weight',
            sets: [
              { id: 'set1', plannedWeight: 20, actualReps: 8, result: 'completed', unit: 'kg' },
            ],
          },
        ],
      },
    ],
    series: [],
    blocks: [],
    availability: [],
    availabilityOverrides: [],
    links: [
      {
        token: 'legacy-secret',
        sessionId: 'session1',
        capability: 'read_training_session',
        expiresAt: '2026-09-21T03:00:00Z',
        includeNote: true,
      },
    ],
  }
}

describe('M7 Demo import preparation', () => {
  it('maps deterministically per Workspace, matches a unique system Definition, and rejects raw links', () => {
    const first = prepareDemoImport(source(), '00000000-0000-4000-8000-000000000001', [
      { id: '10000000-0000-4000-8000-000000000001', name: '深蹲' },
    ])
    const again = prepareDemoImport(source(), '00000000-0000-4000-8000-000000000001', [
      { id: '10000000-0000-4000-8000-000000000001', name: '深蹲' },
    ])
    const other = prepareDemoImport(source(), '00000000-0000-4000-8000-000000000002', [
      { id: '10000000-0000-4000-8000-000000000002', name: '深蹲' },
    ])
    expect(first.manifestChecksum).toBe(again.manifestChecksum)
    expect(first.normalized.students[0]!.targetId).not.toBe(other.normalized.students[0]!.targetId)
    expect(first.normalized.definitions[0]).toMatchObject({
      matchedSystem: true,
      targetId: '10000000-0000-4000-8000-000000000001',
    })
    expect(first.rejections).toContainEqual(
      expect.objectContaining({
        phase: 'capability_links',
        reason: 'legacy_secret_not_transferable',
      }),
    )
    expect(JSON.stringify(safeDemoImportPreview(first))).not.toContain('legacy-secret')
    expect(JSON.stringify(safeDemoImportPreview(first))).not.toContain('private')
  })

  it('reports duplicates, missing references, invalid time ranges, and unsupported settings', () => {
    const raw = source()
    raw.students.push({ ...raw.students[0]! })
    raw.purchases.push({ ...raw.purchases[0]!, id: 'missing', studentId: 'absent' })
    raw.sessions.push({ ...raw.sessions[0]!, id: 'bad-time', endsAt: '2026-09-20T01:00:00Z' })
    const plan = prepareDemoImport(raw, '00000000-0000-4000-8000-000000000001')
    expect(plan.rejections.map((item) => item.reason)).toEqual(
      expect.arrayContaining(['duplicate_source_id', 'student_missing', 'end_not_after_start']),
    )
    expect(plan.warnings.map((item) => item.reason)).toContain('unsupported_setting_not_imported')
  })

  it('rejects invalid IANA time zones before a preview can be frozen', () => {
    const raw = source()
    raw.settings.timezone = 'not/a-zone'
    expect(() => prepareDemoImport(raw, '00000000-0000-4000-8000-000000000001')).toThrow()
  })
})
