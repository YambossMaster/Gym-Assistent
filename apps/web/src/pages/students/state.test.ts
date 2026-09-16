import { describe, expect, it } from 'vitest'
import type { CalendarSession, Student } from '../../api'
import { selectStudentCourseRecords, selectStudentRosterResult } from './state'

const student = (overrides: Partial<Student> = {}): Student => ({
  id: 'student-1',
  name: '品妤',
  phone: '',
  goal: '提升肌力',
  privateNote: '',
  lineLinked: false,
  active: true,
  version: 1,
  createdAt: '2026-09-13T00:00:00.000Z',
  updatedAt: '2026-09-13T00:00:00.000Z',
  lessonSummary: { purchased: 10, completed: 8, remaining: 2 },
  ...overrides
})

describe('Student roster result selection', () => {
  it('distinguishes the first Student empty state', () => {
    expect(selectStudentRosterResult({ students: [], view: 'active', query: '' }).state).toBe(
      'first-empty'
    )
  })

  it('distinguishes an empty active/archive filter', () => {
    expect(
      selectStudentRosterResult({ students: [student()], view: 'archived', query: '' }).state
    ).toBe('filter-empty')
  })

  it('distinguishes a search with no match in the selected view', () => {
    expect(
      selectStudentRosterResult({ students: [student()], view: 'active', query: '不存在' }).state
    ).toBe('search-empty')
  })

  it('returns only matching Students from the selected view', () => {
    const result = selectStudentRosterResult({
      students: [student(), student({ id: 'student-2', name: '家豪', active: false })],
      view: 'active',
      query: '肌力'
    })
    expect(result).toMatchObject({ state: 'ready', students: [{ id: 'student-1' }] })
  })
})

const courseSession = (
  id: string,
  startsAt: string,
  status: CalendarSession['status']
): CalendarSession => ({
  id,
  studentId: 'student-1',
  studentName: '品妤',
  seriesId: null,
  startsAt,
  endsAt: new Date(Date.parse(startsAt) + 60 * 60_000).toISOString(),
  location: '訓練室',
  status,
  completedAt: status === 'completed' ? startsAt : null,
  version: 1,
  isLegacy: false
})

describe('Student course records', () => {
  it('shows the nearest upcoming Session before every completed Session in reverse chronology', () => {
    const next = courseSession('next', '2026-09-20T02:00:00.000Z', 'scheduled')
    const records = selectStudentCourseRecords({
      nearestFuture: next,
      history: [
        courseSession('older', '2026-09-01T02:00:00.000Z', 'completed'),
        courseSession('cancelled', '2026-09-12T02:00:00.000Z', 'cancelled'),
        courseSession('newer', '2026-09-10T02:00:00.000Z', 'completed')
      ]
    })

    expect(records.map(({ id }) => id)).toEqual(['next', 'newer', 'older'])
  })

  it('keeps completed history useful when no future Session exists', () => {
    const completed = courseSession('completed', '2026-09-10T02:00:00.000Z', 'completed')
    expect(selectStudentCourseRecords({ nearestFuture: null, history: [completed] })).toEqual([
      completed
    ])
  })
})
