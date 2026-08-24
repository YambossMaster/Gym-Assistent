import {
  addDays,
  addMinutes,
  addWeeks,
  format,
  isAfter,
  isBefore,
  isEqual,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  max,
  min
} from 'date-fns'
import type {
  AppData,
  AvailabilityWindow,
  CourseSession,
  ExercisePerformanceMetric,
  Student,
  TrainingExercise,
  TrainingRecord,
  TrainingSet
} from './types'

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

const minutesToTime = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`

export const applyAvailabilityWindowChange = (
  windows: AvailabilityWindow[],
  target: AvailabilityWindow,
  mode: 'add' | 'remove'
): AvailabilityWindow[] => {
  const source = windows
    .map((window) => ({
      start: timeToMinutes(window.startTime),
      end: timeToMinutes(window.endTime)
    }))
    .filter((window) => window.end > window.start)
  const change = { start: timeToMinutes(target.startTime), end: timeToMinutes(target.endTime) }
  if (change.end <= change.start) return windows

  const changed =
    mode === 'remove'
      ? source.flatMap((window) => {
          if (change.end <= window.start || change.start >= window.end) return [window]
          return [
            ...(change.start > window.start ? [{ start: window.start, end: change.start }] : []),
            ...(change.end < window.end ? [{ start: change.end, end: window.end }] : [])
          ]
        })
      : [...source, change]

  return changed
    .sort((a, b) => a.start - b.start)
    .reduce<Array<{ start: number; end: number }>>((result, window) => {
      const previous = result.at(-1)
      if (previous && window.start <= previous.end)
        previous.end = Math.max(previous.end, window.end)
      else result.push({ ...window })
      return result
    }, [])
    .map((window) => ({
      startTime: minutesToTime(window.start),
      endTime: minutesToTime(window.end)
    }))
}

export const availabilityWindowsForDate = (data: AppData, day: Date): AvailabilityWindow[] => {
  const override = data.availabilityOverrides.find(
    (item) => item.date === format(day, 'yyyy-MM-dd')
  )
  if (override) return override.windows
  return data.availability
    .filter((rule) => rule.active && rule.weekday === day.getDay())
    .map((rule) => ({ startTime: rule.startTime, endTime: rule.endTime }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export const lessonSummary = (data: AppData, studentId: string) => {
  const purchased = data.purchases
    .filter((p) => p.studentId === studentId)
    .reduce((sum, p) => sum + p.lessonCount, 0)
  const completed = data.sessions.filter(
    (s) => s.studentId === studentId && s.status === 'completed'
  ).length
  return { purchased, completed, remaining: purchased - completed }
}

export type CalendarSessionState = 'upcoming' | 'overdue' | 'completed'

export const calendarSessionState = (
  session: CourseSession,
  now = new Date()
): CalendarSessionState => {
  if (session.status === 'completed') return 'completed'
  return parseISO(session.endsAt) <= now ? 'overdue' : 'upcoming'
}

export const studentCourseRecordSessions = (
  data: AppData,
  studentId: string,
  now = new Date()
): CourseSession[] => {
  const completed = data.sessions
    .filter((session) => session.studentId === studentId && session.status === 'completed')
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
  const next = data.sessions
    .filter(
      (session) =>
        session.studentId === studentId &&
        session.status === 'scheduled' &&
        parseISO(session.startsAt) > now
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]

  return next ? [next, ...completed] : completed
}

export const getStudent = (data: AppData, id: string): Student | undefined =>
  data.students.find((s) => s.id === id)

export const sessionConflicts = (data: AppData, candidate: CourseSession) => {
  const start = parseISO(candidate.startsAt)
  const end = parseISO(candidate.endsAt)
  return data.sessions
    .filter((s) => s.id !== candidate.id && s.status !== 'cancelled')
    .filter((s) => {
      const otherStart = parseISO(s.startsAt)
      const otherEnd = parseISO(s.endsAt)
      return isBefore(start, otherEnd) && isAfter(end, otherStart)
    })
}

export const sessionIssues = (data: AppData, candidate: CourseSession) => {
  const start = parseISO(candidate.startsAt)
  const end = parseISO(candidate.endsAt)
  const sessionOverlap = sessionConflicts(data, candidate)
  const blockedBy = data.blocks.filter(
    (block) => isBefore(start, parseISO(block.endsAt)) && isAfter(end, parseISO(block.startsAt))
  )
  return { sessionOverlap, blockedBy, hasIssues: sessionOverlap.length > 0 || blockedBy.length > 0 }
}

export const scheduleSession = (data: AppData, input: Omit<CourseSession, 'id' | 'status'>) => {
  const candidate: CourseSession = { ...input, id: crypto.randomUUID(), status: 'scheduled' }
  const issues = sessionIssues(data, candidate)
  return { data: { ...data, sessions: [...data.sessions, candidate] }, session: candidate, issues }
}

export const moveSession = (data: AppData, sessionId: string, startsAt: string) => {
  const original = data.sessions.find((s) => s.id === sessionId)
  if (!original) return { data, conflicts: [] as CourseSession[] }
  const duration = parseISO(original.endsAt).getTime() - parseISO(original.startsAt).getTime()
  const candidate = {
    ...original,
    startsAt,
    endsAt: new Date(parseISO(startsAt).getTime() + duration).toISOString(),
    status: 'scheduled' as const
  }
  const conflicts = sessionConflicts(data, candidate)
  return {
    data: { ...data, sessions: data.sessions.map((s) => (s.id === sessionId ? candidate : s)) },
    conflicts
  }
}

export const setSessionStatus = (
  data: AppData,
  sessionId: string,
  status: CourseSession['status']
): AppData => ({
  ...data,
  sessions: data.sessions.map((s) =>
    s.id === sessionId
      ? {
          ...s,
          status,
          completedAt:
            status === 'completed' ? (s.completedAt ?? new Date().toISOString()) : undefined
        }
      : s
  )
})

export const nextSeriesDate = (from: Date, weekday: number, time: string) => {
  const result = new Date(from)
  const days = (weekday - result.getDay() + 7) % 7
  result.setDate(result.getDate() + days)
  const [hours, minutes] = time.split(':').map(Number)
  result.setHours(hours, minutes, 0, 0)
  if (isBefore(result, from) || isEqual(result, from)) return addDays(result, 7)
  return result
}

export const reconcileSchedule = (data: AppData, studentId: string): AppData => {
  const remaining = Math.max(lessonSummary(data, studentId).remaining, 0)
  const now = new Date()
  const future = data.sessions.filter(
    (s) =>
      s.studentId === studentId && s.status === 'scheduled' && isAfter(parseISO(s.startsAt), now)
  )
  let deficit = remaining - future.length
  if (deficit <= 0) return data
  const studentSeries = data.series.filter((s) => s.studentId === studentId && s.active)
  if (!studentSeries.length) return data
  const sessions = [...data.sessions]
  const nextBySeries = new Map(
    studentSeries.map((series) => {
      const seriesSessions = sessions
        .filter((s) => s.seriesId === series.id)
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
      const next = seriesSessions[0]
        ? nextSeriesOccurrence(
            addWeeks(parseISO(seriesSessions[0].startsAt), series.intervalWeeks),
            series.intervalWeeks,
            now
          )
        : nextSeriesDate(now, series.weekday, series.localStartTime)
      return [series.id, next]
    })
  )
  while (deficit > 0) {
    const options = studentSeries
      .map((series) => ({ series, date: nextBySeries.get(series.id)! }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    const selected = options[0]
    sessions.push({
      id: crypto.randomUUID(),
      studentId,
      seriesId: selected.series.id,
      startsAt: selected.date.toISOString(),
      endsAt: addMinutes(selected.date, selected.series.durationMinutes).toISOString(),
      status: 'scheduled',
      location: 'FORM Studio'
    })
    nextBySeries.set(
      selected.series.id,
      addWeeks(selected.date, Math.max(selected.series.intervalWeeks, 1))
    )
    deficit--
  }
  return { ...data, sessions }
}

const nextSeriesOccurrence = (candidate: Date, intervalWeeks: number, after: Date) => {
  let result = candidate
  const safeInterval = Math.max(intervalWeeks, 1)
  while (!isAfter(result, after)) result = addWeeks(result, safeInterval)
  return result
}

export const reconcileAllSchedules = (data: AppData): AppData =>
  data.students
    .filter((student) => student.active)
    .reduce((current, student) => reconcileSchedule(current, student.id), data)

export interface CalendarWindow {
  start: Date
  end: Date
}

export const availableWindowsForDay = (data: AppData, day: Date): CalendarWindow[] => {
  const dayStart = startOfDay(day)
  const rules = availabilityWindowsForDate(data, dayStart)
  const busy = [
    ...data.sessions
      .filter((session) => session.status !== 'cancelled')
      .map((session) => ({ start: parseISO(session.startsAt), end: parseISO(session.endsAt) })),
    ...data.blocks.map((block) => ({
      start: parseISO(block.startsAt),
      end: parseISO(block.endsAt)
    }))
  ]

  return rules.flatMap((rule) => {
    const [startHour, startMinute] = rule.startTime.split(':').map(Number)
    const [endHour, endMinute] = rule.endTime.split(':').map(Number)
    const ruleStart = setMinutes(setHours(dayStart, startHour), startMinute)
    const ruleEnd = setMinutes(setHours(dayStart, endHour), endMinute)
    const overlaps = busy
      .filter(({ start, end }) => isBefore(start, ruleEnd) && isAfter(end, ruleStart))
      .map(({ start, end }) => ({ start: max([start, ruleStart]), end: min([end, ruleEnd]) }))
      .sort((a, b) => a.start.getTime() - b.start.getTime())

    const windows: CalendarWindow[] = []
    let cursor = ruleStart
    for (const item of overlaps) {
      if (isAfter(item.start, cursor)) windows.push({ start: cursor, end: item.start })
      if (isAfter(item.end, cursor)) cursor = item.end
    }
    if (isBefore(cursor, ruleEnd)) windows.push({ start: cursor, end: ruleEnd })
    return windows
  })
}

export const findAvailableSlots = (
  data: AppData,
  session: CourseSession,
  radiusDays = 3,
  now = new Date()
) => {
  const duration =
    (parseISO(session.endsAt).getTime() - parseISO(session.startsAt).getTime()) / 60000
  const slots: Array<{ start: Date; end: Date }> = []
  const originalStart = parseISO(session.startsAt)
  for (let offset = -radiusDays; offset <= radiusDays; offset++) {
    const day = addDays(startOfDay(originalStart), offset)
    const rules = availabilityWindowsForDate(data, day)
    for (const rule of rules) {
      const [startHour, startMinute] = rule.startTime.split(':').map(Number)
      const [endHour, endMinute] = rule.endTime.split(':').map(Number)
      let cursor = setMinutes(setHours(day, startHour), startMinute)
      const boundary = setMinutes(setHours(day, endHour), endMinute)
      while (addMinutes(cursor, duration) <= boundary) {
        const candidate = {
          ...session,
          startsAt: cursor.toISOString(),
          endsAt: addMinutes(cursor, duration).toISOString()
        }
        if (
          isAfter(cursor, now) &&
          !isEqual(cursor, originalStart) &&
          !sessionIssues(data, candidate).hasIssues
        )
          slots.push({ start: cursor, end: addMinutes(cursor, duration) })
        cursor = addMinutes(cursor, 30)
      }
    }
  }
  return slots
}

export const isRescheduleSlotAvailable = (
  data: AppData,
  session: CourseSession,
  startsAt: string,
  now = new Date()
) =>
  findAvailableSlots(data, session, 3, now).some(
    (slot) => slot.start.toISOString() === parseISO(startsAt).toISOString()
  )

export const previousExerciseSets = (
  data: AppData,
  studentId: string,
  exerciseName: string,
  before: string,
  definitionId?: string
): Array<Pick<TrainingSet, 'plannedWeight' | 'plannedReps' | 'unit'>> => {
  const target = { name: exerciseName, definitionId }
  const previous = data.sessions
    .filter(
      (session) =>
        session.studentId === studentId &&
        session.startsAt < before &&
        data.records.some((record) => record.sessionId === session.id)
    )
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .map((session) => data.records.find((record) => record.sessionId === session.id))
    .find((record) =>
      record?.exercises.some((exercise) => exerciseIdentityMatches(exercise, target))
    )
  const exercise = previous?.exercises.find((item) => exerciseIdentityMatches(item, target))
  return (
    exercise?.sets.map((set) => ({
      plannedWeight: set.plannedWeight,
      plannedReps: set.actualReps ?? set.plannedReps,
      unit: set.unit
    })) ?? []
  )
}

const normalizeExerciseName = (name: string) => name.trim().toLocaleLowerCase('zh-TW')

const exerciseIdentityMatches = (
  candidate: Pick<TrainingExercise, 'name' | 'definitionId'>,
  target: Pick<TrainingExercise, 'name' | 'definitionId'>
) => {
  if (candidate.definitionId && target.definitionId)
    return candidate.definitionId === target.definitionId
  return normalizeExerciseName(candidate.name) === normalizeExerciseName(target.name)
}

const KG_PER_LB = 0.45359237

const convertWeight = (weight: number, from: TrainingSet['unit'], to: TrainingSet['unit']) => {
  if (from === to) return weight
  return from === 'lb' ? weight * KG_PER_LB : weight / KG_PER_LB
}

const roundedPerformance = (value: number) => Math.round(value * 10) / 10

export const bestExercisePerformance = (
  exercise: TrainingExercise,
  metric: ExercisePerformanceMetric = exercise.performanceMetric,
  weightUnit: TrainingSet['unit'] = 'kg'
): number | undefined => {
  const values = exercise.sets
    .filter((set) => set.result === 'completed')
    .flatMap((set) => {
      if (metric === 'reps') return set.actualReps === undefined ? [] : [set.actualReps]
      return set.plannedWeight === undefined
        ? []
        : [convertWeight(set.plannedWeight, set.unit, weightUnit)]
    })
  return values.length ? roundedPerformance(Math.max(...values)) : undefined
}

export interface ExercisePerformancePoint {
  sessionId: string
  startsAt: string
  value: number
}

export interface ExercisePerformanceSummary {
  metric: ExercisePerformanceMetric
  unit: TrainingSet['unit'] | '次'
  current?: number
  previous?: number
  personal?: number
  history: ExercisePerformancePoint[]
}

export const exercisePerformanceSummary = (
  data: AppData,
  studentId: string,
  sessionId: string,
  targetExercise: TrainingExercise,
  currentRecord?: TrainingRecord
): ExercisePerformanceSummary => {
  const currentSession = data.sessions.find((session) => session.id === sessionId)
  const preferredWeightUnit =
    targetExercise.sets.find((set) => set.plannedWeight !== undefined)?.unit ??
    data.settings.defaultWeightUnit
  const records = new Map(data.records.map((record) => [record.sessionId, record]))
  if (currentRecord) records.set(currentRecord.sessionId, currentRecord)

  const history = data.sessions
    .filter(
      (session) =>
        session.studentId === studentId &&
        session.status !== 'cancelled' &&
        (session.status === 'completed' || session.id === sessionId)
    )
    .flatMap((session) => {
      const exercise = records
        .get(session.id)
        ?.exercises.find((candidate) => exerciseIdentityMatches(candidate, targetExercise))
      if (!exercise) return []
      const value = bestExercisePerformance(
        exercise,
        targetExercise.performanceMetric,
        preferredWeightUnit
      )
      return value === undefined
        ? []
        : [{ sessionId: session.id, startsAt: session.startsAt, value }]
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  const current = history.find((point) => point.sessionId === sessionId)?.value
  const previous = currentSession
    ? history.filter((point) => point.startsAt < currentSession.startsAt).at(-1)?.value
    : undefined
  const personal = history.length ? Math.max(...history.map((point) => point.value)) : undefined

  return {
    metric: targetExercise.performanceMetric,
    unit: targetExercise.performanceMetric === 'weight' ? preferredWeightUnit : '次',
    current,
    previous,
    personal,
    history
  }
}

export interface StudentExercisePerformanceEntry {
  key: string
  exercise: TrainingExercise
  latestSessionId: string
  sessionCount: number
  summary: ExercisePerformanceSummary
}

export const studentExercisePerformanceEntries = (
  data: AppData,
  studentId: string
): StudentExercisePerformanceEntry[] => {
  const completedSessions = data.sessions
    .filter((session) => session.studentId === studentId && session.status === 'completed')
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
  const representatives: Array<{
    exercise: TrainingExercise
    latestSessionId: string
  }> = []

  for (const session of completedSessions) {
    const record = data.records.find((candidate) => candidate.sessionId === session.id)
    for (const exercise of record?.exercises ?? []) {
      if (bestExercisePerformance(exercise) === undefined) continue
      if (
        representatives.some((representative) =>
          exerciseIdentityMatches(representative.exercise, exercise)
        )
      )
        continue
      representatives.push({ exercise, latestSessionId: session.id })
    }
  }

  return representatives
    .map(({ exercise, latestSessionId }) => {
      const summary = exercisePerformanceSummary(data, studentId, latestSessionId, exercise)
      return {
        key: exercise.definitionId
          ? `definition:${exercise.definitionId}`
          : `name:${normalizeExerciseName(exercise.name)}`,
        exercise,
        latestSessionId,
        sessionCount: summary.history.length,
        summary
      }
    })
    .filter((entry) => entry.sessionCount > 0)
    .sort(
      (a, b) =>
        b.sessionCount - a.sessionCount ||
        (b.summary.history.at(-1)?.startsAt ?? '').localeCompare(
          a.summary.history.at(-1)?.startsAt ?? ''
        ) ||
        a.exercise.name.localeCompare(b.exercise.name, 'zh-TW')
    )
}

export const publicTrainingProjection = (data: AppData, sessionId: string) => {
  const record = data.records.find((r) => r.sessionId === sessionId)
  if (!record) return []
  return record.exercises.map((exercise) => ({
    name: exercise.name,
    sets: exercise.sets.map((set) => ({
      weight: set.plannedWeight,
      reps: set.actualReps,
      unit: set.unit,
      rpe: set.rpe,
      result: set.result
    }))
  }))
}

export const updateTrainingSetActualReps = (
  set: TrainingSet,
  actualReps: number | undefined
): TrainingSet => ({
  ...set,
  actualReps,
  result:
    actualReps === undefined || set.plannedReps === undefined
      ? undefined
      : actualReps < set.plannedReps
        ? 'incomplete'
        : 'completed'
})

export const toggleTrainingSetResult = (
  set: TrainingSet,
  result: NonNullable<TrainingSet['result']>
): TrainingSet => {
  if (set.result === result) return { ...set, actualReps: undefined, result: undefined }
  if (result === 'completed') return { ...set, actualReps: set.plannedReps, result }
  return { ...set, actualReps: undefined, result }
}

export const publicTrainingNote = (data: AppData, sessionId: string, includeNote = false) =>
  includeNote
    ? (data.records.find((record) => record.sessionId === sessionId)?.privateNote ?? '')
    : ''
