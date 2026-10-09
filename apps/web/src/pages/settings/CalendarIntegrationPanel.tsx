import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { ApiError, request } from '../../api'
import { SettingsPanelHeading } from '../../shared/primitives'
import { FormSelect } from '../../shared/FormSelect'
import { PlanAccessMark } from '../../beta-admission/PlanAccessMark'
import { PlanUpsellDialog } from '../../beta-admission/PlanLocked'
import { planAccessKey } from '../../beta-admission/usePlanAccess'
import { SeriesDatePicker } from '../students/SeriesDatePicker'
import type { DataPanelProps } from './FinanceExportPanel'
import { DataDialog, dataError, rangePreset, validRange, workspaceDate } from './data-tools'
import { useExportDownloads } from './ExportDownloads'

type Sharing = { includeBlocks: boolean; showNames: boolean; showLocation: boolean }
type State = Sharing & { version: number; active: boolean }
const defaults: Sharing = { includeBlocks: false, showNames: false, showLocation: true }
const sharingOnly = (s: Sharing): Sharing => ({
  includeBlocks: s.includeBlocks,
  showNames: s.showNames,
  showLocation: s.showLocation
})
const key = (user: string) => ['calendar-integration', user]
function SharingFields({
  value,
  onChange,
  disabled = false
}: {
  value: Sharing
  onChange: (s: Sharing) => void
  disabled?: boolean
}) {
  return (
    <div className="settings-export-checks">
      {(
        [
          ['includeBlocks', '包含行事曆區塊'],
          ['showNames', '顯示學員姓名'],
          ['showLocation', '顯示地點']
        ] as const
      ).map(([field, label]) => (
        <label key={field}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={value[field]}
            onChange={(e) => onChange({ ...value, [field]: e.target.checked })}
          />
          {label}
        </label>
      ))}
      {value.showNames && (
        <p className="settings-export-privacy">學員姓名會傳送到你使用的日曆服務。</p>
      )}
    </div>
  )
}
export function CalendarIntegrationPanel(props: DataPanelProps) {
  const { session, plan, timeZone, loadingError, onRetryLoading } = props
  const [open, setOpen] = useState(false),
    [upsell, setUpsell] = useState(false)
  const state = useQuery({
    queryKey: key(session.user.id),
    queryFn: () => request<State>('/api/v1/calendar-integration', session.access_token),
    enabled: Boolean(plan)
  })
  const prime = plan?.tier === 'advanced'
  useEffect(() => {
    setOpen(false)
    setUpsell(false)
  }, [session.user.id])
  return (
    <section className="settings-panel settings-export-panel" aria-label="日曆整合">
      <div className="settings-export-heading">
        <SettingsPanelHeading eyebrow="CALENDAR INTEGRATION" title="日曆整合" />
        {plan && !prime && <PlanAccessMark tier="Prime" />}
      </div>
      {loadingError ? (
        <p role="alert">
          方案或時區暫時無法讀取。<button onClick={onRetryLoading}>重新讀取</button>
        </p>
      ) : !plan || !timeZone ? (
        <p role="status">正在讀取設定…</p>
      ) : (
        <>
          <div className="settings-row settings-export-entry-row">
            <div className="settings-row-copy">
              <strong>連接慣用日曆</strong>
              <span>在 Apple 或 Google 日曆查看課程與行程。</span>
            </div>
            <button
              className="settings-row-action"
              onClick={() => (prime ? setOpen(true) : setUpsell(true))}
            >
              設定日曆 <ArrowRight aria-hidden="true" />
            </button>
          </div>
          {!prime && state.data?.version !== undefined && state.data.version > 0 && (
            <button className="settings-row-action" onClick={() => setOpen(true)}>
              管理現有訂閱
            </button>
          )}
        </>
      )}
      {open && timeZone && (
        <CalendarDialog
          key={session.user.id}
          {...props}
          timeZone={timeZone}
          onClose={() => setOpen(false)}
          onDenied={() => {
            setOpen(false)
            setUpsell(true)
          }}
        />
      )}
      {upsell && (
        <PlanUpsellDialog title="日曆整合" requiredTier="Prime" onClose={() => setUpsell(false)} />
      )}
    </section>
  )
}
function CalendarDialog({
  session,
  plan,
  timeZone,
  onClose,
  onDenied
}: DataPanelProps & { timeZone: string; onClose: () => void; onDenied: () => void }) {
  const client = useQueryClient(),
    prime = plan?.tier === 'advanced'
  const query = useQuery({
    queryKey: key(session.user.id),
    queryFn: () => request<State>('/api/v1/calendar-integration', session.access_token)
  })
  const [sharing, setSharing] = useState<Sharing>(defaults),
    [loadedVersion, setLoadedVersion] = useState<number | null>(null)
  const [token, setToken] = useState(''),
    [pending, setPending] = useState(false),
    [notice, setNotice] = useState(''),
    [confirm, setConfirm] = useState<'reset' | 'disable' | null>(null)
  const [downloadSharing, setDownloadSharing] = useState<Sharing>(defaults),
    [preset, setPreset] = useState('future'),
    [dates, setDates] = useState(() => rangePreset('future', workspaceDate(timeZone)))
  const downloads = useExportDownloads()
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    if (loadedVersion === null && query.data) {
      setSharing(sharingOnly(query.data))
      setLoadedVersion(query.data.version)
    }
  }, [query.data, loadedVersion])
  useEffect(() => {
    if (!prime) setToken('')
  }, [prime])
  const change = async (action: 'create' | 'reset' | 'update' | 'disable') => {
    if (pending || loadedVersion === null) return
    if (action !== 'disable' && !prime) {
      onDenied()
      return
    }
    setPending(true)
    setNotice('')
    try {
      const result = await request<State & { token?: string }>(
        '/api/v1/calendar-integration',
        session.access_token,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action,
            version: loadedVersion,
            ...(action !== 'disable' ? { sharing } : {})
          })
        }
      )
      if (!mounted.current) return
      client.setQueryData(key(session.user.id), {
        version: result.version,
        active: result.active,
        includeBlocks: result.includeBlocks,
        showNames: result.showNames,
        showLocation: result.showLocation
      })
      if (mounted.current) {
        setLoadedVersion(result.version)
        setSharing(sharingOnly(result))
        setConfirm(null)
        if (action !== 'update') setToken(result.token ?? '')
        setNotice(
          action === 'disable'
            ? '訂閱已停用。外部日曆可能仍保留先前內容。'
            : action === 'update'
              ? '設定已儲存，將在日曆服務下次讀取時更新。'
              : '訂閱連結已建立。請在關閉前複製或加入日曆。'
        )
      }
    } catch (e) {
      if (mounted.current) {
        setNotice(dataError(e))
        if (e instanceof ApiError && e.details.error === 'plan_required') {
          setToken('')
          onDenied()
          void client.invalidateQueries({ queryKey: planAccessKey(session.user.id) })
        } else void query.refetch()
      }
    } finally {
      if (mounted.current) setPending(false)
    }
  }
  const link = token ? `${window.location.origin}/api/v1/public/calendar/${token}.ics` : ''
  const download = () => {
    if (!prime) {
      onDenied()
      return
    }
    if (pending || downloads.pending || !validRange(dates.start, dates.end)) return
    if (
      downloads.start({
        label: `行事曆 · ${dates.start} — ${dates.end}`,
        path: '/api/v1/calendar-integration/download',
        input: { ...dates, ...downloadSharing }
      })
    )
      onClose()
  }
  return (
    <DataDialog title="日曆整合" onClose={onClose}>
      <div className="settings-export-form">
        <div className="settings-export-form-body" data-dialog-scroll-region>
          {query.isPending ? (
            <p role="status">正在讀取日曆設定…</p>
          ) : query.isError ? (
            <p role="alert">
              暫時無法讀取設定。<button onClick={() => void query.refetch()}>重試</button>
            </p>
          ) : (
            <>
              <div className="data-tools-section-heading">
                <h3>日曆訂閱</h3>
                <span>
                  {query.data.active
                    ? prime
                      ? '已啟用'
                      : 'Prime 已失效'
                    : query.data.version
                      ? '已停用'
                      : '尚未啟用'}
                </span>
              </div>
              <p className="settings-export-hint">
                過去 30 天至未來 180 天，僅包含已排定的課程。請在 Form Coach Desk 修改行程。
              </p>
              <SharingFields
                value={sharing}
                onChange={(s) => {
                  setSharing(s)
                  setNotice('')
                }}
                disabled={pending || !prime}
              />
              <div className="data-tools-calendar-preview" aria-label="日曆內容範例">
                <small>範例</small>
                <strong>{sharing.showNames ? '教練課程 · 範例學員' : '教練課程'}</strong>
                <span>09:00 — 10:00{sharing.showLocation ? ' · 範例場地' : ''}</span>
              </div>
              <p className="settings-export-privacy">
                訂閱網址可讀取你選擇的行程資訊，請勿公開分享。更新時間由日曆服務決定。
              </p>
              {link && (
                <div className="data-tools-link">
                  <label>
                    訂閱網址
                    <input readOnly value={link} onFocus={(e) => e.target.select()} />
                  </label>
                  <div className="data-tools-actions">
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(link)
                          setNotice('訂閱網址已複製。')
                        } catch {
                          setNotice('無法自動複製，請選取上方網址後複製。')
                        }
                      }}
                    >
                      複製網址
                    </button>
                    <a href={link.replace(/^https?:/, 'webcal:')} referrerPolicy="no-referrer">
                      加入 Apple 日曆
                    </a>
                  </div>
                  <p className="settings-export-hint">
                    網址僅在建立當次顯示。關閉後需要新網址時，請重設並重新訂閱。
                  </p>
                </div>
              )}
              <details className="data-tools-options">
                <summary>如何加入 Google／Apple 日曆</summary>
                <p>Google：在電腦版 Google 日曆選「其他日曆 → 新增 → 透過網址」，貼上訂閱網址。</p>
                <p>Apple：在日曆選「加入日曆 → 加入訂閱日曆」，貼上訂閱網址。</p>
                <p>加入後的更新由日曆服務處理，不會即時同步，也不會把外部修改寫回本產品。</p>
              </details>
              <div className="data-tools-actions">
                {query.data.active ? (
                  <>
                    <button disabled={pending} onClick={() => void change('update')}>
                      儲存設定
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => (prime ? setConfirm('reset') : onDenied())}
                    >
                      重設訂閱連結
                    </button>
                    <button disabled={pending} onClick={() => setConfirm('disable')}>
                      停用訂閱
                    </button>
                  </>
                ) : (
                  <button disabled={pending} onClick={() => void change('create')}>
                    建立訂閱連結
                  </button>
                )}
              </div>
              {query.data.version !== loadedVersion && (
                <p role="alert">
                  設定已更新。
                  <button
                    disabled={pending}
                    onClick={() => {
                      setSharing(sharingOnly(query.data))
                      setLoadedVersion(query.data.version)
                      setToken('')
                      setNotice('')
                    }}
                  >
                    重新載入設定
                  </button>
                </p>
              )}
              {confirm && (
                <div className="data-tools-confirm" role="group" aria-label="確認訂閱變更">
                  <p>
                    {confirm === 'reset'
                      ? '舊連結將失效，所有既有訂閱都需要重新加入。'
                      : '停用後不再提供行程。外部日曆已下載的內容可能仍會保留。'}
                  </p>
                  <button disabled={pending} onClick={() => void change(confirm)}>
                    確認{confirm === 'reset' ? '重設' : '停用'}
                  </button>
                  <button disabled={pending} onClick={() => setConfirm(null)}>
                    取消
                  </button>
                </div>
              )}
              <details className="data-tools-options">
                <summary>下載行程檔（ICS）</summary>
                <p>一次性匯入後不會自動更新；需要後續改期更新時，請使用日曆訂閱。</p>
                <FormSelect
                  label="期間"
                  required
                  value={preset}
                  onChange={(p) => {
                    setPreset(p)
                    if (p !== 'custom')
                      setDates(
                        rangePreset(p === 'month' ? 'calendar-month' : p, workspaceDate(timeZone))
                      )
                  }}
                  options={[
                    { value: 'future', label: '未來 30 天' },
                    { value: 'month', label: '本月' },
                    { value: 'next-month', label: '下個月' },
                    { value: 'custom', label: '自訂' }
                  ]}
                  disabled={pending}
                />
                <div className="settings-export-fields">
                  <SeriesDatePicker
                    label="開始日期"
                    value={dates.start}
                    disabled={pending}
                    onChange={(start) => {
                      setPreset('custom')
                      setDates({ ...dates, start })
                    }}
                  />
                  <SeriesDatePicker
                    label="結束日期"
                    value={dates.end}
                    disabled={pending}
                    onChange={(end) => {
                      setPreset('custom')
                      setDates({ ...dates, end })
                    }}
                  />
                </div>
                <SharingFields
                  value={downloadSharing}
                  onChange={setDownloadSharing}
                  disabled={pending}
                />
                {!validRange(dates.start, dates.end) && (
                  <p className="form-error">日期區間不可超過 366 日。</p>
                )}
                <button
                  disabled={pending || downloads.pending || !validRange(dates.start, dates.end)}
                  onClick={() => void download()}
                >
                  下載 ICS
                </button>
              </details>
            </>
          )}
        </div>
        <footer className="settings-export-footer">
          <p className="data-tools-status" role="status">
            {pending ? '正在處理…' : notice}
          </p>
          <button className="settings-row-action" onClick={onClose}>
            完成
          </button>
        </footer>
      </div>
    </DataDialog>
  )
}
