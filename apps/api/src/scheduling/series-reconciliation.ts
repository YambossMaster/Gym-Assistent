import type { CourseSession, ScheduleSeries } from './scheduling.js'

/** Pure planning step; persistence owns atomic insertion and retry locking. */
export function planSeriesReconciliation(input: {
  series: ScheduleSeries
  remainingLessons: number
  sessions: CourseSession[]
  now: Date
}) {
  if (!input.series.active || input.remainingLessons <= 0) return []
  const futureScheduled = input.sessions.filter(
    (session) =>
      !session.isLegacy &&
      session.status === 'scheduled' &&
      session.startsAt !== null &&
      new Date(session.startsAt) > input.now,
  )
  const deficit = Math.max(0, input.remainingLessons - futureScheduled.length)
  if (!deficit) return []
  const ownStarts = input.sessions
    .filter((session) => session.seriesId === input.series.id && session.startsAt !== null)
    .map((session) => new Date(session.startsAt!))
  const latest = ownStarts.length
    ? new Date(Math.max(...ownStarts.map((value) => value.getTime())))
    : new Date(input.series.anchorStartsAt)
  const result: Date[] = []
  const horizonEnd = scheduleHorizonEnd(input.now, input.series.autoScheduleHorizon)
  if (!horizonEnd) return result
  let next = addWeeks(latest, input.series.intervalWeeks)
  while (next <= input.now) next = addWeeks(next, input.series.intervalWeeks)
  for (let index = 0; index < deficit && next <= horizonEnd; index += 1) {
    result.push(next)
    next = addWeeks(next, input.series.intervalWeeks)
  }
  return result
}

function scheduleHorizonEnd(now: Date, horizon: ScheduleSeries['autoScheduleHorizon']) {
  if (horizon === 'NONE') return null
  const end = new Date(now)
  end.setUTCDate(end.getUTCDate() + (horizon === '1_WEEK' ? 7 : horizon === '2_WEEKS' ? 14 : 183))
  return end
}

function addWeeks(value: Date, weeks: number) {
  const next = new Date(value)
  next.setUTCDate(next.getUTCDate() + weeks * 7)
  return next
}
