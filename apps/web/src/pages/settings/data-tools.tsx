import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { ApiError } from '../../api'
import { useDialogBehavior } from '../../shared/useDialogBehavior'
export function DataDialog({
  title,
  children,
  onClose
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  const { dialogRef, onBackdropPointerDown } = useDialogBehavior(onClose, { focusDialog: true })
  return createPortal(
    <div className="settings-export-dialog-backdrop" onPointerDown={onBackdropPointerDown}>
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="settings-export-dialog ui-settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-dialog-title"
      >
        <header>
          <div>
            <span className="eyebrow dark">資料與裝置</span>
            <h2 id="data-dialog-title">{title}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={`關閉${title}`}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body
  )
}
export function workspaceDate(zone: string) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
export function rangePreset(preset: string, today: string) {
  const year = Number(today.slice(0, 4)),
    month = Number(today.slice(5, 7)),
    first = `${year}-${String(month).padStart(2, '0')}-01`
  if (preset === 'year') return { start: `${year}-01-01`, end: today }
  if (preset === 'last-year') return { start: `${year - 1}-01-01`, end: `${year - 1}-12-31` }
  if (preset === 'month') return { start: first, end: today }
  if (preset === 'calendar-month')
    return { start: first, end: addDays(addDays(first, 32).slice(0, 7) + '-01', -1) }
  if (preset === 'future') return { start: today, end: addDays(today, 29) }
  if (preset === 'next-month') {
    const next = addDays(first, 32).slice(0, 7) + '-01'
    return { start: next, end: addDays(addDays(next, 32).slice(0, 7) + '-01', -1) }
  }
  const end = addDays(first, -1)
  return { start: end.slice(0, 7) + '-01', end }
}
export function validRange(start: string, end: string, today?: string) {
  return (
    [start, end].every(
      (d) =>
        /^\d{4}-\d{2}-\d{2}$/.test(d) &&
        Number.isFinite(Date.parse(`${d}T00:00:00Z`)) &&
        new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d
    ) &&
    start <= end &&
    (Date.parse(end) - Date.parse(start)) / 86400000 < 366 &&
    (!today || end <= today)
  )
}
export async function prepareDataFile(
  path: string,
  accessToken: string,
  input: unknown,
  signal: AbortSignal
) {
  const response = await fetch(path, {
    method: 'POST',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
    signal: AbortSignal.any([signal, AbortSignal.timeout(35000)]),
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!response.ok) {
    const details = await response.json().catch(() => ({}))
    throw new ApiError(response.status, details.message ?? '暫時無法下載', details)
  }
  const encoded = response.headers
    .get('content-disposition')
    ?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (!encoded) throw new Error('檔名無效')
  const filename = decodeURIComponent(encoded),
    blob = await response.blob()
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
  return { filename, blob }
}
export function saveDataFile({ filename, blob }: { filename: string; blob: Blob }) {
  const url = URL.createObjectURL(blob),
    anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
  return filename
}
export async function downloadData(
  path: string,
  accessToken: string,
  input: unknown,
  signal: AbortSignal
) {
  return saveDataFile(await prepareDataFile(path, accessToken, input, signal))
}
export function dataError(error: unknown) {
  const code = error instanceof ApiError ? error.details.error : ''
  return code === 'export_busy'
    ? '已有檔案正在處理，請稍後再試。'
    : code === 'export_empty'
      ? '此期間沒有可匯出的紀錄。'
      : code === 'export_source_limit'
        ? '帳本資料量超過處理上限，請聯絡支援協助匯出。'
        : code === 'version_conflict'
          ? '設定已在其他地方變更。請重新載入後再試。'
          : code === 'plan_required'
            ? '此功能需要 Prime 方案。'
            : code === 'export_too_large' || code === 'export_processing_limit'
              ? '資料量較大，請縮小範圍後再試。'
              : code === 'invalid_export_range'
                ? '請確認日期區間不超過 366 日。'
                : '暫時無法完成，請檢查連線後再試。'
}
