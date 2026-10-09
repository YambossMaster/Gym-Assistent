import { z } from 'zod'
import { ExportError } from './export-module.js'

export const reportDates = { start: z.iso.date(), end: z.iso.date() }
export function addDateDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
export function localDate(now: Date, timeZone: string) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
export function validateReportRange(start: string, end: string, today?: string) {
  if (start > end || addDateDays(start, 365) < end || (today && end > today))
    throw new ExportError(400, 'invalid_export_range')
}
export function coachFilename(
  name: string,
  kind: string,
  start: string,
  end: string,
  now: Date,
  timeZone: string,
  extension: string,
) {
  const safe =
    Array.from(
      name
        .normalize('NFC')
        .replace(/[<>:"/\\|?*\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '')
        .trim(),
    )
      .slice(0, 40)
      .join('') || '教練'
  const stamp = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(now)
    .replaceAll('-', '')
    .replace(' ', '-')
    .replace(':', '')
  return `[${safe}]_${kind}_${start}_${end}_${stamp}.${extension}`
}
export function attachment(filename: string) {
  return `attachment; filename="form-coach-report.${filename.split('.').at(-1)}"; filename*=UTF-8''${encodeURIComponent(filename).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`
}
