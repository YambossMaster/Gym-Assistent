import { createHash } from 'node:crypto'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import type { SessionWithConflicts } from '../scheduling/scheduling.js'
import type { StudentRepository } from '../students/student-repository.js'
import type { TodayProjection } from './today.js'

export type TodayNotification = {
  id: string
  kind: 'low_lesson_balance' | 'schedule_conflict' | 'student_reschedule'
  title: string
  detail: string
  targetRoute: string | null
  occurredAt: string
  readAt: string | null
}

export type RescheduleSource = {
  id: string
  sessionId: string
  studentName: string
  usedAt: string
  redeemedStartsAt: string
  originalStartsAt: string | null
}

export type ConflictSource = {
  sessionId: string
  relatedSessionIds: string[]
  blockIds: string[]
}

export interface TodayNotificationRepository {
  sourceTimes(
    workspaceId: string,
    studentIds: string[],
    conflicts: ConflictSource[],
    since: Date,
  ): Promise<{
    balances: Record<string, string>
    conflicts: Record<string, string>
    reschedules: RescheduleSource[]
  }>
  states(
    workspaceId: string,
    ids: string[],
  ): Promise<Record<string, { readAt: string | null; dismissedAt: string | null }>>
  markRead(workspaceId: string, id: string, now: Date): Promise<string>
  dismiss(workspaceId: string, id: string, now: Date): Promise<void>
}

export class TodayNotificationModule {
  constructor(
    private readonly workspace: Pick<StudentRepository, 'resolveWorkspace'>,
    private readonly repository: TodayNotificationRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(
    identity: AuthenticatedIdentity,
    attention: TodayProjection['attention'],
    conflicts: SessionWithConflicts[],
    timeZone: string,
  ): Promise<TodayNotification[]> {
    const workspaceId = await this.workspace.resolveWorkspace(identity)
    const since = new Date(this.now().getTime() - 30 * 24 * 60 * 60 * 1000)
    const sources = await this.repository.sourceTimes(
      workspaceId,
      attention.map(({ student }) => student.id),
      conflicts.map(({ session, conflicts: issues }) => ({
        sessionId: session.id,
        relatedSessionIds: issues
          .filter((issue) => issue.kind === 'session_overlap')
          .map((issue) => issue.id),
        blockIds: issues
          .filter((issue) => issue.kind === 'calendar_block')
          .map((issue) => issue.id),
      })),
      since,
    )
    const notices: TodayNotification[] = [
      ...attention.flatMap((item) => {
        const changedAt = sources.balances[item.student.id]
        if (!changedAt) return []
        return [
          {
            id: `balance:${item.student.id}:${item.lessonSummary.remaining}:${changedAt}`,
            kind: 'low_lesson_balance' as const,
            title: `${item.student.name} · 堂數偏低`,
            detail: `剩餘 ${item.lessonSummary.remaining} 堂`,
            targetRoute: item.targetRoute,
            occurredAt: changedAt,
            readAt: null,
          },
        ]
      }),
      ...conflicts.flatMap(({ session, conflicts: issues }) => {
        const changedAt = sources.conflicts[session.id]
        if (!changedAt) return []
        const signature = createHash('sha256')
          .update(
            JSON.stringify(
              issues
                .map(({ kind, id, startsAt, endsAt }) => ({ kind, id, startsAt, endsAt }))
                .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
            ),
          )
          .digest('hex')
          .slice(0, 12)
        return [
          {
            id: `conflict:${session.id}:${session.version}:${signature}`,
            kind: 'schedule_conflict' as const,
            title: `${session.studentName} · 排程需確認`,
            detail: `${issues.length} 項排程提醒`,
            targetRoute: `/sessions/${session.id}`,
            occurredAt: changedAt,
            readAt: null,
          },
        ]
      }),
      ...sources.reschedules.map((source) => ({
        id: `reschedule:${source.id}`,
        kind: 'student_reschedule' as const,
        title: `${source.studentName} · 已透過連結改期`,
        detail: `${source.originalStartsAt ? `從 ${formatNoticeDate(source.originalStartsAt, timeZone)} ` : '原時間未留存，'}改至 ${formatNoticeDate(source.redeemedStartsAt, timeZone)}`,
        targetRoute: null,
        occurredAt: source.usedAt,
        readAt: null,
      })),
    ]
    const states = await this.repository.states(
      workspaceId,
      notices.map(({ id }) => id),
    )
    return notices
      .filter((notice) => !states[notice.id]?.dismissedAt)
      .map((notice) => ({ ...notice, readAt: states[notice.id]?.readAt ?? null }))
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id))
      .slice(0, 30)
  }

  async read(
    identity: AuthenticatedIdentity,
    id: string,
    attention: TodayProjection['attention'],
    conflicts: SessionWithConflicts[],
    timeZone: string,
  ): Promise<string | null> {
    const notices = await this.list(identity, attention, conflicts, timeZone)
    if (!notices.some((notice) => notice.id === id)) return null
    const workspaceId = await this.workspace.resolveWorkspace(identity)
    return this.repository.markRead(workspaceId, id, this.now())
  }

  async dismiss(
    identity: AuthenticatedIdentity,
    id: string,
    attention: TodayProjection['attention'],
    conflicts: SessionWithConflicts[],
    timeZone: string,
  ): Promise<boolean> {
    const notices = await this.list(identity, attention, conflicts, timeZone)
    if (!notices.some((notice) => notice.id === id)) return false
    const workspaceId = await this.workspace.resolveWorkspace(identity)
    await this.repository.dismiss(workspaceId, id, this.now())
    return true
  }
}

function formatNoticeDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}
