import type { CalendarProjection } from '../../api'

export type CalendarRouteState = 'loading' | 'error' | 'empty' | 'ready' | 'refreshing'
export function selectCalendarRouteState(input: {
  data?: CalendarProjection
  isLoading: boolean
  isFetching: boolean
  error: unknown
}): CalendarRouteState {
  if (!input.data && input.isLoading) return 'loading'
  if (!input.data && input.error) return 'error'
  if (!input.data || input.data.sessions.length === 0) return 'empty'
  return input.isFetching ? 'refreshing' : 'ready'
}
