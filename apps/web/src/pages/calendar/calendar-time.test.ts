import { describe, expect, it } from 'vitest'
import { addLocalMinutes, isoToLocalDateTime, localDateTimeToIso } from './calendar-time'

describe('calendar time conversion', () => {
  it('converts Workspace local time without using the browser time zone', () => {
    expect(localDateTimeToIso({ date: '2026-09-14', time: '09:30' }, 'Asia/Taipei')).toBe(
      '2026-09-14T01:30:00.000Z'
    )
    expect(isoToLocalDateTime('2026-09-14T01:30:00.000Z', 'Asia/Taipei')).toEqual({
      date: '2026-09-14',
      time: '09:30'
    })
  })

  it('rejects a skipped daylight-saving local time', () => {
    expect(() =>
      localDateTimeToIso({ date: '2026-03-08', time: '02:30' }, 'America/New_York')
    ).toThrow('不存在')
  })

  it('adds minutes across a local date boundary', () => {
    expect(addLocalMinutes({ date: '2026-09-14', time: '23:45' }, 30)).toEqual({
      date: '2026-09-15',
      time: '00:15'
    })
  })
})
