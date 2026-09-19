import { describe, expect, it } from 'vitest'
import { calendarHeaderWheelAction } from './calendar-header-wheel'

describe('calendarHeaderWheelAction', () => {
  it('collapses on the first downward wheel gesture from anywhere on the page', () => {
    expect(calendarHeaderWheelAction(false, 0, 1)).toBe('collapse')
    expect(calendarHeaderWheelAction(false, 450, 50)).toBe('collapse')
  })

  it('expands only at the top of the planner', () => {
    expect(calendarHeaderWheelAction(true, 100, -10)).toBe('pass')
    expect(calendarHeaderWheelAction(true, 0, -10)).toBe('expand')
    expect(calendarHeaderWheelAction(true, 0, 10)).toBe('pass')
  })
})
