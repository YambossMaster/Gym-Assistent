import { describe, expect, it } from 'vitest'
import { rangePreset, validRange } from './data-tools'
describe('historical export dates', () => {
  it('allows a complete historic leap year and rejects a 367-day selection', () => {
    expect(validRange('2024-01-01', '2024-12-31', '2026-10-10')).toBe(true)
    expect(validRange('2024-01-01', '2025-01-01', '2026-10-10')).toBe(false)
    expect(validRange('2024-02-30', '2024-03-01')).toBe(false)
  })
  it('keeps finance to-date ranges distinct from calendar full months', () => {
    expect(rangePreset('month', '2026-10-10')).toEqual({ start: '2026-10-01', end: '2026-10-10' })
    expect(rangePreset('calendar-month', '2024-02-10')).toEqual({
      start: '2024-02-01',
      end: '2024-02-29'
    })
    expect(rangePreset('next-month', '2026-12-10')).toEqual({
      start: '2027-01-01',
      end: '2027-01-31'
    })
    expect(rangePreset('last-month', '2026-01-10')).toEqual({
      start: '2025-12-01',
      end: '2025-12-31'
    })
  })
})
