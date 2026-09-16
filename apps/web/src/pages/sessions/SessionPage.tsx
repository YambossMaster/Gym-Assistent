import type { Session } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Pencil,
  RotateCcw,
  Trash2,
  XCircle
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, getSession } from '../../api'
import { queryKeys } from '../../query-keys'
import { Page } from '../../shared/primitives'
import { useSchedulingMutations } from '../calendar/queries'
import { isoToLocalDateTime, localDateTimeToIso } from '../calendar/calendar-time'
import { SchedulingDialog } from '../calendar/SchedulingDialog'
import { Confirmation } from '../../shared/primitives'
import { TrainingWorkspace } from '../training/TrainingWorkspace'
import { CapabilityLinkActions } from '../public/CapabilityLinkManager'

export function SessionPage({ session, timeZone }: { session: Session; timeZone: string }) {
  const { sessionId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [notice, setNotice] = useState('')
  const query = useQuery({
    queryKey: queryKeys.session(session.user.id, sessionId),
    queryFn: () => getSession(session.access_token, sessionId)
  })
  const mutations = useSchedulingMutations(session)
  if (query.isLoading)
    return (
      <Page title="課堂" eyebrow="正在載入">
        <section className="detail-skeleton">
          <span />
          <span />
          <span />
        </section>
      </Page>
    )
  if (query.isError || !query.data)
    return (
      <Page
        title={
          query.error instanceof ApiError && query.error.status === 404
            ? '找不到課堂'
            : '無法開啟課堂'
        }
      >
        <section className="empty-state">
          <CalendarClock />
          <h2>
            {query.error instanceof ApiError && query.error.status === 404
              ? '找不到這堂課'
              : '暫時無法讀取課堂'}
          </h2>
          <p>
            {query.error instanceof ApiError && query.error.status === 404
              ? '它可能已被刪除，或你沒有查看權限。'
              : '現有安排沒有被變更，請稍後再試。'}
          </p>
          <button className="secondary-button" onClick={() => void query.refetch()}>
            重新載入
          </button>
        </section>
      </Page>
    )
  const detail = query.data
  const item = detail.session
  if (item.isLegacy || !item.startsAt || !item.endsAt || item.version === null)
    return (
      <Page title="舊有堂數紀錄">
        <section className="empty-state">
          <CalendarClock />
          <h2>這筆是舊有堂數紀錄</h2>
          <p>它保留在堂數計算中，但沒有日期，無法在課堂頁面編輯。</p>
          <Link className="text-button" to="/students">
            返回學生
          </Link>
        </section>
      </Page>
    )
  const pending = mutations.transitionSession.isPending
  const transition = (action: 'complete' | 'reopen' | 'cancel') => {
    setNotice('')
    mutations.transitionSession.mutate(
      {
        sessionId: item.id,
        input: { action, version: item.version! }
      },
      {
        onSuccess: () =>
          setNotice(
            action === 'complete'
              ? '課程已完成。'
              : action === 'cancel'
                ? '課程已取消。'
                : '課程已改回待上課。'
          ),
        onError: (error) =>
          setNotice(
            error instanceof ApiError && error.status === 409
              ? '課程已在其他裝置變更。請重新載入後再操作。'
              : '操作失敗，請稍後再試。'
          )
      }
    )
  }
  return (
    <Page className="session-page" title={item.studentName} eyebrow="課程">
      <section className="session-overview">
        <div className="session-time">
          <CalendarClock />
          <div>
            <span>{formatDate(item.startsAt)}</span>
            <strong>
              {formatTime(item.startsAt)} — {formatTime(item.endsAt)}
            </strong>
            <small>{item.location || '未設定地點'}</small>
          </div>
        </div>
        <div className="session-status">
          <span>{statusLabel(item.status)}</span>
          {detail.conflicts.length ? <small>有 {detail.conflicts.length} 個安排提醒</small> : null}
        </div>
      </section>
      <section className="session-actions" aria-label="課程操作">
        <Link className="secondary-button" to="/calendar">
          <ArrowLeft /> 返回行事曆
        </Link>
        <button className="secondary-button" disabled={pending} onClick={() => setEditing(true)}>
          <Pencil /> 編輯時間
        </button>
        {item.status === 'scheduled' ? (
          <>
            <button
              className="danger-outline-button"
              disabled={pending}
              onClick={() => transition('cancel')}
            >
              <XCircle /> 取消課程
            </button>
          </>
        ) : item.status === 'completed' ? (
          <button
            className="secondary-button"
            disabled={pending}
            onClick={() => transition('reopen')}
          >
            <RotateCcw /> 改回待上課
          </button>
        ) : null}
        {item.status === 'scheduled' && !item.seriesId ? (
          <button
            className="danger-outline-button"
            disabled={pending}
            onClick={() => setDeleting(true)}
          >
            <Trash2 /> 刪除
          </button>
        ) : null}
        <CapabilityLinkActions
          session={session}
          item={item}
          initialPurpose={searchParams.get('link') === 'reschedule' ? 'reschedule_session' : null}
          onClose={() => {
            if (!searchParams.has('link')) return
            const next = new URLSearchParams(searchParams)
            next.delete('link')
            setSearchParams(next, { replace: true })
          }}
        />
      </section>
      {notice ? (
        <p className="form-notice" role="status">
          {notice}
        </p>
      ) : null}
      <TrainingWorkspace session={session} sessionId={item.id} />
      {editing ? (
        <SessionEditor
          item={item}
          timeZone={timeZone}
          pending={mutations.updateSession.isPending}
          onClose={() => setEditing(false)}
          onSave={(input) =>
            mutations.updateSession.mutate(
              { sessionId: item.id, input: { ...input, version: item.version! } },
              {
                onSuccess: () => {
                  setEditing(false)
                  setNotice('課程時間已更新。')
                },
                onError: (error) =>
                  setNotice(
                    error instanceof ApiError && error.status === 409
                      ? '課程已在其他裝置變更；你的輸入仍保留在編輯器中。'
                      : '暫時無法儲存，輸入仍保留。'
                  )
              }
            )
          }
        />
      ) : null}
      {deleting ? (
        <Confirmation
          title="永久刪除這堂課？"
          text="只有尚未完成、未連結固定課表的課程可以刪除。這堂課的訓練紀錄也會一併永久刪除。"
          confirmation={confirmation}
          onConfirmationChange={setConfirmation}
          onCancel={() => {
            setDeleting(false)
            setConfirmation('')
          }}
          onConfirm={() =>
            mutations.deleteSession.mutate(
              { sessionId: item.id, version: item.version! },
              {
                onSuccess: () => {
                  window.location.assign('/calendar')
                },
                onError: () => {
                  setConfirmation('')
                  setNotice('刪除失敗；課程可能已被其他裝置變更。')
                }
              }
            )
          }
          disabled={mutations.deleteSession.isPending}
        />
      ) : null}
    </Page>
  )
}

function SessionEditor({
  item,
  timeZone,
  pending,
  onClose,
  onSave
}: {
  item: { startsAt: string | null; endsAt: string | null; location: string | null }
  timeZone: string
  pending: boolean
  onClose: () => void
  onSave: (input: { startsAt: string; endsAt: string; location: string }) => void
}) {
  const start = isoToLocalDateTime(item.startsAt!, timeZone)
  const end = isoToLocalDateTime(item.endsAt!, timeZone)
  const [date, setDate] = useState(start.date)
  const [startTime, setStartTime] = useState(start.time)
  const [endTime, setEndTime] = useState(end.time)
  const [location, setLocation] = useState(item.location ?? '')
  const [error, setError] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (endTime <= startTime) {
      setError('結束時間必須晚於開始時間。')
      return
    }
    try {
      onSave({
        startsAt: localDateTimeToIso({ date, time: startTime }, timeZone),
        endsAt: localDateTimeToIso({ date, time: endTime }, timeZone),
        location
      })
    } catch {
      setError('這個本地時間不存在。')
    }
  }
  return (
    <SchedulingDialog title="編輯課程時間" onClose={onClose}>
      <form className="scheduling-form" onSubmit={submit}>
        <div className="field-row">
          <label>
            日期
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>
          <label>
            開始
            <input
              type="time"
              step="900"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              required
            />
          </label>
          <label>
            結束
            <input
              type="time"
              step="900"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              required
            />
          </label>
        </div>
        <label>
          地點
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            required
            maxLength={160}
          />
        </label>
        {error ? <p className="notice error">{error}</p> : null}
        <div className="scheduling-form-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            取消
          </button>
          <button className="primary-button compact" disabled={pending}>
            {pending ? '儲存中…' : '儲存變更'}
          </button>
        </div>
      </form>
    </SchedulingDialog>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', { dateStyle: 'full' }).format(new Date(value))
}
function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(value))
}
function statusLabel(status: 'scheduled' | 'completed' | 'cancelled') {
  return status === 'completed' ? '已完成' : status === 'cancelled' ? '已取消' : '即將開始'
}
