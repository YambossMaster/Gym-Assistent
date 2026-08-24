import { describe, expect, it } from 'vitest'
import {
  endTimeSuggestions,
  nearbyTimeSuggestions,
  parseTimeInput,
  scrollableEndTimeOptions,
  scrollableTimeOptions,
  timeRangeFromForm
} from './calendarTime'

describe('calendar time controls', () => {
  it('accepts compact direct time input and the midnight boundary', () => {
    expect(parseTimeInput('9')).toBe(9 * 60)
    expect(parseTimeInput('9:30')).toBe(9 * 60 + 30)
    expect(parseTimeInput('0930')).toBe(9 * 60 + 30)
    expect(parseTimeInput('24:00')).toBe(24 * 60)
    expect(parseTimeInput('24:15')).toBeNull()
  })

  it('builds a date range from the shared lesson and calendar controls', () => {
    const values = new FormData()
    values.set('date', '2026-08-24')
    values.set('startTime', '14:00')
    values.set('endTime', '15:30')

    const range = timeRangeFromForm(values)
    expect(range.start.getHours()).toBe(14)
    expect(range.end.getHours()).toBe(15)
    expect(range.end.getMinutes()).toBe(30)
  })

  it('shows a short nearby list instead of a full-day scrolling list', () => {
    expect(nearbyTimeSuggestions('10:00', 7, 22)).toEqual([
      '09:30',
      '09:45',
      '10:00',
      '10:15',
      '10:30'
    ])
  })

  it('keeps every 15-minute option available behind the compact viewport', () => {
    const options = scrollableTimeOptions(7, 22)
    expect(options).toHaveLength(60)
    expect(options[0]).toBe('07:00')
    expect(options.at(-1)).toBe('21:45')
  })

  it('offers every later end time and labels its duration', () => {
    const options = scrollableEndTimeOptions('22:00', 24)
    expect(options).toHaveLength(8)
    expect(options[0]).toEqual({ value: '22:15', durationMinutes: 15 })
    expect(options.at(-1)).toEqual({ value: '24:00', durationMinutes: 120 })
  })

  it('suggests common end times with durations and supports midnight', () => {
    expect(endTimeSuggestions('22:00', 24)).toEqual([
      { value: '22:30', durationMinutes: 30 },
      { value: '22:45', durationMinutes: 45 },
      { value: '23:00', durationMinutes: 60 },
      { value: '23:30', durationMinutes: 90 },
      { value: '24:00', durationMinutes: 120 }
    ])
  })
})
