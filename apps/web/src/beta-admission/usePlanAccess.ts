import type { Session } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { readPlanAccess } from '../api'

export const planAccessKey = (coachId: string) => ['coach', coachId, 'plan-access'] as const

export function usePlanAccess(session: Session) {
  return useQuery({
    queryKey: planAccessKey(session.user.id),
    queryFn: () => readPlanAccess(session.access_token),
    retry: 1,
    staleTime: 30_000
  })
}
