import { describe, expect, it } from 'vitest'
import type { CalendarSession, LessonPurchase, Student } from '../../api'
import {
  lessonBalanceProgress,
  selectStudentCourseRecords,
  selectStudentPurchaseRecords,
  selectStudentRosterResult
} from './state'

describe('Student balance progress', () => {
  it('fills the track when remaining lessons exceed the latest purchase', () => {
    expect(lessonBalanceProgress(1, 8)).toBe(12.5)
    expect(lessonBalanceProgress(11, 10)).toBe(100)
    expect(lessonBalanceProgress(-1, 10)).toBe(0)
    expect(lessonBalanceProgress(0, null)).toBe(0)
  })
})

describe('Student purchase records', () => {
  it('sorts newest purchase dates first without changing the source records', () => {
    const purchase = (
      id: string,
      purchasedAt: string,
      createdAt = purchasedAt
    ): LessonPurchase => ({
      id,
      purchasedAt,
      createdAt,
      updatedAt: createdAt,
      lessonCount: 8,
      amountMinor: 8000,
      currency: 'TWD',
      privateNote: '',
      version: 1
    })
    const records = [
      purchase('older', '2026-03-11T00:00:00.000Z'),
      purchase('same-day-earlier', '2026-09-28T00:00:00.000Z', '2026-09-27T00:00:00.000Z'),
      purchase('middle', '2026-07-01T00:00:00.000Z'),
      purchase('same-day-later', '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z')
    ]

    expect(selectStudentPurchaseRecords(records).all.map(({ id }) => id)).toEqual([
      'same-day-later',
      'same-day-earlier',
      'middle',
      'older'
    ])
    expect(records[0]?.id).toBe('older')
  })

  it('shows four records on the page and exposes all five in complete history', () => {
    const purchases = Array.from({ length: 5 }, (_, index) => ({
      id: `purchase-${index}`,
      purchasedAt: `2026-09-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
      createdAt: `2026-09-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`
    })) as LessonPurchase[]

    const four = selectStudentPurchaseRecords(purchases.slice(0, 4))
    expect(four.visible).toHaveLength(4)
    expect(four.hasMore).toBe(false)

    const five = selectStudentPurchaseRecords(purchases)
    expect(five.visible.map(({ id }) => id)).toEqual([
      'purchase-4',
      'purchase-3',
      'purchase-2',
      'purchase-1'
    ])
    expect(five.all).toHaveLength(5)
    expect(five.hasMore).toBe(true)
  })
})

const student = (overrides: Partial<Student> = {}): Student => ({
  id: 'student-1',
  name: '品妤',
  phone: '',
  goal: '提升肌力',
  privateNote: '',
  ageRange: null,
  defaultVenueId: null,
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
