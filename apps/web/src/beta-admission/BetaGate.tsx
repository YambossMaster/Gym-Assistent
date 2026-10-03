import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { readBetaGrant } from '../api'

export const betaGrantKey = (coachId: string) => ['coach', coachId, 'beta-grant'] as const

export function BetaGate({ session, children }: { session: Session; children: ReactNode }) {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: betaGrantKey(session.user.id),
    queryFn: () => readBetaGrant(session.access_token),
    retry: 1
  })
  const grant = query.data

  useEffect(() => {
    if (grant?.state !== 'promotional') return
    const remaining = new Date(grant.endsAt).getTime() - Date.now()
    const timeout = window.setTimeout(
      () => void client.invalidateQueries({ queryKey: betaGrantKey(session.user.id) }),
      Math.max(0, Math.min(remaining + 1000, 2_147_483_647))
    )
    return () => window.clearTimeout(timeout)
  }, [client, grant, session.user.id])

  return <>{children}</>
}
