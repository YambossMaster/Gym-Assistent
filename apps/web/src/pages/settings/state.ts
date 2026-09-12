export type SettingsPanelState = 'loading' | 'refreshing' | 'error' | 'ready'

export function selectSettingsPanelState({
  data,
  isLoading,
  isFetching,
  isError
}: {
  data: unknown | undefined
  isLoading: boolean
  isFetching: boolean
  isError: boolean
}): SettingsPanelState {
  if (!data && isLoading) return 'loading'
  if (!data && isError) return 'error'
  return isFetching ? 'refreshing' : 'ready'
}
