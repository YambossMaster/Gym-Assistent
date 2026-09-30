import type { Session } from '@supabase/supabase-js'
import { useQuery, type QueryClient } from '@tanstack/react-query'
import { AlertTriangle, CloudOff, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, saveSessionTraining, type TrainingDraftPayload } from '../api'
import {
  CoachLocalStore,
  OperationQueue,
  type QueuedOperation,
  type ReplayResult
} from '../local-resilience'

export function ResilienceStatus({
  session,
  queryClient
}: {
  session: Session
  queryClient: QueryClient
}) {
  const [online, setOnline] = useState(navigator.onLine)
  const [counts, setCounts] = useState({ pending: 0, attention: 0 })
  const serviceWasUnavailable = useRef(false)
  const localService = useQuery({
    queryKey: ['local-api-health'],
    queryFn: async () => {
      const response = await fetch('/api/health', { cache: 'no-store' })
      if (!response.ok || (await response.json()).status !== 'ok')
        throw new Error('local_api_unavailable')
      return true
    },
    enabled: import.meta.env.DEV && online,
    refetchInterval: 5_000,
    retry: false
  })
  const store = useMemo(() => new CoachLocalStore(), [])
  const scope = useMemo(
    () => ({ environment: import.meta.env.MODE, coachId: session.user.id }),
    [session.user.id]
  )
  const send = useCallback(
    async (operation: QueuedOperation): Promise<ReplayResult> => {
      const sessionId = operation.target.split(':')[1]
      const draftKey = sessionId ? operation.target.slice(`training:${sessionId}:`.length) : ''
      if (!sessionId || !draftKey || !operation.target.startsWith('training:'))
        return { kind: 'failed', message: 'invalid_operation_target' }
      try {
        await saveSessionTraining(
          session.access_token,
          sessionId,
          operation.payload as TrainingDraftPayload
        )
        await store.delete('drafts', draftKey)
        await queryClient.invalidateQueries()
        return { kind: 'accepted' }
      } catch (error) {
        if (error instanceof ApiError && error.status === 409)
          return { kind: 'conflict', message: error.message }
        if (error instanceof ApiError && error.status < 500)
          return { kind: 'failed', message: error.message }
        return { kind: 'retry', message: error instanceof Error ? error.message : 'network_error' }
      }
    },
    [queryClient, session.access_token, store]
  )
  const queue = useMemo(() => new OperationQueue(store, scope, send), [scope, send, store])
  const refresh = useCallback(async () => {
    const operations = await store.list<QueuedOperation>('operations', scope)
    setCounts({
      pending: operations.filter((item) => item.state === 'pending' || item.state === 'sending')
        .length,
      attention: operations.filter((item) => item.state === 'conflict' || item.state === 'failed')
        .length
    })
  }, [scope, store])
  const replay = useCallback(async () => {
    if (!navigator.onLine) return refresh()
    await queue.replay()
    await refresh()
  }, [queue, refresh])

  useEffect(() => {
    if (!import.meta.env.DEV || !online) return
    if (localService.isError) {
      serviceWasUnavailable.current = true
    } else if (localService.isSuccess && serviceWasUnavailable.current) {
      serviceWasUnavailable.current = false
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== 'local-api-health'
      })
      void replay()
    }
  }, [localService.isError, localService.isSuccess, online, queryClient, replay])

  useEffect(() => {
    const onOnline = () => {
        setOnline(true)
        void replay()
      },
      onOffline = () => {
        setOnline(false)
        void refresh()
      },
      onFocus = () => void replay()
    addEventListener('online', onOnline)
    addEventListener('offline', onOffline)
    addEventListener('focus', onFocus)
    void replay()
    return () => {
      removeEventListener('online', onOnline)
      removeEventListener('offline', onOffline)
      removeEventListener('focus', onFocus)
    }
  }, [refresh, replay])

  const serviceUnavailable = import.meta.env.DEV && online && localService.isError
  if (!serviceUnavailable && online && counts.pending === 0 && counts.attention === 0) return null
  return (
    <>
      {serviceUnavailable && (
        <div className="resilience-status" role="status" aria-live="polite">
          <AlertTriangle aria-hidden="true" />
          <span>本機資料服務暫時無法連線。請確認服務視窗仍在執行，然後重試。</span>
          <button type="button" onClick={() => void localService.refetch()}>
            重試
          </button>
        </div>
      )}
      {(!online || counts.pending > 0 || counts.attention > 0) && (
        <div className="resilience-status" role="status" aria-live="polite">
          {!online ? <CloudOff /> : counts.attention ? <AlertTriangle /> : <RefreshCw />}
          <span>
            {!online
              ? `目前離線${counts.pending ? `，${counts.pending} 筆變更會在連線後送出` : ''}`
              : counts.attention
                ? `${counts.attention} 筆變更需要處理，已保留在這台裝置`
                : `${counts.pending} 筆變更正在送出`}
          </span>
          {online && counts.pending > 0 && (
            <button type="button" onClick={() => void replay()}>
              立即重試
            </button>
          )}
        </div>
      )}
    </>
  )
}
