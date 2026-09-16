import type { CalendarSession, Student } from '../../api'

export type StudentRosterResultState = 'first-empty' | 'filter-empty' | 'search-empty' | 'ready'

export function selectStudentRosterResult({
  students,
  view,
  query
}: {
  students: readonly Student[]
  view: 'active' | 'archived'
  query: string
}): { state: StudentRosterResultState; students: Student[] } {
  const visible = students.filter((student) => student.active === (view === 'active'))
  const keyword = query.trim().toLocaleLowerCase('zh-Hant')
  const filtered = keyword
    ? visible.filter((student) =>
        `${student.name} ${student.goal}`.toLocaleLowerCase('zh-Hant').includes(keyword)
      )
    : visible

  if (students.length === 0) return { state: 'first-empty', students: [] }
  if (filtered.length > 0) return { state: 'ready', students: filtered }
  return { state: keyword ? 'search-empty' : 'filter-empty', students: [] }
}

export function selectStudentCourseRecords(schedule?: {
  nearestFuture: CalendarSession | null
  history: CalendarSession[]
}): CalendarSession[] {
  if (!schedule) return []
  const completed = schedule.history
    .filter((session) => session.status === 'completed')
    .sort((left, right) => (right.startsAt ?? '').localeCompare(left.startsAt ?? ''))
  return schedule.nearestFuture ? [schedule.nearestFuture, ...completed] : completed
}
