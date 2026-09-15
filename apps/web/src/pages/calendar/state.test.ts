import { describe, expect, it } from 'vitest'
import type { CalendarProjection } from '../../api'
import { selectCalendarRouteState } from './state'

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
