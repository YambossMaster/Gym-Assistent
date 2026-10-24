import { VenueField } from '../students/VenueField'
import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ApiError,
  getSession,
  getSessionTraining,
  listStudents,
  type CalendarSession
} from '../../api'
import { queryKeys } from '../../query-keys'
import { FormSelect } from '../../shared/FormSelect'
import { TimeSelect } from '../../shared/TimeSelect'
import { Confirmation, Page } from '../../shared/primitives'
import { useSchedulingMutations } from '../calendar/queries'
import { isoToLocalDateTime, localDateTimeToIso } from '../calendar/calendar-time'
import { SchedulingDialog } from '../calendar/SchedulingDialog'
import {
  formatAdjacentLessonTime,
  TrainingLoading,
  TrainingWorkspace
} from '../training/TrainingWorkspace'
import { useSessionTraining } from '../training/queries'
import { CapabilityLinkActions } from '../public/CapabilityLinkManager'
import { SeriesDatePicker } from '../students/SeriesDatePicker'
import { RequiredFieldLabel } from '../../shared/FormFieldLabel'

export function SessionPage({ session, timeZone }: { session: Session; timeZone: string }) {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState('')
  const [switching, setSwitching] = useState<{
    target: CalendarSession
    direction: 'previous' | 'next'
  } | null>(null)
  const query = useQuery({
    queryKey: queryKeys.session(session.user.id, sessionId),
    queryFn: () => getSession(session.access_token, sessionId)
  })
  const studentsQuery = useQuery({
    queryKey: queryKeys.students(session.user.id),
    queryFn: () => listStudents(session.access_token)
  })
  const trainingQuery = useSessionTraining(session, sessionId)
  const mutations = useSchedulingMutations(session)
  const switchAdjacent = async (target: CalendarSession, beforeLeave?: () => Promise<void>) => {
    const direction = query.data?.adjacent?.previous?.id === target.id ? 'previous' : 'next'
    setSwitching({ target, direction })
    const minimum = new Promise<void>((resolve) => window.setTimeout(resolve, 380))
    try {
      await beforeLeave?.()
      await Promise.all([
        minimum,
        queryClient.ensureQueryData({
          queryKey: queryKeys.session(session.user.id, target.id),
          queryFn: () => getSession(session.access_token, target.id)
        }),
        queryClient.ensureQueryData({
          queryKey: queryKeys.sessionTraining(session.user.id, target.id),
          queryFn: () => getSessionTraining(session.access_token, target.id)
        })
      ])
      navigate(`/sessions/${target.id}`)
    } catch (error) {
      setSwitching(null)
      throw error
    }
  }
  const withTransition = (content: ReactNode) => (
    <>
      {content}
      {switching && (
        <SessionSwitchTransition
          target={switching.target}
          direction={switching.direction}
          timeZone={timeZone}
        />
      )}
    </>
  )
  useEffect(() => {
    if (
      switching?.target.id === sessionId &&
      ((query.isError && !query.data) || (trainingQuery.isError && !trainingQuery.data))
    )
      setSwitching(null)
  }, [
    query.data,
    query.isError,
    sessionId,
    switching?.target.id,
    trainingQuery.data,
    trainingQuery.isError
  ])
  useEffect(() => {
    for (const item of [query.data?.adjacent?.previous, query.data?.adjacent?.next]) {
      if (!item) continue
      void queryClient.prefetchQuery({
        queryKey: queryKeys.session(session.user.id, item.id),
        queryFn: () => getSession(session.access_token, item.id)
      })
      void queryClient.prefetchQuery({
        queryKey: queryKeys.sessionTraining(session.user.id, item.id),
        queryFn: () => getSessionTraining(session.access_token, item.id)
      })
    }
  }, [query.data?.adjacent, queryClient, session.access_token, session.user.id])
  if (query.isLoading) return withTransition(<TrainingLoading />)
  if (!query.data)
    return withTransition(
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
    return withTransition(
      <Page title="舊有堂數紀錄">
        <section className="empty-state">
          <CalendarClock />
          <h2>這筆是舊有堂數紀錄</h2>
          <p>它保留在堂數計算中，但沒有日期，無法在課堂頁面編輯。</p>
          <Link className="text-button" to="/students">
            返回
          </Link>
        </section>
      </Page>
    )
  const pending = mutations.transitionSession.isPending
  const adjacent = detail.adjacent
  return withTransition(
    <>
      <TrainingWorkspace
        session={session}
        query={trainingQuery}
        timeZone={timeZone}
        onBack={() => navigate(-1)}
        adjacent={adjacent}
        onSwitchAdjacent={switchAdjacent}
        onAdjacentReady={(readySessionId) => {
          if (readySessionId === sessionId)
            setSwitching((current) => (current?.target.id === readySessionId ? null : current))
        }}
        sessionNotice={
          notice ||
          (query.isError
            ? '課堂資料暫時無法更新，顯示上次載入的內容。'
            : trainingQuery.isError
              ? '訓練紀錄暫時無法更新，顯示上次載入的內容。'
              : '')
        }
        headerActions={(beforeShare) => (
          <>
            <button
              className="secondary-button"
              disabled={pending}
              onClick={() => setEditing(true)}
            >
              <CalendarClock /> 變更課堂
            </button>
            <CapabilityLinkActions
              session={session}
              item={item}
              onBeforeOpen={beforeShare}
              compactLabels
              initialPurpose={
                searchParams.get('link') === 'reschedule' ? 'reschedule_session' : null
              }
              onClose={() => {
                if (!searchParams.has('link')) return
                const next = new URLSearchParams(searchParams)
                next.delete('link')
                setSearchParams(next, { replace: true })
              }}
            />
          </>
        )}
      />
      {editing ? (
        <SessionEditor
          session={session}
          item={item}
          students={studentsQuery.data ?? []}
          timeZone={timeZone}
          pending={mutations.updateSession.isPending}
          onClose={() => setEditing(false)}
          onRequestDelete={() => {
            setEditing(false)
            setDeleting(true)
          }}
          onSave={(input) =>
            mutations.updateSession.mutate(
              {
                sessionId: item.id,
                previousStudentId: item.studentId,
                input: {
                  ...input,
                  ...(input.studentId !== item.studentId ? { studentId: input.studentId } : {}),
                  version: item.version!
                }
              },
              {
                onSuccess: () => {
                  setEditing(false)
                  setNotice('')
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
          title="是否確認刪除此課堂？"
          text="此課堂的所有內容變更將不被保存。刪除後無法復原。"
          confirmLabel="刪除"
          confirmOnDelete
          onCancel={() => setDeleting(false)}
          onConfirm={() => {
            const onSuccess = () => navigate(-1)
            const onError = () => setNotice('刪除失敗；課程可能已被其他裝置變更。')
            if (item.status === 'scheduled' && item.seriesId) {
              mutations.transitionSession.mutate(
                { sessionId: item.id, input: { action: 'cancel', version: item.version! } },
                { onSuccess, onError }
              )
              return
            }
            mutations.deleteSession.mutate(
              { sessionId: item.id, version: item.version! },
              { onSuccess, onError }
            )
          }}
          disabled={mutations.deleteSession.isPending || mutations.transitionSession.isPending}
        />
      ) : null}
    </>
  )
}

function SessionSwitchTransition({
  target,
  direction,
  timeZone
}: {
  target: CalendarSession
  direction: 'previous' | 'next'
  timeZone: string
}) {
  const label = direction === 'previous' ? '前次課堂' : '下次課堂'
  return (
    <div
      className={`session-switch-transition ${direction}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="session-switch-panel">
        <span className="session-switch-eyebrow">切換課堂</span>
        <div className="session-switch-destination">
          {direction === 'previous' ? <ChevronLeft aria-hidden="true" /> : null}
          <div>
            <strong>{label}</strong>
            <time dateTime={target.startsAt!}>
              {formatAdjacentLessonTime(target.startsAt!, timeZone)}
            </time>
          </div>
          {direction === 'next' ? <ChevronRight aria-hidden="true" /> : null}
        </div>
        <span className="session-switch-progress" aria-hidden="true" />
      </div>
    </div>
  )
}

export function SessionEditor({
  session,
  item,
  students,
  timeZone,
  pending,
  onClose,
  onSave,
  onRequestDelete
}: {
  session?: Session
  item: {
    venueId?: string | null
    customerSource?: 'coach' | 'venue' | null
    studentId: string
    studentName: string
    startsAt: string | null
    endsAt: string | null
    location: string | null
    status: 'scheduled' | 'completed' | 'cancelled'
  }
  students: Array<{ id: string; name: string; active: boolean }>
  timeZone: string
  pending: boolean
  onClose: () => void
  onSave: (input: {
    venueId?: string | null
    customerSource?: 'coach' | 'venue' | null
    studentId: string
    startsAt: string
    endsAt: string
    location: string
  }) => void
  onRequestDelete: () => void
}) {
  const start = isoToLocalDateTime(item.startsAt!, timeZone)
  const end = isoToLocalDateTime(item.endsAt!, timeZone)
  const [date, setDate] = useState(start.date)
  const [studentId, setStudentId] = useState(item.studentId)
  const [startTime, setStartTime] = useState(start.time)
  const [endTime, setEndTime] = useState(end.time)
  const [location, setLocation] = useState(item.location ?? '')
  const [venueId, setVenueId] = useState(item.venueId ?? null),
    [customerSource, setCustomerSource] = useState(item.customerSource ?? null)
  const [error, setError] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (item.status === 'scheduled' && !venueId) {
      setError('請選擇或新增場地。')
      return
    }
    if (endTime <= startTime) {
      setError('結束時間必須晚於開始時間。')
      return
    }
    try {
      onSave({
        studentId,
        startsAt: localDateTimeToIso({ date, time: startTime }, timeZone),
        endsAt: localDateTimeToIso({ date, time: endTime }, timeZone),
        location,
        venueId,
        customerSource
      })
    } catch {
      setError('這個本地時間不存在。')
    }
  }
  return (
    <SchedulingDialog
      title="變更課堂"
      description={item.status === 'completed' ? '課堂已完成，無法變更安排。' : undefined}
      onClose={onClose}
      variant="session-edit"
    >
      <form className="scheduling-form session-editor-form" onSubmit={submit} autoComplete="off">
        <div className="scheduling-form-body session-editor-form-body" data-dialog-scroll-region>
          <label>
            <RequiredFieldLabel>學生</RequiredFieldLabel>
            <FormSelect
              label="學生"
              value={studentId}
              onChange={setStudentId}
              required
              disabled={item.status !== 'scheduled'}
              options={[
                ...(!students.some((student) => student.id === item.studentId)
                  ? [{ value: item.studentId, label: item.studentName }]
                  : []),
                ...students
                  .filter((student) => student.active || student.id === item.studentId)
                  .map((student) => ({ value: student.id, label: student.name }))
              ]}
            />
          </label>
          <div className="scheduling-time-fields">
            <SeriesDatePicker
              label="日期"
              value={date}
              onChange={setDate}
              disabled={item.status !== 'scheduled'}
            />
            <div className="field-control">
              <RequiredFieldLabel>開始</RequiredFieldLabel>
              <TimeSelect
                label="開始"
                value={startTime}
                onChange={setStartTime}
                disabled={item.status !== 'scheduled'}
              />
            </div>
            <span className="scheduling-time-arrow" aria-hidden="true">
              →
            </span>
            <div className="field-control">
              <RequiredFieldLabel>結束</RequiredFieldLabel>
              <TimeSelect
                label="結束"
                value={endTime}
                onChange={setEndTime}
                disabled={item.status !== 'scheduled'}
              />
            </div>
          </div>
          {session && item.status === 'scheduled' ? (
            <VenueField
              session={session}
              studentId={item.studentId}
              date={date}
              venueId={venueId}
              customerSource={customerSource}
              location={location}
              onChange={(v) => {
                setVenueId(v.venueId)
                setCustomerSource(v.customerSource)
                setLocation(v.location)
              }}
            />
          ) : (
            <label>
              <RequiredFieldLabel>場地</RequiredFieldLabel>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                required
                disabled={item.status !== 'scheduled'}
                maxLength={160}
              />
            </label>
          )}
          {error ? <p className="notice error">{error}</p> : null}
        </div>
        <div className="scheduling-form-footer session-editor-form-footer">
          <div className="scheduling-form-actions">
            <button
              type="button"
              className="danger-text-button ui-action-delete"
              onClick={onRequestDelete}
            >
              <Trash2 />
              <span className="desktop-action-label">刪除課堂</span>
              <span className="mobile-action-label">刪除</span>
            </button>
            <button type="button" className="secondary-button ui-action-cancel" onClick={onClose}>
              取消
            </button>
            {item.status === 'scheduled' ? (
              <button className="primary-button compact ui-action-save" disabled={pending}>
                {pending ? (
                  '儲存中…'
                ) : (
                  <>
                    <span className="desktop-action-label">儲存變更</span>
                    <span className="mobile-action-label">儲存</span>
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </form>
    </SchedulingDialog>
  )
}
