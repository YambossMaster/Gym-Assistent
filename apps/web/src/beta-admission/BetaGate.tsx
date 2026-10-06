import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Pause, X } from 'lucide-react'
import { ApiError, readBetaGrant, type SessionTraining, type TodayProjection } from '../api'
import { signOutCurrentDevice } from '../account-auth'
import { supabase } from '../supabase'
import { Brand } from '../shared/primitives'
import { isInternalAlpha } from '../config'
import { queryKeys } from '../query-keys'
import { planAccessKey, usePlanAccess } from './usePlanAccess'

export const betaGrantKey = (coachId: string) => ['coach', coachId, 'beta-grant'] as const
const internalAlpha = isInternalAlpha()

export function BetaGate({ session, children }: { session: Session; children: ReactNode }) {
  const client = useQueryClient()
  const plan = usePlanAccess(session)
  const query = useQuery({
    queryKey: betaGrantKey(session.user.id),
    queryFn: () => readBetaGrant(session.access_token),
    retry: 1
  })
  const grant = query.data
  const [now, setNow] = useState(() => Date.now())
  const [dismissedOffer, setDismissedOffer] = useState<string | null>(null)
  const [dismissedCapacity, setDismissedCapacity] = useState<string | null>(null)
  const [exitError, setExitError] = useState('')
  const offerDaysLeft =
    grant?.state === 'promotional'
      ? Math.ceil((new Date(grant.endsAt).getTime() - now) / 86_400_000)
      : null
  const offerNoticeKey = grant?.state === 'promotional' ? `${grant.endsAt}:${offerDaysLeft}` : null
  const capacityNoticeKey = plan.data?.overCapacity
    ? `${plan.data.activeStudents}/${plan.data.studentLimit}:${plan.data.activeVenues}/${plan.data.venueLimit}`
    : null

  useEffect(() => setDismissedOffer(null), [offerNoticeKey])
  useEffect(() => setDismissedCapacity(null), [capacityNoticeKey])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60 * 60 * 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (plan.data?.tier !== 'free') return
    client.removeQueries({ queryKey: ['finances', session.user.id] })
    client.removeQueries({ queryKey: ['student-performance', session.user.id] })
    client.removeQueries({ queryKey: ['student-trend', session.user.id] })
    client.setQueriesData<SessionTraining>(
      { queryKey: ['session-training', session.user.id] },
      (record) =>
        record
          ? {
              ...record,
              exerciseSummaries: record.exerciseSummaries.map((summary) => ({
                ...summary,
                history: [],
                series: summary.series?.map((series) => ({ ...series, points: [] }))
              }))
            }
          : record
    )
    void client.invalidateQueries({ queryKey: ['session-training', session.user.id] })
    const todayKey = queryKeys.today(session.user.id)
    const cachedToday = client.getQueryData<TodayProjection>(todayKey)
    if (cachedToday) {
      client.setQueryData<TodayProjection>(todayKey, {
        ...cachedToday,
        summary: { ...cachedToday.summary, incomeByCurrency: [] }
      })
    }
    void client.invalidateQueries({ queryKey: todayKey })
  }, [client, plan.data?.tier, session.user.id])

  useEffect(() => {
    if (grant?.state !== 'promotional') return
    const remaining = new Date(grant.endsAt).getTime() - Date.now()
    const timeout = window.setTimeout(
      () => {
        void client.invalidateQueries({ queryKey: betaGrantKey(session.user.id) })
        void client.invalidateQueries({ queryKey: planAccessKey(session.user.id) })
      },
      Math.max(0, Math.min(remaining + 1000, 2_147_483_647))
    )
    return () => window.clearTimeout(timeout)
  }, [client, grant, session.user.id])

  if (internalAlpha && query.isPending) {
    return (
      <main className="auth-layout" role="status">
        正在確認測試資格…
      </main>
    )
  }

  if (
    internalAlpha &&
    query.error instanceof ApiError &&
    query.error.details.error === 'alpha_closed'
  ) {
    return (
      <main className="auth-layout auth-entry-form">
        <section className="auth-story">
          <Brand />
        </section>
        <section className="auth-panel">
          <div className="auth-card">
            <h2>目前僅開放內部測試</h2>
            <p>此帳號尚未列入測試名單。</p>
            {exitError && (
              <p className="form-error" role="alert">
                {exitError}
              </p>
            )}
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                void signOutCurrentDevice(supabase.auth).catch(() =>
                  setExitError('登出未完成，請稍後再試。')
                )
              }}
            >
              登出
            </button>
          </div>
        </section>
      </main>
    )
  }

  if (internalAlpha && query.isError) {
    return (
      <main className="auth-layout" role="alert">
        <div className="auth-card">
          <h2>暫時無法確認測試資格</h2>
          <button type="button" className="primary-button" onClick={() => void query.refetch()}>
            重試
          </button>
        </div>
      </main>
    )
  }

  return (
    <>
      <div className="plan-toast-stack">
        {offerNoticeKey &&
          offerDaysLeft !== null &&
          offerDaysLeft > 0 &&
          offerDaysLeft <= 14 &&
          dismissedOffer !== offerNoticeKey && (
            <PlanNotice
              key={offerNoticeKey}
              role="status"
              closeLabel="關閉優惠提醒"
              onDismiss={() => setDismissedOffer(offerNoticeKey)}
            >
              <span className="plan-toast-kicker">優惠提醒</span>
              <strong>Prime 優惠剩餘 {offerDaysLeft} 天</strong>
              <p>到期後會回到 Free 方案。</p>
              <Link to="/plans">
                查看方案 <ArrowUpRight aria-hidden="true" />
              </Link>
            </PlanNotice>
          )}
        {capacityNoticeKey && plan.data && dismissedCapacity !== capacityNoticeKey && (
          <PlanNotice
            key={capacityNoticeKey}
            role="alert"
            closeLabel="關閉名額提醒"
            onDismiss={() => setDismissedCapacity(capacityNoticeKey)}
          >
            <span className="plan-toast-kicker">
              <Pause aria-hidden="true" /> Free 方案額度
            </span>
            <strong>超出額度，儲存暫停</strong>
            <p>
              學員 {plan.data.activeStudents} 名（上限 {plan.data.studentLimit}） · 場地{' '}
              {plan.data.activeVenues} 個（上限 {plan.data.venueLimit}）
            </p>
            <p className="plan-toast-support">資料仍可查看；封存至額度內即可恢復儲存。</p>
            <Link
              to="/settings?category=plans"
              onClick={() => setDismissedCapacity(capacityNoticeKey)}
            >
              了解恢復方式 <ArrowUpRight aria-hidden="true" />
            </Link>
          </PlanNotice>
        )}
      </div>
      {children}
    </>
  )
}

function PlanNotice({
  children,
  role,
  closeLabel,
  onDismiss
}: {
  children: ReactNode
  role: 'alert' | 'status'
  closeLabel: string
  onDismiss: () => void
}) {
  const [exiting, setExiting] = useState(false)
  return (
    <aside
      className={`plan-capacity-toast${exiting ? ' is-exiting' : ''}`}
      role={role}
      onAnimationEnd={(event) => {
        if (exiting && event.target === event.currentTarget) onDismiss()
      }}
    >
      <button
        type="button"
        className="plan-toast-close"
        aria-label={closeLabel}
        onClick={() => {
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) onDismiss()
          else setExiting(true)
        }}
      >
        <X aria-hidden="true" />
      </button>
      {children}
    </aside>
  )
}
