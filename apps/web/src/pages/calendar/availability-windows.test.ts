import { describe, expect, it } from 'vitest'
import { addWindow, removeWindow } from './CalendarPage'

describe('availability window editing', () => {
  it('keeps non-overlapping additions ordered and rejects overlaps', () => {
    const current = [{ startTime: '13:00', endTime: '17:00' }]
    expect(addWindow(current, { startTime: '09:00', endTime: '12:00' })).toEqual([
      { startTime: '09:00', endTime: '12:00' },
      ...current
    ])
    expect(addWindow(current, { startTime: '16:45', endTime: '18:00' })).toBeNull()
  })

  it('removes a half-open slice without changing unrelated windows', () => {
    expect(
      removeWindow(
        [
          { startTime: '09:00', endTime: '12:00' },
          { startTime: '13:00', endTime: '17:00' }
        ],
        { startTime: '10:00', endTime: '11:00' }
      )
    ).toEqual([
      { startTime: '09:00', endTime: '10:00' },
      { startTime: '11:00', endTime: '12:00' },
      { startTime: '13:00', endTime: '17:00' }
    ])
  })
})
