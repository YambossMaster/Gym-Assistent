import type { CourseSession, ScheduleSeries } from './scheduling.js'

/** Pure planning step; persistence owns atomic insertion and retry locking. */
export function planSeriesReconciliation(input: {
  series: ScheduleSeries
  remainingLessons: number
  sessions: CourseSession[]
  now: Date
  timeZone?: string
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
  const monthly = input.series.intervalWeeks === 0
  let monthIndex = monthly
    ? Math.max(
        1,
        monthDistance(input.series.anchorStartsAt, latest, input.timeZone ?? 'Asia/Taipei'),
      )
    : 0
  let next = monthly
    ? monthlyOccurrence(input.series.anchorStartsAt, monthIndex, input.timeZone ?? 'Asia/Taipei')
    : addWeeks(latest, input.series.intervalWeeks)
  while (next <= input.now || next <= latest) {
    next = monthly
      ? monthlyOccurrence(
          input.series.anchorStartsAt,
          ++monthIndex,
          input.timeZone ?? 'Asia/Taipei',
        )
      : addWeeks(next, input.series.intervalWeeks)
  }
  for (let index = 0; index < deficit && next <= horizonEnd; index += 1) {
    result.push(next)
    next = monthly
      ? monthlyOccurrence(
          input.series.anchorStartsAt,
          ++monthIndex,
          input.timeZone ?? 'Asia/Taipei',
        )
      : addWeeks(next, input.series.intervalWeeks)
  }
  return result
}

function scheduleHorizonEnd(now: Date, horizon: ScheduleSeries['autoScheduleHorizon']) {
  if (horizon === 'NONE') return null
  const end = new Date(now)
  end.setUTCDate(end.getUTCDate() + (horizon === '1_WEEK' ? 7 : 14))
  return end
}

function addWeeks(value: Date, weeks: number) {
  const next = new Date(value)
  next.setUTCDate(next.getUTCDate() + weeks * 7)
  return next
}

function localParts(value: Date | string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)!.value)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  }
}

function monthDistance(anchor: string, latest: Date, timeZone: string) {
  const first = localParts(anchor, timeZone)
  const last = localParts(latest, timeZone)
  return (last.year - first.year) * 12 + last.month - first.month
}

function zonedInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
) {
  const desired = Date.UTC(year, month, day, hour, minute)
  let guess = desired
  for (let index = 0; index < 3; index += 1) {
    const actual = localParts(new Date(guess), timeZone)
    guess -=
      Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute) - desired
  }
  return new Date(guess)
}

/** Preserve the next future Session's date when the historical start date was left unchanged. */
export function rebaseSeriesAnchor(
  inputAnchor: Date,
  currentAnchor: string,
  pivot: Date,
  timeZone: string,
) {
  const input = localParts(inputAnchor, timeZone)
  const current = localParts(currentAnchor, timeZone)
  if (input.year !== current.year || input.month !== current.month || input.day !== current.day)
    return inputAnchor
  const future = localParts(pivot, timeZone)
  return zonedInstant(future.year, future.month - 1, future.day, input.hour, input.minute, timeZone)
}

/** Month n from the original local date; short months clamp to their final day. */
export function monthlyOccurrence(anchor: Date | string, months: number, timeZone: string) {
  const first = localParts(anchor, timeZone)
  const targetMonth = new Date(Date.UTC(first.year, first.month - 1 + months, 1))
  const year = targetMonth.getUTCFullYear()
  const month = targetMonth.getUTCMonth()
  const day = Math.min(first.day, new Date(Date.UTC(year, month + 1, 0)).getUTCDate())
  return zonedInstant(year, month, day, first.hour, first.minute, timeZone)
}
