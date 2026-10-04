import type { ExportData, ExportRow } from './export-module.js'
import { ExportError } from './export-module.js'

const maxBytes = 10 * 1024 * 1024
const extensionLabels = {
  training: 'training',
  growth: 'growth',
  calendar: 'calendar',
  finance: 'finance',
} as const

export function exportFilename(data: ExportData): string {
  const timestamp = new Intl.DateTimeFormat('sv-SE', {
    timeZone: data.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(new Date(data.generatedAt))
    .replaceAll('-', '')
    .replace(' ', '-')
    .replace(':', '')
  return `form-coach-${extensionLabels[data.type]}-${data.start}_${data.end}-${timestamp}.${data.format}`
}

const formula = /(?:^[\s\u0000-\u001f]*[=+\-@])|(?:^[\t\r\n])/u
export function csvCell(value: ExportRow[string]): string {
  if (value === null) return ''
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  const raw = String(value)
  const safe = typeof value === 'string' && formula.test(raw) ? `'${raw}` : raw
  return `"${safe.replaceAll('"', '""')}"`
}

export function csvFile(data: ExportData): Buffer {
  const lines = [data.columns.map(csvCell).join(',')]
  for (const row of data.rows)
    lines.push(data.columns.map((column) => csvCell(row[column] ?? null)).join(','))
  return checkBytes(Buffer.from(`\ufeff${lines.join('\r\n')}\r\n`, 'utf8'))
}

export function jsonFile(data: ExportData): Buffer {
  return checkBytes(
    Buffer.from(
      JSON.stringify(
        {
          schemaVersion: 1,
          type: data.type,
          generatedAt: data.generatedAt,
          timeZone: data.timeZone,
          filters: { start: data.start, end: data.end, ...data.filters },
          count: data.rows.length,
          records: data.records,
        },
        null,
        2,
      ),
      'utf8',
    ),
  )
}

export function checkBytes(file: Buffer): Buffer {
  if (file.byteLength > maxBytes) throw new ExportError(413, 'export_too_large')
  return file
}

export const exportMaxBytes = maxBytes
