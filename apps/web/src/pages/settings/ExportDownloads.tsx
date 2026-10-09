import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { Download, LoaderCircle, X, ChevronDown } from 'lucide-react'
import { dataError, prepareDataFile, saveDataFile } from './data-tools'
import { planAccessKey } from '../../beta-admission/usePlanAccess'

type Job = { label: string; path: string; input: unknown }
const Context = createContext<{ pending: boolean; start: (job: Job) => boolean } | null>(null)
export function useExportDownloads() {
  const value = useContext(Context)
  if (!value) throw new Error('ExportDownloads provider missing')
  return value
}

// Mounted once per authenticated Coach, above routes. No files or job inputs are persisted.
export function ExportDownloads({ session, children }: { session: Session; children: ReactNode }) {
  const active = useRef<AbortController | null>(null)
  const [notice, setNotice] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const queryClient = useQueryClient()
  const download = useMutation({
    mutationKey: ['data-download', session.user.id],
    gcTime: 0,
    retry: false,
    mutationFn: ({ job, controller }: { job: Job; controller: AbortController }) =>
      prepareDataFile(job.path, session.access_token, job.input, controller.signal),
    onSettled: (_data, _error, { controller }) => {
      if (active.current === controller) active.current = null
    },
    onError: (_error, { controller }) => {
      if (!controller.signal.aborted)
        void queryClient.invalidateQueries({ queryKey: planAccessKey(session.user.id) })
    }
  })
  const start = (job: Job) => {
    // Synchronous guard also covers two clicks before React commits the disabled state.
    if (active.current) return false
    const controller = new AbortController()
    active.current = controller
    setNotice('')
    setCollapsed(false)
    setElapsed(0)
    download.mutate({ job, controller })
    return true
  }
  const clear = () => {
    active.current?.abort()
    active.current = null
    download.reset()
    setNotice('')
  }
  useEffect(
    () => () => {
      active.current?.abort()
    },
    []
  )
  useEffect(() => {
    if (!download.isPending) return
    const started = Date.now()
    const tick = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000
    )
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      window.clearInterval(tick)
      window.removeEventListener('beforeunload', beforeUnload)
    }
  }, [download.isPending])
  useEffect(() => {
    if (!download.data) return
    // Short-lived in-memory download, including any explicitly opted-in private notes.
    const expiry = window.setTimeout(
      () => {
        download.reset()
        setNotice('檔案已清除，需要時請重新匯出。')
      },
      5 * 60 * 1000
    )
    return () => window.clearTimeout(expiry)
  }, [download.data, download.reset])
  const visible = !download.isIdle || Boolean(notice)
  const title = download.isPending
    ? '正在準備檔案'
    : download.isSuccess
      ? '檔案已就緒'
      : download.isError
        ? '無法準備檔案'
        : notice
  return (
    <Context.Provider value={{ pending: download.isPending, start }}>
      {children}
      {visible && (
        <aside
          className={`export-download-notice${collapsed && download.isPending ? ' is-collapsed' : ''}`}
          aria-label="下載狀態"
        >
          <div className="export-download-heading">
            {download.isPending ? (
              <LoaderCircle className="export-download-spinner" aria-hidden="true" />
            ) : (
              <Download aria-hidden="true" />
            )}
            <strong role="status" aria-live="polite">
              {title}
            </strong>
            {download.isPending ? (
              <button
                className="icon-button"
                aria-label={collapsed ? '展開下載狀態' : '收合下載狀態'}
                onClick={() => setCollapsed(!collapsed)}
              >
                <ChevronDown aria-hidden="true" />
              </button>
            ) : (
              <button className="icon-button" aria-label="關閉下載訊息" onClick={clear}>
                <X aria-hidden="true" />
              </button>
            )}
          </div>
          {(!collapsed || !download.isPending) && (
            <>
              {download.variables && <p>{download.variables.job.label}</p>}
              {download.isPending && (
                <>
                  <progress aria-label="正在準備檔案" />
                  <p className="export-download-secondary">
                    可繼續使用其他頁面，請保持 App 開啟。
                    <span aria-hidden="true">已等待 {elapsed} 秒</span>
                  </p>
                  <button onClick={clear}>取消匯出</button>
                </>
              )}
              {download.isError && <p role="alert">{dataError(download.error)}</p>}
              {download.isSuccess && download.data && (
                <>
                  <p className="export-download-secondary">檔案保留 5 分鐘，請儲存到裝置。</p>
                  <button
                    className="export-download-save"
                    onClick={() => {
                      saveDataFile(download.data!)
                      setNotice('已交由裝置處理，請確認下載或分享選單。')
                    }}
                  >
                    儲存檔案
                  </button>
                  {notice && <p role="status">{notice}</p>}
                </>
              )}
            </>
          )}
        </aside>
      )}
    </Context.Provider>
  )
}
