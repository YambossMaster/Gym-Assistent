import { describe, expect, it } from 'vitest'
import { csvCell, csvFile, exportFilename, jsonFile } from './export-format.js'
import { pdfFile } from './export-pdf.js'
import type { ExportData } from './export-module.js'

function fixture(type: ExportData['type'], format: ExportData['format']): ExportData {
  const fields =
    type === 'training'
      ? {
          sessionId: 'session-1',
          studentName: '陳同學',
          sessionStartsAt: '2026-10-05 09:00:00',
          exerciseName: '深蹲',
          setNumber: 1,
          plannedWeight: 80,
          actualReps: 5,
          rpe: 7,
        }
      : type === 'growth'
        ? {
            studentName: '陳同學',
            definitionName: '深蹲',
            sessionStartsAt: '2026-10-05 09:00:00',
            metric: 'weight',
            value: 80,
            unit: 'kg',
          }
        : type === 'calendar'
          ? {
              eventType: 'session',
              eventId: 'event-1',
              studentName: '陳同學',
              startsAt: '2026-10-05 09:00:00',
              endsAt: '2026-10-05 10:00:00',
              status: 'scheduled',
              location: '台北',
            }
          : {
              rowId: 'manual:1',
              date: '2026-10-05',
              label: '教練費',
              kind: 'manual',
              direction: 'income',
              amountMinor: 1000,
              currency: 'TWD',
            }
  return {
    type,
    format,
    start: '2026-10-05',
    end: '2026-10-05',
    timeZone: 'Asia/Taipei',
    generatedAt: '2026-10-05T01:00:00.000Z',
    includePrivateNotes: false,
    filters: { studentId: null },
    columns: Object.keys(fields),
    rows: [fields],
    records: [fields],
  }
}

describe('one-file export formats', () => {
  it('neutralizes spreadsheet formulas and quotes text without changing numbers', () => {
    expect(csvCell('  =HYPERLINK("x")')).toBe('"\'  =HYPERLINK(""x"")"')
    expect(csvCell('-2')).toBe('"\'-2"')
    expect(csvCell('\tplain text')).toBe('"\'\tplain text"')
    expect(csvCell(2)).toBe('2')
  })

  it.each(['training', 'growth', 'calendar', 'finance'] as const)(
    'writes %s in CSV, JSON and PDF',
    async (type) => {
      const csv = fixture(type, 'csv')
      expect(csvFile(csv).toString('utf8')).toContain(type === 'finance' ? '教練費' : '陳同學')
      expect(csvFile(csv).toString('utf8').startsWith('\ufeff')).toBe(true)
      const json = fixture(type, 'json')
      expect(JSON.parse(jsonFile(json).toString('utf8'))).toMatchObject({
        schemaVersion: 1,
        type,
        count: 1,
      })
      const pdf = await pdfFile(fixture(type, 'pdf'))
      expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
      expect(exportFilename(csv)).toMatch(new RegExp(`^form-coach-${type}-2026-10-05_2026-10-05-`))
    },
    30_000,
  )
})
