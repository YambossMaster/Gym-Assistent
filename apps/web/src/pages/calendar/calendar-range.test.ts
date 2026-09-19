import { describe, expect, it } from 'vitest'
import { rangeFor, shiftPeriod } from './CalendarPage'

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

  it('navigates by calendar month instead of four weeks', () => {
    expect(shiftPeriod('2026-09-18', 'month', 1)).toBe('2026-10-01')
    expect(shiftPeriod('2026-09-18', 'month', -1)).toBe('2026-08-01')
  })
})
