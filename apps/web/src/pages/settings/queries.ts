import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ApiError,
  cancelAccountDeletion,
  getAccountLifecycle,
  getWorkspaceSettings,
  requestAccountDeletion,
  updateWorkspaceSettings,
  type WorkspaceSettings
} from '../../api'
import { queryKeys } from '../../query-keys'
import { invalidateTodayRoute } from '../today/queries'

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
    scope: { id: `workspace-settings-${session.user.id}` },
    mutationFn: (
      changes: Partial<Pick<WorkspaceSettings, 'displayName' | 'timeZone' | 'defaultCurrency'>>
    ) => {
      const current = queryClient.getQueryData<WorkspaceSettings>(
        queryKeys.settings(session.user.id)
      )
      if (!current) throw new Error('目前無法讀取設定，請重新載入。')
      return updateWorkspaceSettings(session.access_token, {
        displayName: changes.displayName ?? current.displayName,
        timeZone: changes.timeZone ?? current.timeZone,
        defaultCurrency: changes.defaultCurrency ?? current.defaultCurrency,
        version: current.version
      })
    },
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.settings(session.user.id), result)
      invalidateTodayRoute(queryClient, session.user.id)
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
      onDeletionRequestClosed()
    },
    onError: (error) => onMessage(readRouteError(error))
  })
  return { settings, lifecycle }
}

function readRouteError(error: unknown) {
  return error instanceof Error ? error.message : '目前無法完成這項操作。'
}
