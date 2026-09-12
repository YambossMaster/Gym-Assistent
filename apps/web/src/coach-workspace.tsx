import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cloud,
  KeyRound,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  TimerReset,
  Trash2,
  UserRound
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom'
import {
  ApiError,
  createStudent,
  deleteAccountImmediately,
  getStudentDetail,
  getWorkspaceSettings,
  type Student
} from './api'
import { changePassword, signOutCurrentDevice, updatePassword } from './account-auth'
import {
  useStudentDetailRouteQuery,
  useStudentRouteMutations,
  useStudentsRouteQuery
} from './pages/students/queries'
import { useSettingsRouteMutations, useSettingsRouteQueries } from './pages/settings/queries'
import { queryKeys } from './query-keys'
import { selectCollectionRouteState, selectDetailRouteState } from './route-state'
import { Confirmation, Page, SettingsPanelHeading } from './shared/primitives'
import { supabase } from './supabase'

export function StudentsPage({ session }: { session: Session }) {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const { students: studentsQuery, income: incomeQuery } = useStudentsRouteQuery(session)
  const students = studentsQuery.data ?? []
  const income = incomeQuery.data ?? []
  const routeState = selectCollectionRouteState({
    data: studentsQuery.data,
    isLoading: studentsQuery.isLoading,
    isFetching: studentsQuery.isFetching,
    isError: studentsQuery.isError
  })
  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('zh-Hant')
    return keyword
      ? students.filter((student) =>
          `${student.name} ${student.goal}`.toLocaleLowerCase('zh-Hant').includes(keyword)
        )
      : students
  }, [query, students])

  return (
    <Page
      title="學生"
      eyebrow={`學生名單 · ${students.length}`}
      actions={
        <button className="primary-button compact" onClick={() => setCreateOpen(true)}>
          <Plus />
          新增學生
        </button>
      }
    >
      <div className="toolbar">
        <label className="search-box">
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋姓名或訓練目標"
          />
        </label>
        <div className={`cloud-state ${studentsQuery.isError ? 'error' : ''}`}>
          {studentsQuery.isFetching ? <Cloud /> : <Check />}
          {studentsQuery.isFetching ? '更新中' : '已更新'}
        </div>
      </div>
      {studentsQuery.isError && (
        <div className="notice error" role="alert">
          <span>暫時無法讀取學生資料，請稍後再試。</span>
          <button onClick={() => void studentsQuery.refetch()}>重試</button>
        </div>
      )}
      {studentsQuery.isSuccess && (
        <section className="income-summary" aria-label="累計實收">
          <span>累計實收</span>
          <div>
            {income.length ? (
              income.map((item) => (
                <strong key={item.currency}>{formatMoney(item.amountMinor, item.currency)}</strong>
              ))
            ) : (
              <strong>尚無紀錄</strong>
            )}
          </div>
          <small>依購課時登錄的實收金額整理。</small>
        </section>
      )}
      {routeState === 'loading' ? (
        <StudentListSkeleton />
      ) : routeState === 'error' ? (
        <StudentListError onRetry={() => void studentsQuery.refetch()} />
      ) : routeState === 'empty' ? (
        <section className="empty-state">
          <UserRound />
          <h2>建立第一位學生</h2>
          <p>先留下姓名與訓練目標，之後隨時補齊資料。</p>
          <button className="text-button" onClick={() => setCreateOpen(true)}>
            建立學生 <ArrowRight />
          </button>
        </section>
      ) : (
        <section className="student-grid" aria-live="polite">
          {filtered.map((student, index) => (
            <StudentCard
              key={student.id}
              student={student}
              index={index}
              accessToken={session.access_token}
              coachId={session.user.id}
            />
          ))}
        </section>
      )}
      {createOpen && (
        <CreateStudentDialog
          accessToken={session.access_token}
          onClose={() => setCreateOpen(false)}
          onCreated={(student) => {
            queryClient.setQueryData<Student[]>(
              queryKeys.students(session.user.id),
              (current = []) => [...current, student]
            )
            void queryClient.invalidateQueries({ queryKey: queryKeys.income(session.user.id) })
            setCreateOpen(false)
          }}
        />
      )}
    </Page>
  )
}

function StudentCard({
  student,
  index,
  accessToken,
  coachId
}: {
  student: Student
  index: number
  accessToken: string
  coachId: string
}) {
  const queryClient = useQueryClient()
  const prefetch = () =>
    void queryClient.prefetchQuery({
      queryKey: queryKeys.student(coachId, student.id),
      queryFn: () => getStudentDetail(accessToken, student.id)
    })
  return (
    <article className="student-card">
      <span className="student-index">{String(index + 1).padStart(2, '0')}</span>
      <div className="large-avatar">{student.name.slice(-2)}</div>
      <h2>{student.name}</h2>
      <p>{student.goal || '尚未設定訓練目標'}</p>
      <div className="student-meta">
        <span>{student.active ? '進行中' : '已封存'}</span>
      </div>
      <Link
        className="student-card-action"
        to={`/students/${student.id}`}
        onMouseEnter={prefetch}
        onFocus={prefetch}
      >
        查看學生資料 <ArrowRight />
      </Link>
    </article>
  )
}

export function StudentDetailPage({ session }: { session: Session }) {
  const { studentId = '' } = useParams()
  const navigate = useNavigate()
  const [notice, setNotice] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const detailQuery = useStudentDetailRouteQuery(session, studentId)
  const {
    save: saveMutation,
    purchase: purchaseMutation,
    remove: deleteMutation
  } = useStudentRouteMutations({
    session,
    studentId,
    onNotice: setNotice,
    onDeleted: () => navigate('/students')
  })
  const routeState = selectDetailRouteState({
    data: detailQuery.data,
    isLoading: detailQuery.isLoading,
    isFetching: detailQuery.isFetching,
    error: detailQuery.error
  })
  if (routeState === 'loading') return <StudentDetailSkeleton />
  if (routeState === 'not-found') return <StudentDetailEmpty />
  if (routeState === 'error' || !detailQuery.data)
    return <StudentDetailError onRetry={() => void detailQuery.refetch()} />
  const detail = detailQuery.data
  const submitting =
    saveMutation.isPending || purchaseMutation.isPending || deleteMutation.isPending

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNotice('')
    const values = new FormData(event.currentTarget)
    saveMutation.mutate({
      name: String(values.get('name') || '').trim(),
      phone: String(values.get('phone') || '').trim(),
      goal: String(values.get('goal') || '').trim(),
      privateNote: String(values.get('privateNote') || '').trim(),
      active: values.get('active') === 'on',
      lineLinked: detail.student.lineLinked,
      version: detail.student.version
    })
  }
  const purchase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    setNotice('')
    const values = new FormData(form)
    purchaseMutation.mutate(
      {
        purchasedAt: new Date(String(values.get('purchasedAt'))).toISOString(),
        lessonCount: Number(values.get('lessonCount')),
        amountMinor: Number(values.get('amountMinor')),
        currency: 'TWD',
        privateNote: String(values.get('purchaseNote') || '').trim()
      },
      { onSuccess: () => form.reset() }
    )
  }
  const remove = async () => {
    deleteMutation.mutate(detail.student.version)
  }
  return (
    <Page
      title={detail.student.name}
      eyebrow="學生資料"
      actions={
        <button className="secondary-button" onClick={() => navigate('/students')}>
          <ArrowLeft />
          返回學生
        </button>
      }
    >
      <section className="detail-page-grid">
        <div className="lesson-balance">
          <span>剩餘堂數</span>
          <strong className={detail.lessonSummary.remaining <= 2 ? 'low-balance' : ''}>
            {detail.lessonSummary.remaining}
          </strong>
          <small>
            已購 {detail.lessonSummary.purchased} · 已完成 {detail.lessonSummary.completed}
          </small>
        </div>
        <p className="security-footnote">堂數會依購課與已完成課堂計算；需要留意時會清楚提示。</p>
        <form className="detail-section" onSubmit={save}>
          <h2>基本資料</h2>
          <label>
            姓名
            <input name="name" defaultValue={detail.student.name} required maxLength={120} />
          </label>
          <div className="field-row">
            <label>
              電話
              <input name="phone" defaultValue={detail.student.phone} maxLength={40} />
            </label>
            <label>
              訓練目標
              <input name="goal" defaultValue={detail.student.goal} maxLength={1000} />
            </label>
          </div>
          <label>
            私人備註
            <textarea
              name="privateNote"
              defaultValue={detail.student.privateNote}
              maxLength={4000}
            />
          </label>
          <label className="checkbox-label">
            <input name="active" type="checkbox" defaultChecked={detail.student.active} />
            進行中的學生
          </label>
          <button className="secondary-button" disabled={submitting}>
            儲存資料
          </button>
        </form>
        <form className="detail-section purchase-form" onSubmit={purchase}>
          <h2>登錄購課</h2>
          <div className="field-row">
            <label>
              購買日期
              <input
                name="purchasedAt"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </label>
            <label>
              堂數
              <input name="lessonCount" type="number" min="1" max="10000" required />
            </label>
            <label>
              實收金額（TWD）
              <input name="amountMinor" type="number" min="0" step="1" required />
            </label>
          </div>
          <label>
            教練備註
            <textarea name="purchaseNote" maxLength={4000} placeholder="僅供自己查看" />
          </label>
          <button className="primary-button compact" disabled={submitting}>
            登錄購課 <ArrowRight />
          </button>
        </form>
        <section className="detail-section purchase-history">
          <h2>購課紀錄</h2>
          {detail.purchases.length ? (
            detail.purchases.map((item) => (
              <div key={item.id}>
                <strong>{item.lessonCount} 堂</strong>
                <span>
                  {new Date(item.purchasedAt).toLocaleDateString('zh-TW')} ·{' '}
                  {formatMoney(item.amountMinor, item.currency)}
                </span>
              </div>
            ))
          ) : (
            <p>尚無購課紀錄。</p>
          )}
        </section>
        <section className="detail-section student-delete">
          <h2>刪除學生</h2>
          <p>刪除後，相關購課與課堂資料無法復原。</p>
          <button
            className="text-button danger-button"
            disabled={submitting}
            onClick={() => setDeleteOpen(true)}
          >
            永久刪除
          </button>
        </section>
        {notice && <p className="form-notice">{notice}</p>}
      </section>
      {deleteOpen && (
        <Confirmation
          title={`永久刪除 ${detail.student.name}？`}
          text="這項操作無法復原。"
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => void remove()}
          disabled={submitting}
        />
      )}
    </Page>
  )
}

function StudentDetailSkeleton() {
  return (
    <Page title="學生資料" eyebrow="正在載入">
      <section className="detail-skeleton" aria-label="正在載入學生資料">
        <span />
        <span />
        <span />
      </section>
    </Page>
  )
}

function StudentListSkeleton() {
  return (
    <section className="student-grid" aria-label="正在載入學生名單">
      <div className="detail-skeleton">
        <span />
        <span />
        <span />
      </div>
      <div className="detail-skeleton">
        <span />
        <span />
        <span />
      </div>
      <div className="detail-skeleton">
        <span />
        <span />
        <span />
      </div>
    </section>
  )
}
function StudentListError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="empty-state">
      <Cloud />
      <h2>暫時無法讀取學生資料</h2>
      <p>請稍後再試。</p>
      <button className="secondary-button" onClick={onRetry}>
        重試
      </button>
    </section>
  )
}
function StudentDetailEmpty() {
  return (
    <Page title="找不到學生">
      <section className="empty-state">
        <UserRound />
        <h2>這位學生已不存在</h2>
        <p>可能已被刪除，或你沒有查看權限。</p>
        <NavLink className="text-button" to="/students">
          返回學生名單 <ArrowRight />
        </NavLink>
      </section>
    </Page>
  )
}
function StudentDetailError({ onRetry }: { onRetry: () => void }) {
  return (
    <Page title="暫時無法開啟學生資料">
      <section className="empty-state">
        <Cloud />
        <h2>請稍後再試</h2>
        <p>目前無法讀取資料；學生資料沒有被更動。</p>
        <button className="secondary-button" onClick={onRetry}>
          重新載入
        </button>
      </section>
    </Page>
  )
}

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
    onDeletionRequestClosed: () => setDeletionRequestOpen(false)
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
  const deleteMutation = useMutation({
    mutationFn: () => deleteAccountImmediately(session.access_token),
    onSuccess: async () => {
      await signOutCurrentDevice(supabase.auth)
    },
    onError: (error) => setMessage(readError(error))
  })
  const settings = settingsQuery.data
  const lifecycle = lifecycleQuery.data?.deletionDueAt ?? null
  const submitting =
    settingsMutation.isPending ||
    lifecycleMutation.isPending ||
    passwordMutation.isPending ||
    deleteMutation.isPending
  if ((settingsQuery.isLoading || lifecycleQuery.isLoading) && !settings)
    return (
      <Page title="設定">
        <section className="detail-skeleton">
          <span />
          <span />
          <span />
        </section>
      </Page>
    )
  if (settingsQuery.isError || lifecycleQuery.isError || !settings)
    return (
      <Page title="設定">
        <section className="empty-state">
          <Settings />
          <h2>暫時無法讀取設定</h2>
          <p>請重新整理後再試。</p>
        </section>
      </Page>
    )
  return (
    <Page title="設定" eyebrow="SYSTEM / PREFERENCES">
      <section className="settings-layout">
        <form
          className="settings-panel workspace-settings-panel"
          onSubmit={(event) => {
            event.preventDefault()
            setMessage('')
            const values = new FormData(event.currentTarget)
            settingsMutation.mutate({
              displayName: String(values.get('displayName') || '').trim(),
              timeZone: String(values.get('timeZone') || '').trim(),
              version: settings.version
            })
          }}
        >
          <SettingsPanelHeading eyebrow="COACH PROFILE" title="教練資料" />
          <label>
            教練顯示名稱
            <input
              name="displayName"
              defaultValue={settings.displayName}
              maxLength={120}
              required
            />
          </label>
          <label>
            工作時區
            <input name="timeZone" defaultValue={settings.timeZone} maxLength={64} required />
          </label>
          <button className="primary-button compact settings-submit" disabled={submitting}>
            儲存設定
          </button>
        </form>
        <section className="settings-panel account-settings-panel">
          <SettingsPanelHeading eyebrow="ACCOUNT & SECURITY" title="帳號安全" />
          <div className="account-email">
            <span>登入帳號</span>
            <strong>{session.user.email}</strong>
          </div>
          <button
            className="secondary-button security-button"
            disabled={submitting}
            onClick={() => void signOutCurrentDevice(supabase.auth)}
          >
            登出帳號 <LogOut />
          </button>
          <section className="account-operation password-settings">
            <div className="security-subsection-heading">
              <KeyRound />
              <div>
                <h3>{hasEmailIdentity(session) ? '修改密碼' : '建立登入密碼'}</h3>
              </div>
            </div>
            {!passwordOpen ? (
              <button
                className="secondary-button security-button"
                disabled={submitting}
                onClick={() => setPasswordOpen(true)}
              >
                修改密碼 <ArrowRight />
              </button>
            ) : (
              <form
                className="password-change-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (password !== confirmPassword) return setMessage('兩次輸入的新密碼不一致。')
                  passwordMutation.mutate()
                }}
              >
                <div
                  className={
                    hasEmailIdentity(session)
                      ? 'password-fields email-password-fields'
                      : 'password-fields'
                  }
                >
                  {hasEmailIdentity(session) && (
                    <label>
                      目前密碼
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
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
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={12}
                      required
                      autoFocus={!hasEmailIdentity(session)}
                    />
                  </label>
                  <label>
                    再次輸入新密碼
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      minLength={12}
                      required
                    />
                  </label>
                </div>
                <div className="password-form-actions">
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => {
                      setPasswordOpen(false)
                      setCurrentPassword('')
                      setPassword('')
                      setConfirmPassword('')
                    }}
                  >
                    取消
                  </button>
                  <button className="primary-button compact" disabled={submitting}>
                    更新密碼 <KeyRound />
                  </button>
                </div>
              </form>
            )}
          </section>
          <section className="account-operation account-deletion-zone">
            <div className="security-subsection-heading">
              {lifecycle ? <TimerReset /> : <Trash2 />}
              <div>
                <h3>{lifecycle ? '刪除倒數已開始' : '刪除帳號'}</h3>
                {lifecycle && <p>{new Date(lifecycle).toLocaleString('zh-TW')}</p>}
              </div>
            </div>
            {lifecycle ? (
              <div className="deletion-countdown-actions">
                <button
                  className="secondary-button"
                  disabled={submitting}
                  onClick={() => lifecycleMutation.mutate('cancel')}
                >
                  取消刪除
                </button>
                <div className="danger-operation-actions">
                  <button
                    className="danger-outline-button"
                    disabled={submitting}
                    onClick={() => setImmediateDelete(true)}
                  >
                    立即刪除 <Trash2 />
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="danger-outline-button"
                disabled={submitting}
                onClick={() => setDeletionRequestOpen(true)}
              >
                刪除帳號 <Trash2 />
              </button>
            )}
          </section>
        </section>
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
          disabled={submitting}
        />
      )}
      {immediateDelete && (
        <Confirmation
          title="立即永久刪除帳號？"
          text="這會永久刪除帳號與所有資料。"
          confirmation={confirmation}
          onConfirmationChange={setConfirmation}
          onCancel={() => setImmediateDelete(false)}
          onConfirm={() => deleteMutation.mutate()}
          disabled={submitting}
        />
      )}
    </Page>
  )
}

function CreateStudentDialog({
  accessToken,
  onClose,
  onCreated
}: {
  accessToken: string
  onClose: () => void
  onCreated: (student: Student) => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    const values = new FormData(event.currentTarget)
    try {
      onCreated(
        await createStudent(accessToken, {
          name: String(values.get('name') || '').trim(),
          phone: String(values.get('phone') || '').trim(),
          goal: String(values.get('goal') || '').trim(),
          privateNote: String(values.get('privateNote') || '').trim()
        })
      )
    } catch (reason) {
      setError(readError(reason))
      setSubmitting(false)
    }
  }
  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-modal="true">
        <header>
          <div>
            <span className="eyebrow dark">學生</span>
            <h2>新增學生</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            ×
          </button>
        </header>
        <form onSubmit={submit}>
          <label>
            姓名
            <input name="name" required maxLength={120} autoFocus />
          </label>
          <label>
            電話
            <input name="phone" maxLength={40} />
          </label>
          <label>
            訓練目標
            <input name="goal" maxLength={1000} />
          </label>
          <label>
            私人備註
            <textarea name="privateNote" maxLength={4000} />
          </label>
          {error && <p className="form-error">{error}</p>}
          <footer>
            <button className="secondary-button" type="button" onClick={onClose}>
              取消
            </button>
            <button className="primary-button compact" disabled={submitting}>
              建立學生
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

function initials(email: string | undefined) {
  return (email?.slice(0, 2) || 'CO').toUpperCase()
}

function hasEmailIdentity(session: Session): boolean {
  return session.user.identities?.some((identity) => identity.provider === 'email') ?? false
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'TWD' ? 0 : undefined
  }).format(amountMinor)
}
function readError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return '登入已失效，請重新登入。'
  return error instanceof Error ? error.message : '目前無法完成這項操作。'
}
