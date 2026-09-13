import type { TodayProjection } from '../../api'
import { selectDetailRouteState, type RouteState } from '../../route-state'

export function selectTodayRouteState(input: {
  data: TodayProjection | undefined
  isLoading: boolean
  isFetching: boolean
  error: unknown | null
}): RouteState {
  return selectDetailRouteState(input)
}
