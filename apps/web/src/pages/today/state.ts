import { ApiError, type TodayProjection } from '../../api'
import { selectDetailRouteState, type RouteState } from '../../route-state'

export function selectTodayRouteState(input: {
  data: TodayProjection | undefined
  isLoading: boolean
  isFetching: boolean
  error: unknown | null
}): RouteState {
  return selectDetailRouteState(input)
}

export function todayErrorMessage(error: unknown, isDevelopment: boolean): string {
  if (isDevelopment && error instanceof ApiError && error.status === 502) {
    return '本機資料服務未連線。請重新開啟應用程式，確認服務視窗保持開啟，再重試。'
  }
  return '暫時無法整理目前的工作台訊號。'
}
