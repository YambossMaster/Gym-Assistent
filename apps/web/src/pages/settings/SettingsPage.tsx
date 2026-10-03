import type { Session } from '@supabase/supabase-js'
import { FormSelect } from '../../shared/FormSelect'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CircleCheck,
  Database,
  KeyRound,
  LogOut,
  MessageSquare,
  SlidersHorizontal,
  Shield,
  Trash2,
  UserRound,
  X
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  ApiError,
  deleteAccountImmediately,
  readBetaGrant,
  type BetaGrant,
  type WorkspaceSettings
} from '../../api'
import { betaGrantKey } from '../../beta-admission/BetaGate'
import {
  changePassword,
  passwordRecoveryRedirect,
  requestPasswordReset,
  signOutCurrentDevice,
  updatePassword
} from '../../account-auth'
import { Confirmation, Page, SettingsPanelHeading } from '../../shared/primitives'
import { supabase } from '../../supabase'
import { useSettingsRouteMutations, useSettingsRouteQueries } from './queries'
import { selectSettingsPanelState, type SettingsPanelState } from './state'
import { useTrainingMutations, useTrainingPreference } from '../training/queries'
import { DemoImportPanel } from './DemoImportPanel'
import { CoachLocalStore } from '../../local-resilience'
import { useDialogBehavior } from '../../shared/useDialogBehavior'
import { MobilePageAppBar } from '../../shared/MobilePageAppBar'

function betaGrantDescription(grant: BetaGrant | undefined): string {
  if (!grant) return '正在確認使用資格…'
  if (grant.state === 'permanent') return '永久免費使用資格。'
  if (grant.state === 'free')
    return '體驗期間已結束，已轉為免費方案。你可以繼續使用目前的功能與資料。'
  if (grant.state === 'promotional') {
    const date = new Date(grant.endsAt).toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    return `90 天體驗期間至 ${date}。目前所有功能皆可使用。`
  }
  return '尚未啟用。'
}

function FeedbackPanel() {
  const address = (import.meta.env.VITE_SUPPORT_EMAIL ?? '').trim()
  const available = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
  return (
    <section className="settings-panel account-settings-panel">
      <div className="settings-row">
        <div className="settings-row-copy">
          <strong>意見回饋</strong>
          <span>可回報問題或提出建議。請勿寄送密碼、分享連結或非必要的學員資料。</span>
        </div>
        {available ? (
          <a
            className="settings-row-action"
            href={`mailto:${address}?subject=${encodeURIComponent('FORM 意見回饋')}`}
          >
            寄送 Email <ArrowRight aria-hidden="true" />
          </a>
        ) : (
          <span className="settings-account-value">聯絡方式準備中</span>
        )}
      </div>
    </section>
  )
}

const settingsCategories = [
  {
    id: 'profile',
    label: '教練與工作台',
    icon: UserRound,
    description: '管理教練名稱與工作時區。'
  },
  {
    id: 'preferences',
    label: '工作偏好',
    icon: SlidersHorizontal,
    description: '調整新增紀錄時使用的預設值。'
  },
  { id: 'security', label: '帳號與安全', icon: Shield, description: '管理登入方式與帳號狀態。' },
  { id: 'data', label: '資料與裝置', icon: Database, description: '管理此裝置的暫存資料。' },
  { id: 'feedback', label: '協助與回饋', icon: MessageSquare, description: '回報問題或提出建議。' }
] as const
type SettingsCategory = (typeof settingsCategories)[number]['id']

const commonTimeZones = [
  ['Asia/Taipei', '台北'],
  ['Asia/Tokyo', '東京'],
  ['Asia/Seoul', '首爾'],
  ['Asia/Hong_Kong', '香港'],
  ['Asia/Shanghai', '上海'],
  ['Asia/Singapore', '新加坡'],
  ['Asia/Bangkok', '曼谷'],
  ['Asia/Manila', '馬尼拉'],
  ['Asia/Jakarta', '雅加達'],
  ['Asia/Dubai', '杜拜'],
  ['Europe/London', '倫敦'],
  ['Europe/Paris', '巴黎'],
  ['Europe/Berlin', '柏林'],
  ['America/New_York', '紐約'],
  ['America/Chicago', '芝加哥'],
  ['America/Denver', '丹佛'],
  ['America/Los_Angeles', '洛杉磯'],
  ['America/Toronto', '多倫多'],
  ['America/Vancouver', '溫哥華'],
  ['Australia/Sydney', '雪梨'],
  ['Pacific/Auckland', '奧克蘭']
] as const

function timeZoneOptions(current: string) {
  const options: { value: string; label: string }[] = commonTimeZones.map(([value, city]) => ({
    value,
    label: `${city} · ${value}`
  }))
  for (const value of Intl.supportedValuesOf?.('timeZone') ?? []) {
    if (!options.some((item) => item.value === value))
      options.push({ value, label: value.replaceAll('_', ' ') })
  }
  if (!options.some((item) => item.value === current))
    options.unshift({ value: current, label: `目前使用 · ${current}` })
  return options
}

export function SettingsPage({ session }: { session: Session }) {
  const [category, setCategory] = useState<SettingsCategory>('profile')
  const [message, setMessage] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordNotice, setPasswordNotice] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [deletionRequestOpen, setDeletionRequestOpen] = useState(false)
  const [immediateDelete, setImmediateDelete] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const { settings: settingsQuery, lifecycle: lifecycleQuery } = useSettingsRouteQueries(session)
  const grantQuery = useQuery({
    queryKey: betaGrantKey(session.user.id),
    queryFn: () => readBetaGrant(session.access_token)
  })
  const { settings: settingsMutation, lifecycle: lifecycleMutation } = useSettingsRouteMutations({
    session,
    onMessage: setMessage,
    onDeletionRequestClosed: () => {
      setDeletionRequestOpen(false)
      setConfirmation('')
    },
    onSettingsConflict: () => {
      setMessage('設定已在其他裝置更新。已重新讀取目前設定，請重新套用你的變更。')
      void settingsQuery.refetch()
    }
  })
  const passwordMutation = useMutation({
    mutationFn: () =>
      hasEmailIdentity(session)
        ? changePassword(supabase.auth, session.user.email || '', currentPassword, password)
        : updatePassword(supabase.auth, password),
    onSuccess: () => {
      setCurrentPassword('')
      setPassword('')
      setConfirmPassword('')
      setPasswordOpen(false)
      setPasswordError('')
    },
    onError: (error) => setPasswordError(readError(error))
  })
  const signOutMutation = useMutation({
    mutationFn: () => signOutCurrentDevice(supabase.auth),
    onError: (error) => {
      setSignOutOpen(false)
      setMessage(readError(error))
    },
    onSuccess: () => setSignOutOpen(false)
  })
  const resetPasswordMutation = useMutation({
    mutationFn: () =>
      requestPasswordReset(
        supabase.auth,
        session.user.email || '',
        passwordRecoveryRedirect(window.location.origin)
      ),
    onSuccess: () => {
      setPasswordError('')
      setPasswordNotice(true)
    },
    onError: (error) => setPasswordError(readError(error))
  })
  const deleteMutation = useMutation({
    mutationFn: () => deleteAccountImmediately(session.access_token),
    onSuccess: () => signOutCurrentDevice(supabase.auth),
    onError: (error) => setMessage(readError(error))
  })
  const profileState = selectSettingsPanelState(settingsQuery)
  const lifecycleState = selectSettingsPanelState(lifecycleQuery)
  const lifecycle = lifecycleQuery.data?.deletionDueAt ?? null
  const selectedCategory = settingsCategories.find((item) => item.id === category)!

  return (
    <Page
      title="設定"
      eyebrow="帳號與工作台"
      className="settings-page"
      beforeHeader={<MobilePageAppBar title="設定" />}
    >
      <section className="settings-layout">
        <nav className="settings-category-nav" aria-label="設定分類">
          <span className="settings-category-nav-label">分類</span>
          {settingsCategories.map((item) => (
            <button
              type="button"
              key={item.id}
              className={category === item.id ? 'is-active' : ''}
              aria-current={category === item.id ? 'page' : undefined}
              onClick={() => {
                setCategory(item.id)
                setMessage('')
                window.scrollTo({ top: 0, behavior: 'instant' })
              }}
            >
              <item.icon aria-hidden="true" />
              <span>{item.label}</span>
              <ArrowRight aria-hidden="true" className="settings-category-arrow" />
            </button>
          ))}
        </nav>
        <div className="settings-detail">
          <header className="settings-detail-heading">
            <span className="eyebrow dark">SETTINGS</span>
            <h2>{selectedCategory.label}</h2>
            <p>{selectedCategory.description}</p>
          </header>
          {message && (
            <p className="settings-feedback" role="alert">
              {message}
            </p>
          )}
          {category === 'profile' && (
            <WorkspaceProfile
              state={profileState}
              settings={settingsQuery.data}
              refreshFailed={Boolean(settingsQuery.data && settingsQuery.isError)}
              onRetry={() => void settingsQuery.refetch()}
              onNameChange={(displayName) => {
                setMessage('')
                settingsMutation.mutate({ displayName })
              }}
              onTimeZoneChange={(timeZone) => {
                setMessage('')
                settingsMutation.mutate({ timeZone })
              }}
            />
          )}
          {category === 'security' && (
            <section className="settings-panel account-settings-panel">
              <div className="settings-row">
                <div className="settings-row-copy">
                  <strong>使用資格</strong>
                  <span>
                    {grantQuery.isError
                      ? '暫時無法取得使用資格。'
                      : betaGrantDescription(grantQuery.data)}
                  </span>
                </div>
                {grantQuery.isError && (
                  <button
                    type="button"
                    className="settings-row-action"
                    onClick={() => void grantQuery.refetch()}
                  >
                    重試
                  </button>
                )}
              </div>
              <div className="settings-row">
                <div className="settings-row-copy">
                  <strong>登入帳號</strong>
                  <span>目前用於登入的電子郵件。</span>
                </div>
                <span className="settings-account-value">{session.user.email}</span>
              </div>
              <div className="settings-row">
                <div className="settings-row-copy">
                  <strong>{hasEmailIdentity(session) ? '登入密碼' : '建立登入密碼'}</strong>
                  <span>在獨立視窗中更新帳號的登入密碼。</span>
                </div>
                <button
                  type="button"
                  className="settings-row-action"
                  onClick={() => {
                    setPasswordError('')
                    setPasswordNotice(false)
                    setPasswordOpen(true)
                  }}
                >
                  {hasEmailIdentity(session) ? '修改密碼' : '建立密碼'}{' '}
                  <ArrowRight aria-hidden="true" />
                </button>
              </div>
              <div className="settings-row">
                <div className="settings-row-copy">
                  <strong>登出帳號</strong>
                  <span>結束這台裝置目前的登入狀態。</span>
                </div>
                <button
                  type="button"
                  className="settings-row-action"
                  disabled={signOutMutation.isPending}
                  onClick={() => setSignOutOpen(true)}
                >
                  登出 <LogOut aria-hidden="true" />
                </button>
              </div>
              <LifecycleSection
                state={lifecycleState}
                deletionDueAt={lifecycle}
                saving={lifecycleMutation.isPending || deleteMutation.isPending}
                onRetry={() => void lifecycleQuery.refetch()}
                onRequest={() => setDeletionRequestOpen(true)}
                onCancel={() => lifecycleMutation.mutate('cancel')}
                onImmediateDelete={() => setImmediateDelete(true)}
              />
            </section>
          )}
          {category === 'preferences' && (
            <>
              <CalendarPreferencePanel
                settings={settingsQuery.data}
                saving={settingsMutation.isPending}
                onChange={(changes) => {
                  setMessage('')
                  settingsMutation.mutate(changes)
                }}
              />
              <TrainingPreferencePanel session={session} />
              <FinancePreferencePanel
                settings={settingsQuery.data}
                saving={settingsMutation.isPending}
                onChange={(defaultCurrency) => {
                  setMessage('')
                  settingsMutation.mutate({ defaultCurrency })
                }}
              />
            </>
          )}
          {category === 'data' && (
            <>
              <DeviceDataPanel session={session} />
              {import.meta.env.DEV && settingsQuery.data && (
                <details className="settings-dev-tools">
                  <summary>開發工具：Demo 資料匯入</summary>
                  <ImportPanelBoundary
                    session={session}
                    workspaceVersion={settingsQuery.data.version}
                    onImported={() => {
                      void settingsQuery.refetch()
                      void lifecycleQuery.refetch()
                    }}
                  />
                </details>
              )}
            </>
          )}
          {category === 'feedback' && <FeedbackPanel />}
        </div>
      </section>
      {passwordOpen && (
        <PasswordDialog
          emailIdentity={hasEmailIdentity(session)}
          currentPassword={currentPassword}
          password={password}
          confirmPassword={confirmPassword}
          error={passwordError}
          notice={passwordNotice}
          saving={passwordMutation.isPending || resetPasswordMutation.isPending}
          onClose={() => {
            setPasswordOpen(false)
            setCurrentPassword('')
            setPassword('')
            setConfirmPassword('')
            setPasswordError('')
            setPasswordNotice(false)
          }}
          onForgotPassword={() => {
            setPasswordError('')
            setPasswordNotice(false)
            resetPasswordMutation.mutate()
          }}
          onCurrentPasswordChange={setCurrentPassword}
          onPasswordChange={setPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onSubmit={(event) => {
            event.preventDefault()
            if (password !== confirmPassword) return setPasswordError('兩次輸入的新密碼不一致。')
            setPasswordError('')
            passwordMutation.mutate()
          }}
        />
      )}
      {signOutOpen && (
        <Confirmation
          title="確定登出？"
          text="登出後，這台裝置需要重新登入才能使用工作台。"
          confirmLabel="登出"
          tone="neutral"
          onCancel={() => setSignOutOpen(false)}
          onConfirm={() => signOutMutation.mutate()}
          disabled={signOutMutation.isPending}
        />
      )}
      {deletionRequestOpen && (
        <Confirmation
          title="刪除帳號？"
          text="確認後，帳號會進入 14 天刪除倒數。倒數期間可以隨時取消；期限屆滿才會永久刪除帳號與所有工作台資料。"
          confirmation={confirmation}
          onConfirmationChange={setConfirmation}
          onCancel={() => {
            setDeletionRequestOpen(false)
            setConfirmation('')
          }}
          onConfirm={() => lifecycleMutation.mutate('request')}
          disabled={lifecycleMutation.isPending}
        />
      )}
      {immediateDelete && (
        <Confirmation
          title="立即永久刪除帳號？"
          text="這會永久刪除帳號與所有資料。"
          confirmation={confirmation}
          onConfirmationChange={setConfirmation}
          onCancel={() => {
            setImmediateDelete(false)
            setConfirmation('')
          }}
          onConfirm={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
        />
      )}
    </Page>
  )
}

function CalendarPreferencePanel({
  settings,
  saving,
  onChange
}: {
  settings: WorkspaceSettings | undefined
  saving: boolean
  onChange: (
    changes: Partial<
      Pick<
        WorkspaceSettings,
        'calendarStartHour' | 'calendarEndHour' | 'calendarWeekStart' | 'defaultSessionMinutes'
      >
    >
  ) => void
}) {
  const [rangeError, setRangeError] = useState('')
  const hourLabel = (hour: number) =>
    hour === 24 ? '24:00（午夜）' : `${String(hour).padStart(2, '0')}:00`
  const changeHour = (key: 'calendarStartHour' | 'calendarEndHour', value: number) => {
    const start = key === 'calendarStartHour' ? value : settings!.calendarStartHour
    const end = key === 'calendarEndHour' ? value : settings!.calendarEndHour
    if (end <= start) {
      setRangeError('結束時間必須晚於開始時間。')
      return
    }
    setRangeError('')
    onChange({ [key]: value })
  }
  return (
    <section className="settings-panel">
      <SettingsPanelHeading eyebrow="CALENDAR" title="行事曆設定" />
      <div className="settings-row">
        <div className="settings-row-copy">
          <strong>顯示開始時間</strong>
          <span>日／週行事曆的主要顯示時段。</span>
        </div>
        <FormSelect
          label="顯示開始時間"
          value={String(settings?.calendarStartHour ?? 6)}
          disabled={!settings || saving}
          onChange={(value) => changeHour('calendarStartHour', Number(value))}
          options={Array.from({ length: 24 }, (_, hour) => ({
            value: String(hour),
            label: hourLabel(hour)
          }))}
        />
      </div>
      <div className="settings-row">
        <div className="settings-row-copy">
          <strong>顯示結束時間</strong>
          <span>已有安排超出時段時，行事曆會自動延伸顯示。</span>
        </div>
        <FormSelect
          label="顯示結束時間"
          value={String(settings?.calendarEndHour ?? 22)}
          disabled={!settings || saving}
          onChange={(value) => changeHour('calendarEndHour', Number(value))}
          options={Array.from({ length: 24 }, (_, index) => index + 1).map((hour) => ({
            value: String(hour),
            label: hourLabel(hour)
          }))}
        />
      </div>
      {rangeError && (
        <p role="alert" className="field-error">
          {rangeError}
        </p>
      )}
      <div className="settings-row">
        <div className="settings-row-copy">
          <strong>每週第一天</strong>
          <span>決定週視圖與月曆的排列。</span>
        </div>
        <FormSelect
          label="每週第一天"
          value={String(settings?.calendarWeekStart ?? 1)}
          disabled={!settings || saving}
          onChange={(value) => onChange({ calendarWeekStart: Number(value) as 0 | 1 })}
          options={[
            { value: '1', label: '星期一' },
            { value: '0', label: '星期日' }
          ]}
        />
      </div>
      <div className="settings-row">
        <div className="settings-row-copy">
          <strong>預設每堂課時間</strong>
          <span>新增課程時預先帶入；既有課程不變。</span>
        </div>
        <FormSelect
          label="預設每堂課時間"
          value={String(settings?.defaultSessionMinutes ?? 60)}
          disabled={!settings || saving}
          onChange={(value) =>
            onChange({
              defaultSessionMinutes: Number(value) as WorkspaceSettings['defaultSessionMinutes']
            })
          }
          options={[30, 45, 60, 90, 120].map((minutes) => ({
            value: String(minutes),
            label: `${minutes} 分鐘`
          }))}
        />
      </div>
    </section>
  )
}

function FinancePreferencePanel({
  settings,
  saving,
  onChange
}: {
  settings: WorkspaceSettings | undefined
  saving: boolean
  onChange: (value: WorkspaceSettings['defaultCurrency']) => void
}) {
  return (
    <section className="settings-panel">
      <SettingsPanelHeading eyebrow="FINANCE" title="收支設定" />
      <div className="settings-row">
        <div className="settings-row-copy">
          <strong>預設幣別</strong>
          <span>新增購課、場地收支與收支明細時使用；既有紀錄保留原幣別。</span>
        </div>
        <FormSelect
          label="預設幣別"
          value={settings?.defaultCurrency ?? 'TWD'}
          disabled={!settings || saving}
          onChange={(next) => onChange(next as WorkspaceSettings['defaultCurrency'])}
          options={['TWD', 'USD', 'JPY', 'EUR', 'HKD'].map((value) => ({ value, label: value }))}
        />
      </div>
    </section>
  )
}

function DeviceDataPanel({ session }: { session: Session }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="settings-panel">
      <div className="settings-row">
        <div className="settings-row-copy">
          <strong>這台裝置的暫存</strong>
          <span>管理尚未送出的變更、訓練草稿與本機介面偏好。</span>
        </div>
        <button className="settings-row-action" type="button" onClick={() => setOpen(true)}>
          管理暫存 <ArrowRight aria-hidden="true" />
        </button>
      </div>
      {open && <DeviceCacheDialog session={session} onClose={() => setOpen(false)} />}
    </section>
  )
}

function DeviceCacheDialog({ session, onClose }: { session: Session; onClose: () => void }) {
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const { dialogRef, onBackdropPointerDown } = useDialogBehavior(onClose, { focusDialog: true })
  const clearCache = async () => {
    setSaving(true)
    setError('')
    try {
      await new CoachLocalStore().clearCoach({
        environment: import.meta.env.MODE,
        coachId: session.user.id
      })
      onClose()
    } catch {
      setError('目前無法清除裝置暫存。')
      setSaving(false)
    }
  }
  return (
    <div className="modal-backdrop" onPointerDown={onBackdropPointerDown}>
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="modal security-modal settings-operation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-cache-title"
      >
        <header>
          <div>
            <span className="eyebrow dark">資料與裝置</span>
            <h2 id="settings-cache-title">管理裝置暫存</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="關閉暫存管理"
            onClick={onClose}
            disabled={saving}
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="ui-settings-dialog-content">
          <div className="ui-settings-dialog-fields">
            <p>
              這台裝置保存訓練草稿、待送變更與介面偏好，協助中斷後繼續工作。清除後無法從裝置復原這些內容；雲端正式紀錄不受影響。
            </p>
            <label className="settings-cache-confirm">
              輸入 CLEAR 以清除
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
              />
            </label>
            {error && (
              <p className="settings-dialog-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="settings-dialog-actions">
            <button
              type="button"
              className="secondary-button ui-action-cancel"
              onClick={onClose}
              disabled={saving}
            >
              取消
            </button>
            <button
              type="button"
              className="danger-outline-button ui-action-delete"
              onClick={() => void clearCache()}
              disabled={saving || confirmation !== 'CLEAR'}
            >
              {saving ? (
                '清除中…'
              ) : (
                <>
                  <span className="desktop-action-label">清除裝置暫存</span>
                  <span className="mobile-action-label">清除</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function ImportPanelBoundary({
  session,
  workspaceVersion,
  onImported
}: {
  session: Session
  workspaceVersion: number
  onImported: () => void
}) {
  const preference = useTrainingPreference(session)
  if (preference.isLoading)
    return (
      <section className="settings-panel">
        <span className="panel-loading">正在載入資料移轉工具</span>
      </section>
    )
  if (preference.isError || !preference.data)
    return <PanelError title="暫時無法開啟資料移轉工具" onRetry={() => void preference.refetch()} />
  return (
    <DemoImportPanel
      session={session}
      workspaceVersion={workspaceVersion}
      preferenceVersion={preference.data.version}
      onImported={() => {
        void preference.refetch()
        onImported()
      }}
    />
  )
}

function TrainingPreferencePanel({ session }: { session: Session }) {
  const query = useTrainingPreference(session)
  const mutations = useTrainingMutations(session)
  if (query.isLoading)
    return (
      <section className="settings-panel">
        <span className="panel-loading">正在載入訓練設定</span>
      </section>
    )
  if (query.isError || !query.data)
    return (
      <section className="settings-panel settings-panel-error">
        <h2>暫時無法讀取訓練設定</h2>
        <button onClick={() => void query.refetch()}>重新載入</button>
      </section>
    )
  return (
    <section className="settings-panel training-preference">
      <SettingsPanelHeading eyebrow="TRAINING" title="訓練設定" />
      <div className="settings-row">
        <div className="settings-row-copy">
          <strong>重量單位習慣</strong>
          <span>用於新增訓練紀錄與表現顯示。</span>
        </div>
        <FormSelect
          label="重量單位習慣"
          value={query.data.defaultWeightUnit}
          disabled={mutations.preference.isPending}
          onChange={(value) =>
            mutations.preference.mutate({
              unit: value as 'kg' | 'lb',
              defaultDistanceUnit: query.data!.defaultDistanceUnit,
              version: query.data!.version
            })
          }
          options={[
            { value: 'kg', label: '公斤（kg）' },
            { value: 'lb', label: '磅（lb）' }
          ]}
        />
      </div>
      <div className="settings-row">
        <div className="settings-row-copy">
          <strong>距離單位習慣</strong>
          <span>選擇公制或英制。</span>
        </div>
        <FormSelect
          label="距離單位習慣"
          value={query.data.defaultDistanceUnit}
          disabled={mutations.preference.isPending}
          options={[
            { value: 'km', label: '公制（公里／公尺）' },
            { value: 'mi', label: '英制（英里／英尺）' }
          ]}
          onChange={(value) =>
            mutations.preference.mutate({
              unit: query.data!.defaultWeightUnit,
              version: query.data!.version,
              defaultDistanceUnit: value as 'km' | 'mi'
            })
          }
        />
      </div>
      <p>
        重量與距離習慣會套用至新增紀錄與表現顯示；既有紀錄保留原始數值與單位。時間可在每組以秒／分切換，距離可在同一制式內快速切換尺度。
      </p>
      {mutations.preference.isError && (
        <p role="alert">
          單位儲存失敗，請重新選取。<button onClick={() => void query.refetch()}>重新載入</button>
        </p>
      )}
    </section>
  )
}

function WorkspaceProfile({
  state,
  settings,
  refreshFailed,
  onRetry,
  onNameChange,
  onTimeZoneChange
}: {
  state: SettingsPanelState
  settings: WorkspaceSettings | undefined
  refreshFailed: boolean
  onRetry: () => void
  onNameChange: (value: string) => void
  onTimeZoneChange: (value: string) => void
}) {
  if (state === 'loading')
    return (
      <section className="settings-panel" aria-label="正在載入教練資料">
        <Skeleton />
      </section>
    )
  if (state === 'error' || !settings)
    return <PanelError title="暫時無法讀取教練資料" onRetry={onRetry} />
  return (
    <section className="settings-panel workspace-settings-panel">
      {refreshFailed && <RefreshError onRetry={onRetry} />}
      <div className="settings-row">
        <div className="settings-row-copy">
          <strong>教練顯示名稱</strong>
          <span>顯示在工作台上的名稱。</span>
        </div>
        <input
          name="displayName"
          aria-label="教練顯示名稱"
          defaultValue={settings.displayName}
          maxLength={120}
          required
          onBlur={(event) => {
            const value = event.currentTarget.value.trim()
            if (!value) {
              event.currentTarget.value = settings.displayName
              return
            }
            if (value !== settings.displayName) onNameChange(value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
        />
      </div>
      <div className="settings-row">
        <div className="settings-row-copy">
          <strong>工作時區</strong>
          <span>常用城市列在前面。改變後影響行事曆、今日與月份的顯示；既有課程時間不會改寫。</span>
        </div>
        <FormSelect
          label="工作時區"
          value={settings.timeZone}
          onChange={(value) => {
            if (value !== settings.timeZone) onTimeZoneChange(value)
          }}
          options={timeZoneOptions(settings.timeZone)}
          required
        />
      </div>
    </section>
  )
}

function PasswordDialog({
  emailIdentity,
  currentPassword,
  password,
  confirmPassword,
  error,
  notice,
  saving,
  onClose,
  onForgotPassword,
  onCurrentPasswordChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit
}: {
  emailIdentity: boolean
  currentPassword: string
  password: string
  confirmPassword: string
  error: string
  notice: boolean
  saving: boolean
  onClose: () => void
  onForgotPassword: () => void
  onCurrentPasswordChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const { dialogRef, onBackdropPointerDown } = useDialogBehavior(onClose, { focusDialog: true })
  return (
    <div className="modal-backdrop" onPointerDown={onBackdropPointerDown}>
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="modal security-modal settings-operation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-password-title"
      >
        <header>
          <div>
            <span className="eyebrow dark">帳號與安全</span>
            <h2 id="settings-password-title">{emailIdentity ? '修改密碼' : '建立登入密碼'}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="關閉密碼設定"
            onClick={onClose}
            disabled={saving}
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <form className="password-change-form ui-settings-dialog-content" onSubmit={onSubmit}>
          <div className="ui-settings-dialog-fields">
            {emailIdentity && (
              <div className="password-current-field">
                <label>
                  目前密碼
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => onCurrentPasswordChange(event.target.value)}
                    required
                    autoFocus
                    autoComplete="current-password"
                  />
                </label>
                <button
                  type="button"
                  className="text-button"
                  onClick={onForgotPassword}
                  disabled={saving}
                >
                  忘記密碼？
                </button>
                {notice && (
                  <p className="password-recovery-notice" role="status">
                    <CircleCheck aria-hidden="true" />
                    <span>密碼重設信已寄出，請查看電子郵件。</span>
                  </p>
                )}
              </div>
            )}
            <label>
              新密碼
              <input
                type="password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                minLength={12}
                required
                autoFocus={!emailIdentity}
              />
            </label>
            <label>
              再次輸入新密碼
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => onConfirmPasswordChange(event.target.value)}
                minLength={12}
                required
              />
            </label>
            {error && (
              <p className="settings-dialog-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="password-form-actions">
            <button
              className="secondary-button ui-action-cancel"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              取消
            </button>
            <button className="primary-button compact ui-action-save" disabled={saving}>
              {saving ? (
                '更新中…'
              ) : (
                <>
                  <span className="desktop-action-label">更新密碼</span>
                  <span className="mobile-action-label">儲存</span>
                </>
              )}{' '}
              <KeyRound aria-hidden="true" />
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function LifecycleSection({
  state,
  deletionDueAt,
  saving,
  onRetry,
  onRequest,
  onCancel,
  onImmediateDelete
}: {
  state: SettingsPanelState
  deletionDueAt: string | null
  saving: boolean
  onRetry: () => void
  onRequest: () => void
  onCancel: () => void
  onImmediateDelete: () => void
}) {
  if (state === 'loading')
    return (
      <div className="settings-row">
        <span className="panel-loading">正在載入刪除狀態</span>
      </div>
    )
  if (state === 'error')
    return (
      <div className="settings-row">
        <RefreshError onRetry={onRetry} />
      </div>
    )
  return (
    <div className="settings-row settings-danger-row">
      <div className="settings-row-copy">
        <strong>{deletionDueAt ? '刪除倒數已開始' : '刪除帳號'}</strong>
        <span>
          {deletionDueAt
            ? `預計於 ${new Date(deletionDueAt).toLocaleString('zh-TW')} 永久刪除。`
            : '帳號與工作台資料將在 14 天倒數結束後永久刪除。'}
        </span>
      </div>
      {deletionDueAt ? (
        <div className="settings-deletion-actions">
          <button
            className="secondary-button ui-action-general"
            disabled={saving}
            onClick={onCancel}
          >
            取消刪除
          </button>
          <button
            className="danger-outline-button ui-action-delete"
            disabled={saving}
            onClick={onImmediateDelete}
          >
            立即刪除 <Trash2 aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          className="danger-outline-button ui-action-delete"
          disabled={saving}
          onClick={onRequest}
        >
          刪除帳號 <Trash2 aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="detail-skeleton">
      <span />
      <span />
      <span />
    </div>
  )
}
function PanelError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <section className="settings-panel settings-panel-error" role="alert">
      <h2>{title}</h2>
      <p>其他帳號設定仍可使用。</p>
      <button className="secondary-button" onClick={onRetry}>
        重新載入
      </button>
    </section>
  )
}
function RefreshError({ onRetry }: { onRetry: () => void }) {
  return (
    <p className="panel-refresh-error" role="alert">
      目前無法更新這個區塊。
      <button className="text-button" onClick={onRetry}>
        重新載入
      </button>
    </p>
  )
}
function hasEmailIdentity(session: Session) {
  return session.user.identities?.some((identity) => identity.provider === 'email') ?? false
}
function readError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return '登入已失效，請重新登入。'
  return error instanceof Error ? error.message : '目前無法完成這項操作。'
}
