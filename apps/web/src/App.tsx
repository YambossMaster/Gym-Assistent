import type { Session } from '@supabase/supabase-js'
import {
  ArrowRight,
  Check,
  Cloud,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  X
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ApiError, createStudent, listStudents, type Student } from './api'
import { supabase } from './supabase'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (!authReady) return <AppLoading />
  if (!session) return <SignIn />
  return <StudentWorkspace session={session} />
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (authError) setError('登入失敗，請確認 Email 與密碼。')
    setSubmitting(false)
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
            <h2>回到你的工作台</h2>
            <p>目前僅開放已建立的教練帳號登入。</p>
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
          <label>
            密碼
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="輸入你的密碼"
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" disabled={submitting}>
            {submitting ? '驗證中…' : '安全登入'}
            <ArrowRight />
          </button>
          <small>登入狀態由 Supabase Auth 安全維護；應用不會保存你的密碼。</small>
        </form>
      </section>
    </main>
  )
}

function StudentWorkspace({ session }: { session: Session }) {
  const [students, setStudents] = useState<Student[]>([])
  const [state, setState] = useState<LoadState>('idle')
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    setState('loading')
    setMessage('')
    try {
      setStudents(await listStudents(session.access_token))
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
            <button aria-label="登出" onClick={() => void supabase.auth.signOut()}>
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

function readError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return '登入已失效，請登出後重新登入。'
  return error instanceof Error ? error.message : '發生未預期的錯誤'
}
