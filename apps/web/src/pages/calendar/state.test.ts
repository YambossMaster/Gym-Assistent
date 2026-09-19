import { describe, expect, it } from 'vitest'
import type { CalendarProjection } from '../../api'
import { calendarSessionVisualState, selectCalendarRouteState } from './state'

const calendar: CalendarProjection = {
  timeZone: 'Asia/Taipei',
  range: { start: '2026-09-14', end: '2026-09-21' },
  sessions: [
    {
      session: {
        id: 'session-1',
        studentId: 'student-1',
        studentName: 'Alice',
        seriesId: null,
        startsAt: '2026-09-14T02:00:00.000Z',
        endsAt: '2026-09-14T03:00:00.000Z',
        location: 'Studio',
        status: 'scheduled',
        completedAt: null,
        version: 1,
        isLegacy: false
      },
      conflicts: []
    }
  ],
  blocks: [],
  availabilityByDate: {},
  availabilityVersionsByDate: {},
  availabilityRulesByWeekday: {}
}

describe('selectCalendarRouteState', () => {
  it.each([
    [{ isLoading: true, isFetching: true, error: null }, 'loading'],
    [{ isLoading: false, isFetching: false, error: new Error('offline') }, 'error'],
    [
      { isLoading: false, isFetching: false, error: null, data: { ...calendar, sessions: [] } },
      'empty'
    ],
    [{ isLoading: false, isFetching: false, error: null, data: calendar }, 'ready'],
    [{ isLoading: false, isFetching: true, error: null, data: calendar }, 'refreshing']
  ])('returns %s for the contracted range boundary', (input, expected) => {
    expect(selectCalendarRouteState(input)).toBe(expected)
  })
})

describe('calendarSessionVisualState', () => {
  const session = calendar.sessions[0].session
  const now = new Date('2026-09-14T03:00:00.000Z')

  it('shows a scheduled session as overdue once its end has passed', () => {
    expect(calendarSessionVisualState(session, now)).toBe('overdue')
    expect(calendarSessionVisualState(session, new Date('2026-09-14T02:59:00.000Z'))).toBe(
      'upcoming'
    )
  })

  it('keeps a completed session in the completed palette', () => {
    expect(calendarSessionVisualState({ ...session, status: 'completed' }, now)).toBe('completed')
  })
})
