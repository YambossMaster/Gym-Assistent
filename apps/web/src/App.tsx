import type { Session } from '@supabase/supabase-js'
import { QueryClientProvider } from '@tanstack/react-query'
import { ArrowRight, KeyRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { isRegistrationEmailTaken } from './api'
import {
  requestPasswordReset,
  resendEmailVerification,
  signInWithGoogle,
  signOutCurrentDevice,
  signUpCoach,
  updatePassword,
  verifySignupEmail
} from './account-auth'
import { CoachWorkspace } from './app-shell/CoachWorkspace'
import { PublicCapabilityApp } from './pages/public/PublicCapabilityPages'
import { createAppQueryClient } from './query-client'
import { supabase } from './supabase'

type Mode = 'signin' | 'signup' | 'reset' | 'verify'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/t/:token" element={<PublicCapabilityApp purpose="training" />} />
        <Route path="/r/:token" element={<PublicCapabilityApp purpose="reschedule" />} />
        <Route path="*" element={<AuthenticatedApp />} />
      </Routes>
    </BrowserRouter>
  )
}

function AuthenticatedApp() {
  const [client] = useState(createAppQueryClient),
    [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(false),
    [recovery, setRecovery] = useState(false)
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (!next) client.clear()
      setSession(next)
      setRecovery(event === 'PASSWORD_RECOVERY')
      setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [client])
  if (!ready) return <Loading />
  if (session && recovery) return <Recovery onComplete={() => setRecovery(false)} />
  if (!session) return <SignIn />
  return (
    <QueryClientProvider client={client}>
      <CoachWorkspace session={session} />
    </QueryClientProvider>
  )
}

function SignIn() {
  const [mode, setMode] = useState<Mode>('signin'),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [code, setCode] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [submitting, setSubmitting] = useState(false)
  const change = (next: Mode) => {
    setMode(next)
    setError('')
    setNotice('')
    setPassword('')
    setConfirm('')
    setCode('')
  }
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw new Error('登入失敗，請確認 Email 與密碼。')
      } else if (mode === 'signup') {
        if (password !== confirm) throw new Error('兩次輸入的密碼不一致。')
        if (await isRegistrationEmailTaken(email)) throw new Error('此帳號已經註冊過。')
        await signUpCoach(supabase.auth, email, password, window.location.origin)
        setMode('verify')
        setNotice('6 位驗證碼已寄出。')
      } else if (mode === 'verify') {
        await verifySignupEmail(supabase.auth, email, code)
        setNotice('Email 已驗證，正在開啟工作台…')
      } else {
        await requestPasswordReset(supabase.auth, email, window.location.origin)
        setNotice('若帳號存在，重設信已寄出。')
      }
    } catch (reason) {
      setError(readError(reason))
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Brand />
        <div className="auth-copy">
          <span className="eyebrow">FORM COACH DESK</span>
          <h1>
            專注在教學，
            <br />
            其餘保持<span>有序。</span>
          </h1>
          <p>學生、課程與每一次訓練脈絡，隨時都能接續。</p>
        </div>
      </section>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <div>
            <h2>
              {mode === 'signin'
                ? '回到工作台'
                : mode === 'signup'
                  ? '建立教練帳號'
                  : mode === 'verify'
                    ? '驗證 Email'
                    : '重設密碼'}
            </h2>
          </div>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {(mode === 'signin' || mode === 'signup') && (
            <label>
              密碼
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'signup' ? 12 : undefined}
              />
            </label>
          )}
          {mode === 'signup' && (
            <label>
              再次輸入密碼
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={12}
              />
            </label>
          )}
          {mode === 'verify' && (
            <label>
              6 位驗證碼
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                inputMode="numeric"
              />
            </label>
          )}
          {error && <p className="form-error">{error}</p>}
          {notice && <p className="form-notice">{notice}</p>}
          <button className="primary-button" disabled={submitting}>
            {submitting ? '處理中…' : '繼續'}
            <ArrowRight />
          </button>
          {mode === 'verify' && (
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                void resendEmailVerification(supabase.auth, email, window.location.origin)
              }
            >
              重新寄送驗證碼
            </button>
          )}
          {(mode === 'signin' || mode === 'signup') && (
            <button
              type="button"
              className="secondary-button auth-google"
              onClick={() => void signInWithGoogle(supabase.auth, window.location.origin)}
            >
              使用 Google 繼續
            </button>
          )}
          <div className="auth-links">
            {mode === 'signin' ? (
              <>
                <button type="button" onClick={() => change('signup')}>
                  建立帳號
                </button>
                <button type="button" onClick={() => change('reset')}>
                  忘記密碼
                </button>
                <button type="button" onClick={() => change('verify')}>
                  未收到驗證信
                </button>
              </>
            ) : (
              <button type="button" onClick={() => change('signin')}>
                返回登入
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  )
}

function Recovery({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [error, setError] = useState('')
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (password !== confirm) return setError('兩次輸入的新密碼不一致。')
    try {
      await updatePassword(supabase.auth, password)
      await signOutCurrentDevice(supabase.auth)
      onComplete()
    } catch (reason) {
      setError(readError(reason))
    }
  }
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Brand />
      </section>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <h2>設定新密碼</h2>
          <label>
            新密碼
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={12}
              required
            />
          </label>
          <label>
            再次輸入新密碼
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={12}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button">
            更新密碼 <KeyRound />
          </button>
        </form>
      </section>
    </main>
  )
}
function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">F</span>
      <span>
        FORM<small>COACH DESK</small>
      </span>
    </div>
  )
}
function Loading() {
  return (
    <main className="app-loading">
      <Brand />
      <span>正在開啟工作台…</span>
    </main>
  )
}
function readError(error: unknown) {
  return error instanceof Error ? error.message : '目前無法完成這項操作。'
}
