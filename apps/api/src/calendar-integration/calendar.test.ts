import { describe, expect, it } from 'vitest'
import {
  calendarFile,
  eventUid,
  foldLine,
  reconcileEvents,
  type CalendarEvent,
} from './calendar.js'
const now = new Date('2026-10-10T02:00:00Z')
const event: CalendarEvent = {
  uid: eventUid('session', 'one'),
  startsAt: '2026-10-10T02:00:00Z',
  endsAt: '2026-10-10T03:00:00Z',
  summary: '教練課程 · 小白',
  location: '台北',
  cancelled: false,
}
describe('subscribed calendar continuity and privacy', () => {
  it('keeps identity and revision stable, increments on reschedule and strips cancellation details', () => {
    const first = reconcileEvents([event], [], now)
    const unchanged = reconcileEvents([event], first, new Date('2026-10-11T00:00:00Z'))
    expect(unchanged).toEqual(first)
    const changed = reconcileEvents(
      [{ ...event, startsAt: '2026-10-11T02:00:00Z', endsAt: '2026-10-11T03:00:00Z' }],
      first,
      now,
    )
    expect(changed[0]).toMatchObject({ uid: event.uid, sequence: 1 })
    const cancelled = reconcileEvents([], changed, now)
    expect(cancelled[0]).toMatchObject({
      uid: event.uid,
      sequence: 2,
      cancelled: true,
      location: '',
      summary: '已取消的行程',
    })
    expect(calendarFile(cancelled).toString()).not.toContain('小白')
    const restored = reconcileEvents([event], cancelled, now)
    expect(restored[0]).toMatchObject({ sequence: 3, cancelled: false })
  })
  it('retains tombstones for 210 days and represents an empty feed honestly', () => {
    const deleted = reconcileEvents([], reconcileEvents([event], [], now), now)
    expect(reconcileEvents([], deleted, new Date(now.getTime() + 209 * 86400000))).toHaveLength(1)
    expect(reconcileEvents([], deleted, new Date(now.getTime() + 211 * 86400000))).toHaveLength(0)
    expect(calendarFile([]).toString()).toContain('END:VCALENDAR\r\n')
  })
  it('escapes property injection and folds Unicode without splitting characters or exceeding 75 octets', () => {
    const body = calendarFile(
      reconcileEvents(
        [{ ...event, summary: '中文'.repeat(70) + '\r\nATTENDEE:evil@example.com,;\\' }],
        [],
        now,
      ),
    ).toString()
    expect(body).not.toContain('\r\nATTENDEE:')
    for (const line of body.split('\r\n')) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75)
    expect(body).not.toContain('�')
    expect(foldLine('中文'.repeat(50)).replace(/\r\n /g, '')).toBe('中文'.repeat(50))
  })
})
