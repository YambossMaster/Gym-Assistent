import { describe, expect, it } from 'vitest'
import { calendarHeaderWheelAction } from './calendarViewport'

describe('calendar header scroll intent', () => {
  it('consumes the first downward gesture to collapse the header', () => {
    expect(calendarHeaderWheelAction(false, 0, 20)).toBe('collapse')
    expect(calendarHeaderWheelAction(true, 0, 20)).toBe('pass')
  })

  it('returns only after another upward wheel gesture at the top', () => {
    expect(calendarHeaderWheelAction(true, 0, -20)).toBe('expand')
    expect(calendarHeaderWheelAction(true, 10, -20)).toBe('pass')
  })

  it('does not react to upward gestures while the header is already visible', () => {
    expect(calendarHeaderWheelAction(false, 0, -20)).toBe('pass')
  })
})
