import type { Session } from '@supabase/supabase-js'
import { useQuery, type QueryClient } from '@tanstack/react-query'
import { getToday } from '../../api'
import { queryKeys } from '../../query-keys'

// Today stays current while it is open without polling hidden tabs or other routes.
export const todayRefreshOptions = {
  refetchInterval: 60_000,
  refetchIntervalInBackground: false,
  refetchOnMount: 'always',
  refetchOnWindowFocus: 'always',
  refetchOnReconnect: 'always'
} as const

export function useTodayRouteQuery(session: Session) {
  return useQuery({
    queryKey: queryKeys.today(session.user.id),
    queryFn: () => getToday(session.access_token),
    ...todayRefreshOptions
  })
}

export function invalidateTodayRoute(queryClient: QueryClient, coachId: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.today(coachId) })
}
