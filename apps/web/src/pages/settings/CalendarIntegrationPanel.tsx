import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, ChevronDown, Copy } from 'lucide-react'
import { ApiError, request } from '../../api'
import { Confirmation, SettingsPanelHeading } from '../../shared/primitives'
import { FormSelect } from '../../shared/FormSelect'
import { PlanAccessMark } from '../../beta-admission/PlanAccessMark'
import { PlanUpsellDialog } from '../../beta-admission/PlanLocked'
import { planAccessKey } from '../../beta-admission/usePlanAccess'
import { SeriesDatePicker } from '../students/SeriesDatePicker'
import type { DataPanelProps } from './FinanceExportPanel'
import { DataDialog, dataError, rangePreset, validRange, workspaceDate } from './data-tools'
import { useExportDownloads } from './ExportDownloads'

type Sharing = { includeBlocks: boolean; showNames: boolean; showLocation: boolean }
type State = Sharing & { version: number; active: boolean; expired?: boolean; token?: string }
const defaults: Sharing = { includeBlocks: false, showNames: false, showLocation: true }
const sharingOnly = (state: Sharing): Sharing => ({
  includeBlocks: false,
  showNames: state.showNames,
  showLocation: state.showLocation
})
const key = (user: string) => ['calendar-integration', user]

function SharingFields({
  value,
  onChange,
  disabled = false
}: {
  value: Sharing
  onChange: (sharing: Sharing) => void
  disabled?: boolean
}) {
  return (
    <div className="settings-export-checks">
      {(
        [
          ['showNames', '顯示學員姓名'],
          ['showLocation', '顯示地點']
        ] as const
      ).map(([field, label]) => (
        <label key={field}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={value[field]}
            onChange={(event) => onChange({ ...value, [field]: event.target.checked })}
          />
          {label}
        </label>
      ))}
    </div>
  )
}

export function CalendarIntegrationPanel(props: DataPanelProps) {
  const { session, plan, timeZone, loadingError, onRetryLoading } = props
  const [open, setOpen] = useState(false)
  const [upsell, setUpsell] = useState(false)
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
  const client = useQueryClient()
  const prime = plan?.tier === 'advanced'
  const query = useQuery({
    queryKey: key(session.user.id),
    queryFn: () => request<State>('/api/v1/calendar-integration', session.access_token)
  })
  const [sharing, setSharing] = useState<Sharing>(defaults)
  const [loadedVersion, setLoadedVersion] = useState<number | null>(null)
  const [tab, setTab] = useState<'subscription' | 'download'>('subscription')
  const [pending, setPending] = useState(false)
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null)
  const [confirm, setConfirm] = useState<'reset' | 'disable' | null>(null)
  const [downloadSharing, setDownloadSharing] = useState<Sharing>(defaults)
  const [preset, setPreset] = useState('future')
  const [dates, setDates] = useState(() => rangePreset('future', workspaceDate(timeZone)))
  const downloads = useExportDownloads()
  const mounted = useRef(true)
  const scrollRegion = useRef<HTMLDivElement>(null)

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
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [toast])
  useLayoutEffect(() => {
    if (scrollRegion.current) scrollRegion.current.scrollTop = 0
  }, [tab])

  const notify = (message: string, error = false) => setToast({ message, error })
  const change = async (
    action: 'create' | 'reset' | 'update' | 'disable',
    nextSharing: Sharing = sharing
  ) => {
    if (pending || loadedVersion === null) return
    if (action !== 'disable' && !prime) {
      onDenied()
      return
    }
    setPending(true)
    setToast(null)
    try {
      const result = await request<State>('/api/v1/calendar-integration', session.access_token, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action,
          version: loadedVersion,
          ...(action !== 'disable' ? { sharing: nextSharing } : {})
        })
      })
      if (!mounted.current) return
      client.setQueryData(key(session.user.id), result)
      setLoadedVersion(result.version)
      setSharing(sharingOnly(result))
      setConfirm(null)
      if (action !== 'update')
        notify(
          action === 'disable'
            ? '訂閱已停用。外部日曆可能仍保留先前內容。'
            : action === 'reset'
              ? '訂閱網址已重設，請將新網址重新加入日曆。'
              : '訂閱已啟用，網址可隨時回來複製。'
        )
    } catch (error) {
      if (!mounted.current) return
      notify(dataError(error), true)
      if (error instanceof ApiError && error.details.error === 'plan_required') {
        onDenied()
        void client.invalidateQueries({ queryKey: planAccessKey(session.user.id) })
      } else void query.refetch()
    } finally {
      if (mounted.current) setPending(false)
    }
  }
  const updateSharing = (nextSharing: Sharing) => {
    setSharing(nextSharing)
    if (!query.data?.active || !prime || loadedVersion === null) return
    void change('update', nextSharing)
  }

  const link = query.data?.token
    ? `${window.location.origin}/api/v1/public/calendar/${query.data.token}.ics`
    : ''
  const download = () => {
    if (!prime) {
      onDenied()
      return
    }
    if (pending || downloads.pending || !validRange(dates.start, dates.end)) return
    downloads.start({
      label: `行事曆 · ${dates.start} — ${dates.end}`,
      path: '/api/v1/calendar-integration/download',
      input: { ...dates, ...downloadSharing }
    })
  }

  return (
    <DataDialog title="日曆整合" onClose={onClose}>
      <div className="settings-export-form">
        <div ref={scrollRegion} className="settings-export-form-body" data-dialog-scroll-region>
          {query.isPending ? (
            <p role="status">正在讀取日曆設定…</p>
          ) : query.isError ? (
            <p role="alert">
              暫時無法讀取設定。<button onClick={() => void query.refetch()}>重試</button>
            </p>
          ) : (
            <>
              <div className="calendar-integration-tabs" role="tablist" aria-label="日曆整合方式">
                <button
                  id="calendar-subscription-tab"
                  type="button"
                  role="tab"
                  aria-selected={tab === 'subscription'}
                  aria-controls="calendar-subscription-panel"
                  onClick={() => setTab('subscription')}
                >
                  <strong>日曆訂閱</strong>
                  <span>持續同步</span>
                </button>
                <button
                  id="calendar-download-tab"
                  type="button"
                  role="tab"
                  aria-selected={tab === 'download'}
                  aria-controls="calendar-download-panel"
                  onClick={() => setTab('download')}
                >
                  <strong>單次匯出</strong>
                  <span>下載 ICS</span>
                </button>
              </div>

              {tab === 'subscription' ? (
                <section
                  id="calendar-subscription-panel"
                  className="calendar-integration-panel"
                  role="tabpanel"
                  aria-labelledby="calendar-subscription-tab"
                >
                  <SubscriptionPanel
                    state={query.data}
                    sharing={sharing}
                    setSharing={updateSharing}
                    loadedVersion={loadedVersion}
                    pending={pending}
                    prime={prime}
                    link={link}
                    notify={notify}
                    onChange={change}
                    onDenied={onDenied}
                    setConfirm={setConfirm}
                    reload={() => {
                      setSharing(sharingOnly(query.data))
                      setLoadedVersion(query.data.version)
                      setToast(null)
                    }}
                  />
                </section>
              ) : (
                <DownloadPanel
                  timeZone={timeZone}
                  pending={pending}
                  downloadsPending={downloads.pending}
                  preset={preset}
                  setPreset={setPreset}
                  dates={dates}
                  setDates={setDates}
                  sharing={downloadSharing}
                  setSharing={setDownloadSharing}
                  onDownload={download}
                />
              )}
            </>
          )}
        </div>
        <footer className="settings-export-footer">
          <button className="secondary-button calendar-close-button" onClick={onClose}>
            關閉
          </button>
        </footer>
        {toast && (
          <div
            className="data-tools-toast"
            data-error={toast.error || undefined}
            role={toast.error ? 'alert' : 'status'}
            aria-live="polite"
          >
            {toast.message}
          </div>
        )}
      </div>
      {confirm && (
        <Confirmation
          title={confirm === 'reset' ? '重設訂閱連結？' : '停用日曆訂閱？'}
          text={
            confirm === 'reset'
              ? '重設後既有裝置將停止同步，需重新貼上新網址。此動作無法復原。'
              : '停用後不再提供後續行程，外部日曆已下載的內容仍可能保留。'
          }
          confirmLabel={confirm === 'reset' ? '確認重設' : '確認停用'}
          onCancel={() => setConfirm(null)}
          onConfirm={() => void change(confirm)}
          disabled={pending}
        />
      )}
    </DataDialog>
  )
}

function SubscriptionPanel({
  state,
  sharing,
  setSharing,
  loadedVersion,
  pending,
  prime,
  link,
  notify,
  onChange,
  onDenied,
  setConfirm,
  reload
}: {
  state: State
  sharing: Sharing
  setSharing: (sharing: Sharing) => void
  loadedVersion: number | null
  pending: boolean
  prime: boolean
  link: string
  notify: (message: string, error?: boolean) => void
  onChange: (action: 'create' | 'reset' | 'update' | 'disable') => Promise<void>
  onDenied: () => void
  setConfirm: (value: 'reset' | 'disable') => void
  reload: () => void
}) {
  return (
    <>
      <section className="calendar-integration-section">
        <div className="data-tools-section-heading">
          <div>
            <span className="settings-export-field-label">同步狀態</span>
            <h3>訂閱內容</h3>
          </div>
          <span className="calendar-status-chip">
            {state.expired
              ? 'Prime 已失效'
              : state.active
                ? prime
                  ? '已啟用'
                  : 'Prime 已失效'
                : state.version
                  ? '已停用'
                  : '尚未啟用'}
          </span>
        </div>
        {state.expired && (
          <p className="settings-export-hint">
            舊連結僅顯示方案到期提示，不再提供行程。恢復 Prime 後請建立新連結。
          </p>
        )}
        <p className="settings-export-hint">
          同步過去 30 天至未來 180 天的已排定課程；行程請回到 Form Coach Desk 修改。
        </p>
        <fieldset className="calendar-integration-fieldset">
          <legend>顯示內容</legend>
          <SharingFields value={sharing} onChange={setSharing} disabled={pending || !prime} />
        </fieldset>
        <div className="data-tools-calendar-preview" aria-label="日曆內容範例">
          <small>即時範例</small>
          <strong>{sharing.showNames ? '教練課程 · 範例學員' : '教練課程'}</strong>
          <span>09:00 — 10:00{sharing.showLocation ? ' · 範例場地' : ''}</span>
        </div>
      </section>

      <section className="calendar-integration-section">
        <div className="calendar-section-heading">
          <h3>專屬訂閱網址</h3>
          <p>這個網址可讀取你選擇的行程資訊，請勿公開分享。</p>
        </div>
        {link ? (
          <div className="data-tools-link-row">
            <input
              aria-label="專屬訂閱網址"
              readOnly
              value={link}
              spellCheck={false}
              onFocus={(event) => event.target.select()}
            />
            <button
              type="button"
              className="secondary-button calendar-copy-button"
              aria-label="複製訂閱網址"
              title="複製網址"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link)
                  notify('訂閱網址已複製。')
                } catch {
                  notify('無法自動複製，請選取網址後複製。', true)
                }
              }}
            >
              <Copy aria-hidden="true" />
            </button>
          </div>
        ) : state.active ? (
          <div className="calendar-legacy-link" role="status">
            <strong>這是舊版訂閱連結</strong>
            <p>為了繼續保護原始網址，系統無法還原舊連結；重設一次後即可隨時複製。</p>
          </div>
        ) : (
          <button
            className="settings-export-download calendar-enable-button"
            disabled={pending || !prime}
            onClick={() => void onChange('create')}
          >
            {pending ? '啟用中…' : '啟用日曆訂閱'}
          </button>
        )}
      </section>

      {(state.active || state.expired) && (
        <section className="calendar-integration-section calendar-advanced-actions">
          <div className="calendar-section-heading">
            <h3>進階管理</h3>
            <p>重設會更換網址；停用則停止提供後續行程。</p>
          </div>
          <div className="data-tools-actions">
            {state.active && (
              <button
                className="secondary-button"
                disabled={pending}
                onClick={() => (prime ? setConfirm('reset') : onDenied())}
              >
                重設訂閱連結
              </button>
            )}
            <button
              className="danger-outline-button ui-action-delete"
              disabled={pending}
              onClick={() => setConfirm('disable')}
            >
              停用訂閱
            </button>
          </div>
        </section>
      )}

      <details className="calendar-guide-disclosure">
        <summary>
          <span>
            <strong>如何加入 Google／Apple 日曆</strong>
            <small>需要時再展開查看設定步驟</small>
          </span>
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="calendar-guide-content">
          <p>先複製上方的專屬網址，再依照你使用的日曆完成一次設定。</p>
          <div className="calendar-guide-grid">
            <article>
              <strong>Google 日曆</strong>
              <ol>
                <li>在電腦瀏覽器開啟 Google 日曆。</li>
                <li>找到左側「其他日曆」，按旁邊的＋。</li>
                <li>選擇「透過網址」，貼上專屬網址後按「新增日曆」。</li>
              </ol>
              <p className="calendar-guide-note">
                Google 手機 App 不能直接加入網址；用電腦加入一次後，同一帳號的手機也會看到。
              </p>
            </article>
            <article>
              <strong>Apple 日曆</strong>
              <ol>
                <li>在 iPhone／iPad 開啟「日曆」，點選底部「行事曆」。</li>
                <li>選擇「加入行事曆 → 加入訂閱行事曆」。</li>
                <li>貼上完整網址，確認使用 SSL，再按「訂閱」。</li>
              </ol>
              <p className="calendar-guide-note">
                使用 Mac 時，請在日曆選擇「檔案 → 新增日曆訂閱」，再貼上同一網址。
              </p>
            </article>
          </div>
          <p className="calendar-guide-footnote">
            完成後，日曆服務會自行讀取更新；第一次出現與後續同步都可能需要一些時間，不會立即完成。
            若要持續同步，請加入訂閱網址，不要改用一次性 ICS 匯入。
          </p>
        </div>
      </details>
      {loadedVersion !== null && state.version !== loadedVersion && (
        <p role="alert" className="calendar-version-conflict">
          設定已在其他地方更新。<button onClick={reload}>重新載入設定</button>
        </p>
      )}
    </>
  )
}

function DownloadPanel({
  timeZone,
  pending,
  downloadsPending,
  preset,
  setPreset,
  dates,
  setDates,
  sharing,
  setSharing,
  onDownload
}: {
  timeZone: string
  pending: boolean
  downloadsPending: boolean
  preset: string
  setPreset: (preset: string) => void
  dates: { start: string; end: string }
  setDates: (dates: { start: string; end: string }) => void
  sharing: Sharing
  setSharing: (sharing: Sharing) => void
  onDownload: () => void
}) {
  return (
    <section
      id="calendar-download-panel"
      className="calendar-integration-panel"
      role="tabpanel"
      aria-labelledby="calendar-download-tab"
    >
      <div className="calendar-export-intro">
        <h3>下載行程檔（ICS）</h3>
        <p>適合單次匯入；後續改期不會自動更新，需要持續同步時請使用日曆訂閱。</p>
      </div>
      <section className="settings-export-step calendar-range-group">
        <div className="settings-export-step-heading">
          <span>01</span>
          <h3>時間範圍</h3>
        </div>
        <div className="settings-export-field">
          <span className="settings-export-field-label">快速選擇區間</span>
          <FormSelect
            label="快速選擇區間"
            required
            value={preset}
            onChange={(nextPreset) => {
              setPreset(nextPreset)
              if (nextPreset !== 'custom')
                setDates(
                  rangePreset(
                    nextPreset === 'month' ? 'calendar-month' : nextPreset,
                    workspaceDate(timeZone)
                  )
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
        </div>
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
        {!validRange(dates.start, dates.end) && (
          <p className="form-error">日期區間不可超過 366 日。</p>
        )}
      </section>
      <section className="settings-export-step calendar-export-options">
        <div className="calendar-export-options-copy">
          <div className="settings-export-step-heading">
            <span>02</span>
            <h3>匯出內容</h3>
          </div>
          <p>選擇要寫入這次 ICS 檔案的資訊。</p>
        </div>
        <SharingFields value={sharing} onChange={setSharing} disabled={pending} />
        <button
          className="settings-export-download calendar-download-button"
          disabled={pending || downloadsPending || !validRange(dates.start, dates.end)}
          onClick={onDownload}
        >
          {downloadsPending ? '準備檔案中…' : '下載 ICS'}
        </button>
      </section>
    </section>
  )
}
