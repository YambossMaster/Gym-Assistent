import type { Session } from '@supabase/supabase-js'
import { useQuery, type QueryClient } from '@tanstack/react-query'
import { getToday } from '../../api'
import { queryKeys } from '../../query-keys'

export function useTodayRouteQuery(session: Session) {
  return useQuery({
    queryKey: queryKeys.today(session.user.id),
    queryFn: () => getToday(session.access_token)
  })
}

export function invalidateTodayRoute(queryClient: QueryClient, coachId: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.today(coachId) })
}
