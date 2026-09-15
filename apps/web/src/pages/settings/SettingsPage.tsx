import type { Session } from '@supabase/supabase-js'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, KeyRound, LogOut, TimerReset, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError, deleteAccountImmediately, type WorkspaceSettings } from '../../api'
import { changePassword, signOutCurrentDevice, updatePassword } from '../../account-auth'
import { Confirmation, Page, SettingsPanelHeading } from '../../shared/primitives'
import { supabase } from '../../supabase'
import { useSettingsRouteMutations, useSettingsRouteQueries } from './queries'
import { selectSettingsPanelState, type SettingsPanelState } from './state'
import { useTrainingMutations, useTrainingPreference } from '../training/queries'
import { DemoImportPanel } from './DemoImportPanel'

export function SettingsPage({ session }: { session: Session }) {
  const [message, setMessage] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [deletionRequestOpen, setDeletionRequestOpen] = useState(false)
  const [immediateDelete, setImmediateDelete] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const { settings: settingsQuery, lifecycle: lifecycleQuery } = useSettingsRouteQueries(session)
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
      setMessage('密碼已更新。')
    },
    onError: (error) => setMessage(readError(error))
  })
  const signOutMutation = useMutation({
    mutationFn: () => signOutCurrentDevice(supabase.auth),
    onError: (error) => setMessage(readError(error))
  })
  const deleteMutation = useMutation({
    mutationFn: () => deleteAccountImmediately(session.access_token),
    onSuccess: () => signOutCurrentDevice(supabase.auth),
    onError: (error) => setMessage(readError(error))
  })
  const profileState = selectSettingsPanelState(settingsQuery)
  const lifecycleState = selectSettingsPanelState(lifecycleQuery)
  const lifecycle = lifecycleQuery.data?.deletionDueAt ?? null

  return (
    <Page title="設定" eyebrow="帳號與工作台">
      <section className="settings-layout">
        <WorkspaceProfile
          state={profileState}
          settings={settingsQuery.data}
          isSaving={settingsMutation.isPending}
          refreshFailed={Boolean(settingsQuery.data && settingsQuery.isError)}
          onRetry={() => void settingsQuery.refetch()}
          onSubmit={(event) => {
            event.preventDefault()
            const settings = settingsQuery.data
            if (!settings) return
            setMessage('')
            const values = new FormData(event.currentTarget)
            settingsMutation.mutate({
              displayName: String(values.get('displayName') || '').trim(),
              timeZone: String(values.get('timeZone') || '').trim(),
              version: settings.version
            })
          }}
        />
        <section className="settings-panel account-settings-panel">
          <SettingsPanelHeading eyebrow="ACCOUNT & SECURITY" title="帳號安全" />
          <div className="account-email">
            <span>登入帳號</span>
            <strong>{session.user.email}</strong>
          </div>
          <button
            className="secondary-button security-button"
            disabled={signOutMutation.isPending}
            onClick={() => signOutMutation.mutate()}
          >
            登出帳號 <LogOut />
          </button>
          <PasswordSection
            emailIdentity={hasEmailIdentity(session)}
            open={passwordOpen}
            currentPassword={currentPassword}
            password={password}
            confirmPassword={confirmPassword}
            saving={passwordMutation.isPending}
            onOpen={() => setPasswordOpen(true)}
            onCancel={() => {
              setPasswordOpen(false)
              setCurrentPassword('')
              setPassword('')
              setConfirmPassword('')
            }}
            onCurrentPasswordChange={setCurrentPassword}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onSubmit={(event) => {
              event.preventDefault()
              if (password !== confirmPassword) return setMessage('兩次輸入的新密碼不一致。')
              passwordMutation.mutate()
            }}
          />
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
        <TrainingPreferencePanel session={session} />
        {settingsQuery.data && (
          <ImportPanelBoundary
            session={session}
            workspaceVersion={settingsQuery.data.version}
            onImported={() => {
              void settingsQuery.refetch()
              void lifecycleQuery.refetch()
            }}
          />
        )}
        {message && <p className="form-notice">{message}</p>}
      </section>
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
      <label>
        預設重量單位
        <select
          value={query.data.defaultWeightUnit}
          disabled={mutations.preference.isPending}
          onChange={(event) =>
            mutations.preference.mutate({
              unit: event.target.value as 'kg' | 'lb',
              version: query.data!.version
            })
          }
        >
          <option value="kg">公斤（kg）</option>
          <option value="lb">磅（lb）</option>
        </select>
      </label>
      <p>只影響新增組別與表現顯示，不會改寫既有重量。</p>
    </section>
  )
}

function WorkspaceProfile({
  state,
  settings,
  isSaving,
  refreshFailed,
  onRetry,
  onSubmit
}: {
  state: SettingsPanelState
  settings: WorkspaceSettings | undefined
  isSaving: boolean
  refreshFailed: boolean
  onRetry: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
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
    <form className="settings-panel workspace-settings-panel" onSubmit={onSubmit}>
      <SettingsPanelHeading eyebrow="COACH PROFILE" title="教練資料" />
      {refreshFailed && <RefreshError onRetry={onRetry} />}
      <label>
        教練顯示名稱
        <input name="displayName" defaultValue={settings.displayName} maxLength={120} required />
      </label>
      <label>
        工作時區
        <input name="timeZone" defaultValue={settings.timeZone} maxLength={64} required />
      </label>
      <button className="primary-button compact settings-submit" disabled={isSaving}>
        儲存設定
      </button>
    </form>
  )
}

function PasswordSection({
  emailIdentity,
  open,
  currentPassword,
  password,
  confirmPassword,
  saving,
  onOpen,
  onCancel,
  onCurrentPasswordChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit
}: {
  emailIdentity: boolean
  open: boolean
  currentPassword: string
  password: string
  confirmPassword: string
  saving: boolean
  onOpen: () => void
  onCancel: () => void
  onCurrentPasswordChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <section className="account-operation password-settings">
      <div className="security-subsection-heading">
        <KeyRound />
        <div>
          <h3>{emailIdentity ? '修改密碼' : '建立登入密碼'}</h3>
        </div>
      </div>
      {!open ? (
        <button className="secondary-button security-button" disabled={saving} onClick={onOpen}>
          修改密碼 <ArrowRight />
        </button>
      ) : (
        <form className="password-change-form" onSubmit={onSubmit}>
          <div
            className={emailIdentity ? 'password-fields email-password-fields' : 'password-fields'}
          >
            {emailIdentity && (
              <label>
                目前密碼
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => onCurrentPasswordChange(event.target.value)}
                  required
                  autoFocus
                />
              </label>
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
          </div>
          <div className="password-form-actions">
            <button className="text-button" type="button" onClick={onCancel}>
              取消
            </button>
            <button className="primary-button compact" disabled={saving}>
              更新密碼 <KeyRound />
            </button>
          </div>
        </form>
      )}
    </section>
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
      <section className="account-operation">
        <span className="panel-loading">正在載入刪除狀態</span>
      </section>
    )
  if (state === 'error')
    return (
      <section className="account-operation">
        <RefreshError onRetry={onRetry} />
      </section>
    )
  return (
    <section className="account-operation account-deletion-zone">
      <div className="security-subsection-heading">
        {deletionDueAt ? <TimerReset /> : <Trash2 />}
        <div>
          <h3>{deletionDueAt ? '刪除倒數已開始' : '刪除帳號'}</h3>
          {deletionDueAt && <p>{new Date(deletionDueAt).toLocaleString('zh-TW')}</p>}
        </div>
      </div>
      {deletionDueAt ? (
        <div className="deletion-countdown-actions">
          <button className="secondary-button" disabled={saving} onClick={onCancel}>
            取消刪除
          </button>
          <div className="danger-operation-actions">
            <button className="danger-outline-button" disabled={saving} onClick={onImmediateDelete}>
              立即刪除 <Trash2 />
            </button>
          </div>
        </div>
      ) : (
        <button className="danger-outline-button" disabled={saving} onClick={onRequest}>
          刪除帳號 <Trash2 />
        </button>
      )}
    </section>
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
