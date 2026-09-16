import type { LessonIncomeSummary, LessonSummary, StudentRosterItem } from '../students/student.js'
import type { TodayTrainingPlan } from '../training/training.js'

export interface TodayProjection {
  date: string
  timeZone: string
  summary: {
    activeStudents: number
    incomePeriod: { startsOn: string; endsOn: string }
    incomeByCurrency: LessonIncomeSummary[]
    attentionCount: number
  }
  attention: Array<{
    kind: 'low_lesson_balance'
    student: { id: string; name: string }
    lessonSummary: LessonSummary
    targetRoute: string
  }>
  schedule?: Omit<import('../scheduling/scheduling.js').TodaySchedule, 'sessions' | 'counts'> & {
    counts: { scheduled: number; completed: number }
    sessions: Array<
      import('../scheduling/scheduling.js').SessionWithConflicts & {
        trainingPlan?: TodayTrainingPlan
      }
    >
  }
}

export function selectTodayAttention(students: StudentRosterItem[]): TodayProjection['attention'] {
  return students
    .filter((student) => student.active && student.lessonSummary.remaining <= 1)
    .sort(
      (left, right) =>
        left.lessonSummary.remaining - right.lessonSummary.remaining ||
        left.name.localeCompare(right.name) ||
        left.id.localeCompare(right.id),
    )
    .map((student) => ({
      kind: 'low_lesson_balance' as const,
      student: { id: student.id, name: student.name },
      lessonSummary: student.lessonSummary,
      targetRoute: `/students/${student.id}`,
    }))
}

export function localMonthPeriod(now: Date, timeZone: string) {
  const parts = dateParts(now, timeZone)
  const startsOn = `${parts.year}-${parts.month}-01`
  const nextMonth =
    parts.month === '12'
      ? `${Number(parts.year) + 1}-01-01`
      : `${parts.year}-${String(Number(parts.month) + 1).padStart(2, '0')}-01`
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    startsOn,
    endsOn: nextMonth,
    startsAt: zonedMidnight(startsOn, timeZone),
    endsAt: zonedMidnight(nextMonth, timeZone),
  }
}

function dateParts(value: Date, timeZone: string) {
  const result = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    result.find((part) => part.type === type)?.value
  return { year: get('year')!, month: get('month')!, day: get('day')! }
}

export function zonedMidnight(date: string, timeZone: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  const intended = Date.UTC(year!, month! - 1, day!)
  let instant = intended
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const local = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(instant))
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      local.find((part) => part.type === type)?.value
    const observed = Date.UTC(
      Number(get('year')),
      Number(get('month')) - 1,
      Number(get('day')),
      Number(get('hour')),
      Number(get('minute')),
    )
    instant += intended - observed
  }
  return new Date(instant)
}
