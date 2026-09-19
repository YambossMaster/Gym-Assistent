import type { Session } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, getSession, listStudents } from '../../api'
import { queryKeys } from '../../query-keys'
import { FormSelect } from '../../shared/FormSelect'
import { Confirmation, Page } from '../../shared/primitives'
import { useSchedulingMutations } from '../calendar/queries'
import { isoToLocalDateTime, localDateTimeToIso } from '../calendar/calendar-time'
import { SchedulingDialog } from '../calendar/SchedulingDialog'
import { TrainingWorkspace } from '../training/TrainingWorkspace'
import { useSessionTraining } from '../training/queries'
import { CapabilityLinkActions } from '../public/CapabilityLinkManager'

export function SessionPage({ session, timeZone }: { session: Session; timeZone: string }) {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState('')
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
  return (
    <>
      <TrainingWorkspace
        session={session}
        query={trainingQuery}
        timeZone={timeZone}
        onBack={() => navigate(-1)}
        sessionNotice={notice}
        headerActions={
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
        }
      />
      {editing ? (
        <SessionEditor
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
          shortcutHint="ESC 取消 · DELETE 刪除"
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

export function SessionEditor({
  item,
  students,
  timeZone,
  pending,
  onClose,
  onSave,
  onRequestDelete
}: {
  item: {
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
  onSave: (input: { studentId: string; startsAt: string; endsAt: string; location: string }) => void
  onRequestDelete: () => void
}) {
  const start = isoToLocalDateTime(item.startsAt!, timeZone)
  const end = isoToLocalDateTime(item.endsAt!, timeZone)
  const [date, setDate] = useState(start.date)
  const [studentId, setStudentId] = useState(item.studentId)
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
        studentId,
        startsAt: localDateTimeToIso({ date, time: startTime }, timeZone),
        endsAt: localDateTimeToIso({ date, time: endTime }, timeZone),
        location
      })
    } catch {
      setError('這個本地時間不存在。')
    }
  }
  return (
    <SchedulingDialog title="變更課堂" onClose={onClose} variant="session-edit">
      <form className="scheduling-form session-editor-form" onSubmit={submit}>
        <div className="scheduling-form-body session-editor-form-body">
          <label>
            學生
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
          <div className="field-row">
            <label>
              日期
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
                disabled={item.status !== 'scheduled'}
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
                disabled={item.status !== 'scheduled'}
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
                disabled={item.status !== 'scheduled'}
              />
            </label>
          </div>
          <label>
            地點
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              required
              disabled={item.status !== 'scheduled'}
              maxLength={160}
            />
          </label>
          {error ? <p className="notice error">{error}</p> : null}
        </div>
        <div className="scheduling-form-footer session-editor-form-footer">
          <div className="scheduling-form-actions">
            <button type="button" className="danger-text-button" onClick={onRequestDelete}>
              <Trash2 /> 刪除課堂
            </button>
            <button type="button" className="secondary-button" onClick={onClose}>
              取消
            </button>
            {item.status === 'scheduled' ? (
              <button className="primary-button compact" disabled={pending}>
                {pending ? '儲存中…' : '儲存變更'}
              </button>
            ) : null}
          </div>
        </div>
      </form>
    </SchedulingDialog>
  )
}
