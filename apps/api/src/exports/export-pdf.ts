import PDFDocument from 'pdfkit'
import { fileURLToPath } from 'node:url'
import type { ExportData, ExportRow } from './export-module.js'
import { ExportError } from './export-module.js'
import { exportMaxBytes } from './export-format.js'

const fontPath = fileURLToPath(
  import.meta.resolve(
    '@fontsource/noto-sans-tc/files/noto-sans-tc-chinese-traditional-400-normal.woff',
  ),
)
const titles = {
  training: '訓練紀錄',
  growth: '成長軌跡數值',
  calendar: '行事曆',
  finance: '收支明細',
} as const

const value = (input: ExportRow[string] | undefined) =>
  input === null || input === undefined || input === '' ? '—' : String(input)

export async function pdfFile(data: ExportData, signal?: AbortSignal): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    layout: data.type === 'training' ? 'landscape' : 'portrait',
    margin: 38,
    bufferPages: true,
    autoFirstPage: true,
    info: { Title: `FORM Coach Desk ${titles[data.type]}`, Author: 'FORM Coach Desk' },
  })
  doc.registerFont('NotoTC', fontPath)
  doc.font('NotoTC')
  const chunks: Buffer[] = []
  let bytes = 0
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => {
      bytes += chunk.length
      if (bytes > exportMaxBytes) {
        doc.destroy(new ExportError(413, 'export_too_large'))
        return
      }
      chunks.push(chunk)
    })
    doc.once('error', reject)
    doc.once('end', () => resolve(Buffer.concat(chunks)))
  })
  const abort = () => doc.destroy(new ExportError(422, 'export_processing_limit'))
  signal?.addEventListener('abort', abort, { once: true })
  try {
    if (signal?.aborted) abort()
    const width = doc.page.width - 76
    const bottom = () => doc.page.height - 48
    const header = () => {
      doc
        .font('NotoTC')
        .fillColor('#18251f')
        .fontSize(17)
        .text(titles[data.type], 38, 34, { width })
      doc
        .fontSize(8)
        .fillColor('#5e6b61')
        .text(`${data.start} – ${data.end}  ·  ${data.timeZone}`, 38, 62, { width })
        .text(
          `產生時間 ${new Intl.DateTimeFormat('sv-SE', { timeZone: data.timeZone, dateStyle: 'short', timeStyle: 'short' }).format(new Date(data.generatedAt))}  ·  ${data.rows.length} 筆`,
          38,
          75,
          { width },
        )
      doc
        .moveTo(38, 93)
        .lineTo(38 + width, 93)
        .strokeColor('#c9d2ca')
        .stroke()
      doc.y = 105
    }
    const page = () => {
      doc.addPage()
      header()
    }
    header()
    const section = (title: string, subtitle?: string) => {
      if (doc.y + 43 > bottom()) page()
      doc
        .moveDown(0.4)
        .font('NotoTC')
        .fontSize(10)
        .fillColor('#18251f')
        .text(title, 38, doc.y, { width })
      if (subtitle) doc.fontSize(7).fillColor('#69766b').text(subtitle, 38, doc.y, { width })
      doc.moveDown(0.35)
    }
    const table = async (labels: string[], widths: number[], records: string[][]) => {
      const x = 38
      const heading = () => {
        const top = doc.y
        doc.rect(x, top, width, 22).fill('#e8efe7')
        let left = x + 6
        labels.forEach((label, i) => {
          doc
            .font('NotoTC')
            .fillColor('#24372b')
            .fontSize(8)
            .text(label, left, top + 6, { width: widths[i]! - 9, lineBreak: false })
          left += widths[i]!
        })
        doc.y = top + 22
      }
      heading()
      for (const [index, record] of records.entries()) {
        if (index % 8 === 0) {
          await new Promise<void>((resolve) => setImmediate(resolve))
          if (signal?.aborted) throw new ExportError(422, 'export_processing_limit')
        }
        doc.font('NotoTC').fontSize(8)
        let remaining = [...record]
        do {
          const heights = remaining.map((cell, i) =>
            doc.heightOfString(cell, { width: widths[i]! - 9 }),
          )
          let rowHeight = Math.max(23, ...heights.map((h) => h + 9))
          if (doc.y + Math.min(rowHeight, 23) > bottom()) {
            page()
            heading()
          }
          const available = bottom() - doc.y
          const displayed = remaining.map((cell, i) => {
            if (doc.heightOfString(cell, { width: widths[i]! - 9 }) + 9 <= available) return cell
            const characters = Array.from(cell)
            let low = 1
            let high = characters.length
            while (low < high) {
              const middle = Math.ceil((low + high) / 2)
              if (
                doc.heightOfString(characters.slice(0, middle).join(''), {
                  width: widths[i]! - 9,
                }) +
                  9 <=
                available
              )
                low = middle
              else high = middle - 1
            }
            return characters.slice(0, low).join('')
          })
          remaining = remaining.map((cell, i) => cell.slice(displayed[i]!.length))
          rowHeight = Math.max(
            23,
            ...displayed.map((cell, i) => doc.heightOfString(cell, { width: widths[i]! - 9 }) + 9),
          )
          const top = doc.y
          doc
            .moveTo(x, top + rowHeight)
            .lineTo(x + width, top + rowHeight)
            .strokeColor('#e3e8e2')
            .stroke()
          let left = x + 6
          displayed.forEach((cell, i) => {
            doc.fillColor('#27352c').text(cell, left, top + 5, {
              width: widths[i]! - 9,
              height: rowHeight - 8,
            })
            left += widths[i]!
          })
          doc.y = top + rowHeight
          if (remaining.some(Boolean)) {
            page()
            heading()
          }
        } while (remaining.some(Boolean))
      }
      doc.moveDown(0.6)
    }
    const note = (label: string, content: string) => {
      if (!content) return
      if (doc.y + 28 > bottom()) page()
      doc.font('NotoTC').fontSize(8).fillColor('#59675b').text(label, 38, doc.y, { width })
      doc.fillColor('#27352c').text(content, 38, doc.y + 3, { width })
      doc.moveDown(0.3)
    }

    if (data.type === 'training') {
      const sessions = new Map<string, ExportRow[]>()
      for (const row of data.rows) {
        const key = String(row.sessionId)
        sessions.set(key, [...(sessions.get(key) ?? []), row])
      }
      for (const [sessionId, rows] of sessions) {
        const first = rows[0]!
        section(
          `${value(first.studentName)} · ${value(first.sessionStartsAt)}`,
          `Session ${sessionId} · Record ${value(first.recordId)} · ${value(first.sessionStatus)} · ${value(first.location)} · 更新 ${value(first.recordUpdatedAt)}`,
        )
        await table(
          ['動作／來源', '組', '預計重量', '預計次數', '完成次數', 'RPE', '結果'],
          [210, 45, 91, 91, 91, 62, width - 590],
          rows.map((row) => [
            `${value(row.exerciseName)}\n${value(row.exerciseId)} / ${value(row.setId)}`,
            value(row.setNumber),
            value(row.plannedWeight),
            value(row.plannedReps),
            value(row.actualReps),
            value(row.rpe),
            value(row.result),
          ]),
        )
        for (const row of rows) {
          if (
            row.weight !== null ||
            row.duration !== null ||
            row.distance !== null ||
            row.rounds !== null
          )
            note(
              `測量 · ${value(row.setId)}`,
              `${value(row.recordingType)} · ${value(row.weight)} ${value(row.weightUnit)} · ${value(row.duration)} ${value(row.durationUnit)} · ${value(row.distance)} ${value(row.distanceUnit)} · ${value(row.rounds)} 回合 · Definition ${value(row.definitionId)}`,
            )
        }
        if (data.includePrivateNotes && first.privateNote)
          note(`私人備註 · Record ${value(first.recordId)}`, String(first.privateNote))
      }
    } else if (data.type === 'growth') {
      section('數值紀錄')
      await table(
        ['時間', '學員', '動作', '指標', '數值'],
        [110, 100, 140, 100, width - 450],
        data.rows.map((row) => [
          value(row.sessionStartsAt),
          value(row.studentName),
          `${value(row.definitionName)}\n${value(row.definitionId)} · ${value(row.sessionId)}`,
          value(row.metric),
          `${value(row.value)} ${value(row.unit)}`,
        ]),
      )
    } else if (data.type === 'calendar') {
      section('行程')
      await table(
        ['開始', '結束', '類型／學員', '狀態／地點'],
        [120, 120, 133, width - 373],
        data.rows.map((row) => [
          value(row.startsAt),
          value(row.endsAt),
          `${value(row.eventType)} · ${value(row.studentName)}\n${value(row.eventId)}`,
          `${value(row.status)} · ${value(row.location)}`,
        ]),
      )
      for (const row of data.rows) {
        if (row.venueId || row.seriesId)
          note(
            `行程資訊 · ${value(row.eventId)}`,
            `Student ${value(row.studentId)} · Venue ${value(row.venueId)} ${value(row.venueName)} · Series ${value(row.seriesId)}`,
          )
        if (data.includePrivateNotes && row.blockNote)
          note(`私人區塊備註 · ${value(row.eventId)}`, String(row.blockNote))
      }
    } else {
      section('可見列明細', '以下合計僅根據本次匯出的可見列，不代表帳戶餘額。')
      await table(
        ['日期', '項目', '分類', '方向', '金額', '幣別'],
        [72, 155, 82, 70, 73, width - 452],
        data.rows.map((row) => [
          value(row.date),
          `${value(row.label)}\n${value(row.rowId)}`,
          value(row.kind),
          value(row.direction),
          value(row.amountMinor),
          value(row.currency),
        ]),
      )
      for (const row of data.rows) {
        if (
          row.detail ||
          row.venueId ||
          row.status !== 'original' ||
          row.sourceChanged ||
          row.sourceRemoved
        )
          note(
            `列資訊 · ${value(row.rowId)}`,
            `${value(row.occurredAt)} · ${value(row.detail)} · Venue ${value(row.venueId)} ${value(row.venueName)} · ${value(row.status)} · sourceChanged ${value(row.sourceChanged)} · sourceRemoved ${value(row.sourceRemoved)}`,
          )
        if (data.includePrivateNotes && row.privateNote)
          note(`私人備註 · ${value(row.rowId)}`, String(row.privateNote))
      }
      const totals = new Map<string, { income: number; expense: number }>()
      for (const row of data.rows) {
        const currency = String(row.currency)
        const total = totals.get(currency) ?? { income: 0, expense: 0 }
        if (row.direction === 'income') total.income += Number(row.amountMinor)
        if (row.direction === 'expense') total.expense += Number(row.amountMinor)
        totals.set(currency, total)
      }
      section('本次匯出列合計')
      await table(
        ['幣別', '收入', '支出', '收支差額'],
        [90, 130, 130, width - 350],
        [...totals].map(([currency, total]) => [
          currency,
          String(total.income),
          String(total.expense),
          String(total.income - total.expense),
        ]),
      )
    }

    const pages = doc.bufferedPageRange()
    for (let i = pages.start; i < pages.start + pages.count; i += 1) {
      doc.switchToPage(i)
      doc
        .font('NotoTC')
        .fontSize(7)
        .fillColor('#77837a')
        .text(`${i + 1} / ${pages.count}`, 38, doc.page.height - 60, {
          width,
          align: 'right',
          lineBreak: false,
        })
    }
    doc.end()
    return await done
  } catch (error) {
    doc.destroy(error instanceof Error ? error : new Error('PDF export failed'))
    await done.catch(() => undefined)
    throw error
  } finally {
    signal?.removeEventListener('abort', abort)
  }
}
