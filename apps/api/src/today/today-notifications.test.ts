import { describe, expect, it } from 'vitest'
import type { SessionWithConflicts } from '../scheduling/scheduling.js'
import type { TodayProjection } from './today.js'
import { TodayNotificationModule, type TodayNotificationRepository } from './today-notifications.js'

const studentId = '00000000-0000-4000-8000-000000000011'
const sessionId = '00000000-0000-4000-8000-000000000022'
const linkId = '00000000-0000-4000-8000-000000000033'
const attention: TodayProjection['attention'] = [
  {
    kind: 'low_lesson_balance',
    student: { id: studentId, name: '林教練' },
    lessonSummary: { purchased: 2, completed: 1, remaining: 1 },
    targetRoute: `/students/${studentId}`,
  },
]
const conflicts = [
  {
    session: { id: sessionId, studentName: '林教練', version: 2, status: 'scheduled' },
    conflicts: [
      {
        kind: 'session_overlap',
        id: 'other',
        startsAt: '2026-09-15T08:00:00.000Z',
        endsAt: '2026-09-15T09:00:00.000Z',
      },
    ],
  },
] as SessionWithConflicts[]

describe('Today notifications', () => {
  it('sorts source events, persists idempotent reads, and rejects another Coach or stale ID', async () => {
    const reads = new Map<string, string>()
    const dismissals = new Map<string, string>()
    const calls: string[] = []
    const repository: TodayNotificationRepository = {
      sourceTimes: async (workspaceId, students, sessions) => {
        calls.push(workspaceId)
        expect(students).toEqual([studentId])
        expect(sessions).toEqual([{ sessionId, relatedSessionIds: ['other'], blockIds: [] }])
        return workspaceId === 'workspace-owner'
          ? {
              balances: { [studentId]: '2026-09-13T00:00:00.000Z' },
              conflicts: { [sessionId]: '2026-09-14T00:00:00.000Z' },
              reschedules: [
                {
                  id: linkId,
                  sessionId,
                  studentName: '林教練',
                  usedAt: '2026-09-15T00:00:00.000Z',
                  redeemedStartsAt: '2026-09-18T08:00:00.000Z',
                  originalStartsAt: '2026-09-17T08:00:00.000Z',
                },
              ],
            }
          : { balances: {}, conflicts: {}, reschedules: [] }
      },
      states: async (workspaceId, ids) =>
        Object.fromEntries(
          ids.flatMap((id) => {
            const readAt = reads.get(`${workspaceId}:${id}`) ?? null
            const dismissedAt = dismissals.get(`${workspaceId}:${id}`) ?? null
            return readAt || dismissedAt ? [[id, { readAt, dismissedAt }]] : []
          }),
        ),
      markRead: async (workspaceId, id, now) => {
        const key = `${workspaceId}:${id}`
        if (!reads.has(key)) reads.set(key, now.toISOString())
        return reads.get(key)!
      },
      dismiss: async (workspaceId, id, now) => {
        dismissals.set(`${workspaceId}:${id}`, now.toISOString())
      },
    }
    const module = new TodayNotificationModule(
      { resolveWorkspace: async ({ userId }) => `workspace-${userId}` },
      repository,
      () => new Date('2026-09-16T00:00:00.000Z'),
    )
    const owner = { userId: 'owner' }
    const listed = await module.list(owner, attention, conflicts, 'Asia/Taipei')
    expect(listed.map(({ kind }) => kind)).toEqual([
      'student_reschedule',
      'schedule_conflict',
      'low_lesson_balance',
    ])
    expect(listed[0]).toMatchObject({
      id: `reschedule:${linkId}`,
      targetRoute: null,
      readAt: null,
    })
    expect(listed[0]!.detail).toMatch(/從 9\/17.*16:00.*改至 9\/18.*16:00/)
    expect(
      await module.read({ userId: 'other' }, listed[0]!.id, attention, conflicts, 'Asia/Taipei'),
    ).toBeNull()
    expect(
      await module.read(owner, 'reschedule:stale', attention, conflicts, 'Asia/Taipei'),
    ).toBeNull()
    expect(await module.read(owner, listed[0]!.id, attention, conflicts, 'Asia/Taipei')).toBe(
      '2026-09-16T00:00:00.000Z',
    )
    expect(await module.read(owner, listed[0]!.id, attention, conflicts, 'Asia/Taipei')).toBe(
      '2026-09-16T00:00:00.000Z',
    )
    expect((await module.list(owner, attention, conflicts, 'Asia/Taipei'))[0]!.readAt).toBe(
      '2026-09-16T00:00:00.000Z',
    )
    expect(await module.dismiss(owner, listed[0]!.id, attention, conflicts, 'Asia/Taipei')).toBe(
      true,
    )
    expect((await module.list(owner, attention, conflicts, 'Asia/Taipei')).length).toBe(2)
    expect(await module.dismiss(owner, listed[0]!.id, attention, conflicts, 'Asia/Taipei')).toBe(
      false,
    )
    expect(calls).toContain('workspace-other')
  })

  it('keeps only 30 newest visible notices and describes legacy reschedules without inventing an original time', async () => {
    const repository: TodayNotificationRepository = {
      sourceTimes: async () => ({
        balances: {},
        conflicts: {},
        reschedules: Array.from({ length: 35 }, (_, index) => ({
          id: `link-${index}`,
          sessionId,
          studentName: '測試學生',
          usedAt: new Date(Date.UTC(2026, 8, 16, 10, 0, index)).toISOString(),
          redeemedStartsAt: '2026-09-18T08:00:00.000Z',
          originalStartsAt: null,
        })),
      }),
      states: async () => ({}),
      markRead: async () => '2026-09-16T00:00:00.000Z',
      dismiss: async () => undefined,
    }
    const module = new TodayNotificationModule(
      { resolveWorkspace: async () => 'workspace-owner' },
      repository,
      () => new Date('2026-09-16T12:00:00.000Z'),
    )
    const owner = { userId: 'owner' }
    const notices = await module.list(owner, [], [], 'Asia/Taipei')
    expect(notices).toHaveLength(30)
    expect(notices[0]?.id).toBe('reschedule:link-34')
    expect(notices[0]?.detail).toContain('原時間未留存，改至')
    expect(await module.read(owner, 'reschedule:link-0', [], [], 'Asia/Taipei')).toBeNull()
  })
})
