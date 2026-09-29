import { describe, expect, it } from 'vitest'
import type { CalendarProjection } from '../../api'
import { rangeFor, shiftPeriod, timelineHours } from './CalendarPage'

describe('calendar periods', () => {
  it('includes only weeks that intersect the selected month', () => {
    expect(rangeFor('2026-09-18', 'month')).toEqual({
      start: '2026-08-31',
      end: '2026-10-05'
    })
    expect(rangeFor('2026-08-18', 'month')).toEqual({
      start: '2026-07-27',
      end: '2026-09-07'
    })
  })

  it('starts week and month periods on Sunday when selected', () => {
    expect(rangeFor('2026-09-18', 'week', 0)).toEqual({ start: '2026-09-13', end: '2026-09-20' })
    expect(rangeFor('2026-09-18', 'month', 0)).toEqual({ start: '2026-08-30', end: '2026-10-04' })
  })

  it('navigates by calendar month instead of four weeks', () => {
    expect(shiftPeriod('2026-09-18', 'month', 1)).toBe('2026-10-01')
    expect(shiftPeriod('2026-09-18', 'month', -1)).toBe('2026-08-01')
  })

  it('extends display hours for a lesson beyond the preferred end', () => {
    const calendar = {
      range: { start: '2026-09-30', end: '2026-10-01' },
      timeZone: 'Asia/Taipei',
      sessions: [
        {
          session: {
            status: 'scheduled',
            startsAt: '2026-09-30T10:00:00.000Z',
            endsAt: '2026-09-30T11:00:00.000Z'
          }
        }
      ],
      blocks: []
    } as unknown as CalendarProjection
    expect(
      timelineHours(calendar, {
        calendarStartHour: 8,
        calendarEndHour: 16,
        calendarWeekStart: 1,
        defaultSessionMinutes: 60
      })
    ).toEqual({ start: 8, end: 19 })
  })
})
