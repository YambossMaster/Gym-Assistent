import type { AuthenticatedIdentity } from '../identity/identity.js'
import type { LessonSummary } from '../students/student.js'
import type {
  AvailabilityWindow,
  CalendarBlock,
  CourseSession,
  Conflict,
  ScheduleSeries,
} from './scheduling.js'

export type SchedulingWorkspaceId = string
export type NewSession = {
  id: string
  studentId: string
  startsAt: Date
  endsAt: Date
  location: string
  now: Date
  seriesId?: string
}
export type ChangedSession = {
  startsAt: Date
  endsAt: Date
  location: string
  expectedVersion: number
  now: Date
}
export type NewBlock = {
  id: string
  recurrenceId: string | null
  startsAt: Date
  endsAt: Date
  note: string
  now: Date
}
export type NewScheduleSeries = {
  id: string
  studentId: string
  anchorStartsAt: Date
  localWeekday: number
  localStartTime: string
  durationMinutes: number
  intervalWeeks: 1 | 2
  autoScheduleHorizon: import('./scheduling.js').AutoScheduleHorizon
  location: string
  now: Date
}

export class SchedulingVersionConflictError extends Error {
  constructor(
    readonly current:
      | CourseSession
      | CalendarBlock
      | ScheduleSeries
      | {
          kind: 'rule' | 'override'
          target: string | number
          windows: AvailabilityWindow[]
          version: number
        },
  ) {
    super('This calendar item changed on another device.')
    this.name = 'SchedulingVersionConflictError'
  }
}

export interface SchedulingRepository {
  resolveWorkspace(identity: AuthenticatedIdentity): Promise<SchedulingWorkspaceId>
  getTimeZone(workspaceId: SchedulingWorkspaceId): Promise<string>
  hasStudent(workspaceId: SchedulingWorkspaceId, studentId: string): Promise<boolean>
  lessonSummary(
    workspaceId: SchedulingWorkspaceId,
    studentId: string,
  ): Promise<LessonSummary | null>
  listSessions(workspaceId: SchedulingWorkspaceId, start: Date, end: Date): Promise<CourseSession[]>
  getSession(workspaceId: SchedulingWorkspaceId, sessionId: string): Promise<CourseSession | null>
  createSession(workspaceId: SchedulingWorkspaceId, input: NewSession): Promise<CourseSession>
  updateSession(
    workspaceId: SchedulingWorkspaceId,
    sessionId: string,
    input: ChangedSession,
  ): Promise<CourseSession | null>
  transitionSession(
    workspaceId: SchedulingWorkspaceId,
    sessionId: string,
    action: 'complete' | 'reopen' | 'cancel',
    version: number,
    now: Date,
  ): Promise<CourseSession | null>
  deleteSession(
    workspaceId: SchedulingWorkspaceId,
    sessionId: string,
    version: number,
  ): Promise<boolean>
  listSeries(workspaceId: SchedulingWorkspaceId, studentId: string): Promise<ScheduleSeries[]>
  createSeriesAndAnchor(
    workspaceId: SchedulingWorkspaceId,
    series: NewScheduleSeries,
    anchor: NewSession,
  ): Promise<{ series: ScheduleSeries; anchor: CourseSession }>
  updateSeries(
    workspaceId: SchedulingWorkspaceId,
    seriesId: string,
    input: Omit<NewScheduleSeries, 'id' | 'studentId' | 'now'> & {
      active: boolean
      effectiveFromSessionId?: string
      expectedVersion: number
      now: Date
    },
  ): Promise<ScheduleSeries | null>
  reconcileSeries(
    workspaceId: SchedulingWorkspaceId,
    studentId: string,
    now: Date,
  ): Promise<CourseSession[]>
  listBlocks(workspaceId: SchedulingWorkspaceId, start: Date, end: Date): Promise<CalendarBlock[]>
  createBlocks(workspaceId: SchedulingWorkspaceId, blocks: NewBlock[]): Promise<CalendarBlock[]>
  updateBlock(
    workspaceId: SchedulingWorkspaceId,
    blockId: string,
    block: {
      startsAt: Date
      endsAt: Date
      note: string
      version: number
      scope: 'single' | 'future' | 'all'
      now: Date
    },
  ): Promise<CalendarBlock[] | null>
  deleteBlock(
    workspaceId: SchedulingWorkspaceId,
    blockId: string,
    input: { version: number; scope: 'single' | 'future' | 'all' },
  ): Promise<boolean | null>
  listAvailability(
    workspaceId: SchedulingWorkspaceId,
  ): Promise<{ weekday: number; windows: AvailabilityWindow[]; version: number }[]>
  getAvailabilityOverride(
    workspaceId: SchedulingWorkspaceId,
    date: string,
  ): Promise<{ windows: AvailabilityWindow[]; version: number } | null>
  replaceAvailability(
    workspaceId: SchedulingWorkspaceId,
    kind: 'rule' | 'override',
    target: string | number,
    windows: AvailabilityWindow[],
    version: number,
    now: Date,
  ): Promise<{
    kind: 'rule' | 'override'
    target: string | number
    windows: AvailabilityWindow[]
    version: number
  }>
}

export function conflictsFor(
  session: CourseSession,
  sessions: CourseSession[],
  blocks: CalendarBlock[],
): Conflict[] {
  if (!session.startsAt || !session.endsAt) return []
  const startsAt = new Date(session.startsAt).getTime(),
    endsAt = new Date(session.endsAt).getTime()
  return [
    ...sessions
      .filter(
        (other) =>
          other.id !== session.id &&
          other.status !== 'cancelled' &&
          other.startsAt &&
          other.endsAt &&
          startsAt < new Date(other.endsAt).getTime() &&
          endsAt > new Date(other.startsAt).getTime(),
      )
      .map((other) => ({
        kind: 'session_overlap' as const,
        id: other.id,
        startsAt: other.startsAt!,
        endsAt: other.endsAt!,
        studentName: other.studentName,
      })),
    ...blocks
      .filter(
        (block) =>
          startsAt < new Date(block.endsAt).getTime() &&
          endsAt > new Date(block.startsAt).getTime(),
      )
      .map((block) => ({
        kind: 'calendar_block' as const,
        id: block.id,
        startsAt: block.startsAt,
        endsAt: block.endsAt,
      })),
  ]
}
