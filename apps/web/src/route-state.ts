import { ApiError } from './api'

export type RouteState = 'loading' | 'refreshing' | 'error' | 'empty' | 'not-found' | 'ready'

export function selectCollectionRouteState({
  data,
  isLoading,
  isFetching,
  isError
}: {
  data: readonly unknown[] | undefined
  isLoading: boolean
  isFetching: boolean
  isError: boolean
}): RouteState {
  if (!data && isLoading) return 'loading'
  if (isError && !data) return 'error'
  if ((data?.length ?? 0) === 0) return 'empty'
  return isFetching ? 'refreshing' : 'ready'
}

export function selectDetailRouteState({
  data,
  isLoading,
  isFetching,
  error
}: {
  data: unknown | undefined
  isLoading: boolean
  isFetching: boolean
  error: unknown | null
}): RouteState {
  if (!data && isLoading) return 'loading'
  if (!data && error instanceof ApiError && error.status === 404) return 'not-found'
  if (!data && error) return 'error'
  return isFetching ? 'refreshing' : 'ready'
}
