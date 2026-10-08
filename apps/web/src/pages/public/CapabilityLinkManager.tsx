import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Clipboard, Copy, Link2, Plus, RefreshCw, ShieldOff, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
import { Checkbox } from '../../shared/Checkbox'
import { useDialogBehavior } from '../../shared/useDialogBehavior'
import {
  clearCapabilityLink,
  readCapabilityLink,
  saveCapabilityLink
} from './capability-link-session'

export function CapabilityLinkActions({
  session,
  item,
  compactLabels = false,
  initialPurpose = null,
  onClose
}: {
  session: Session
  item: CalendarSession
  compactLabels?: boolean
  initialPurpose?: CapabilityPurpose | null
  onClose?: () => void
}) {
  const [purpose, setPurpose] = useState<CapabilityPurpose | null>(
    item.status === 'scheduled' ? initialPurpose : null
  )
  const [retained, setRetained] = useState<{
    coachId: string
    sessionId: string
    issued: IssuedCapabilityLink
  } | null>(() => {
    const value = initialPurpose
      ? readCapabilityLink(session.user.id, item.id, initialPurpose)
      : null
    return value ? { coachId: session.user.id, sessionId: item.id, issued: value } : null
  })
  const rescheduleButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!retained) return
    const remaining = Date.parse(retained.issued.link.expiresAt) - Date.now()
    if (remaining <= 0) {
      clearCapabilityLink(retained.coachId, retained.sessionId, retained.issued.link.purpose)
      setRetained(null)
      return
    }
    const timer = window.setTimeout(() => {
      clearCapabilityLink(retained.coachId, retained.sessionId, retained.issued.link.purpose)
      setRetained(null)
    }, remaining)
    return () => window.clearTimeout(timer)
  }, [retained])
  const open = (nextPurpose: CapabilityPurpose) => {
    const value = readCapabilityLink(session.user.id, item.id, nextPurpose)
    setRetained(value ? { coachId: session.user.id, sessionId: item.id, issued: value } : null)
    setPurpose(nextPurpose)
  }
  const updateIssued = (value: IssuedCapabilityLink | null) => {
    if (value) saveCapabilityLink(session.user.id, item.id, value)
    else if (purpose) clearCapabilityLink(session.user.id, item.id, purpose)
    setRetained(value ? { coachId: session.user.id, sessionId: item.id, issued: value } : null)
  }
  return (
    <>
      {item.status === 'completed' ? (
        <button className="secondary-button" onClick={() => open('training_result')}>
          <Link2 /> {compactLabels ? '分享結果' : '分享訓練結果'}
        </button>
      ) : null}
      {item.status === 'scheduled' ? (
        <button
          ref={rescheduleButton}
          className="secondary-button"
          onClick={() => open('reschedule_session')}
        >
          <CalendarLinkIcon /> {compactLabels ? '改期連結' : '建立改期連結'}
        </button>
      ) : null}
      {purpose ? (
        <CapabilityLinkDialog
          session={session}
          sessionId={item.id}
          purpose={purpose}
          issued={
            retained?.coachId === session.user.id && retained.sessionId === item.id
              ? retained.issued
              : null
          }
          onIssuedChange={updateIssued}
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
  issued,
  onIssuedChange,
  onClose
}: {
  session: Session
  sessionId: string
  purpose: CapabilityPurpose
  issued: IssuedCapabilityLink | null
  onIssuedChange: (value: IssuedCapabilityLink | null) => void
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [includeNote, setIncludeNote] = useState(false)
  const [confirmReissue, setConfirmReissue] = useState(false)
  const confirmReissueRef = useRef<HTMLButtonElement>(null)
  const reissueTriggerRef = useRef<HTMLButtonElement>(null)
  const [copyFeedback, setCopyFeedback] = useState<{
    url: string
    state: 'success' | 'error'
  } | null>(null)
  const [notice, setNotice] = useState('')
  const key = queryKeys.capabilityLinks(session.user.id, sessionId)
  const query = useQuery({
    queryKey: key,
    queryFn: () => listCapabilityLinks(session.access_token, sessionId)
  })
  const current = query.data?.find((link) => link.purpose === purpose) ?? null
  const availableIssued =
    current &&
    issued &&
    current.id === issued.link.id &&
    current.status === 'active' &&
    Date.parse(current.expiresAt) > Date.now()
      ? issued
      : null
  useEffect(() => {
    if (current?.purpose === 'training_result') {
      setIncludeNote(current.includeTrainingNote)
    }
  }, [current?.id, current?.includeTrainingNote, current?.purpose])
  useEffect(() => {
    if (confirmReissue) requestAnimationFrame(() => confirmReissueRef.current?.focus())
  }, [confirmReissue])
  useEffect(() => {
    if (
      issued &&
      query.isSuccess &&
      !query.isFetching &&
      (current?.id !== issued.link.id || current.status !== 'active')
    ) {
      onIssuedChange(null)
    }
  }, [current?.id, current?.status, issued, onIssuedChange, query.isFetching, query.isSuccess])
  const updateCurrent = (link: CapabilityLinkMetadata) =>
    queryClient.setQueryData<CapabilityLinkMetadata[]>(key, (links = []) => [
      ...links.filter((value) => value.purpose !== link.purpose),
      link
    ])
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
      updateCurrent(value.link)
      onIssuedChange(value)
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
      updateCurrent(value.link)
      onIssuedChange(value)
      setConfirmReissue(false)
      setNotice('')
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
    onSuccess: (link) => {
      updateCurrent(link)
      onIssuedChange(null)
      setConfirmReissue(false)
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
  const rawUrl = availableIssued
    ? `${window.location.origin}/${purpose === 'training_result' ? 't' : 'r'}/${availableIssued.token}`
    : ''
  const copyState = copyFeedback?.url === rawUrl ? copyFeedback.state : 'idle'
  return createPortal(
    <div
      className="modal-backdrop capability-dialog-backdrop"
      onPointerDown={onBackdropPointerDown}
    >
      <section
        className="modal capability-dialog ui-settings-dialog"
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
        <div className="ui-settings-dialog-content">
          <div className="ui-settings-dialog-fields" data-dialog-scroll-region>
            <p className="capability-intro">
              連結會在 24 小時後失效。只有持有連結的人能查看這項內容。
            </p>
            {purpose === 'training_result' && !current ? (
              <Checkbox
                className="capability-note"
                label="一併分享教練筆記"
                description="只有這個連結會顯示本堂筆記。"
                checked={includeNote}
                onChange={setIncludeNote}
              />
            ) : null}
            {query.isLoading ? (
              <p role="status">正在確認連結狀態…</p>
            ) : query.isError ? (
              <button className="secondary-button" onClick={() => void query.refetch()}>
                <RefreshCw /> 重新載入
              </button>
            ) : null}
            {current ? <LinkMetadata link={current} /> : null}
            {notice ? (
              <p className="form-notice" role="status">
                {notice}
              </p>
            ) : null}
            {rawUrl ? (
              <div className="capability-secret">
                <label htmlFor="capability-url">目前連結</label>
                <input id="capability-url" readOnly value={rawUrl} />
                <button
                  className="secondary-button ui-action-general capability-copy-button"
                  aria-label={
                    copyState === 'success'
                      ? '連結已複製'
                      : copyState === 'error'
                        ? '複製失敗，請手動選取連結'
                        : '複製連結'
                  }
                  data-copy-state={copyState}
                  onClick={() =>
                    void copy(rawUrl, (state) => setCopyFeedback({ url: rawUrl, state }))
                  }
                >
                  <Clipboard className="capability-copy-desktop" aria-hidden="true" />
                  {copyState === 'success' ? (
                    <Check className="capability-copy-mobile" aria-hidden="true" />
                  ) : copyState === 'error' ? (
                    <X className="capability-copy-mobile" aria-hidden="true" />
                  ) : (
                    <Copy className="capability-copy-mobile" aria-hidden="true" />
                  )}
                  <span className="capability-copy-label">複製連結</span>
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
            {confirmReissue && current?.allowedActions.canReissue ? (
              <div className="capability-reissue">
                <strong>重新建立連結</strong>
                <p>新連結建立後，先前的網址會立即失效。請將新網址分享給需要的人。</p>
                {purpose === 'training_result' ? (
                  <Checkbox
                    label="新連結一併分享教練筆記"
                    description="只有新連結會顯示本堂筆記。"
                    checked={includeNote}
                    onChange={setIncludeNote}
                  />
                ) : null}
                <div className="capability-reissue-actions">
                  <button
                    className="secondary-button"
                    disabled={pending}
                    onClick={() => {
                      setConfirmReissue(false)
                      requestAnimationFrame(() => reissueTriggerRef.current?.focus())
                    }}
                  >
                    取消
                  </button>
                  <button
                    ref={confirmReissueRef}
                    className="primary-button"
                    disabled={pending}
                    onClick={() => reissue.mutate(current)}
                  >
                    {reissue.isPending ? '處理中…' : '確認重新建立'}
                  </button>
                </div>
              </div>
            ) : null}
            {current?.allowedActions.canReissue && !confirmReissue ? (
              <small className="capability-warning">重新建立會立即讓先前的 URL 失效。</small>
            ) : null}
          </div>
          {!confirmReissue ? (
            <footer>
              {!current ? (
                <button
                  className="primary-button ui-action-add"
                  disabled={pending || query.isLoading}
                  onClick={() => issue.mutate()}
                >
                  {issue.isPending ? (
                    '處理中…'
                  ) : (
                    <>
                      <Plus aria-hidden="true" />
                      建立連結
                    </>
                  )}
                </button>
              ) : null}
              {current?.allowedActions.canRevoke ? (
                <button
                  className="danger-outline-button ui-action-delete"
                  disabled={pending}
                  onClick={() => revoke.mutate(current)}
                >
                  <ShieldOff /> {revoke.isPending ? '處理中…' : '撤銷連結'}
                </button>
              ) : null}
              {current?.allowedActions.canReissue ? (
                <button
                  ref={reissueTriggerRef}
                  className="secondary-button ui-action-general"
                  disabled={pending}
                  onClick={() => setConfirmReissue(true)}
                >
                  <RefreshCw /> {reissue.isPending ? '處理中…' : '重新建立連結'}
                </button>
              ) : null}
            </footer>
          ) : null}
        </div>
      </section>
    </div>,
    document.body
  )
}

function LinkMetadata({ link }: { link: CapabilityLinkMetadata }) {
  const labels = { active: '使用中', expired: '已過期', revoked: '已撤銷', used: '已使用' }
  return (
    <dl
      className={`capability-metadata${link.purpose === 'reschedule_session' ? ' capability-metadata-two' : ''}`}
    >
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

async function copy(value: string, setState: (state: 'success' | 'error') => void) {
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
