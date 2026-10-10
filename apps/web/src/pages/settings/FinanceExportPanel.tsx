import type { Session } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { request, type PlanAccess } from '../../api'
import { FormSelect } from '../../shared/FormSelect'
import { SettingsPanelHeading } from '../../shared/primitives'
import { PlanAccessMark } from '../../beta-admission/PlanAccessMark'
import { PlanUpsellDialog } from '../../beta-admission/PlanLocked'
import { useExportDownloads } from './ExportDownloads'
import { SeriesDatePicker } from '../students/SeriesDatePicker'
import type { VenueData } from '../students/finance-api'
import { DataDialog, rangePreset, validRange, workspaceDate } from './data-tools'

export type DataPanelProps = {
  session: Session
  plan: PlanAccess | undefined
  timeZone: string | undefined
  loadingError: boolean
  onRetryLoading: () => void
}
export function FinanceExportPanel({
  session,
  plan,
  timeZone,
  loadingError,
  onRetryLoading
}: DataPanelProps) {
  const [open, setOpen] = useState(false),
    [upsell, setUpsell] = useState(false)
  const prime = plan?.tier === 'advanced'
  useEffect(() => {
    setOpen(false)
    setUpsell(false)
  }, [session.user.id])
  return (
    <section className="settings-panel settings-export-panel" aria-label="匯出收支明細">
      <div className="settings-export-heading">
        <SettingsPanelHeading eyebrow="FINANCE EXPORT" title="匯出收支明細" />
        {plan && !prime && <PlanAccessMark tier="Prime" />}
      </div>
      {loadingError ? (
        <div role="alert">
          方案或工作時區暫時無法讀取。<button onClick={onRetryLoading}>重新讀取</button>
        </div>
      ) : !plan || !timeZone ? (
        <p role="status">正在讀取設定…</p>
      ) : (
        <div className="settings-row settings-export-entry-row">
          <div className="settings-row-copy">
            <strong>收支報表</strong>
            <span>下載指定期間的收支，供記帳與會計整理。</span>
          </div>
          <button
            className="settings-row-action"
            onClick={() => (prime ? setOpen(true) : setUpsell(true))}
          >
            設定匯出 <ArrowRight aria-hidden="true" />
          </button>
        </div>
      )}
      {open && timeZone && prime && (
        <FinanceDialog
          key={session.user.id}
          session={session}
          timeZone={timeZone}
          onClose={() => setOpen(false)}
        />
      )}
      {upsell && (
        <PlanUpsellDialog
          title="匯出收支明細"
          requiredTier="Prime"
          onClose={() => setUpsell(false)}
        />
      )}
    </section>
  )
}
function FinanceDialog({
  session,
  timeZone,
  onClose
}: {
  session: Session
  timeZone: string
  onClose: () => void
}) {
  const today = workspaceDate(timeZone),
    [preset, setPreset] = useState('last-month'),
    [dates, setDates] = useState(() => rangePreset('last-month', today)),
    [year, setYear] = useState(today.slice(0, 4))
  const [venueId, setVenue] = useState(''),
    [format, setFormat] = useState('xlsx'),
    [notes, setNotes] = useState(false),
    [notice, setNotice] = useState('')
  const { pending, start } = useExportDownloads()
  const venues = useQuery({
    queryKey: ['export-venues', session.user.id],
    queryFn: () => request<VenueData>('/api/v1/venues', session.access_token)
  })
  const valid = validRange(dates.start, dates.end, today)
  const submit = () => {
    if (pending || !valid) return
    if (
      start({
        label: `收支明細 · ${dates.start} — ${dates.end} · ${format.toUpperCase()}`,
        path: '/api/v1/finance-export',
        input: { ...dates, format, ...(venueId ? { venueId } : {}), includePrivateNotes: notes }
      })
    )
      onClose()
  }
  return (
    <DataDialog title="匯出收支明細" onClose={onClose}>
      <form
        className="settings-export-form"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className="settings-export-form-body" data-dialog-scroll-region>
          <section className="settings-export-step" aria-labelledby="finance-export-when">
            <div className="settings-export-step-heading">
              <span>01</span>
              <h3 id="finance-export-when">時間區間</h3>
            </div>
            <div className="settings-export-field">
              <span className="settings-export-field-label">快速選擇區間</span>
              <FormSelect
                label="快速選擇區間"
                required
                value={preset}
                onChange={(p) => {
                  setPreset(p)
                  if (p !== 'custom') setDates(rangePreset(p, today))
                  setNotice('')
                }}
                options={[
                  { value: 'last-month', label: '上個月' },
                  { value: 'month', label: '本月' },
                  { value: 'year', label: '今年' },
                  { value: 'last-year', label: '去年' },
                  { value: 'custom', label: '自訂' }
                ]}
                disabled={pending}
              />
            </div>
            {preset === 'custom' && (
              <div className="data-tools-year">
                <label>
                  快速選取年度
                  <input
                    type="number"
                    min="1900"
                    max={Number(today.slice(0, 4))}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  disabled={
                    !/^\d{4}$/.test(year) ||
                    Number(year) < 1900 ||
                    Number(year) > Number(today.slice(0, 4)) ||
                    pending
                  }
                  onClick={() => {
                    setDates({
                      start: `${year}-01-01`,
                      end: year === today.slice(0, 4) ? today : `${year}-12-31`
                    })
                    setNotice('')
                  }}
                >
                  套用年度
                </button>
              </div>
            )}
            <div className="settings-export-fields">
              <SeriesDatePicker
                label="開始日期"
                value={dates.start}
                disabled={pending}
                onChange={(start) => {
                  setPreset('custom')
                  setDates({ ...dates, start })
                  setNotice('')
                }}
              />
              <SeriesDatePicker
                label="結束日期"
                value={dates.end}
                disabled={pending}
                onChange={(end) => {
                  setPreset('custom')
                  setDates({ ...dates, end })
                  setNotice('')
                }}
              />
            </div>
            <p className="settings-export-hint">
              可選擇歷史年度，每次最多 366 日；以 {timeZone} 為準。
            </p>
            {!valid && <p className="form-error">請選擇不含未來日期、最多 366 日的區間。</p>}
          </section>

          <section className="settings-export-step" aria-labelledby="finance-export-what">
            <div className="settings-export-step-heading">
              <span>02</span>
              <h3 id="finance-export-what">資料篩選</h3>
            </div>
            <div className="settings-export-field">
              <span className="settings-export-field-label">場地篩選</span>
              <FormSelect
                label="場地篩選"
                value={venueId}
                onChange={(v) => {
                  setVenue(v)
                  setNotice('')
                }}
                disabled={pending || venues.isPending || venues.isError}
                options={[
                  { value: '', label: '全部場地' },
                  { value: 'none', label: '未指定場地' },
                  ...(venues.data?.venues ?? []).map((v) => ({ value: v.id, label: v.name }))
                ]}
              />
            </div>
            {venues.isError && (
              <p role="alert">
                場地暫時無法讀取。
                <button type="button" onClick={() => void venues.refetch()}>
                  重試
                </button>
              </p>
            )}
          </section>

          <section className="settings-export-step" aria-labelledby="finance-export-how">
            <div className="settings-export-step-heading">
              <span>03</span>
              <h3 id="finance-export-how">匯出設定</h3>
            </div>
            <div className="settings-export-field">
              <span className="settings-export-field-label">匯出格式</span>
              <FormSelect
                label="匯出格式"
                required
                value={format}
                onChange={(f) => {
                  setFormat(f)
                  setNotice('')
                }}
                disabled={pending}
                options={[
                  { value: 'xlsx', label: 'Excel · 摘要與明細' },
                  { value: 'csv', label: 'CSV · 收支明細' }
                ]}
              />
            </div>
            <label className="settings-export-check settings-export-option">
              <input
                type="checkbox"
                checked={notes}
                disabled={pending}
                onChange={(e) => {
                  setNotes(e.target.checked)
                  setNotice('')
                }}
              />
              包含收支私人備註（僅限本次）
            </label>
          </section>
        </div>
        <footer className="settings-export-footer">
          <div className="settings-export-footer-copy">
            <p className="settings-export-summary">
              {dates.start} — {dates.end} · {format.toUpperCase()}
              {' · '}
              {venueId === 'none'
                ? '未指定場地'
                : venueId
                  ? venues.data?.venues.find((v) => v.id === venueId)?.name
                  : '全部場地'}
              {notes ? ' · 含私人備註' : ''}
            </p>
            <p className="settings-export-privacy">檔案含財務資料，請妥善保管。</p>
            <p className="data-tools-status" role="status">
              {pending ? '正在產生檔案…' : notice}
            </p>
          </div>
          <button
            type="submit"
            className="settings-export-download"
            disabled={!valid || pending || venues.isPending || venues.isError}
          >
            <Download aria-hidden="true" />
            {pending ? '正在產生…' : format === 'xlsx' ? '下載 Excel' : '下載 CSV'}
          </button>
        </footer>
      </form>
    </DataDialog>
  )
}
