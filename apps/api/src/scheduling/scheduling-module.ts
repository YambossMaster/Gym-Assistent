import { randomUUID } from 'node:crypto'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import {
  calendarRangeSchema,
  createBlockSchema,
  createSessionSchema,
  createSeriesSchema,
  deleteBlockSchema,
  deleteSessionSchema,
  replaceAvailabilitySchema,
  transitionSessionSchema,
  updateBlockSchema,
  updateSeriesSchema,
  updateSessionSchema,
  type CalendarProjection,
  type CourseSession,
  type ScheduleSeries,
  type SessionWithConflicts,
  type TodaySchedule,
} from './scheduling.js'
import {
  SchedulingStudentChangeError,
  SchedulingVersionConflictError,
  conflictsFor,
  type NewScheduleSeries,
  type SchedulingRepository,
} from './scheduling-repository.js'
import { zonedMidnight } from '../today/today.js'

export class SchedulingModule {
  constructor(
    private readonly repository: SchedulingRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async calendar(
    identity: AuthenticatedIdentity,
    raw: { start: string; end: string },
  ): Promise<CalendarProjection> {
    const input = calendarRangeSchema.parse(raw)
    if (input.end <= input.start || daysBetween(input.start, input.end) > 42)
      throw new Error('Calendar range must be between one and 42 local days.')
    const workspaceId = await this.repository.resolveWorkspace(identity)
    const timeZone = await this.repository.getTimeZone(workspaceId)
    const startsAt = zonedMidnight(input.start, timeZone)
    const endsAt = zonedMidnight(input.end, timeZone)
    const [sessions, blocks, availability] = await Promise.all([
      this.repository.listSessions(workspaceId, startsAt, endsAt),
      this.repository.listBlocks(workspaceId, startsAt, endsAt),
      this.repository.listAvailability(workspaceId),
    ])
    const effectiveAvailability = await this.availabilityByDate(
      workspaceId,
      input.start,
      input.end,
      availability,
    )
    return {
      timeZone,
      range: input,
      sessions: sessions.map((session) => ({
        session,
        conflicts: conflictsFor(session, sessions, blocks),
      })),
      blocks,
      availabilityByDate: effectiveAvailability.windowsByDate,
      availabilityVersionsByDate: effectiveAvailability.versionsByDate,
      availabilityRulesByWeekday: Object.fromEntries(
        availability.map((rule) => [
          String(rule.weekday),
          { windows: rule.windows, version: rule.version },
        ]),
      ),
    }
  }

  async today(identity: AuthenticatedIdentity, date: string): Promise<TodaySchedule> {
    const next = new Date(`${date}T00:00:00.000Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    const calendar = await this.calendar(identity, {
      start: date,
      end: next.toISOString().slice(0, 10),
    })
    const sessions = calendar.sessions.filter(
      ({ session }) => !session.isLegacy && session.status !== 'cancelled',
    )
    return {
      date,
      timeZone: calendar.timeZone,
      sessions,
      counts: {
        scheduled: sessions.filter(({ session }) => session.status === 'scheduled').length,
        completed: sessions.filter(({ session }) => session.status === 'completed').length,
      },
      conflictAttention: sessions.filter((item) => item.conflicts.length > 0),
      isEmpty: sessions.length === 0,
    }
  }

  async createSession(
    identity: AuthenticatedIdentity,
    raw: unknown,
  ): Promise<SessionWithConflicts | null> {
    const input = createSessionSchema.parse(raw)
    const workspaceId = await this.repository.resolveWorkspace(identity)
    if (!(await this.repository.hasStudent(workspaceId, input.studentId))) return null
    const session = await this.repository.createSession(workspaceId, {
      id: randomUUID(),
      studentId: input.studentId,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      location: input.location,
      now: this.now(),
    })
    await this.repository.reconcileSeries(workspaceId, input.studentId, this.now())
    return this.withConflicts(workspaceId, session)
  }
  async updateSession(
    identity: AuthenticatedIdentity,
    sessionId: string,
    raw: unknown,
  ): Promise<SessionWithConflicts | null> {
    const input = updateSessionSchema.parse(raw)
    const workspaceId = await this.repository.resolveWorkspace(identity)
    let changedStudentId: string | undefined
    if (input.studentId) {
      const current = await this.repository.getSession(workspaceId, sessionId)
      if (!current) return null
      if (current.version !== input.version) throw new SchedulingVersionConflictError(current)
      if (input.studentId !== current.studentId) {
        if (current.seriesId) throw new SchedulingStudentChangeError('series_owned')
        if (current.status !== 'scheduled' || current.isLegacy)
          throw new SchedulingStudentChangeError('session_not_editable')
        if (!(await this.repository.hasStudent(workspaceId, input.studentId)))
          throw new SchedulingStudentChangeError('student_not_found')
        changedStudentId = input.studentId
      }
    }
    const session = await this.repository.updateSession(workspaceId, sessionId, {
      ...(changedStudentId ? { studentId: changedStudentId } : {}),
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      location: input.location,
      expectedVersion: input.version,
      now: this.now(),
    })
    return session ? this.withConflicts(workspaceId, session) : null
  }
  async session(identity: AuthenticatedIdentity, sessionId: string) {
    const workspaceId = await this.repository.resolveWorkspace(identity)
    const session = await this.repository.getSession(workspaceId, sessionId)
    if (!session) return null
    if (session.isLegacy) return { session, lessonSummary: null, conflicts: [] }
    const [lessonSummary, result] = await Promise.all([
      this.repository.lessonSummary(workspaceId, session.studentId),
      this.withConflicts(workspaceId, session),
    ])
    return { ...result, lessonSummary }
  }
  async studentSchedule(identity: AuthenticatedIdentity, studentId: string) {
    const workspaceId = await this.repository.resolveWorkspace(identity)
    if (!(await this.repository.hasStudent(workspaceId, studentId))) return null
    const sessions = (
      await this.repository.listSessions(
        workspaceId,
        new Date('1970-01-01T00:00:00.000Z'),
        new Date('9999-12-31T23:59:59.999Z'),
      )
    ).filter((session) => session.studentId === studentId && !session.isLegacy)
    const now = this.now()
    return {
      nearestFuture:
        sessions.find(
          (session) =>
            session.status === 'scheduled' && session.startsAt && new Date(session.startsAt) > now,
        ) ?? null,
      history: sessions
        .filter((session) => session.status !== 'scheduled')
        .sort((a, b) => b.startsAt!.localeCompare(a.startsAt!)),
    }
  }
  async transitionSession(
    identity: AuthenticatedIdentity,
    sessionId: string,
    raw: unknown,
  ): Promise<SessionWithConflicts | null> {
    const input = transitionSessionSchema.parse(raw)
    const workspaceId = await this.repository.resolveWorkspace(identity)
    const session = await this.repository.transitionSession(
      workspaceId,
      sessionId,
      input.action,
      input.version,
      this.now(),
    )
    if (session) await this.repository.reconcileSeries(workspaceId, session.studentId, this.now())
    return session ? this.withConflicts(workspaceId, session) : null
  }
  async deleteSession(
    identity: AuthenticatedIdentity,
    sessionId: string,
    raw: unknown,
  ): Promise<boolean> {
    const input = deleteSessionSchema.parse(raw)
    const workspaceId = await this.repository.resolveWorkspace(identity)
    const session = await this.repository.getSession(workspaceId, sessionId)
    const deleted = await this.repository.deleteSession(workspaceId, sessionId, input.version)
    if (deleted && session)
      await this.repository.reconcileSeries(workspaceId, session.studentId, this.now())
    return deleted
  }
  async listSeries(identity: AuthenticatedIdentity, studentId: string) {
    const workspaceId = await this.repository.resolveWorkspace(identity)
    if (!(await this.repository.hasStudent(workspaceId, studentId))) return null
    return this.repository.listSeries(workspaceId, studentId)
  }
  async createSeries(identity: AuthenticatedIdentity, studentId: string, raw: unknown) {
    const input = createSeriesSchema.parse(raw)
    const workspaceId = await this.repository.resolveWorkspace(identity)
    if (!(await this.repository.hasStudent(workspaceId, studentId))) return null
    const startsAt = new Date(input.startsAt)
    const endsAt = new Date(input.endsAt)
    const timeZone = await this.repository.getTimeZone(workspaceId)
    const local = localSeriesParts(startsAt, timeZone)
    const series: NewScheduleSeries = {
      id: randomUUID(),
      studentId,
      anchorStartsAt: startsAt,
      localWeekday: local.weekday,
      localStartTime: local.startTime,
      durationMinutes: (endsAt.getTime() - startsAt.getTime()) / 60_000,
      intervalWeeks: input.intervalWeeks,
      autoScheduleHorizon: input.autoScheduleHorizon,
      location: input.location,
      now: this.now(),
    }
    const created = await this.repository.createSeriesAndAnchor(workspaceId, series, {
      id: randomUUID(),
      studentId,
      startsAt,
      endsAt,
      location: input.location,
      seriesId: series.id,
      now: series.now,
    })
    const generated = await this.repository.reconcileSeries(workspaceId, studentId, series.now)
    return { ...created, generatedIds: generated.map((session) => session.id) }
  }
  async updateSeries(identity: AuthenticatedIdentity, seriesId: string, raw: unknown) {
    const input = updateSeriesSchema.parse(raw)
    const workspaceId = await this.repository.resolveWorkspace(identity)
    const startsAt = new Date(input.startsAt)
    const endsAt = new Date(input.endsAt)
    const local = localSeriesParts(startsAt, await this.repository.getTimeZone(workspaceId))
    const series = await this.repository.updateSeries(workspaceId, seriesId, {
      anchorStartsAt: startsAt,
      localWeekday: local.weekday,
      localStartTime: local.startTime,
      durationMinutes: (endsAt.getTime() - startsAt.getTime()) / 60_000,
      intervalWeeks: input.intervalWeeks,
      autoScheduleHorizon: input.autoScheduleHorizon,
      location: input.location,
      active: input.active,
      ...(input.effective_from_session_id
        ? { effectiveFromSessionId: input.effective_from_session_id }
        : {}),
      expectedVersion: input.version,
      now: this.now(),
    })
    if (!series) return null
    const generated = await this.repository.reconcileSeries(
      workspaceId,
      series.studentId,
      this.now(),
    )
    return { series, generatedIds: generated.map((session) => session.id) }
  }
  async reconcileSeries(identity: AuthenticatedIdentity, studentId: string) {
    const workspaceId = await this.repository.resolveWorkspace(identity)
    if (!(await this.repository.hasStudent(workspaceId, studentId))) return null
    return this.repository.reconcileSeries(workspaceId, studentId, this.now())
  }
  async createBlock(identity: AuthenticatedIdentity, raw: unknown) {
    const input = createBlockSchema.parse(raw)
    const workspaceId = await this.repository.resolveWorkspace(identity)
    const recurrenceId = input.repeatCount > 1 ? randomUUID() : null
    const blocks = Array.from({ length: input.repeatCount }, (_, index) => ({
      id: randomUUID(),
      recurrenceId,
      startsAt: addWeeks(new Date(input.startsAt), index),
      endsAt: addWeeks(new Date(input.endsAt), index),
      note: input.note,
      now: this.now(),
    }))
    return this.repository.createBlocks(workspaceId, blocks)
  }
  async updateBlock(identity: AuthenticatedIdentity, blockId: string, raw: unknown) {
    const input = updateBlockSchema.parse(raw)
    return this.repository.updateBlock(await this.repository.resolveWorkspace(identity), blockId, {
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      note: input.note,
      version: input.version,
      scope: input.scope,
      now: this.now(),
    })
  }
  async deleteBlock(identity: AuthenticatedIdentity, blockId: string, raw: unknown) {
    const input = deleteBlockSchema.parse(raw)
    return this.repository.deleteBlock(
      await this.repository.resolveWorkspace(identity),
      blockId,
      input,
    )
  }
  async replaceAvailability(
    identity: AuthenticatedIdentity,
    kind: 'rule' | 'override',
    target: string | number,
    raw: unknown,
  ) {
    const input = replaceAvailabilitySchema.parse(raw)
    const windows = [...input.windows].sort((left, right) =>
      left.startTime.localeCompare(right.startTime),
    )
    if (
      windows.some((window, index) => index > 0 && windows[index - 1]!.endTime > window.startTime)
    )
      throw new Error('Availability windows must not overlap.')
    return this.repository.replaceAvailability(
      await this.repository.resolveWorkspace(identity),
      kind,
      target,
      windows,
      input.version,
      this.now(),
    )
  }
  private async withConflicts(
    workspaceId: string,
    session: CourseSession,
  ): Promise<SessionWithConflicts> {
    const start = new Date(session.startsAt!),
      end = new Date(session.endsAt!)
    const [sessions, blocks, timeZone, availability] = await Promise.all([
      this.repository.listSessions(workspaceId, start, end),
      this.repository.listBlocks(workspaceId, start, end),
      this.repository.getTimeZone(workspaceId),
      this.repository.listAvailability(workspaceId),
    ])
    const localStart = localDateTimeParts(start, timeZone)
    const localEnd = localDateTimeParts(end, timeZone)
    const override = await this.repository.getAvailabilityOverride(workspaceId, localStart.date)
    const baseline = availability.find((rule) => rule.weekday === isoWeekday(localStart.date))
    const windows = override?.windows ?? baseline?.windows ?? []
    const outsideAvailability =
      localStart.date !== localEnd.date ||
      !windows.some(
        (window) => window.startTime <= localStart.time && window.endTime >= localEnd.time,
      )
    return {
      session,
      conflicts: [
        ...conflictsFor(session, sessions, blocks),
        ...(outsideAvailability
          ? [
              {
                kind: 'outside_availability' as const,
                id: localStart.date,
                startsAt: session.startsAt!,
                endsAt: session.endsAt!,
              },
            ]
          : []),
      ],
    }
  }
  private async availabilityByDate(
    workspaceId: string,
    start: string,
    end: string,
    rules: {
      weekday: number
      windows: import('./scheduling.js').AvailabilityWindow[]
      version: number
    }[],
  ) {
    const baseline = new Map(rules.map((rule) => [rule.weekday, rule]))
    const dates = localDates(start, end)
    const overrides = await Promise.all(
      dates.map(
        async (date) =>
          [date, await this.repository.getAvailabilityOverride(workspaceId, date)] as const,
      ),
    )
    return {
      windowsByDate: Object.fromEntries(
        overrides.map(([date, override]) => [
          date,
          override?.windows ?? baseline.get(isoWeekday(date))?.windows ?? [],
        ]),
      ),
      versionsByDate: Object.fromEntries(
        overrides.map(([date, override]) => [
          date,
          override?.version ?? baseline.get(isoWeekday(date))?.version ?? 1,
        ]),
      ),
    }
  }
}
function addWeeks(value: Date, weeks: number) {
  const next = new Date(value)
  next.setUTCDate(next.getUTCDate() + weeks * 7)
  return next
}
function daysBetween(start: string, end: string) {
  return (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000
}
function localDates(start: string, end: string) {
  const result: string[] = []
  const current = new Date(`${start}T00:00:00.000Z`)
  const exclusiveEnd = new Date(`${end}T00:00:00.000Z`)
  while (current < exclusiveEnd) {
    result.push(current.toISOString().slice(0, 10))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return result
}
function isoWeekday(date: string) {
  const weekday = new Date(`${date}T12:00:00.000Z`).getUTCDay()
  return weekday === 0 ? 7 : weekday
}
function localSeriesParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)!.value
  const weekday = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[get('weekday')]
  return { weekday: weekday!, startTime: `${get('hour')}:${get('minute')}` }
}

function localDateTimeParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)!.value
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}
