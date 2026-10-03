import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { readBetaGrant, type SessionTraining } from '../api'
import { planAccessKey, usePlanAccess } from './usePlanAccess'

export const betaGrantKey = (coachId: string) => ['coach', coachId, 'beta-grant'] as const

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
  const offerDaysLeft =
    grant?.state === 'promotional'
      ? Math.ceil((new Date(grant.endsAt).getTime() - now) / 86_400_000)
      : null

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
      (record) => (record ? { ...record, exerciseSummaries: [] } : record)
    )
    void client.invalidateQueries({ queryKey: ['session-training', session.user.id] })
    client.removeQueries({ queryKey: ['today', session.user.id] })
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

  return (
    <>
      {offerDaysLeft !== null && offerDaysLeft > 0 && offerDaysLeft <= 14 && (
        <div className="plan-capacity-banner" role="status">
          <p>
            進階方案優惠剩餘 {offerDaysLeft}{' '}
            天。到期後若未訂閱，將轉為免費方案；超出免費名額時，作業儲存會暫停。
          </p>
          <Link to="/settings?category=plans">查看方案</Link>
        </div>
      )}
      {plan.data?.overCapacity && (
        <div className="plan-capacity-banner" role="alert">
          <p>
            目前學員 {plan.data.activeStudents}/{plan.data.studentLimit}、場地{' '}
            {plan.data.activeVenues}/{plan.data.venueLimit}
            ，已超過免費方案名額。資料仍可瀏覽；作業儲存暫停。封存學員或場地至額度內即可恢復。
          </p>
          <Link to="/settings?category=plans">查看方案</Link>
        </div>
      )}
      {children}
    </>
  )
}
