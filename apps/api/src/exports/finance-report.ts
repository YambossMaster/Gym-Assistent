import ExcelJS from 'exceljs'
import { isMainThread } from 'node:worker_threads'
import { PassThrough } from 'node:stream'
import { runFinanceWorker, type ReportFile } from './finance-worker.js'
import { z } from 'zod'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import type { FinanceModule } from '../finances/finance-module.js'
import type { WorkspaceModule } from '../workspace/workspace-module.js'
import type { FinanceRow } from '../finances/finance.js'
import { ExportError } from './export-module.js'
import { csvCell, checkBytes } from './export-format.js'
import { coachFilename, localDate, reportDates, validateReportRange } from './report-common.js'

const schema = z
  .object({
    ...reportDates,
    format: z.enum(['xlsx', 'csv']),
    venueId: z.union([z.uuid(), z.literal('none')]).optional(),
    includePrivateNotes: z.boolean().default(false),
  })
  .strict()
const labels: Record<FinanceRow['kind'], string> = {
  purchase: '購課',
  payout: '場地結算',
  prepaid: '場地預購',
  rent: '場租',
  commission: '抽成',
  salary: '底薪',
  manual: '自行新增',
}
export const currencyDigits = (currency: string) =>
  currency === 'TWD'
    ? 0
    : (new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? 2)
const amount = (value: number, currency: string) => value / 10 ** currencyDigits(currency)
type Total = { income: number; expense: number; currency: string; group: string }
export function reportTotals(
  rows: FinanceRow[],
  group: (row: FinanceRow) => string = () => '合計',
) {
  const totals = new Map<string, Total>()
  for (const row of rows) {
    if (row.direction === 'reference') continue
    const title = group(row),
      key = JSON.stringify([title, row.currency])
    const total = totals.get(key) ?? { income: 0, expense: 0, currency: row.currency, group: title }
    total[row.direction] += row.amountMinor
    if (
      !Number.isSafeInteger(total.income) ||
      !Number.isSafeInteger(total.expense) ||
      !Number.isSafeInteger(total.income - total.expense)
    )
      throw new ExportError(413, 'export_too_large')
    totals.set(key, total)
  }
  return [...totals.values()].sort(
    (a, b) => a.group.localeCompare(b.group) || a.currency.localeCompare(b.currency),
  )
}

export class FinanceReportModule {
  constructor(
    private readonly finance: Pick<FinanceModule, 'reportSource'> &
      Partial<Pick<FinanceModule, 'reportSnapshot'>>,
    private readonly workspace: Pick<WorkspaceModule, 'getSettings'>,
    private readonly now = () => new Date(),
  ) {}
  async generate(
    identity: AuthenticatedIdentity,
    raw: unknown,
    signal: AbortSignal,
  ): Promise<ReportFile> {
    const input = schema.parse(raw),
      settings = await this.workspace.getSettings(identity),
      now = this.now()
    validateReportRange(input.start, input.end, localDate(now, settings.timeZone))
    signal.throwIfAborted()
    if (isMainThread) {
      const data = this.finance.reportSnapshot
        ? { snapshot: await this.finance.reportSnapshot(identity) }
        : { source: await this.finance.reportSource(identity) }
      return runFinanceWorker({ ...data, settings, input, now }, signal)
    }
    const source = await this.finance.reportSource(identity)
    if (
      input.venueId &&
      input.venueId !== 'none' &&
      !source.venues.some((v) => v.id === input.venueId)
    )
      throw new ExportError(404, 'not_found')
    const matches = (row: { date: string | null; venueId: string | null }) =>
      Boolean(
        row.date &&
          row.date >= input.start &&
          row.date <= input.end &&
          (!input.venueId ||
            (input.venueId === 'none' ? row.venueId === null : row.venueId === input.venueId)),
      )
    const rows = source.rows.filter((r) => matches(r) && r.direction !== 'reference')
    if (!rows.length) throw new ExportError(404, 'export_empty')
    if (rows.length > 20000) throw new ExportError(413, 'export_too_large')
    const names = new Map(source.venues.map((v) => [v.id, v.name]))
    const venue = (r: FinanceRow) => (r.venueId ? (names.get(r.venueId) ?? '場地') : '未指定場地')
    const headers = [
      '日期',
      '時間',
      '項目',
      '分類',
      '場地',
      '收入',
      '支出',
      '幣別',
      '說明',
      '紀錄狀態',
      '核對提示',
      ...(input.includePrivateNotes ? ['私人備註'] : []),
      '時區',
      '匯出時間',
      '來源編號',
    ]
    const generated = new Intl.DateTimeFormat('sv-SE', {
      timeZone: source.timeZone,
      dateStyle: 'short',
      timeStyle: 'long',
    }).format(now)
    const records = rows.map((r) => [
      r.date,
      r.occurredAt
        ? new Intl.DateTimeFormat('sv-SE', {
            timeZone: source.timeZone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23',
          }).format(new Date(r.occurredAt))
        : '',
      r.label,
      labels[r.kind],
      r.venueId ? venue(r) : '',
      r.direction === 'income' ? amount(r.amountMinor, r.currency) : null,
      r.direction === 'expense' ? amount(r.amountMinor, r.currency) : null,
      r.currency,
      r.detail ?? '',
      r.status === 'modified' ? '已更正' : r.status === 'manual' ? '自行新增' : '原始',
      r.sourceRemoved ? '來源已移除' : r.sourceChanged ? '來源資料已變更' : '',
      ...(input.includePrivateNotes ? [source.manualNotes.get(r.id) ?? ''] : []),
      source.timeZone,
      generated,
      r.id,
    ])
    signal.throwIfAborted()
    let body: Buffer
    if (input.format === 'csv') {
      body = checkBytes(
        Buffer.from(
          '\ufeff' +
            [headers, ...records]
              .map((r) => r.map((v) => csvCell(v ?? null)).join(','))
              .join('\r\n') +
            '\r\n',
        ),
      )
    } else {
      const chunks: Buffer[] = []
      let bytes = 0
      const stream = new PassThrough()
      stream.on('data', (chunk: Buffer) => {
        bytes += chunk.length
        if (bytes > 10 * 1024 * 1024) stream.destroy(new ExportError(413, 'export_too_large'))
        else chunks.push(chunk)
      })
      const book = new ExcelJS.stream.xlsx.WorkbookWriter({
        stream,
        useStyles: true,
        useSharedStrings: false,
      })
      book.creator = 'Form Coach Desk'
      book.created = now
      const summary = book.addWorksheet('收支摘要', { views: [{ showGridLines: false }] })
      const font = 'Microsoft JhengHei'
      const ink = 'FF26362C',
        muted = 'FF657069',
        green = 'FF34483A',
        pale = 'FFEAF0EA'
      const moneyFormat = (currency: string) => {
        const digits = currencyDigits(currency)
        const n = '#,##0' + (digits ? '.' + '0'.repeat(digits) : '')
        return `${n};[Red]-${n};${n}`
      }
      const styleRow = (row: ExcelJS.Row, columns: number, fill?: string) => {
        row.height = 23
        // Style populated cells, never the whole row: row-level fills extend to XFD in Excel.
        for (let c = 1; c <= columns; c++) {
          const cell = row.getCell(c)
          cell.font = { name: font, size: 10, color: { argb: ink } }
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
          if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }
        }
      }
      const spacer = () => {
        summary.addRow([]).height = 9
      }
      const textLine = (text: string, size = 10, color = muted, bold = false) => {
        const row = summary.addRow([text])
        styleRow(row, 5)
        summary.mergeCells(row.number, 1, row.number, 5)
        row.getCell(1).font = { name: font, size, color: { argb: color }, bold }
        const units = [...text].reduce((n, ch) => n + (ch.charCodeAt(0) > 255 ? 2 : 1), 0)
        row.height = Math.max(size === 16 ? 30 : 21, Math.ceil(units / 88) * 16 + 5)
        return row
      }
      summary.columns = [{ width: 27 }, { width: 10 }, { width: 18 }, { width: 18 }, { width: 18 }]
      spacer()
      textLine('收支摘要', 16, green, true)
      textLine(settings.displayName, 10, ink, true)
      textLine(`${input.start} — ${input.end}`)
      const selectedVenue =
        input.venueId === 'none'
          ? '未指定場地'
          : input.venueId
            ? names.get(input.venueId)
            : '全部場地'
      textLine(`${selectedVenue}　／　${source.timeZone}`)
      spacer()
      const missing = source.missing.filter(matches).length
      const untracked = source.untracked.filter(matches).length
      if (missing || untracked) {
        const warning = textLine(
          `待核對：${missing} 項費用缺漏，${untracked} 堂課未追蹤場地費用。`,
          10,
          'FF855D19',
          true,
        )
        warning.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF3D9' },
        }
        spacer()
      }
      const section = (title: string, values: Total[]) => {
        const primary = title === '各幣別合計'
        const heading = summary.addRow([title, '幣別', '收入', '支出', '收支差額'])
        styleRow(heading, 5, primary ? green : pale)
        heading.height = 26
        heading.eachCell((cell, col) => {
          cell.font = {
            name: font,
            size: 10,
            bold: true,
            color: { argb: primary ? 'FFFFFFFF' : green },
          }
          cell.alignment = { vertical: 'middle', horizontal: col >= 3 ? 'right' : 'left' }
        })
        for (const [index, v] of values.entries()) {
          const row = summary.addRow([
            v.group,
            v.currency,
            amount(v.income, v.currency),
            amount(v.expense, v.currency),
            amount(v.income - v.expense, v.currency),
          ])
          styleRow(row, 5, index % 2 === 1 ? 'FFF6F8F5' : undefined)
          row.height = Math.max(23, Math.ceil(([...v.group].length * 2) / 25) * 15 + 5)
          for (const col of [3, 4, 5]) {
            row.getCell(col).numFmt = moneyFormat(v.currency)
            row.getCell(col).alignment = { vertical: 'middle', horizontal: 'right' }
          }
          row.getCell(5).font = { name: font, size: 10, bold: primary, color: { argb: green } }
        }
        spacer()
      }
      section('各幣別合計', reportTotals(rows))
      section(
        '依月份',
        reportTotals(rows, (r) => r.date.slice(0, 7)),
      )
      section(
        '依分類',
        reportTotals(rows, (r) => labels[r.kind]),
      )
      section('依場地', reportTotals(rows, venue))
      textLine('報表說明', 10, ink, true)
      textLine('收支差額非淨利或帳戶餘額。未追蹤／缺漏費用不代表零成本。')
      textLine('本表為匯出時的帳本快照，不含隱藏與參考列；修改明細不會重算摘要。')
      textLine(`費用缺漏 ${missing} 項；未追蹤場地費用 ${untracked} 堂。本表不是稅務申報檔。`)
      const lastSummaryRow = textLine(`產生時間：${generated}　Form Coach Desk`).number
      summary.pageSetup = {
        paperSize: 9,
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        printArea: `A1:E${lastSummaryRow}`,
        margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      }
      summary.headerFooter.oddFooter = '&C第 &P 頁，共 &N 頁'
      summary.commit()
      const detail = book.addWorksheet('收支明細', {
        views: [{ state: 'frozen', ySplit: 1, xSplit: 1, showGridLines: false }],
      })
      detail.columns = headers.map((header, i) => ({
        header,
        width:
          header === '來源編號'
            ? 52
            : header === '匯出時間'
              ? 30
              : header === '說明' || header === '私人備註'
                ? 44
                : [2, 10].includes(i)
                  ? 34
                  : 18,
      }))
      detail.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: records.length + 1, column: headers.length },
      }
      styleRow(detail.getRow(1), headers.length, green)
      detail.getRow(1).height = 27
      detail.getRow(1).eachCell((cell) => {
        cell.font = { name: font, size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
      })
      detail.getRow(1).commit()
      for (const [index, values] of records.entries()) {
        if (index % 100 === 0) {
          await new Promise<void>((resolve) => setImmediate(resolve))
          signal.throwIfAborted()
        }
        const row = detail.addRow([
          new Date(`${rows[index]!.date}T00:00:00Z`),
          ...values.slice(1).map((value) => (value === '' ? null : value)),
        ])
        styleRow(row, headers.length, index % 2 === 1 ? 'FFF6F8F5' : undefined)
        row.getCell(1).numFmt = 'yyyy-mm-dd'
        for (const col of [6, 7]) {
          row.getCell(col).numFmt = moneyFormat(rows[index]!.currency)
          row.getCell(col).alignment = { vertical: 'middle', horizontal: 'right' }
        }
        let lines = 1
        row.eachCell((cell, col) => {
          if (typeof cell.value !== 'string') return
          const width = detail.getColumn(col).width ?? 18
          const wrapped = cell.value
            .split(/\r?\n/)
            .reduce(
              (count, line) =>
                count +
                Math.max(
                  1,
                  Math.ceil(
                    [...line].reduce((n, ch) => n + (ch.charCodeAt(0) > 255 ? 2 : 1), 0) /
                      (width - 2),
                  ),
                ),
              0,
            )
          lines = Math.max(lines, wrapped)
        })
        row.height = Math.min(409, Math.max(23, lines * 15 + 6))
        row.commit()
      }
      detail.commit()
      await book.commit()
      body = checkBytes(Buffer.concat(chunks))
    }
    signal.throwIfAborted()
    return {
      body,
      filename: coachFilename(
        settings.displayName,
        '收支明細',
        input.start,
        input.end,
        now,
        source.timeZone,
        input.format,
      ),
      contentType:
        input.format === 'csv'
          ? 'text/csv; charset=utf-8'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }
  }
}
