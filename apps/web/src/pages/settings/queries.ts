import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ApiError,
  cancelAccountDeletion,
  getAccountLifecycle,
  getWorkspaceSettings,
  requestAccountDeletion,
  updateWorkspaceSettings
} from '../../api'
import { queryKeys } from '../../query-keys'

export function useSettingsRouteQueries(session: Session) {
  const settings = useQuery({
    queryKey: queryKeys.settings(session.user.id),
    queryFn: () => getWorkspaceSettings(session.access_token)
  })
  const lifecycle = useQuery({
    queryKey: queryKeys.lifecycle(session.user.id),
    queryFn: () => getAccountLifecycle(session.access_token)
  })
  return { settings, lifecycle }
}

export function useSettingsRouteMutations({
  session,
  onMessage,
  onDeletionRequestClosed,
  onSettingsConflict
}: {
  session: Session
  onMessage: (message: string) => void
  onDeletionRequestClosed: () => void
  onSettingsConflict?: () => void
}) {
  const queryClient = useQueryClient()
  const settings = useMutation({
    mutationFn: (input: Parameters<typeof updateWorkspaceSettings>[1]) =>
      updateWorkspaceSettings(session.access_token, input),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.settings(session.user.id), result)
      onMessage('設定已儲存。')
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        if (onSettingsConflict) {
          onSettingsConflict()
          return
        }
      }
      onMessage(readRouteError(error))
    }
  })
  const lifecycle = useMutation({
    mutationFn: (action: 'request' | 'cancel') =>
      action === 'request'
        ? requestAccountDeletion(session.access_token)
        : cancelAccountDeletion(session.access_token),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.lifecycle(session.user.id), result)
      onMessage(result.deletionDueAt ? '已開始 14 天刪除倒數。' : '已取消刪除。')
      onDeletionRequestClosed()
    },
    onError: (error) => onMessage(readRouteError(error))
  })
  return { settings, lifecycle }
}

function readRouteError(error: unknown) {
  return error instanceof Error ? error.message : '目前無法完成這項操作。'
}
