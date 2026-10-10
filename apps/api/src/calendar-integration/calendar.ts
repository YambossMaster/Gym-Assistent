import { createHash } from 'node:crypto'
import { z } from 'zod'
import { ExportError } from '../exports/export-module.js'
import { checkBytes } from '../exports/export-format.js'

export const sharingSchema = z
  .object({ includeBlocks: z.boolean(), showNames: z.boolean(), showLocation: z.boolean() })
  .strict()
export type Sharing = z.infer<typeof sharingSchema>
export const defaultSharing: Sharing = {
  includeBlocks: false,
  showNames: false,
  showLocation: true,
}
export type CalendarState = Sharing & { version: number; active: boolean; expired?: boolean }
export type CalendarEvent = {
  uid: string
  startsAt: string
  endsAt: string
  summary: string
  location: string
  cancelled: boolean
  allDay?: boolean
  transparent?: boolean
}
export type PublishedEvent = {
  uid: string
  fingerprint: string
  sequence: number
  startsAt: string
  endsAt: string
  revisedAt: string
  cancelledAt: string | null
}
export const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex')
export const eventUid = (kind: string, id: string) =>
  `${tokenHash(`${kind}:${id}`)}@formcoachdesk.com`
export class CalendarError extends Error {
  constructor(
    readonly statusCode: 404 | 409 | 413 | 429 | 503,
    readonly code: string,
  ) {
    super(code)
  }
}
export function reconcileEvents(current: CalendarEvent[], previous: PublishedEvent[], now: Date) {
  const old = new Map(previous.map((e) => [e.uid, e])),
    events: (CalendarEvent & PublishedEvent)[] = []
  for (const item of current) {
    const event = item.cancelled ? { ...item, summary: '已取消的行程', location: '' } : item
    const prior = old.get(event.uid),
      fingerprint = tokenHash(JSON.stringify(event))
    events.push({
      ...event,
      fingerprint,
      sequence: prior ? prior.sequence + Number(prior.fingerprint !== fingerprint) : 0,
      revisedAt: prior?.fingerprint === fingerprint ? prior.revisedAt : now.toISOString(),
      cancelledAt: event.cancelled ? (prior?.cancelledAt ?? now.toISOString()) : null,
    })
    old.delete(event.uid)
  }
  for (const prior of old.values()) {
    if (prior.cancelledAt && Date.parse(prior.cancelledAt) < now.getTime() - 210 * 86400000)
      continue
    const event: CalendarEvent = {
      uid: prior.uid,
      startsAt: prior.startsAt,
      endsAt: prior.endsAt,
      cancelled: true,
      summary: '已取消的行程',
      location: '',
    }
    events.push({
      ...event,
      fingerprint: tokenHash(JSON.stringify(event)),
      sequence: prior.sequence + Number(!prior.cancelledAt),
      revisedAt: prior.cancelledAt ? prior.revisedAt : now.toISOString(),
      cancelledAt: prior.cancelledAt ?? now.toISOString(),
    })
  }
  if (events.length > 10000) throw new ExportError(413, 'export_too_large')
  return events.sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.uid.localeCompare(b.uid))
}
const escapeText = (s: string) =>
  s
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
export function foldLine(line: string) {
  const lines: string[] = []
  let part = '',
    bytes = 0
  for (const character of line) {
    const size = Buffer.byteLength(character)
    if (bytes + size > 75) {
      lines.push(part)
      part = ' '
      bytes = 1
    }
    part += character
    bytes += size
  }
  lines.push(part)
  return lines.join('\r\n')
}
const instant = (date: string) =>
  new Date(date)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
export function calendarFile(
  events: (CalendarEvent & Pick<PublishedEvent, 'sequence' | 'revisedAt'>)[],
) {
  if (events.length > 10000) throw new ExportError(413, 'export_too_large')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Form Coach Desk//Calendar//ZH-TW',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Form Coach Desk',
  ]
  for (const e of events)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${instant(e.revisedAt)}`,
      `LAST-MODIFIED:${instant(e.revisedAt)}`,
      `SEQUENCE:${e.sequence}`,
      e.allDay
        ? `DTSTART;VALUE=DATE:${instant(e.startsAt).slice(0, 8)}`
        : `DTSTART:${instant(e.startsAt)}`,
      e.allDay ? `DTEND;VALUE=DATE:${instant(e.endsAt).slice(0, 8)}` : `DTEND:${instant(e.endsAt)}`,
      `SUMMARY:${escapeText(e.summary)}`,
      ...(e.location ? [`LOCATION:${escapeText(e.location)}`] : []),
      `STATUS:${e.cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
      `TRANSP:${e.cancelled || e.transparent ? 'TRANSPARENT' : 'OPAQUE'}`,
      'CLASS:PRIVATE',
      'END:VEVENT',
    )
  lines.push('END:VCALENDAR')
  return checkBytes(Buffer.from(lines.map(foldLine).join('\r\n') + '\r\n', 'utf8'))
}

// A valid replacement feed: no real event UID/timing, account fields or private content.
// Subscription clients control refresh/removal; this is not a remote deletion guarantee.
export function expiredCalendarFile(subscriptionHash: string, expiredAt: Date) {
  const startsAt = new Date(expiredAt.toISOString().slice(0, 10) + 'T00:00:00Z')
  return calendarFile([
    {
      uid: eventUid('prime-expired', subscriptionHash),
      startsAt: startsAt.toISOString(),
      endsAt: new Date(startsAt.getTime() + 86400000).toISOString(),
      summary: 'Prime 方案已到期',
      location: '',
      cancelled: false,
      allDay: true,
      transparent: true,
      sequence: 0,
      revisedAt: expiredAt.toISOString(),
    },
  ])
}
