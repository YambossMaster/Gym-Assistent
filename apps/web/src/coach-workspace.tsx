import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Cloud,
  KeyRound,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  TimerReset,
  Trash2,
  UserRound
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom'
import {
  ApiError,
  createStudent,
  deleteAccountImmediately,
  getStudentDetail,
  getWorkspaceSettings,
  listScheduleSeries,
  type LessonPurchase,
  type ScheduleSeries,
  type Student
} from './api'
import { changePassword, signOutCurrentDevice, updatePassword } from './account-auth'
import {
  useStudentDetailRouteQuery,
  useStudentRouteMutations,
  useStudentsRouteQuery
} from './pages/students/queries'
import { selectStudentRosterResult } from './pages/students/state'
import { useSettingsRouteMutations, useSettingsRouteQueries } from './pages/settings/queries'
import { invalidateTodayRoute } from './pages/today/queries'
import { queryKeys } from './query-keys'
import { useSchedulingMutations } from './pages/calendar/queries'
import { isoToLocalDateTime, localDateTimeToIso } from './pages/calendar/calendar-time'
import { SchedulingDialog } from './pages/calendar/SchedulingDialog'
import { selectCollectionRouteState, selectDetailRouteState } from './route-state'
import { Confirmation, Page, SettingsPanelHeading } from './shared/primitives'
import { supabase } from './supabase'

export function StudentsPage({ session }: { session: Session }) {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'active' | 'archived'>('active')
  const [createOpen, setCreateOpen] = useState(false)
  const { students: studentsQuery, income: incomeQuery } = useStudentsRouteQuery(session)
  const students = studentsQuery.data ?? []
  const income = incomeQuery.data ?? []
  const routeState = selectCollectionRouteState({
    data: studentsQuery.data,
    isLoading: studentsQuery.isLoading,
    isFetching: studentsQuery.isFetching,
    isError: studentsQuery.isError
  })
  const rosterResult = useMemo(
    () => selectStudentRosterResult({ students, view, query }),
    [query, students, view]
  )

  return (
    <Page
      className="students-page"
      title="學生"
      eyebrow={`學生名單 · ${students.length}`}
      actions={
        <button className="primary-button compact" onClick={() => setCreateOpen(true)}>
          <Plus />
          新增學生
        </button>
      }
    >
      <div className="toolbar">
        <label className="search-box">
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋姓名或訓練目標"
          />
        </label>
        <div className="student-view-switch" role="group" aria-label="學生狀態">
          <button type="button" onClick={() => setView('active')} aria-pressed={view === 'active'}>
            進行中
          </button>
          <button
            type="button"
            onClick={() => setView('archived')}
            aria-pressed={view === 'archived'}
          >
            已封存
          </button>
        </div>
        {studentsQuery.isFetching && (
          <div className="cloud-state" role="status">
            <Cloud /> 更新中
          </div>
        )}
      </div>
      {studentsQuery.isError && (
        <div className="notice error" role="alert">
          <span>暫時無法讀取學生資料，請稍後再試。</span>
          <button onClick={() => void studentsQuery.refetch()}>重試</button>
        </div>
      )}
      {studentsQuery.isSuccess && (
        <section className="income-summary" aria-label="累計實收">
          <span>累計實收</span>
          <div>
            {income.length ? (
              income.map((item) => (
                <strong key={item.currency}>{formatMoney(item.amountMinor, item.currency)}</strong>
              ))
            ) : (
              <strong>尚無紀錄</strong>
            )}
          </div>
          <small>依購課時登錄的實收金額整理。</small>
        </section>
      )}
      {routeState === 'loading' ? (
        <StudentListSkeleton />
      ) : routeState === 'error' ? (
        <StudentListError onRetry={() => void studentsQuery.refetch()} />
      ) : rosterResult.state === 'first-empty' ? (
        <section className="empty-state">
          <UserRound />
          <h2>建立第一位學生</h2>
          <p>先留下姓名與訓練目標，之後隨時補齊資料。</p>
          <button className="text-button" onClick={() => setCreateOpen(true)}>
            建立學生 <ArrowRight />
          </button>
        </section>
      ) : rosterResult.state === 'filter-empty' || rosterResult.state === 'search-empty' ? (
        <section className="empty-state">
          <UserRound />
          <h2>{rosterResult.state === 'search-empty' ? '找不到符合的學生' : '這個分類尚無學生'}</h2>
          {rosterResult.state === 'search-empty' && (
            <button className="text-button" onClick={() => setQuery('')}>
              清除搜尋
            </button>
          )}
        </section>
      ) : (
        <section className="student-grid" aria-live="polite">
          {rosterResult.students.map((student, index) => (
            <StudentCard
              key={student.id}
              student={student}
              index={index}
              accessToken={session.access_token}
              coachId={session.user.id}
            />
          ))}
        </section>
      )}
      {createOpen && (
        <CreateStudentDialog
          accessToken={session.access_token}
          onClose={() => setCreateOpen(false)}
          onCreated={(student) => {
            queryClient.setQueryData<Student[]>(
              queryKeys.students(session.user.id),
              (current = []) => [...current, student]
            )
            void queryClient.invalidateQueries({ queryKey: queryKeys.income(session.user.id) })
            invalidateTodayRoute(queryClient, session.user.id)
            setCreateOpen(false)
          }}
        />
      )}
    </Page>
  )
}

function StudentCard({
  student,
  index,
  accessToken,
  coachId
}: {
  student: Student
  index: number
  accessToken: string
  coachId: string
}) {
  const queryClient = useQueryClient()
  const prefetch = () =>
    void queryClient.prefetchQuery({
      queryKey: queryKeys.student(coachId, student.id),
      queryFn: () => getStudentDetail(accessToken, student.id)
    })
  return (
    <Link
      className="student-card"
      to={`/students/${student.id}`}
      onMouseEnter={prefetch}
      onFocus={prefetch}
    >
      <span className="student-index">{String(index + 1).padStart(2, '0')}</span>
      <div className="large-avatar">{student.name.slice(-2)}</div>
      <h2>{student.name}</h2>
      <p>{student.goal || '尚未設定訓練目標'}</p>
      <div className="student-meta">
        <span>{student.active ? '進行中' : '已封存'}</span>
        {student.lessonSummary && (
          <span className={student.lessonSummary.remaining <= 2 ? 'lesson-attention' : undefined}>
            {student.lessonSummary.remaining < 0
              ? `尚欠 ${Math.abs(student.lessonSummary.remaining)} 堂`
              : student.lessonSummary.remaining === 0
                ? '堂數不足'
                : student.lessonSummary.remaining <= 2
                  ? `堂數偏低 · 剩餘 ${student.lessonSummary.remaining}`
                  : `剩餘 ${student.lessonSummary.remaining} / ${student.lessonSummary.purchased}`}
          </span>
        )}
      </div>
      <span className="student-card-action">
        查看學生資料 <ArrowRight />
      </span>
    </Link>
  )
}

export function StudentDetailPage({
  session,
  timeZone = 'Asia/Taipei'
}: {
  session: Session
  timeZone?: string
}) {
  const { studentId = '' } = useParams()
  const navigate = useNavigate()
  const [notice, setNotice] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [purchaseToDelete, setPurchaseToDelete] = useState<{ id: string; version: number } | null>(
    null
  )
  const [purchaseConfirmation, setPurchaseConfirmation] = useState('')
  const [studentConfirmation, setStudentConfirmation] = useState('')
  const [purchaseEditor, setPurchaseEditor] = useState<LessonPurchase | null>(null)
  const [purchaseConflict, setPurchaseConflict] = useState<LessonPurchase | null>(null)
  const detailQuery = useStudentDetailRouteQuery(session, studentId)
  const {
    save: saveMutation,
    purchase: purchaseMutation,
    remove: deleteMutation,
    updatePurchase: updatePurchaseMutation,
    removePurchase: deletePurchaseMutation
  } = useStudentRouteMutations({
    session,
    studentId,
    onNotice: setNotice,
    onDeleted: () => navigate('/students')
  })
  const routeState = selectDetailRouteState({
    data: detailQuery.data,
    isLoading: detailQuery.isLoading,
    isFetching: detailQuery.isFetching,
    error: detailQuery.error
  })
  if (routeState === 'loading') return <StudentDetailSkeleton />
  if (routeState === 'not-found') return <StudentDetailEmpty />
  if (routeState === 'error' || !detailQuery.data)
    return <StudentDetailError onRetry={() => void detailQuery.refetch()} />
  const detail = detailQuery.data
  const submitting =
    saveMutation.isPending ||
    purchaseMutation.isPending ||
    deleteMutation.isPending ||
    deletePurchaseMutation.isPending ||
    updatePurchaseMutation.isPending

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNotice('')
    const values = new FormData(event.currentTarget)
    saveMutation.mutate({
      name: String(values.get('name') || '').trim(),
      phone: String(values.get('phone') || '').trim(),
      goal: String(values.get('goal') || '').trim(),
      privateNote: String(values.get('privateNote') || '').trim(),
      active: values.get('active') === 'on',
      lineLinked: detail.student.lineLinked,
      version: detail.student.version
    })
  }
  const purchase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    setNotice('')
    const values = new FormData(form)
    purchaseMutation.mutate(
      {
        purchasedAt: new Date(String(values.get('purchasedAt'))).toISOString(),
        lessonCount: Number(values.get('lessonCount')),
        amountMinor: Number(values.get('amountMinor')),
        currency: 'TWD',
        privateNote: String(values.get('purchaseNote') || '').trim()
      },
      { onSuccess: () => form.reset() }
    )
  }
  const remove = async () => {
    deleteMutation.mutate(detail.student.version)
  }
  return (
    <Page
      className="student-detail-page"
      title={detail.student.name}
      eyebrow="學生資料"
      actions={
        <button className="secondary-button" onClick={() => navigate('/students')}>
          <ArrowLeft />
          返回學生
        </button>
      }
    >
      <section className="detail-page-grid">
        <div className="lesson-balance">
          <span>剩餘堂數</span>
          <strong className={detail.lessonSummary.remaining <= 2 ? 'low-balance' : ''}>
            {detail.lessonSummary.remaining}
          </strong>
          <small>
            已購 {detail.lessonSummary.purchased} · 已完成 {detail.lessonSummary.completed}
          </small>
        </div>
        <p className="security-footnote">
          {detail.lessonSummary.remaining <= 0
            ? '堂數不足，請先與學生確認新的購課安排。'
            : detail.lessonSummary.remaining <= 2
              ? '堂數偏低，可以提早與學生確認補課。'
              : '堂數依購課與已完成課堂自動計算。'}
        </p>
        <StudentSchedule
          session={session}
          studentId={studentId}
          studentName={detail.student.name}
          timeZone={timeZone}
          schedule={detail.schedule}
        />
        <form className="detail-section" onSubmit={save}>
          <h2>基本資料</h2>
          <label>
            姓名
            <input name="name" defaultValue={detail.student.name} required maxLength={120} />
          </label>
          <div className="field-row">
            <label>
              電話
              <input name="phone" defaultValue={detail.student.phone} maxLength={40} />
            </label>
            <label>
              訓練目標
              <input name="goal" defaultValue={detail.student.goal} maxLength={1000} />
            </label>
          </div>
          <label>
            私人備註
            <textarea
              name="privateNote"
              defaultValue={detail.student.privateNote}
              maxLength={4000}
            />
          </label>
          <label className="checkbox-label">
            <input name="active" type="checkbox" defaultChecked={detail.student.active} />
            進行中的學生
          </label>
          <button className="secondary-button" disabled={submitting}>
            儲存資料
          </button>
        </form>
        <form className="detail-section purchase-form" onSubmit={purchase}>
          <h2>登錄購課</h2>
          <div className="field-row">
            <label>
              購買日期
              <input
                name="purchasedAt"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </label>
            <label>
              堂數
              <input name="lessonCount" type="number" min="1" max="10000" required />
            </label>
            <label>
              實收金額（TWD）
              <input name="amountMinor" type="number" min="0" step="1" required />
            </label>
          </div>
          <label>
            教練備註
            <textarea name="purchaseNote" maxLength={4000} placeholder="僅供自己查看" />
          </label>
          <button className="primary-button compact" disabled={submitting}>
            登錄購課 <ArrowRight />
          </button>
        </form>
        <section className="detail-section purchase-history">
          <h2>購課紀錄</h2>
          {detail.purchases.length ? (
            detail.purchases.map((item) => (
              <div className="purchase-ledger-row" key={item.id}>
                <span className="purchase-ledger-date">
                  {new Date(item.purchasedAt).toLocaleDateString('zh-TW')}
                </span>
                <strong>+{item.lessonCount} 堂</strong>
                <span className="purchase-ledger-money">
                  {formatMoney(item.amountMinor, item.currency)}
                </span>
                <span className="purchase-ledger-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseConflict(null)
                      setPurchaseEditor(item)
                    }}
                    disabled={submitting}
                  >
                    編輯
                  </button>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => setPurchaseToDelete({ id: item.id, version: item.version })}
                    disabled={submitting}
                  >
                    刪除
                  </button>
                </span>
              </div>
            ))
          ) : (
            <p>尚無購課紀錄。</p>
          )}
        </section>
        <section className="detail-section student-delete">
          <h2>刪除學生</h2>
          <p>刪除後，相關購課與課堂資料無法復原。</p>
          <button
            className="text-button danger-button"
            disabled={submitting}
            onClick={() => setDeleteOpen(true)}
          >
            永久刪除
          </button>
        </section>
        {notice && <p className="form-notice">{notice}</p>}
      </section>
      {deleteOpen && (
        <Confirmation
          title={`永久刪除 ${detail.student.name}？`}
          text="這項操作無法復原。"
          confirmation={studentConfirmation}
          onConfirmationChange={setStudentConfirmation}
          onCancel={() => {
            setDeleteOpen(false)
            setStudentConfirmation('')
          }}
          onConfirm={() => void remove()}
          disabled={submitting}
        />
      )}
      {purchaseToDelete && (
        <Confirmation
          title="永久刪除購課紀錄？"
          text={
            deletePurchaseMutation.error instanceof ApiError &&
            deletePurchaseMutation.error.details.currentPurchase
              ? '這筆購課已在其他裝置變更。請確認後重新輸入 DELETE。'
              : '這項操作會重新計算學生的剩餘堂數。'
          }
          confirmation={purchaseConfirmation}
          onConfirmationChange={setPurchaseConfirmation}
          onCancel={() => {
            setPurchaseToDelete(null)
            setPurchaseConfirmation('')
          }}
          onConfirm={() =>
            deletePurchaseMutation.mutate(
              { purchaseId: purchaseToDelete.id, version: purchaseToDelete.version },
              {
                onSuccess: () => {
                  setPurchaseToDelete(null)
                  setPurchaseConfirmation('')
                },
                onError: (error) => {
                  if (error instanceof ApiError && error.details.currentPurchase) {
                    setPurchaseToDelete({
                      id: error.details.currentPurchase.id,
                      version: error.details.currentPurchase.version
                    })
                    setPurchaseConfirmation('')
                  }
                }
              }
            )
          }
          disabled={submitting}
        />
      )}
      {purchaseEditor && (
        <PurchaseEditor
          purchase={purchaseEditor}
          conflict={purchaseConflict}
          error={updatePurchaseMutation.error}
          disabled={submitting}
          onCancel={() => {
            setPurchaseEditor(null)
            setPurchaseConflict(null)
          }}
          onSave={(input) =>
            updatePurchaseMutation.mutate(
              { purchaseId: purchaseEditor.id, input },
              {
                onSuccess: () => {
                  setPurchaseEditor(null)
                  setPurchaseConflict(null)
                },
                onError: (error) => {
                  if (error instanceof ApiError && error.details.currentPurchase) {
                    setPurchaseConflict(error.details.currentPurchase)
                    setPurchaseEditor(error.details.currentPurchase)
                  }
                }
              }
            )
          }
        />
      )}
    </Page>
  )
}

function StudentSchedule({
  session,
  studentId,
  studentName,
  timeZone,
  schedule
}: {
  session: Session
  studentId: string
  studentName: string
  timeZone: string
  schedule?: {
    nearestFuture: import('./api').CalendarSession | null
    history: import('./api').CalendarSession[]
  }
}) {
  const seriesQuery = useQuery({
    queryKey: queryKeys.scheduleSeries(session.user.id, studentId),
    queryFn: () => listScheduleSeries(session.access_token, studentId)
  })
  const mutations = useSchedulingMutations(session)
  const [editor, setEditor] = useState<ScheduleSeries | 'new' | null>(null)
  const [seriesNotice, setSeriesNotice] = useState('')
  if (!schedule) return null
  return (
    <section className="detail-section student-schedule" aria-labelledby="student-schedule-title">
      <div className="student-schedule-heading">
        <div>
          <span className="eyebrow dark">課程安排</span>
          <h2 id="student-schedule-title">下次課程</h2>
        </div>
        <button className="text-button" onClick={() => setEditor('new')}>
          建立固定課表
        </button>
      </div>
      {schedule.nearestFuture ? (
        <Link className="student-next-session" to={`/sessions/${schedule.nearestFuture.id}`}>
          <time>{formatScheduleDate(schedule.nearestFuture.startsAt)}</time>
          <div>
            <strong>{formatScheduleTime(schedule.nearestFuture.startsAt)}</strong>
            <span>{schedule.nearestFuture.location || '未設定地點'}</span>
          </div>
          <ArrowRight />
        </Link>
      ) : (
        <p className="empty-inline">尚未安排下一堂課。</p>
      )}
      <div className="student-session-history">
        <h3>已結束課程</h3>
        {schedule.history.length ? (
          <ol>
            {schedule.history.slice(0, 4).map((item) => (
              <li key={item.id}>
                <Link to={`/sessions/${item.id}`}>
                  {formatScheduleDate(item.startsAt)} ·{' '}
                  {item.status === 'completed' ? '已完成' : '已取消'}
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p>還沒有日期化的課程紀錄。</p>
        )}
      </div>
      <div className="student-series-list">
        <h3>固定課表</h3>
        {seriesQuery.isLoading ? (
          <p>正在載入固定課表…</p>
        ) : seriesQuery.isError ? (
          <p className="notice error">暫時無法讀取固定課表。</p>
        ) : seriesQuery.data?.length ? (
          seriesQuery.data.map((series) => (
            <button
              key={series.id}
              className="student-series-row"
              onClick={() => setEditor(series)}
            >
              <strong>
                {series.intervalWeeks === 1 ? '每週' : '隔週'} · {weekdayLabel(series.localWeekday)}{' '}
                {series.localStartTime}
              </strong>
              <span>
                {series.location} · {series.active ? '使用中' : '已停用'}
              </span>
            </button>
          ))
        ) : (
          <p>尚未建立固定課表。</p>
        )}
        <button
          className="secondary-button"
          disabled={mutations.reconcileSeries.isPending}
          onClick={() =>
            mutations.reconcileSeries.mutate(studentId, {
              onSuccess: (result) =>
                setSeriesNotice(
                  result.generatedIds.length
                    ? `已補齊 ${result.generatedIds.length} 堂未來課程。`
                    : '目前課程已足夠，沒有重複建立。'
                ),
              onError: () => setSeriesNotice('暫時無法補齊課程，請稍後重試。')
            })
          }
        >
          重新檢查未來課程
        </button>
        {seriesNotice ? (
          <p className="form-notice" role="status">
            {seriesNotice}
          </p>
        ) : null}
      </div>
      {editor ? (
        <SeriesEditor
          series={editor === 'new' ? null : editor}
          studentId={studentId}
          studentName={studentName}
          nearestFuture={schedule.nearestFuture}
          timeZone={timeZone}
          pending={mutations.createSeries.isPending || mutations.updateSeries.isPending}
          onClose={() => setEditor(null)}
          onSave={(input) => {
            const callbacks = {
              onSuccess: (accepted: { generatedIds: string[] }) => {
                setEditor(null)
                setSeriesNotice(
                  accepted.generatedIds.length
                    ? `固定課表已儲存，並建立 ${accepted.generatedIds.length} 堂課。`
                    : '固定課表已儲存。'
                )
              },
              onError: (error: Error) =>
                setSeriesNotice(
                  error instanceof ApiError && (error as ApiError).status === 409
                    ? '固定課表已在其他裝置變更；你的輸入仍保留。'
                    : '暫時無法儲存，輸入仍保留。'
                )
            }
            if (editor === 'new') mutations.createSeries.mutate({ studentId, input }, callbacks)
            else
              mutations.updateSeries.mutate(
                {
                  seriesId: editor.id,
                  input: {
                    ...input,
                    active: input.active ?? true,
                    version: editor.version,
                    effective_from_session_id: input.effective_from_session_id
                  }
                },
                callbacks
              )
          }}
        />
      ) : null}
    </section>
  )
}

function SeriesEditor({
  series,
  studentId,
  studentName,
  nearestFuture,
  timeZone,
  pending,
  onClose,
  onSave
}: {
  series: ScheduleSeries | null
  studentId: string
  studentName: string
  nearestFuture: import('./api').CalendarSession | null
  timeZone: string
  pending: boolean
  onClose: () => void
  onSave: (input: {
    startsAt: string
    endsAt: string
    location: string
    intervalWeeks: 1 | 2
    autoScheduleHorizon: ScheduleSeries['autoScheduleHorizon']
    active?: boolean
    effective_from_session_id?: string
  }) => void
}) {
  const initial = series
    ? isoToLocalDateTime(series.anchorStartsAt, timeZone)
    : { date: new Date().toISOString().slice(0, 10), time: '09:00' }
  const [date, setDate] = useState(initial.date),
    [start, setStart] = useState(initial.time)
  const [duration, setDuration] = useState(series?.durationMinutes ?? 60),
    [location, setLocation] = useState(series?.location ?? '')
  const [interval, setInterval] = useState<1 | 2>(series?.intervalWeeks ?? 1),
    [horizon, setHorizon] = useState<ScheduleSeries['autoScheduleHorizon']>(
      series?.autoScheduleHorizon ?? 'NONE'
    )
  const [active, setActive] = useState(series?.active ?? true),
    [fromNext, setFromNext] = useState(false),
    [error, setError] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    try {
      const startsAt = localDateTimeToIso({ date, time: start }, timeZone)
      const endLocal = isoToLocalDateTime(
        new Date(Date.parse(startsAt) + duration * 60_000).toISOString(),
        timeZone
      )
      onSave({
        startsAt,
        endsAt: localDateTimeToIso(endLocal, timeZone),
        location,
        intervalWeeks: interval,
        autoScheduleHorizon: horizon,
        active,
        effective_from_session_id:
          fromNext && nearestFuture?.seriesId === series?.id ? nearestFuture?.id : undefined
      })
    } catch {
      setError('日期或時間無效。')
    }
  }
  return (
    <SchedulingDialog
      title={series ? '編輯固定課表' : `為 ${studentName} 建立固定課表`}
      description="固定課表只補齊未來需要的課程，不會改動過去紀錄。"
      onClose={onClose}
    >
      <form className="scheduling-form" onSubmit={submit}>
        <div className="field-row">
          <label>
            起始日期
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>
          <label>
            開始時間
            <input
              type="time"
              step="900"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              required
            />
          </label>
          <label>
            分鐘
            <input
              type="number"
              min="15"
              max="480"
              step="15"
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              required
            />
          </label>
        </div>
        <label>
          地點
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            maxLength={160}
            required
          />
        </label>
        <div className="field-row">
          <label>
            頻率
            <select
              value={interval}
              onChange={(event) => setInterval(Number(event.target.value) as 1 | 2)}
            >
              <option value="1">每週</option>
              <option value="2">隔週</option>
            </select>
          </label>
          <label>
            自動安排範圍
            <select
              value={horizon}
              onChange={(event) =>
                setHorizon(event.target.value as ScheduleSeries['autoScheduleHorizon'])
              }
            >
              <option value="NONE">只建立首堂</option>
              <option value="1_WEEK">未來 1 週</option>
              <option value="2_WEEKS">未來 2 週</option>
              <option value="MAX_WINDOW">依剩餘堂數補齊</option>
            </select>
          </label>
        </div>
        {series ? (
          <>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />{' '}
              使用這個固定課表
            </label>
            {nearestFuture?.seriesId === series.id ? (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={fromNext}
                  onChange={(event) => setFromNext(event.target.checked)}
                />{' '}
                從下一堂課開始套用新時間
              </label>
            ) : null}
          </>
        ) : null}
        {error ? <p className="notice error">{error}</p> : null}
        <div className="scheduling-form-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            取消
          </button>
          <button className="primary-button compact" disabled={pending}>
            {pending ? '儲存中…' : '儲存固定課表'}
          </button>
        </div>
      </form>
    </SchedulingDialog>
  )
}
function weekdayLabel(value: number) {
  return ['', '週一', '週二', '週三', '週四', '週五', '週六', '週日'][value]
}
function formatScheduleDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' }).format(
        new Date(value)
      )
    : '—'
}
function formatScheduleTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date(value))
    : '—'
}

function PurchaseEditor({
  purchase,
  conflict,
  error,
  disabled,
  onCancel,
  onSave
}: {
  purchase: LessonPurchase
  conflict: LessonPurchase | null
  error: unknown
  disabled: boolean
  onCancel: () => void
  onSave: (input: {
    purchasedAt: string
    lessonCount: number
    amountMinor: number
    currency: string
    privateNote: string
    version: number
  }) => void
}) {
  const openerRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  )
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onCancel()
      requestAnimationFrame(() => openerRef.current?.focus())
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onCancel])
  const cancel = () => {
    onCancel()
    requestAnimationFrame(() => openerRef.current?.focus())
  }
  return (
    <section className="purchase-editor" role="dialog" aria-modal="true" aria-label="編輯購課紀錄">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const values = new FormData(event.currentTarget)
          onSave({
            purchasedAt: new Date(String(values.get('purchasedAt'))).toISOString(),
            lessonCount: Number(values.get('lessonCount')),
            amountMinor: Number(values.get('amountMinor')),
            currency: purchase.currency,
            privateNote: String(values.get('privateNote') || '').trim(),
            version: purchase.version
          })
        }}
      >
        <h2>編輯購課紀錄</h2>
        {conflict ? (
          <p className="form-notice" role="alert">
            這筆購課已更新為第 {conflict.version} 版。目前為 {conflict.lessonCount} 堂、
            {formatMoney(conflict.amountMinor, conflict.currency)}
            ；你的輸入仍保留，確認後可重新儲存。
          </p>
        ) : error instanceof Error ? (
          <p className="form-notice" role="alert">
            {error.message}
          </p>
        ) : null}
        <label>
          購買日期
          <input
            name="purchasedAt"
            type="date"
            defaultValue={purchase.purchasedAt.slice(0, 10)}
            required
            autoFocus
          />
        </label>
        <label>
          堂數
          <input
            name="lessonCount"
            type="number"
            min="1"
            max="10000"
            defaultValue={purchase.lessonCount}
            required
          />
        </label>
        <label>
          實收金額
          <input
            name="amountMinor"
            type="number"
            min="0"
            defaultValue={purchase.amountMinor}
            required
          />
        </label>
        <label>
          教練備註
          <textarea name="privateNote" defaultValue={purchase.privateNote} maxLength={4000} />
        </label>
        <div className="purchase-editor-actions">
          <button className="secondary-button" type="button" onClick={cancel} disabled={disabled}>
            取消
          </button>
          <button className="primary-button compact" disabled={disabled}>
            儲存購課紀錄
          </button>
        </div>
      </form>
    </section>
  )
}

function StudentDetailSkeleton() {
  return (
    <Page title="學生資料" eyebrow="正在載入">
      <section className="detail-skeleton" aria-label="正在載入學生資料">
        <span />
        <span />
        <span />
      </section>
    </Page>
  )
}

function StudentListSkeleton() {
  return (
    <section className="student-grid" aria-label="正在載入學生名單">
      <div className="detail-skeleton">
        <span />
        <span />
        <span />
      </div>
      <div className="detail-skeleton">
        <span />
        <span />
        <span />
      </div>
      <div className="detail-skeleton">
        <span />
        <span />
        <span />
      </div>
    </section>
  )
}
function StudentListError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="empty-state">
      <Cloud />
      <h2>暫時無法讀取學生資料</h2>
      <p>請稍後再試。</p>
      <button className="secondary-button" onClick={onRetry}>
        重試
      </button>
    </section>
  )
}
function StudentDetailEmpty() {
  return (
    <Page title="找不到學生">
      <section className="empty-state">
        <UserRound />
        <h2>這位學生已不存在</h2>
        <p>可能已被刪除，或你沒有查看權限。</p>
        <NavLink className="text-button" to="/students">
          返回學生名單 <ArrowRight />
        </NavLink>
      </section>
    </Page>
  )
}
function StudentDetailError({ onRetry }: { onRetry: () => void }) {
  return (
    <Page title="暫時無法開啟學生資料">
      <section className="empty-state">
        <Cloud />
        <h2>請稍後再試</h2>
        <p>目前無法讀取資料；學生資料沒有被更動。</p>
        <button className="secondary-button" onClick={onRetry}>
          重新載入
        </button>
      </section>
    </Page>
  )
}

export function SettingsPage({ session }: { session: Session }) {
  const [message, setMessage] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [deletionRequestOpen, setDeletionRequestOpen] = useState(false)
  const [immediateDelete, setImmediateDelete] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const { settings: settingsQuery, lifecycle: lifecycleQuery } = useSettingsRouteQueries(session)
  const { settings: settingsMutation, lifecycle: lifecycleMutation } = useSettingsRouteMutations({
    session,
    onMessage: setMessage,
    onDeletionRequestClosed: () => setDeletionRequestOpen(false)
  })
  const passwordMutation = useMutation({
    mutationFn: () =>
      hasEmailIdentity(session)
        ? changePassword(supabase.auth, session.user.email || '', currentPassword, password)
        : updatePassword(supabase.auth, password),
    onSuccess: () => {
      setCurrentPassword('')
      setPassword('')
      setConfirmPassword('')
      setPasswordOpen(false)
      setMessage('密碼已更新。')
    },
    onError: (error) => setMessage(readError(error))
  })
  const deleteMutation = useMutation({
    mutationFn: () => deleteAccountImmediately(session.access_token),
    onSuccess: async () => {
      await signOutCurrentDevice(supabase.auth)
    },
    onError: (error) => setMessage(readError(error))
  })
  const settings = settingsQuery.data
  const lifecycle = lifecycleQuery.data?.deletionDueAt ?? null
  const submitting =
    settingsMutation.isPending ||
    lifecycleMutation.isPending ||
    passwordMutation.isPending ||
    deleteMutation.isPending
  if ((settingsQuery.isLoading || lifecycleQuery.isLoading) && !settings)
    return (
      <Page title="設定">
        <section className="detail-skeleton">
          <span />
          <span />
          <span />
        </section>
      </Page>
    )
  if (settingsQuery.isError || lifecycleQuery.isError || !settings)
    return (
      <Page title="設定">
        <section className="empty-state">
          <Settings />
          <h2>暫時無法讀取設定</h2>
          <p>請重新整理後再試。</p>
        </section>
      </Page>
    )
  return (
    <Page title="設定" eyebrow="SYSTEM / PREFERENCES">
      <section className="settings-layout">
        <form
          className="settings-panel workspace-settings-panel"
          onSubmit={(event) => {
            event.preventDefault()
            setMessage('')
            const values = new FormData(event.currentTarget)
            settingsMutation.mutate({
              displayName: String(values.get('displayName') || '').trim(),
              timeZone: String(values.get('timeZone') || '').trim(),
              version: settings.version
            })
          }}
        >
          <SettingsPanelHeading eyebrow="COACH PROFILE" title="教練資料" />
          <label>
            教練顯示名稱
            <input
              name="displayName"
              defaultValue={settings.displayName}
              maxLength={120}
              required
            />
          </label>
          <label>
            工作時區
            <input name="timeZone" defaultValue={settings.timeZone} maxLength={64} required />
          </label>
          <button className="primary-button compact settings-submit" disabled={submitting}>
            儲存設定
          </button>
        </form>
        <section className="settings-panel account-settings-panel">
          <SettingsPanelHeading eyebrow="ACCOUNT & SECURITY" title="帳號安全" />
          <div className="account-email">
            <span>登入帳號</span>
            <strong>{session.user.email}</strong>
          </div>
          <button
            className="secondary-button security-button"
            disabled={submitting}
            onClick={() => void signOutCurrentDevice(supabase.auth)}
          >
            登出帳號 <LogOut />
          </button>
          <section className="account-operation password-settings">
            <div className="security-subsection-heading">
              <KeyRound />
              <div>
                <h3>{hasEmailIdentity(session) ? '修改密碼' : '建立登入密碼'}</h3>
              </div>
            </div>
            {!passwordOpen ? (
              <button
                className="secondary-button security-button"
                disabled={submitting}
                onClick={() => setPasswordOpen(true)}
              >
                修改密碼 <ArrowRight />
              </button>
            ) : (
              <form
                className="password-change-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (password !== confirmPassword) return setMessage('兩次輸入的新密碼不一致。')
                  passwordMutation.mutate()
                }}
              >
                <div
                  className={
                    hasEmailIdentity(session)
                      ? 'password-fields email-password-fields'
                      : 'password-fields'
                  }
                >
                  {hasEmailIdentity(session) && (
                    <label>
                      目前密碼
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        required
                        autoFocus
                      />
                    </label>
                  )}
                  <label>
                    新密碼
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={12}
                      required
                      autoFocus={!hasEmailIdentity(session)}
                    />
                  </label>
                  <label>
                    再次輸入新密碼
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      minLength={12}
                      required
                    />
                  </label>
                </div>
                <div className="password-form-actions">
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => {
                      setPasswordOpen(false)
                      setCurrentPassword('')
                      setPassword('')
                      setConfirmPassword('')
                    }}
                  >
                    取消
                  </button>
                  <button className="primary-button compact" disabled={submitting}>
                    更新密碼 <KeyRound />
                  </button>
                </div>
              </form>
            )}
          </section>
          <section className="account-operation account-deletion-zone">
            <div className="security-subsection-heading">
              {lifecycle ? <TimerReset /> : <Trash2 />}
              <div>
                <h3>{lifecycle ? '刪除倒數已開始' : '刪除帳號'}</h3>
                {lifecycle && <p>{new Date(lifecycle).toLocaleString('zh-TW')}</p>}
              </div>
            </div>
            {lifecycle ? (
              <div className="deletion-countdown-actions">
                <button
                  className="secondary-button"
                  disabled={submitting}
                  onClick={() => lifecycleMutation.mutate('cancel')}
                >
                  取消刪除
                </button>
                <div className="danger-operation-actions">
                  <button
                    className="danger-outline-button"
                    disabled={submitting}
                    onClick={() => setImmediateDelete(true)}
                  >
                    立即刪除 <Trash2 />
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="danger-outline-button"
                disabled={submitting}
                onClick={() => setDeletionRequestOpen(true)}
              >
                刪除帳號 <Trash2 />
              </button>
            )}
          </section>
        </section>
        {message && <p className="form-notice">{message}</p>}
      </section>
      {deletionRequestOpen && (
        <Confirmation
          title="刪除帳號？"
          text="確認後，帳號會進入 14 天刪除倒數。倒數期間可以隨時取消；期限屆滿才會永久刪除帳號與所有工作台資料。"
          confirmation={confirmation}
          onConfirmationChange={setConfirmation}
          onCancel={() => {
            setDeletionRequestOpen(false)
            setConfirmation('')
          }}
          onConfirm={() => lifecycleMutation.mutate('request')}
          disabled={submitting}
        />
      )}
      {immediateDelete && (
        <Confirmation
          title="立即永久刪除帳號？"
          text="這會永久刪除帳號與所有資料。"
          confirmation={confirmation}
          onConfirmationChange={setConfirmation}
          onCancel={() => setImmediateDelete(false)}
          onConfirm={() => deleteMutation.mutate()}
          disabled={submitting}
        />
      )}
    </Page>
  )
}

function CreateStudentDialog({
  accessToken,
  onClose,
  onCreated
}: {
  accessToken: string
  onClose: () => void
  onCreated: (student: Student) => void
}) {
  const openerRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
      requestAnimationFrame(() => openerRef.current?.focus())
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])
  const close = () => {
    onClose()
    requestAnimationFrame(() => openerRef.current?.focus())
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    const values = new FormData(event.currentTarget)
    try {
      onCreated(
        await createStudent(accessToken, {
          name: String(values.get('name') || '').trim(),
          phone: String(values.get('phone') || '').trim(),
          goal: String(values.get('goal') || '').trim(),
          privateNote: String(values.get('privateNote') || '').trim()
        })
      )
    } catch (reason) {
      setError(readError(reason))
      setSubmitting(false)
    }
  }
  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-modal="true">
        <header>
          <div>
            <span className="eyebrow dark">學生</span>
            <h2>新增學生</h2>
          </div>
          <button className="icon-button" type="button" onClick={close} aria-label="關閉新增學生">
            ×
          </button>
        </header>
        <form onSubmit={submit}>
          <label>
            姓名
            <input name="name" required maxLength={120} autoFocus />
          </label>
          <label>
            電話
            <input name="phone" maxLength={40} />
          </label>
          <label>
            訓練目標
            <input name="goal" maxLength={1000} />
          </label>
          <label>
            私人備註
            <textarea name="privateNote" maxLength={4000} />
          </label>
          {error && <p className="form-error">{error}</p>}
          <footer>
            <button className="secondary-button" type="button" onClick={close}>
              取消
            </button>
            <button className="primary-button compact" disabled={submitting}>
              建立學生
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

function initials(email: string | undefined) {
  return (email?.slice(0, 2) || 'CO').toUpperCase()
}

function hasEmailIdentity(session: Session): boolean {
  return session.user.identities?.some((identity) => identity.provider === 'email') ?? false
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'TWD' ? 0 : undefined
  }).format(amountMinor)
}
function readError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return '登入已失效，請重新登入。'
  return error instanceof Error ? error.message : '目前無法完成這項操作。'
}
