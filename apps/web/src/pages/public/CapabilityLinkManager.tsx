import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Clipboard, Link2, RefreshCw, ShieldOff, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  ApiError,
  issueCapabilityLink,
  listCapabilityLinks,
  reissueCapabilityLink,
  revokeCapabilityLink,
  type CalendarSession,
  type CapabilityLinkMetadata,
  type CapabilityPurpose,
  type IssuedCapabilityLink
} from '../../api'
import { queryKeys } from '../../query-keys'
import { useDialogBehavior } from '../../shared/useDialogBehavior'

export function CapabilityLinkActions({
  session,
  item,
  initialPurpose = null,
  onClose
}: {
  session: Session
  item: CalendarSession
  initialPurpose?: CapabilityPurpose | null
  onClose?: () => void
}) {
  const [purpose, setPurpose] = useState<CapabilityPurpose | null>(
    item.status === 'scheduled' && item.startsAt && new Date(item.startsAt) > new Date()
      ? initialPurpose
      : null
  )
  const rescheduleButton = useRef<HTMLButtonElement>(null)
  return (
    <>
      {item.status === 'completed' ? (
        <button className="secondary-button" onClick={() => setPurpose('training_result')}>
          <Link2 /> 分享訓練結果
        </button>
      ) : null}
      {item.status === 'scheduled' && item.startsAt && new Date(item.startsAt) > new Date() ? (
        <button
          ref={rescheduleButton}
          className="secondary-button"
          onClick={() => setPurpose('reschedule_session')}
        >
          <CalendarLinkIcon /> 建立改期連結
        </button>
      ) : null}
      {purpose ? (
        <CapabilityLinkDialog
          session={session}
          sessionId={item.id}
          purpose={purpose}
          onClose={() => {
            setPurpose(null)
            onClose?.()
            if (purpose === 'reschedule_session')
              requestAnimationFrame(() => rescheduleButton.current?.focus())
          }}
        />
      ) : null}
    </>
  )
}

function CapabilityLinkDialog({
  session,
  sessionId,
  purpose,
  onClose
}: {
  session: Session
  sessionId: string
  purpose: CapabilityPurpose
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [includeNote, setIncludeNote] = useState(false)
  const [issued, setIssued] = useState<IssuedCapabilityLink | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle')
  const [notice, setNotice] = useState('')
  const key = queryKeys.capabilityLinks(session.user.id, sessionId)
  const query = useQuery({
    queryKey: key,
    queryFn: () => listCapabilityLinks(session.access_token, sessionId)
  })
  const current = issued?.link ?? query.data?.find((link) => link.purpose === purpose) ?? null
  useEffect(() => {
    if (!issued && current?.purpose === 'training_result') {
      setIncludeNote(current.includeTrainingNote)
    }
  }, [current?.id, current?.includeTrainingNote, current?.purpose, issued])
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: key })
  }
  const issue = useMutation({
    mutationFn: () =>
      issueCapabilityLink(session.access_token, sessionId, {
        purpose,
        includeTrainingNote: purpose === 'training_result' && includeNote
      }),
    retry: false,
    onSuccess: (value) => {
      setIssued(value)
      setNotice('')
      void refresh()
    },
    onError: (error) => {
      setNotice(
        error instanceof ApiError && error.details.error === 'active_link_exists'
          ? '連結已建立，但無法再次顯示。請重新建立連結。'
          : '暫時無法建立連結，請稍後再試。'
      )
      void refresh()
    }
  })
  const reissue = useMutation({
    mutationFn: (link: CapabilityLinkMetadata) =>
      reissueCapabilityLink(session.access_token, link.id, {
        version: link.version,
        includeTrainingNote: purpose === 'training_result' && includeNote
      }),
    retry: false,
    onSuccess: (value) => {
      setIssued(value)
      setNotice('舊連結已失效，請改用下方新連結。')
      void refresh()
    },
    onError: () => {
      setNotice('連結狀態已變更，請重新開啟後再試。')
      void refresh()
    }
  })
  const revoke = useMutation({
    mutationFn: (link: CapabilityLinkMetadata) =>
      revokeCapabilityLink(session.access_token, link.id, link.version),
    onSuccess: () => {
      setIssued(null)
      setNotice('連結已撤銷。')
      void refresh()
    },
    onError: () => {
      setNotice('連結狀態已變更，請重新開啟後再試。')
      void refresh()
    }
  })
  const pending = issue.isPending || reissue.isPending || revoke.isPending
  const close = () => {
    if (pending) return
    setIssued(null)
    onClose()
  }
  const { dialogRef, onBackdropPointerDown } = useDialogBehavior(close, { submitOnEnter: true })
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [
        ...dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled)'
        )
      ]
      if (!focusable.length) return
      const first = focusable[0]!,
        last = focusable[focusable.length - 1]!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', keydown)
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>('button')?.focus())
    return () => {
      window.removeEventListener('keydown', keydown)
    }
  }, [])
  const rawUrl = issued
    ? `${window.location.origin}/${purpose === 'training_result' ? 't' : 'r'}/${issued.token}`
    : ''
  return (
    <div
      className="modal-backdrop capability-dialog-backdrop"
      onPointerDown={onBackdropPointerDown}
    >
      <section
        className="modal capability-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="capability-title"
        ref={dialogRef}
      >
        <header>
          <div>
            <span className="eyebrow dark">PRIVATE LINK</span>
            <h2 id="capability-title">
              {purpose === 'training_result' ? '分享訓練結果' : '建立改期連結'}
            </h2>
          </div>
          <button className="icon-button" aria-label="關閉" onClick={close}>
            <X />
          </button>
        </header>
        <p className="capability-intro">連結會在 24 小時後失效。只有持有連結的人能查看這項內容。</p>
        {purpose === 'training_result' ? (
          <label className="checkbox-label capability-note">
            <input
              type="checkbox"
              checked={includeNote}
              onChange={(event) => setIncludeNote(event.target.checked)}
            />
            <span>
              <strong>一併分享教練筆記</strong>
              <small>只有這個連結會顯示本堂筆記。</small>
            </span>
          </label>
        ) : null}
        {query.isLoading ? (
          <p role="status">正在確認連結狀態…</p>
        ) : query.isError ? (
          <button className="secondary-button" onClick={() => void query.refetch()}>
            <RefreshCw /> 重新載入
          </button>
        ) : null}
        {current ? <LinkMetadata link={current} /> : null}
        {rawUrl ? (
          <div className="capability-secret">
            <label htmlFor="capability-url">只會顯示這一次</label>
            <input
              id="capability-url"
              readOnly
              value={rawUrl}
              onFocus={(event) => event.currentTarget.select()}
            />
            <button className="primary-button" onClick={() => void copy(rawUrl, setCopyState)}>
              <Clipboard /> 複製連結
            </button>
            <span role="status">
              {copyState === 'success'
                ? '連結已複製。'
                : copyState === 'error'
                  ? '無法自動複製，請選取上方連結手動複製。'
                  : ''}
            </span>
          </div>
        ) : null}
        {notice ? (
          <p className="form-notice" role="status">
            {notice}
          </p>
        ) : null}
        <footer>
          {!current ? (
            <button
              className="primary-button"
              disabled={pending || query.isLoading}
              onClick={() => issue.mutate()}
            >
              建立連結
            </button>
          ) : null}
          {current?.allowedActions.canRevoke ? (
            <button
              className="danger-outline-button"
              disabled={pending}
              onClick={() => revoke.mutate(current)}
            >
              <ShieldOff /> 撤銷連結
            </button>
          ) : null}
          {current?.allowedActions.canReissue ? (
            <button
              className="secondary-button"
              disabled={pending}
              onClick={() => reissue.mutate(current)}
            >
              <RefreshCw /> 重新建立連結
            </button>
          ) : null}
        </footer>
        {current?.allowedActions.canReissue ? (
          <small className="capability-warning">重新建立會立即讓先前的 URL 失效。</small>
        ) : null}
      </section>
    </div>
  )
}

function LinkMetadata({ link }: { link: CapabilityLinkMetadata }) {
  const labels = { active: '使用中', expired: '已過期', revoked: '已撤銷', used: '已使用' }
  return (
    <dl className="capability-metadata">
      <div>
        <dt>狀態</dt>
        <dd data-status={link.status}>{labels[link.status]}</dd>
      </div>
      <div>
        <dt>有效期限</dt>
        <dd>
          {new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(
            new Date(link.expiresAt)
          )}
        </dd>
      </div>
      {link.purpose === 'training_result' ? (
        <div>
          <dt>教練筆記</dt>
          <dd>{link.includeTrainingNote ? '一併分享' : '不分享'}</dd>
        </div>
      ) : null}
    </dl>
  )
}

async function copy(value: string, setState: (state: 'idle' | 'success' | 'error') => void) {
  try {
    await navigator.clipboard.writeText(value)
    setState('success')
  } catch {
    setState('error')
  }
}
function CalendarLinkIcon() {
  return <Link2 aria-hidden="true" />
}
