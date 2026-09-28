import type { Session } from '@supabase/supabase-js'
import { QueryClientProvider } from '@tanstack/react-query'
import { ArrowRight, KeyRound } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { isRegistrationEmailTaken } from './api'
import {
  requestPasswordReset,
  passwordRecoveryRedirect,
  resendEmailVerification,
  signInWithGoogle,
  signOutCurrentDevice,
  signUpCoach,
  updatePassword,
  verifySignupEmail
} from './account-auth'
import { CoachWorkspace } from './app-shell/CoachWorkspace'
import { Brand } from './shared/primitives'
import { PublicCapabilityApp } from './pages/public/PublicCapabilityPages'
import { clearOtherCoachCapabilityLinks } from './pages/public/capability-link-session'
import { createAppQueryClient } from './query-client'
import {
  initialAuthRedirectError,
  initialRecoveryPending,
  setRecoveryPending,
  supabase
} from './supabase'
import { CoachLocalStore } from './local-resilience'

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
  const location = useLocation()
  const navigate = useNavigate()
  const [client] = useState(createAppQueryClient),
    [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(false),
    [authLinkError, setAuthLinkError] = useState(initialAuthRedirectError),
    [recoveryExitError, setRecoveryExitError] = useState(''),
    [recoveryEntry, setRecoveryEntry] = useState(
      () => initialRecoveryPending || window.location.pathname === '/account/recover'
    ),
    [recoveryVerified, setRecoveryVerified] = useState(false),
    previousSubject = useRef<string | null>(null)
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      previousSubject.current = data.session?.user.id ?? null
      clearOtherCoachCapabilityLinks(data.session?.user.id ?? null)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      const previous = previousSubject.current
      const nextSubject = next?.user.id ?? null
      if (previous && previous !== nextSubject) {
        client.clear()
        clearOtherCoachCapabilityLinks(nextSubject)
        void new CoachLocalStore().clearCoach({
          environment: import.meta.env.MODE,
          coachId: previous
        })
      }
      previousSubject.current = nextSubject
      setSession(next)
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryPending(true)
        setRecoveryEntry(true)
        setRecoveryVerified(true)
      } else if (event === 'SIGNED_OUT') {
        setRecoveryPending(false)
        setRecoveryEntry(false)
        setRecoveryVerified(false)
      }
      setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [client])
  const leaveRecovery = async () => {
    if (recoveryEntry) {
      try {
        await signOutCurrentDevice(supabase.auth)
      } catch (reason) {
        setRecoveryExitError(readError(reason))
        return
      }
    }
    setRecoveryPending(false)
    setRecoveryEntry(false)
    setRecoveryVerified(false)
    setAuthLinkError(false)
    navigate('/', { replace: true })
  }
  if (!ready) return <Loading />
  if (authLinkError)
    return <AuthLinkError error={recoveryExitError} onReturn={() => void leaveRecovery()} />
  if (recoveryEntry || location.pathname === '/account/recover') {
    if (session && recoveryVerified)
      return (
        <Recovery
          onComplete={() => {
            setRecoveryEntry(false)
            setRecoveryVerified(false)
            setRecoveryPending(false)
            navigate('/', { replace: true })
          }}
        />
      )
    return (
      <SignIn
        key="recovery-unavailable"
        initialMode="reset"
        initialNotice="重設連結已失效。請重新寄送密碼重設信。"
        externalError={recoveryExitError}
        onReturn={() => void leaveRecovery()}
      />
    )
  }
  if (!session) return <SignIn key="ordinary-sign-in" />
  return (
    <QueryClientProvider client={client}>
      <CoachWorkspace session={session} />
    </QueryClientProvider>
  )
}

function SignIn({
  initialMode = 'signin',
  initialNotice = '',
  externalError = '',
  onReturn
}: {
  initialMode?: Mode
  initialNotice?: string
  externalError?: string
  onReturn?: () => void
}) {
  const [mode, setMode] = useState<Mode>(initialMode),
    [mobileView, setMobileView] = useState<'welcome' | 'form'>(
      initialMode === 'signin' ? 'welcome' : 'form'
    ),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [code, setCode] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(initialNotice),
    [submitting, setSubmitting] = useState(false),
    [verificationNeeded, setVerificationNeeded] = useState(false),
    [resendAvailableAt, setResendAvailableAt] = useState(0),
    [now, setNow] = useState(Date.now())
  const resendWait = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000))
  useEffect(() => {
    if (mode !== 'verify' || resendWait === 0) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [mode, resendWait])
  const change = (next: Mode) => {
    setMode(next)
    setError('')
    setNotice('')
    setVerificationNeeded(false)
    setPassword('')
    setConfirm('')
    setCode('')
  }
  const openMobileForm = (next: Mode) => {
    change(next)
    setMobileView('form')
  }
  const leaveMobileForm = () => {
    if (onReturn) {
      onReturn()
      return
    }
    change('signin')
    setMobileView('welcome')
  }
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setNotice('')
    setVerificationNeeded(false)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          if (error.code === 'email_not_confirmed') {
            setVerificationNeeded(true)
            throw new Error('請先完成電子信箱驗證，再登入工作台。')
          }
          throw new Error('登入失敗，請確認 Email 與密碼。')
        }
      } else if (mode === 'signup') {
        if (password !== confirm) throw new Error('兩次輸入的密碼不一致。')
        if (await isRegistrationEmailTaken(email)) throw new Error('此帳號已經註冊過。')
        await signUpCoach(supabase.auth, email, password, window.location.origin)
        setMode('verify')
        setNow(Date.now())
        setResendAvailableAt(Date.now() + 60_000)
        setNotice('6 位驗證碼已寄出，請查看收件匣與垃圾郵件。')
      } else if (mode === 'verify') {
        await verifySignupEmail(supabase.auth, email, code)
        setNotice('Email 已驗證，正在開啟工作台…')
      } else {
        await requestPasswordReset(
          supabase.auth,
          email,
          passwordRecoveryRedirect(window.location.origin)
        )
        setNotice('若帳號存在，重設信已寄出。')
      }
    } catch (reason) {
      setError(readError(reason))
    } finally {
      setSubmitting(false)
    }
  }
  const resend = async () => {
    if (resendWait > 0 || submitting) return
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      await resendEmailVerification(supabase.auth, email, window.location.origin)
      setNow(Date.now())
      setResendAvailableAt(Date.now() + 60_000)
      setNotice('新的 6 位驗證碼已寄出，請查看收件匣。')
    } catch (reason) {
      setError(readError(reason))
    } finally {
      setSubmitting(false)
    }
  }
  const continueWithGoogle = async () => {
    setError('')
    try {
      await signInWithGoogle(
        supabase.auth,
        window.location.origin,
        window.self !== window.top ? (url) => window.top?.location.assign(url) : undefined
      )
    } catch (reason) {
      setError(readError(reason))
    }
  }
  return (
    <main className={`auth-layout auth-entry-${mobileView}`}>
      <section className="auth-story">
        <Brand />
        <button type="button" className="auth-mobile-back" onClick={leaveMobileForm}>
          ← 返回
        </button>
        {mode === 'signin' && (
          <div className="auth-mobile-intro">
            <p className="auth-mobile-kicker">私人教練的工作台</p>
            <h1>
              每一堂課，<span>都有跡可循。</span>
            </h1>
            <p className="auth-mobile-description">學員、課程與訓練紀錄，清楚接續每一天。</p>
          </div>
        )}
        <div className="auth-copy">
          <span className="eyebrow">FORM COACH DESK</span>
          <h1>
            專業，
            <br />
            始於<span>有跡可循。</span>
          </h1>
          <p>告別凌亂的備忘錄。系統化保留學員的完整軌跡，讓每一堂課都無縫接軌。</p>
        </div>
      </section>
      <section className="auth-mobile-entry" aria-label="開始使用">
        <button
          type="button"
          className="auth-entry-signup"
          onClick={() => openMobileForm('signup')}
        >
          建立帳號 <ArrowRight aria-hidden="true" />
        </button>
        <button
          type="button"
          className="auth-entry-signin"
          onClick={() => openMobileForm('signin')}
        >
          登入
        </button>
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
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setVerificationNeeded(false)
              }}
              readOnly={mode === 'verify'}
              autoComplete="email"
              required
            />
          </label>
          {(mode === 'signin' || mode === 'signup') && (
            <label>
              密碼
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={mode === 'signup' ? 12 : undefined}
              />
            </label>
          )}
          {mode === 'signin' && (
            <div className="auth-field-action">
              <button type="button" onClick={() => change('reset')}>
                忘記密碼？
              </button>
            </div>
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
          {mode === 'verify' && (
            <p className="auth-guidance">請輸入寄至上述 Email 的驗證碼，完成帳號建立。</p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {externalError && (
            <p className="form-error" role="alert">
              {externalError}
            </p>
          )}
          {verificationNeeded && mode === 'signin' && (
            <button type="button" className="auth-inline-action" onClick={() => change('verify')}>
              前往電子信箱驗證
            </button>
          )}
          {notice && (
            <p className="form-notice" role="status">
              {notice}
            </p>
          )}
          <button className="primary-button" disabled={submitting}>
            {submitting ? '處理中…' : '繼續'}
            <ArrowRight />
          </button>
          {mode === 'verify' && resendWait > 0 && (
            <p className="auth-guidance">尚未收到？請稍候 {resendWait} 秒，再重新寄送。</p>
          )}
          {mode === 'verify' && resendWait === 0 && (
            <button
              type="button"
              className="secondary-button"
              disabled={submitting}
              onClick={() => void resend()}
            >
              重新寄送驗證碼
            </button>
          )}
          {(mode === 'signin' || mode === 'signup') && (
            <div className="auth-alternative">
              <div className="auth-divider" aria-hidden="true">
                或者
              </div>
              <button
                type="button"
                className="secondary-button auth-google"
                onClick={() => void continueWithGoogle()}
              >
                使用 Google 繼續
              </button>
            </div>
          )}
          <div className={`auth-links${mode === 'signin' ? '' : ' auth-links-return'}`}>
            {mode === 'signin' ? (
              <span>
                第一次使用？{' '}
                <button type="button" onClick={() => change('signup')}>
                  建立帳號
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => (onReturn ? onReturn() : change('signin'))}>
                返回
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
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (password !== confirm) return setError('兩次輸入的新密碼不一致。')
    setBusy(true)
    try {
      await updatePassword(supabase.auth, password)
      await signOutCurrentDevice(supabase.auth)
      onComplete()
    } catch (reason) {
      setError(readError(reason))
    } finally {
      setBusy(false)
    }
  }
  const cancel = async () => {
    setBusy(true)
    try {
      await signOutCurrentDevice(supabase.auth)
      onComplete()
    } catch (reason) {
      setError(readError(reason))
    } finally {
      setBusy(false)
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
          <div className="password-form-actions">
            <button
              type="button"
              className="secondary-button ui-action-cancel"
              disabled={busy}
              onClick={() => void cancel()}
            >
              取消重設並登出
            </button>
            <button className="primary-button ui-action-save" disabled={busy}>
              {busy ? '處理中…' : '更新密碼'} <KeyRound />
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
function AuthLinkError({ onReturn, error }: { onReturn: () => void; error: string }) {
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Brand />
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <h2>驗證連結無法使用</h2>
          <p>連結可能已失效或已使用。若要重設密碼，請重新寄送密碼重設信。</p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="primary-button" onClick={onReturn}>
            返回
          </button>
        </div>
      </section>
    </main>
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
