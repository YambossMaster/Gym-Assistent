import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarDays,
  ChartNoAxesCombined,
  Download,
  FileText,
  WalletCards,
  X
} from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  ApiError,
  downloadExport,
  getExerciseLibrary,
  listStudents,
  request,
  type ExportRequest,
  type PlanAccess,
  type Student
} from '../../api'
import { FormSelect } from '../../shared/FormSelect'
import { SettingsPanelHeading } from '../../shared/primitives'
import { useDialogBehavior } from '../../shared/useDialogBehavior'
import { planAccessKey } from '../../beta-admission/usePlanAccess'
import { PlanAccessMark } from '../../beta-admission/PlanAccessMark'
import { PlanUpsellDialog } from '../../beta-admission/PlanLocked'
import { SeriesDatePicker } from '../students/SeriesDatePicker'
import type { VenueData } from '../students/finance-api'

type Kind = ExportRequest['type']
type Format = ExportRequest['format']
const types = [
  { value: 'training', label: '訓練紀錄', hint: '課程中的動作與組數', Icon: FileText },
  { value: 'growth', label: '成長軌跡數值', hint: '訓練表現的數值紀錄', Icon: ChartNoAxesCombined },
  { value: 'calendar', label: '行事曆', hint: '排課與行事曆區塊', Icon: CalendarDays },
  { value: 'finance', label: '收支明細', hint: '目前可見的收支列', Icon: WalletCards }
]

function workspaceDate(timeZone: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function dateCount(start: string, end: string): number {
  return (
    Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1
  )
}

function ExportDialog({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const { dialogRef, onBackdropPointerDown } = useDialogBehavior(onClose, { focusDialog: true })

  return createPortal(
    <div className="settings-export-dialog-backdrop" onPointerDown={onBackdropPointerDown}>
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="settings-export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-export-dialog-title"
      >
        <header>
          <div>
            <span className="eyebrow dark">資料與裝置</span>
            <h2 id="settings-export-dialog-title">設定匯出</h2>
            <p>選擇一種資料與格式，每次下載一個檔案。</p>
          </div>
          <button type="button" className="icon-button" aria-label="關閉匯出設定" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body
  )
}

export function ExportPanel({
  session,
  plan,
  timeZone,
  loadingError,
  onRetryLoading
}: {
  session: Session
  plan: PlanAccess | undefined
  timeZone: string | undefined
  loadingError: boolean
  onRetryLoading: () => void
}) {
  const [kind, setKind] = useState<Kind>('training')
  const [format, setFormat] = useState<Format>('csv')
  const [dates, setDates] = useState(() => {
    const end = workspaceDate(timeZone ?? 'Asia/Taipei')
    return { start: addDays(end, -29), end }
  })
  const [studentId, setStudentId] = useState('')
  const [definitionId, setDefinitionId] = useState('')
  const [venueId, setVenueId] = useState('')
  const [includeBlocks, setIncludeBlocks] = useState(false)
  const [income, setIncome] = useState(true)
  const [expense, setExpense] = useState(true)
  const [reference, setReference] = useState(true)
  const [includePrivateNotes, setIncludePrivateNotes] = useState(false)
  const [notice, setNotice] = useState('')
  const [downloaded, setDownloaded] = useState('')
  const [planDenied, setPlanDenied] = useState(false)
  const [upsellOpen, setUpsellOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const queryClient = useQueryClient()
  const prime = plan?.tier === 'advanced' && !planDenied
  const locked = !loadingError && Boolean(plan && timeZone) && !prime

  useEffect(() => {
    if (!timeZone) return
    const end = workspaceDate(timeZone)
    setDates({ start: addDays(end, format === 'pdf' ? -6 : -29), end })
  }, [timeZone])
  useEffect(() => {
    setIncludePrivateNotes(false)
    setDownloaded('')
    setPlanDenied(false)
    setExportOpen(false)
    setUpsellOpen(false)
  }, [session.user.id])
  useEffect(() => {
    if (plan?.tier === 'advanced') setPlanDenied(false)
  }, [plan?.tier])

  const studentQuery = useQuery({
    queryKey: ['export-students', session.user.id],
    queryFn: () => listStudents(session.access_token),
    enabled: prime && exportOpen && kind !== 'finance',
    staleTime: 30_000
  })
  const definitionQuery = useQuery({
    queryKey: ['export-definitions', session.user.id],
    queryFn: () => getExerciseLibrary(session.access_token),
    enabled: prime && exportOpen && kind === 'growth',
    staleTime: 30_000
  })
  const venueQuery = useQuery({
    queryKey: ['export-venues', session.user.id],
    queryFn: () => request<VenueData>('/api/v1/venues', session.access_token),
    enabled: prime && exportOpen && kind === 'finance',
    staleTime: 30_000
  })
  const mutation = useMutation({
    mutationFn: (selection: ExportRequest) => downloadExport(session.access_token, selection),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setDownloaded(filename)
      setIncludePrivateNotes(false)
      setNotice('檔案已開始下載。')
    },
    onError: (error) => {
      setDownloaded('')
      const code = error instanceof ApiError ? error.details.error : ''
      if (code === 'plan_required') {
        setPlanDenied(true)
        setExportOpen(false)
        setUpsellOpen(true)
        void queryClient.invalidateQueries({ queryKey: planAccessKey(session.user.id) })
      }
      setNotice(
        code === 'export_empty'
          ? '此區間無資料，請調整篩選條件。'
          : code === 'plan_required'
            ? '資料匯出需要 Prime 方案。請到「方案與帳單」查看。'
            : code === 'export_too_large' ||
                code === 'export_processing_limit' ||
                (error instanceof DOMException && error.name === 'TimeoutError')
              ? '資料量過大，請縮小日期範圍或指定單一對象後再試。'
              : code === 'invalid_export_range'
                ? '日期範圍不符合此格式的限制。'
                : '目前無法匯出，請檢查連線後再試。'
      )
    }
  })
  const maxDays = format === 'pdf' ? 7 : 31
  const validDates =
    /^\d{4}-\d{2}-\d{2}$/.test(dates.start) &&
    /^\d{4}-\d{2}-\d{2}$/.test(dates.end) &&
    dates.start <= dates.end &&
    dateCount(dates.start, dates.end) <= maxDays
  const changeKind = (next: Kind) => {
    setKind(next)
    setStudentId('')
    setDefinitionId('')
    setVenueId('')
    setIncludeBlocks(false)
    setIncome(true)
    setExpense(true)
    setReference(true)
    setIncludePrivateNotes(false)
    setNotice('')
    setDownloaded('')
  }
  const changeFormat = (next: Format) => {
    setFormat(next)
    setDownloaded('')
    setNotice('')
    if (dateCount(dates.start, dates.end) > (next === 'pdf' ? 7 : 31)) {
      setDates({ start: addDays(dates.end, next === 'pdf' ? -6 : -30), end: dates.end })
      setNotice(`已將日期調整為 ${next === 'pdf' ? '7' : '31'} 天，請確認後下載。`)
    }
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!prime || !validDates || mutation.isPending) return
    setNotice('')
    setDownloaded('')
    mutation.mutate({
      type: kind,
      format,
      start: dates.start,
      end: dates.end,
      ...(kind !== 'finance' && studentId ? { studentId } : {}),
      ...(kind === 'growth' && definitionId ? { definitionId } : {}),
      ...(kind === 'finance' && venueId ? { venueId } : {}),
      ...(kind === 'calendar' ? { includeBlocks } : {}),
      ...(kind === 'finance' ? { income, expense, reference } : {}),
      includePrivateNotes
    })
  }

  return (
    <section className="settings-panel settings-export-panel" aria-label="匯出資料">
      <div className="settings-export-heading">
        <SettingsPanelHeading eyebrow="DATA EXPORT" title="匯出資料" />
        {locked && <PlanAccessMark tier="Prime" />}
      </div>
      <p className="settings-export-intro">
        選擇一種資料與格式，每次下載一個檔案。匯出檔可供查閱與分析，無法用來還原工作台。
      </p>
      {loadingError ? (
        <div className="settings-export-message" role="alert">
          <p>方案或工作台時區暫時無法讀取。</p>
          <button type="button" onClick={onRetryLoading}>
            重新讀取
          </button>
        </div>
      ) : !plan || !timeZone ? (
        <p role="status">正在讀取方案與工作台時區…</p>
      ) : (
        <div className="settings-row settings-export-entry-row">
          <div className="settings-row-copy">
            <strong>匯出設定</strong>
            <span>選擇資料類型、檔案格式與日期範圍。</span>
          </div>
          <button
            type="button"
            className="settings-row-action"
            onClick={() => (locked ? setUpsellOpen(true) : setExportOpen(true))}
            aria-label={locked ? '設定匯出，需 Prime 方案' : '開啟匯出設定'}
          >
            設定匯出 <ArrowRight aria-hidden="true" />
          </button>
        </div>
      )}
      {exportOpen && prime && (
        <ExportDialog onClose={() => setExportOpen(false)}>
          <form className="settings-export-form" onSubmit={submit}>
            <div className="settings-export-form-body">
              <div className="settings-export-step">
                <div className="settings-export-step-heading">
                  <span>01</span>
                  <h3>選擇資料</h3>
                </div>
                <div className="settings-export-type-grid" role="group" aria-label="資料類型">
                  {types.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className="settings-export-type"
                      aria-pressed={kind === item.value}
                      onClick={() => changeKind(item.value as Kind)}
                    >
                      <item.Icon aria-hidden="true" />
                      <strong className="ui-text-body-compact">{item.label}</strong>
                      <span className="ui-text-secondary">{item.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-export-step">
                <div className="settings-export-step-heading">
                  <span>02</span>
                  <h3>選擇格式</h3>
                </div>
                <div className="settings-export-format-options" role="group" aria-label="檔案格式">
                  {(['csv', 'json', 'pdf'] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={format === item}
                      onClick={() => changeFormat(item)}
                    >
                      {item.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-export-step">
                <div className="settings-export-step-heading">
                  <span>03</span>
                  <h3>設定範圍</h3>
                </div>
                <div className="settings-export-fields">
                  <SeriesDatePicker
                    label="開始日期"
                    calendarClassName="settings-export-calendar"
                    value={dates.start}
                    onChange={(start) => {
                      setDates((current) => ({ ...current, start }))
                      setDownloaded('')
                    }}
                  />
                  <SeriesDatePicker
                    label="結束日期"
                    calendarClassName="settings-export-calendar"
                    value={dates.end}
                    onChange={(end) => {
                      setDates((current) => ({ ...current, end }))
                      setDownloaded('')
                    }}
                  />
                </div>
                <p className="settings-export-hint">
                  以 {timeZone} 的日期為準；
                  {format === 'pdf'
                    ? 'PDF 最多 7 天、500 筆。'
                    : 'CSV／JSON 最多 31 天、2,000 筆。'}
                </p>
                {!validDates && (
                  <p className="form-error" role="alert">
                    請選擇不超過 {maxDays} 天的有效日期範圍。
                  </p>
                )}
                {kind !== 'finance' && (
                  <FormSelect
                    label="學員"
                    value={studentId}
                    onChange={setStudentId}
                    options={[
                      { value: '', label: '全部學員' },
                      ...(studentQuery.data ?? []).map((student: Student) => ({
                        value: student.id,
                        label: student.name
                      }))
                    ]}
                    disabled={studentQuery.isPending || studentQuery.isError}
                  />
                )}
                {kind === 'growth' && (
                  <FormSelect
                    label="動作"
                    value={definitionId}
                    onChange={setDefinitionId}
                    options={[
                      { value: '', label: '全部動作' },
                      ...(definitionQuery.data?.definitions ?? []).map((definition) => ({
                        value: definition.id,
                        label: definition.name
                      }))
                    ]}
                    disabled={definitionQuery.isPending || definitionQuery.isError}
                  />
                )}
                {kind === 'finance' && (
                  <FormSelect
                    label="場地"
                    value={venueId}
                    onChange={setVenueId}
                    options={[
                      { value: '', label: '全部場地' },
                      ...(venueQuery.data?.venues ?? []).map((venue) => ({
                        value: venue.id,
                        label: venue.name
                      }))
                    ]}
                    disabled={venueQuery.isPending || venueQuery.isError}
                  />
                )}
                {((studentQuery.isError && kind !== 'finance') ||
                  (definitionQuery.isError && kind === 'growth') ||
                  (venueQuery.isError && kind === 'finance')) && (
                  <p className="form-error" role="alert">
                    篩選項目暫時無法讀取，請稍後再試。
                  </p>
                )}
                {kind === 'calendar' && (
                  <label className="settings-export-check">
                    <input
                      type="checkbox"
                      checked={includeBlocks}
                      onChange={(event) => setIncludeBlocks(event.target.checked)}
                    />
                    包含行事曆區塊
                  </label>
                )}
                {kind === 'finance' && (
                  <div className="settings-export-checks" aria-label="收支方向">
                    <label>
                      <input
                        type="checkbox"
                        checked={income}
                        onChange={(event) => setIncome(event.target.checked)}
                      />
                      收入
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={expense}
                        onChange={(event) => setExpense(event.target.checked)}
                      />
                      支出
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={reference}
                        onChange={(event) => setReference(event.target.checked)}
                      />
                      參考列
                    </label>
                  </div>
                )}
                {kind !== 'growth' && (
                  <label className="settings-export-check">
                    <input
                      type="checkbox"
                      checked={includePrivateNotes}
                      onChange={(event) => setIncludePrivateNotes(event.target.checked)}
                    />
                    包含私人備註（僅限本次下載）
                  </label>
                )}
              </div>
            </div>
            <footer className="settings-export-footer">
              <div className="settings-export-footer-copy">
                <p className="settings-export-privacy">
                  檔案可能包含學員與財務資料，下載後請妥善保管。
                </p>
                {notice && (
                  <p
                    className={downloaded ? 'settings-export-success' : 'settings-export-message'}
                    role="status"
                  >
                    {notice}
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="settings-export-download"
                disabled={
                  !validDates ||
                  mutation.isPending ||
                  (kind !== 'finance' && (studentQuery.isPending || studentQuery.isError)) ||
                  (kind === 'growth' && (definitionQuery.isPending || definitionQuery.isError)) ||
                  (kind === 'finance' && (venueQuery.isPending || venueQuery.isError))
                }
              >
                <Download aria-hidden="true" />
                {mutation.isPending ? '正在產生檔案…' : '下載檔案'}
              </button>
            </footer>
          </form>
        </ExportDialog>
      )}
      {upsellOpen && (
        <PlanUpsellDialog
          title="匯出資料"
          requiredTier="Prime"
          onClose={() => setUpsellOpen(false)}
        />
      )}
    </section>
  )
}
