import type { Session } from '@supabase/supabase-js'
import {
  ArrowRight,
  Check,
  Cloud,
  KeyRound,
  LogOut,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  X
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ApiError,
  cancelAccountDeletion,
  createStudent,
  createLessonPurchase,
  deleteStudent,
  deleteAccountImmediately,
  getAccountLifecycle,
  getLessonPurchaseIncome,
  getWorkspaceSettings,
  getStudentDetail,
  isRegistrationEmailTaken,
  listStudents,
  requestAccountDeletion,
  updateWorkspaceSettings,
  updateStudent,
  type Student,
  type StudentDetail,
  type LessonIncomeSummary,
  type WorkspaceSettings
} from './api'
import {
  requestPasswordReset,
  resendEmailVerification,
  signInWithGoogle,
  signOutCurrentDevice,
  signOutEveryDevice,
  signUpCoach,
  updatePassword,
  verifySignupEmail
} from './account-auth'
import { supabase } from './supabase'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setPasswordRecovery(event === 'PASSWORD_RECOVERY')
      setAuthReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (!authReady) return <AppLoading />
  if (session && passwordRecovery) {
    return <PasswordRecovery onComplete={() => setPasswordRecovery(false)} />
  }
  if (!session) return <SignIn />
  return <StudentWorkspace session={session} />
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset' | 'verify'>('signin')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (mode === 'reset') {
      await requestEmail('reset')
      return
    }
    if (mode === 'verify') {
      await verifyCode()
      return
    }
    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('兩次輸入的密碼不一致。')
        return
      }
      setSubmitting(true)
      setError('')
      setNotice('')
      try {
        if (await isRegistrationEmailTaken(email)) {
          setError('此帳號已經註冊過。')
          return
        }
        await signUpCoach(supabase.auth, email, password, window.location.origin)
        setMode('verify')
        setVerificationCode('')
        setNotice('6 位驗證碼已寄出。')
      } catch (signupError) {
        setError(readError(signupError))
      } finally {
        setSubmitting(false)
      }
      return
    }
    setSubmitting(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (authError) setError('登入失敗，請確認 Email 與密碼。')
    setSubmitting(false)
  }

  const verifyCode = async () => {
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      await verifySignupEmail(supabase.auth, email, verificationCode)
      setNotice('Email 已驗證，正在開啟工作台…')
    } catch (verificationError) {
      setError(readError(verificationError))
    } finally {
      setSubmitting(false)
    }
  }

  const onGoogleSignIn = async () => {
    setSubmitting(true)
    setError('')
    try {
      await signInWithGoogle(supabase.auth, window.location.origin)
    } catch (googleError) {
      setError(readError(googleError))
      setSubmitting(false)
    }
  }

  const changeMode = (nextMode: typeof mode) => {
    setMode(nextMode)
    setError('')
    setNotice('')
    setPassword('')
    setConfirmPassword('')
    setVerificationCode('')
  }

  const requestEmail = async (kind: 'reset' | 'verify') => {
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      const redirectTo = window.location.origin
      if (kind === 'reset') await requestPasswordReset(supabase.auth, email, redirectTo)
      else await resendEmailVerification(supabase.auth, email, redirectTo)
      setNotice(
        kind === 'reset' ? '若帳號存在，重設信已寄出。' : '若帳號需要驗證，驗證信已重新寄出。'
      )
    } catch (requestError) {
      setError(readError(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story" aria-label="FORM Coach Desk">
        <Brand />
        <div className="auth-copy reveal">
          <span className="eyebrow">COACH OPERATING SYSTEM</span>
          <h1>
            專注在教學，
            <br />
            其餘保持<span>有序。</span>
          </h1>
          <p>學生、課程與每一次訓練脈絡，跨裝置安全同步。</p>
        </div>
        <div className="auth-proof">
          <ShieldCheck />
          <span>每位教練擁有獨立工作空間</span>
        </div>
      </section>
      <section className="auth-panel">
        <form className="auth-card reveal delay-1" onSubmit={onSubmit}>
          <div>
            <span className="eyebrow dark">SECURE ACCESS</span>
            <h2>
              {mode === 'signin'
                ? '回到你的工作台'
                : mode === 'signup'
                  ? '建立教練帳號'
                  : mode === 'reset'
                    ? '重設登入密碼'
                    : '驗證你的 Email'}
            </h2>
            <p>
              {mode === 'signin'
                ? '使用 Email 密碼或 Google 帳號登入。'
                : mode === 'signup'
                  ? '使用你的 Email 與自訂密碼；完成 6 位驗證碼後即可開始。'
                  : mode === 'verify'
                    ? '輸入寄到 Email 的 6 位驗證碼。'
                    : '我們會將重設方式寄到你的 Email。'}
            </p>
          </div>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="coach@example.com"
              autoComplete="email"
              required
              autoFocus
            />
          </label>
          {(mode === 'signin' || mode === 'signup') && (
            <label>
              {mode === 'signup' ? '設定密碼' : '密碼'}
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === 'signup' ? '至少 12 個字元' : '輸入你的密碼'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={mode === 'signup' ? 12 : undefined}
                required
              />
            </label>
          )}
          {mode === 'signup' && (
            <label>
              再次輸入密碼
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={12}
                required
              />
            </label>
          )}
          {mode === 'verify' && (
            <label>
              6 位驗證碼
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={verificationCode}
                onChange={(event) =>
                  setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="123456"
                required
                autoFocus
              />
            </label>
          )}
          {error && <p className="form-error">{error}</p>}
          {notice && <p className="form-notice">{notice}</p>}
          <button className="primary-button" disabled={submitting}>
            {submitting
              ? '處理中…'
              : mode === 'signin'
                ? '安全登入'
                : mode === 'signup'
                  ? '寄送驗證碼'
                  : mode === 'reset'
                    ? '寄送重設信'
                    : '驗證 Email'}
            <ArrowRight />
          </button>
          {mode === 'verify' && (
            <button
              type="button"
              className="secondary-button"
              disabled={submitting}
              onClick={() => void requestEmail('verify')}
            >
              重新寄送驗證碼
            </button>
          )}
          <div className="auth-links">
            {mode === 'signin' ? (
              <>
                <button type="button" onClick={() => changeMode('signup')}>
                  建立帳號
                </button>
                <button type="button" onClick={() => changeMode('reset')}>
                  忘記密碼
                </button>
                <button type="button" onClick={() => changeMode('verify')}>
                  未收到驗證信
                </button>
              </>
            ) : (
              <button type="button" onClick={() => changeMode('signin')}>
                返回登入
              </button>
            )}
          </div>
          {(mode === 'signin' || mode === 'signup') && (
            <>
              <div className="auth-divider">或</div>
              <button
                type="button"
                className="secondary-button auth-google"
                disabled={submitting}
                onClick={() => void onGoogleSignIn()}
              >
                使用 Google 繼續
              </button>
              {mode === 'signup' && (
                <small>
                  若你已用同一 Email 的 Google 帳號登入過，請先使用 Google
                  登入，再從帳號安全設定密碼。
                </small>
              )}
            </>
          )}
          <small>登入狀態由 Supabase Auth 安全維護；應用不會保存你的密碼。</small>
        </form>
      </section>
    </main>
  )
}

function StudentWorkspace({ session }: { session: Session }) {
  const [students, setStudents] = useState<Student[]>([])
  const [income, setIncome] = useState<LessonIncomeSummary[]>([])
  const [state, setState] = useState<LoadState>('idle')
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [securityOpen, setSecurityOpen] = useState(false)
  const [workspaceSettingsOpen, setWorkspaceSettingsOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState('loading')
    setMessage('')
    try {
      const [listedStudents, incomeSummary] = await Promise.all([
        listStudents(session.access_token),
        getLessonPurchaseIncome(session.access_token)
      ])
      setStudents(listedStudents)
      setIncome(incomeSummary)
      setState('ready')
    } catch (error) {
      setState('error')
      setMessage(readError(error))
    }
  }, [session.access_token])

  useEffect(() => {
    void load()
  }, [load])

  const filteredStudents = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('zh-Hant')
    if (!keyword) return students
    return students.filter((student) =>
      `${student.name} ${student.goal}`.toLocaleLowerCase('zh-Hant').includes(keyword)
    )
  }, [query, students])

  const onCreated = (student: Student) => {
    setStudents((current) => [...current, student])
    setModalOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav aria-label="主要導覽">
          <a className="active" href="#students">
            <UsersRound />
            學生
          </a>
        </nav>
        <div className="sidebar-bottom">
          <p className="sync-state">
            <span /> SUPABASE CONNECTED
          </p>
          <div className="coach-card">
            <div className="mini-avatar">{initials(session.user.email)}</div>
            <div>
              <strong>{session.user.email?.split('@')[0] || 'Coach'}</strong>
              <small>{session.user.email}</small>
            </div>
            <button aria-label="帳號安全" onClick={() => setSecurityOpen(true)}>
              <Settings2 />
            </button>
            <button aria-label="工作台設定" onClick={() => setWorkspaceSettingsOpen(true)}>
              <SlidersHorizontal />
            </button>
            <button
              aria-label="登出目前裝置"
              onClick={() => void signOutCurrentDevice(supabase.auth)}
            >
              <LogOut />
            </button>
          </div>
        </div>
      </aside>
      <main className="page" id="students">
        <header className="page-header reveal">
          <div>
            <span className="eyebrow dark">CLIENT ROSTER / {students.length} TOTAL</span>
            <h1>學生</h1>
            <p>正式資料由後端管理；此裝置只保留登入狀態與畫面狀態。</p>
          </div>
          <button className="primary-button compact" onClick={() => setModalOpen(true)}>
            <Plus /> 新增學生
          </button>
        </header>

        <div className="toolbar reveal delay-1">
          <label className="search-box">
            <Search />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜尋姓名或訓練目標"
            />
          </label>
          <div className={`cloud-state ${state}`}>
            {state === 'loading' ? <Cloud /> : state === 'error' ? <X /> : <Check />}
            {state === 'loading' ? '同步中' : state === 'error' ? '連線失敗' : '資料已同步'}
          </div>
        </div>

        {state === 'ready' && (
          <section className="income-summary reveal delay-1" aria-label="累計實收">
            <span>累計實收</span>
            {income.length ? (
              <div>
                {income.map((item) => (
                  <strong key={item.currency}>
                    {formatMoney(item.amountMinor, item.currency)}
                  </strong>
                ))}
              </div>
            ) : (
              <strong>尚無收款紀錄</strong>
            )}
            <small>依教練手動登錄的購課實收統計，不包含線上付款。</small>
          </section>
        )}

        {message && (
          <div className="notice error" role="alert">
            <span>{message}</span>
            <button onClick={() => void load()}>重試</button>
          </div>
        )}

        {state === 'ready' && students.length === 0 ? (
          <section className="empty-state reveal delay-2">
            <span className="empty-index">01</span>
            <UserRound />
            <h2>建立第一位學生</h2>
            <p>學生會保存到你的私有 Workspace，其他教練無法讀取。</p>
            <button className="text-button" onClick={() => setModalOpen(true)}>
              開始建立 <ArrowRight />
            </button>
          </section>
        ) : (
          <section className="student-grid reveal delay-2" aria-live="polite">
            {filteredStudents.map((student, index) => (
              <article className="student-card" key={student.id}>
                <span className="student-index">{String(index + 1).padStart(2, '0')}</span>
                <div className="large-avatar">{student.name.slice(-2)}</div>
                <h2>{student.name}</h2>
                <p>{student.goal || '尚未設定訓練目標'}</p>
                <div className="student-meta">
                  <span>{student.active ? '進行中' : '已封存'}</span>
                  <small>v{student.version}</small>
                </div>
                <button
                  className="student-card-action"
                  onClick={() => setSelectedStudentId(student.id)}
                >
                  查看學生與堂數 <ArrowRight />
                </button>
              </article>
            ))}
          </section>
        )}
      </main>
      {modalOpen && (
        <CreateStudentDialog
          accessToken={session.access_token}
          onClose={() => setModalOpen(false)}
          onCreated={onCreated}
        />
      )}
      {securityOpen && (
        <AccountSecurityDialog
          accessToken={session.access_token}
          email={session.user.email || ''}
          onClose={() => setSecurityOpen(false)}
        />
      )}
      {workspaceSettingsOpen && (
        <WorkspaceSettingsDialog
          accessToken={session.access_token}
          onClose={() => setWorkspaceSettingsOpen(false)}
        />
      )}
      {selectedStudentId && (
        <StudentDetailDialog
          accessToken={session.access_token}
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  )
}

function StudentDetailDialog({
  accessToken,
  studentId,
  onClose,
  onChanged
}: {
  accessToken: string
  studentId: string
  onClose: () => void
  onChanged: () => void
}) {
  const [detail, setDetail] = useState<StudentDetail | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const loadDetail = useCallback(async () => {
    setError('')
    try {
      setDetail(await getStudentDetail(accessToken, studentId))
    } catch (loadError) {
      setError(readError(loadError))
    }
  }, [accessToken, studentId])
  useEffect(() => {
    void loadDetail()
  }, [loadDetail])
  const saveStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!detail) return
    setSubmitting(true)
    setError('')
    setMessage('')
    const values = new FormData(event.currentTarget)
    try {
      const student = await updateStudent(accessToken, detail.student.id, {
        name: String(values.get('name') || '').trim(),
        phone: String(values.get('phone') || '').trim(),
        goal: String(values.get('goal') || '').trim(),
        privateNote: String(values.get('privateNote') || '').trim(),
        active: values.get('active') === 'on',
        lineLinked: detail.student.lineLinked,
        version: detail.student.version
      })
      setDetail((current) => (current ? { ...current, student } : current))
      setMessage('學生資料已儲存。')
      onChanged()
    } catch (saveError) {
      setError(readError(saveError))
    } finally {
      setSubmitting(false)
    }
  }
  const addPurchase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!detail) return
    const form = event.currentTarget
    setSubmitting(true)
    setError('')
    setMessage('')
    const values = new FormData(event.currentTarget)
    try {
      await createLessonPurchase(accessToken, detail.student.id, {
        purchasedAt: new Date(String(values.get('purchasedAt'))).toISOString(),
        lessonCount: Number(values.get('lessonCount')),
        amountMinor: Number(values.get('amountMinor')),
        currency: 'TWD',
        privateNote: String(values.get('purchaseNote') || '').trim()
      })
      await loadDetail()
      setMessage('購課堂數已登錄；餘額會由已完成課堂自動推導。')
      onChanged()
      form.reset()
    } catch (purchaseError) {
      setError(readError(purchaseError))
    } finally {
      setSubmitting(false)
    }
  }
  const remove = async () => {
    if (!detail) return
    setSubmitting(true)
    setError('')
    try {
      await deleteStudent(accessToken, detail.student.id, detail.student.version)
      onChanged()
      onClose()
    } catch (deleteError) {
      setError(readError(deleteError))
    } finally {
      setSubmitting(false)
    }
  }
  const localToday = new Date().toISOString().slice(0, 10)
  return (
    <div className="modal-backdrop" role="presentation" onPointerDown={onClose}>
      <section
        className="modal student-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-detail-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow dark">STUDENT / PRIVATE</span>
            <h2 id="student-detail-title">{detail?.student.name || '學生資料'}</h2>
          </div>
          <button className="icon-button" aria-label="關閉" onClick={onClose}>
            <X />
          </button>
        </header>
        {!detail && !error ? (
          <p className="security-footnote">正在讀取學生資料…</p>
        ) : (
          detail && (
            <>
              <div className="lesson-balance">
                <span>剩餘堂數</span>
                <strong className={detail.lessonSummary.remaining <= 2 ? 'low-balance' : ''}>
                  {detail.lessonSummary.remaining}
                </strong>
                <small>
                  已購 {detail.lessonSummary.purchased} · 已完成 {detail.lessonSummary.completed}
                </small>
              </div>
              <p className="security-footnote">
                餘額只由購課與已完成課堂推導；低堂數或負數只會提示，不會自動修改。
              </p>
              <form onSubmit={saveStudent}>
                <h3>學生資料</h3>
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
                  進行中的學生（取消勾選為封存，不會刪除資料）
                </label>
                <button className="secondary-button" disabled={submitting}>
                  儲存學生資料
                </button>
              </form>
              <form className="purchase-form" onSubmit={addPurchase}>
                <h3>登錄購課</h3>
                <div className="field-row">
                  <label>
                    購買日期
                    <input name="purchasedAt" type="date" defaultValue={localToday} required />
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
                  <textarea name="purchaseNote" maxLength={4000} placeholder="僅供教練查看" />
                </label>
                <button className="primary-button compact" disabled={submitting}>
                  登錄堂數 <ArrowRight />
                </button>
              </form>
              <section className="purchase-history">
                <h3>購課紀錄</h3>
                {detail.purchases.length ? (
                  detail.purchases.map((purchase) => (
                    <div key={purchase.id}>
                      <strong>{purchase.lessonCount} 堂</strong>
                      <span>
                        {new Date(purchase.purchasedAt).toLocaleDateString('zh-TW')} ·{' '}
                        {formatMoney(purchase.amountMinor, purchase.currency)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p>尚無購課紀錄。</p>
                )}
              </section>
              <section className="student-delete">
                <h3>永久刪除學生</h3>
                <p>這會刪除學生、購課與之後建立的課堂相關資料，無法復原。</p>
                <button
                  className="text-button danger-button"
                  disabled={submitting}
                  onClick={() => setDeleteOpen(true)}
                >
                  永久刪除
                </button>
              </section>
              {message && <p className="form-notice">{message}</p>}
              {error && <p className="form-error">{error}</p>}
              {deleteOpen && (
                <div className="danger-confirmation" role="presentation">
                  <section
                    className="danger-confirmation-card"
                    role="alertdialog"
                    aria-modal="true"
                  >
                    <span className="eyebrow danger">IRREVERSIBLE ACTION</span>
                    <h3>永久刪除 {detail.student.name}？</h3>
                    <p>所有購課與課堂相關資料會一併刪除，無法復原。</p>
                    <div className="danger-confirmation-actions">
                      <button
                        className="secondary-button"
                        disabled={submitting}
                        onClick={() => setDeleteOpen(false)}
                      >
                        保留學生
                      </button>
                      <button
                        className="danger-confirm-button"
                        disabled={submitting}
                        onClick={() => void remove()}
                      >
                        永久刪除
                      </button>
                    </div>
                  </section>
                </div>
              )}
            </>
          )
        )}
        {error && !detail && <p className="form-error">{error}</p>}
      </section>
    </div>
  )
}

function WorkspaceSettingsDialog({
  accessToken,
  onClose
}: {
  accessToken: string
  onClose: () => void
}) {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [timeZone, setTimeZone] = useState('Asia/Taipei')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    void getWorkspaceSettings(accessToken)
      .then((loaded) => {
        if (!active) return
        setSettings(loaded)
        setDisplayName(loaded.displayName)
        setTimeZone(loaded.timeZone)
      })
      .catch((loadError) => active && setError(readError(loadError)))
    return () => {
      active = false
    }
  }, [accessToken])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!settings) return
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const updated = await updateWorkspaceSettings(accessToken, {
        displayName: displayName.trim(),
        timeZone: timeZone.trim(),
        version: settings.version
      })
      setSettings(updated)
      setDisplayName(updated.displayName)
      setTimeZone(updated.timeZone)
      setMessage('工作台設定已儲存。')
    } catch (saveError) {
      if (saveError instanceof ApiError && saveError.status === 409) {
        setError('此設定已在另一個裝置變更。請關閉後重新開啟，再決定是否覆寫。')
      } else {
        setError(readError(saveError))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onPointerDown={onClose}>
      <section
        className="modal settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-settings-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow dark">WORKSPACE SETTINGS</span>
            <h2 id="workspace-settings-title">工作台設定</h2>
          </div>
          <button className="icon-button" aria-label="關閉" onClick={onClose}>
            <X />
          </button>
        </header>
        {!settings && !error ? (
          <p className="security-footnote">正在讀取設定…</p>
        ) : (
          <form onSubmit={onSubmit}>
            <label>
              工作台顯示名稱
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={120}
                required
                autoFocus
              />
            </label>
            <label>
              時區（IANA 格式）
              <input
                value={timeZone}
                onChange={(event) => setTimeZone(event.target.value)}
                placeholder="Asia/Taipei"
                maxLength={64}
                required
              />
            </label>
            <p className="security-footnote">
              時區只影響你的工作台呈現，不參與帳號或 Workspace 授權。
            </p>
            {message && <p className="form-notice">{message}</p>}
            {error && <p className="form-error">{error}</p>}
            <footer>
              <button type="button" className="secondary-button" onClick={onClose}>
                關閉
              </button>
              <button className="primary-button compact" disabled={!settings || submitting}>
                {submitting ? '儲存中…' : '儲存設定'} <ArrowRight />
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  )
}

function PasswordRecovery({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password !== confirmPassword) return setError('兩次輸入的新密碼不一致。')
    setSubmitting(true)
    setError('')
    try {
      await updatePassword(supabase.auth, password)
      await signOutCurrentDevice(supabase.auth)
      onComplete()
    } catch (updateError) {
      setError(readError(updateError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story" aria-label="FORM Coach Desk">
        <Brand />
      </section>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={onSubmit}>
          <div>
            <span className="eyebrow dark">PASSWORD RECOVERY</span>
            <h2>設定新密碼</h2>
            <p>完成後會登出目前裝置，請使用新密碼重新登入。</p>
          </div>
          <label>
            新密碼
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
              autoFocus
            />
          </label>
          <label>
            再次輸入新密碼
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" disabled={submitting}>
            {submitting ? '更新中…' : '更新密碼'} <KeyRound />
          </button>
        </form>
      </section>
    </main>
  )
}

function AccountSecurityDialog({
  accessToken,
  email,
  onClose
}: {
  accessToken: string
  email: string
  onClose: () => void
}) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [deletionDueAt, setDeletionDueAt] = useState<string | null>(null)
  const [lifecycleLoading, setLifecycleLoading] = useState(true)
  const [immediateDeleteOpen, setImmediateDeleteOpen] = useState(false)
  const [immediateDeleteConfirmation, setImmediateDeleteConfirmation] = useState('')
  useEffect(() => {
    void getAccountLifecycle(accessToken)
      .then((lifecycle) => setDeletionDueAt(lifecycle.deletionDueAt))
      .catch((loadError) => setError(readError(loadError)))
      .finally(() => setLifecycleLoading(false))
  }, [accessToken])
  const execute = async (action: () => Promise<void>, success: string) => {
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      await action()
      setMessage(success)
    } catch (actionError) {
      setError(readError(actionError))
    } finally {
      setSubmitting(false)
    }
  }
  const onSetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password !== confirmPassword) {
      setError('兩次輸入的新密碼不一致。')
      return
    }
    await execute(async () => updatePassword(supabase.auth, password), '密碼已設定。')
    setPassword('')
    setConfirmPassword('')
  }
  const confirmImmediateDeletion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (immediateDeleteConfirmation !== 'DELETE') return
    await execute(async () => {
      await deleteAccountImmediately(accessToken)
      await signOutCurrentDevice(supabase.auth)
      onClose()
    }, '帳號已永久刪除。')
  }
  return (
    <div className="modal-backdrop" role="presentation" onPointerDown={onClose}>
      <section
        className="modal security-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-security-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow dark">ACCOUNT SECURITY</span>
            <h2 id="account-security-title">帳號與裝置</h2>
          </div>
          <button className="icon-button" aria-label="關閉" onClick={onClose}>
            <X />
          </button>
        </header>
        <p className="security-email">{email}</p>
        <div className="security-actions">
          <button
            className="primary-button"
            disabled={submitting}
            onClick={() =>
              void execute(() => signOutEveryDevice(supabase.auth), '所有裝置的登入已結束。')
            }
          >
            登出所有裝置 <LogOut />
          </button>
        </div>
        <form className="security-password" onSubmit={onSetPassword}>
          <h3>設定或變更密碼</h3>
          <p>Google 登入的帳號可在此設定密碼，之後同一個 Email 可用任一方式登入。</p>
          <label>
            新密碼
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
          </label>
          <label>
            再次輸入新密碼
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
          </label>
          <button className="secondary-button" disabled={submitting}>
            設定密碼 <KeyRound />
          </button>
        </form>
        {message && <p className="form-notice">{message}</p>}
        {error && <p className="form-error">{error}</p>}
        <section className="security-password account-deletion">
          <h3>刪除帳號與所有資料</h3>
          <p>
            {deletionDueAt
              ? `已排定於 ${new Date(deletionDueAt).toLocaleString('zh-TW')} 永久刪除。到期前可取消，或立即永久刪除。`
              : '提出刪除後會有 14 天反悔期；期限一到，這個 Coach、Workspace、學生與所有相關資料將永久從資料庫刪除，無法復原。'}
          </p>
          {deletionDueAt ? (
            <button
              className="secondary-button"
              disabled={submitting || lifecycleLoading}
              onClick={() =>
                void execute(async () => {
                  const lifecycle = await cancelAccountDeletion(accessToken)
                  setDeletionDueAt(lifecycle.deletionDueAt)
                }, '已取消帳號刪除。')
              }
            >
              取消刪除
            </button>
          ) : (
            <button
              className="secondary-button"
              disabled={submitting || lifecycleLoading}
              onClick={() =>
                void execute(async () => {
                  const lifecycle = await requestAccountDeletion(accessToken)
                  setDeletionDueAt(lifecycle.deletionDueAt)
                }, '帳號已進入 14 天刪除倒數。')
              }
            >
              開始 14 天刪除倒數
            </button>
          )}
          <button
            className="text-button danger-button"
            disabled={submitting || lifecycleLoading}
            onClick={() => setImmediateDeleteOpen(true)}
          >
            立即永久刪除
          </button>
        </section>
        <p className="security-footnote">
          刪除完成後不保留可恢復副本；系統不會寄送帳號刪除通知信。
        </p>
        {immediateDeleteOpen && (
          <div className="danger-confirmation" role="presentation">
            <section
              className="danger-confirmation-card"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="immediate-delete-title"
              aria-describedby="immediate-delete-description"
            >
              <span className="eyebrow danger">IRREVERSIBLE ACTION</span>
              <h3 id="immediate-delete-title">立即永久刪除？</h3>
              <p id="immediate-delete-description">
                這會立刻刪除這個 Coach、Workspace、學生與所有相關資料，無法恢復。
              </p>
              <form onSubmit={(event) => void confirmImmediateDeletion(event)}>
                <label>
                  輸入 <code>DELETE</code> 以確認
                  <input
                    value={immediateDeleteConfirmation}
                    onChange={(event) => setImmediateDeleteConfirmation(event.target.value)}
                    autoComplete="off"
                    autoFocus
                    spellCheck={false}
                  />
                </label>
                <div className="danger-confirmation-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={submitting}
                    onClick={() => {
                      setImmediateDeleteOpen(false)
                      setImmediateDeleteConfirmation('')
                    }}
                  >
                    保留帳號
                  </button>
                  <button
                    className="danger-confirm-button"
                    disabled={submitting || immediateDeleteConfirmation !== 'DELETE'}
                  >
                    永久刪除
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </section>
    </div>
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

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const values = new FormData(event.currentTarget)
    try {
      const student = await createStudent(accessToken, {
        name: String(values.get('name') || '').trim(),
        phone: String(values.get('phone') || '').trim(),
        goal: String(values.get('goal') || '').trim(),
        privateNote: String(values.get('privateNote') || '').trim()
      })
      onCreated(student)
    } catch (submitError) {
      setError(readError(submitError))
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onPointerDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-student-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow dark">NEW CLIENT / PRIVATE</span>
            <h2 id="create-student-title">建立學生</h2>
          </div>
          <button className="icon-button" aria-label="關閉" onClick={onClose}>
            <X />
          </button>
        </header>
        <form onSubmit={onSubmit}>
          <label>
            學生姓名
            <input name="name" required maxLength={120} placeholder="例如：陳品妤" autoFocus />
          </label>
          <div className="field-row">
            <label>
              聯絡電話
              <input name="phone" maxLength={40} placeholder="選填" />
            </label>
            <label>
              訓練目標
              <input name="goal" maxLength={1000} placeholder="提升肌力・改善肩頸" />
            </label>
          </div>
          <label>
            私人備註
            <textarea
              name="privateNote"
              maxLength={4000}
              placeholder="只供教練查看，不進入公開分享內容"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <footer>
            <button type="button" className="secondary-button" onClick={onClose}>
              取消
            </button>
            <button className="primary-button compact" disabled={submitting}>
              {submitting ? '建立中…' : '建立學生'} <ArrowRight />
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">F</span>
      <span>
        FORM
        <small>COACH DESK</small>
      </span>
    </div>
  )
}

function AppLoading() {
  return (
    <main className="app-loading">
      <Brand />
      <span>正在確認登入狀態…</span>
    </main>
  )
}

function initials(email: string | undefined) {
  return (email?.slice(0, 2) || 'CO').toUpperCase()
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'TWD' ? 0 : undefined
  }).format(amountMinor)
}

function readError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return '登入已失效，請登出後重新登入。'
  return error instanceof Error ? error.message : '發生未預期的錯誤'
}
