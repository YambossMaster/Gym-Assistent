import { describe, expect, it } from 'vitest'
import { calendarHeaderWheelStep } from './calendar-header-wheel'

describe('calendarHeaderWheelStep', () => {
  it('spends downward wheel distance on the header before the planner', () => {
    expect(calendarHeaderWheelStep(0, 132, 0, 80)).toEqual({ kind: 'header', hiddenPx: 80 })
    expect(calendarHeaderWheelStep(80, 132, 0, 80)).toEqual({ kind: 'header', hiddenPx: 132 })
    expect(calendarHeaderWheelStep(132, 132, 0, 80)).toEqual({ kind: 'planner' })
  })

  it('returns the planner to its top before spending upward distance on the header', () => {
    expect(calendarHeaderWheelStep(132, 132, 100, -80)).toEqual({ kind: 'planner' })
    expect(calendarHeaderWheelStep(132, 132, 0, -80)).toEqual({ kind: 'header', hiddenPx: 52 })
    expect(calendarHeaderWheelStep(52, 132, 0, -80)).toEqual({ kind: 'header', hiddenPx: 0 })
    expect(calendarHeaderWheelStep(0, 132, 0, -80)).toEqual({ kind: 'planner' })
  })
})
