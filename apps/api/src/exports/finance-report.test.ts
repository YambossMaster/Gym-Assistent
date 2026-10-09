import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { FinanceReportModule } from './finance-report.js'
import { attachment } from './report-common.js'
import type { FinanceModule } from '../finances/finance-module.js'
import type { WorkspaceModule } from '../workspace/workspace-module.js'
import type { FinanceRow } from '../finances/finance.js'

const base: FinanceRow = {
  id: 'manual:1',
  date: '2024-02-29',
  kind: 'manual',
  label: '=HYPERLINK("evil")',
  amountMinor: 12000,
  currency: 'TWD',
  direction: 'income',
  targetRoute: '',
  venueId: null,
}
const rows: FinanceRow[] = [
  base,
  { ...base, id: 'expense', amountMinor: 3000, direction: 'expense' },
  { ...base, id: 'credit', amountMinor: -200, direction: 'expense' },
  { ...base, id: 'reference', amountMinor: 900000000, direction: 'reference' },
  { ...base, id: 'jpy', amountMinor: 1234, currency: 'JPY' },
  { ...base, id: 'outside', date: '2023-12-31' },
]
function module(sourceRows = rows) {
  return new FinanceReportModule(
    {
      reportSource: async () => ({
        rows: sourceRows,
        venues: [],
        timeZone: 'Asia/Taipei',
        manualNotes: new Map([[base.id, '私人測試備註']]),
        missing: [],
        untracked: [],
      }),
    } as Pick<FinanceModule, 'reportSource'>,
    {
      getSettings: async () => ({ displayName: '呂/曉白\r\n', timeZone: 'Asia/Taipei' }),
    } as unknown as Pick<WorkspaceModule, 'getSettings'>,
    () => new Date('2026-10-10T02:00:00Z'),
  )
}
const request = { start: '2024-01-01', end: '2024-12-31', format: 'xlsx' }
const generate = (input: unknown, sourceRows = rows) =>
  module(sourceRows).generate({ userId: 'owner' }, input, new AbortController().signal)
describe('accountant finance report', { timeout: 20000 }, () => {
  it('exports any historical leap year, typed money and dates, currency-separated totals and safe Coach filenames', async () => {
    const result = await generate(request)
    expect(result.filename).toBe('[呂曉白]_收支明細_2024-01-01_2024-12-31_20261010-1000.xlsx')
    expect(attachment(result.filename)).toContain('filename*=UTF-8')
    const book = new ExcelJS.Workbook()
    await book.xlsx.load(result.body as never)
    const detail = book.getWorksheet('收支明細')!,
      summary = book.getWorksheet('收支摘要')!
    expect(detail.rowCount).toBe(5)
    expect(detail.getCell('A2').value).toEqual(new Date('2024-02-29T00:00:00Z'))
    expect(detail.getCell('F2').value).toBe(12000)
    expect(detail.getCell('G4').value).toBe(-200)
    expect(detail.getCell('C2').type).toBe(ExcelJS.ValueType.String)
    expect(detail.getCell('B2').value).toBeNull()
    expect(JSON.stringify(detail.model)).not.toContain('私人測試備註')
    const totals: unknown[][] = []
    summary.eachRow((r) => totals.push(r.values as unknown[]))
    expect(totals.some((r) => r.includes('TWD') && r.includes(9200))).toBe(true)
    expect(totals.some((r) => r.includes('JPY') && r.includes(1234))).toBe(true)
    expect(detail.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 })
    expect(summary.getCell('A2').font).toMatchObject({ name: 'Microsoft JhengHei', size: 16 })
    expect(summary.getCell('A7').value).toBe('各幣別合計')
    expect(summary.getCell('A7').fill).toMatchObject({ type: 'pattern', pattern: 'solid' })
    expect(summary.getCell('F7').fill?.type).not.toBe('pattern')
    expect(summary.getRow(7).fill).toBeUndefined()
    expect(summary.pageSetup.printArea).toBe(`A1:E${summary.rowCount}`)
    expect(summary.pageSetup).toMatchObject({ fitToWidth: 1, fitToHeight: 0 })
    expect(detail.getCell('F2').numFmt).toContain('#,##0')
    expect(detail.getCell('F2').alignment.horizontal).toBe('right')
    expect(detail.getCell('A2').font.name).toBe('Microsoft JhengHei')
  })
  it('preserves the existing TWD whole-unit convention while converting USD cents', async () => {
    const usd = (
      await generate({ ...request, format: 'csv' }, [
        { ...base, currency: 'USD', amountMinor: 123450 },
      ])
    ).body.toString('utf8')
    expect(usd).toContain('1234.5')
    const twd = (
      await generate({ ...request, format: 'csv' }, [{ ...base, amountMinor: 123450 }])
    ).body.toString('utf8')
    expect(twd).toContain('123450')
    expect(twd).not.toContain('1234.5')
  })
  it('CSV has one header, safe text, no summary rows, and per-request note consent', async () => {
    const normal = (await generate({ ...request, format: 'csv' })).body.toString('utf8')
    expect(normal.startsWith('\ufeff')).toBe(true)
    expect(normal).toContain("'=HYPERLINK")
    expect(normal).not.toContain('私人備註')
    expect(normal).not.toContain('reference')
    const consent = (
      await generate({ ...request, format: 'csv', includePrivateNotes: true })
    ).body.toString('utf8')
    expect(consent).toContain('私人測試備註')
  })
  it('rejects invalid, future and overlong ranges without imposing a recency limit', async () => {
    for (const input of [
      { ...request, start: '2024-02-30' },
      { ...request, end: '2025-01-01' },
      { ...request, start: '2027-01-01', end: '2027-01-02' },
    ])
      await expect(generate(input)).rejects.toBeDefined()
    await expect(generate({ ...request, venueId: 'none', format: 'csv' })).resolves.toHaveProperty(
      'body',
    )
    await expect(
      generate({ ...request, venueId: '00000000-0000-4000-8000-000000000001' }),
    ).rejects.toMatchObject({ code: 'not_found' })
    await expect(generate(request, [])).rejects.toMatchObject({ code: 'export_empty' })
  })
})
