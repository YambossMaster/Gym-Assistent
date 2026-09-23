import { MultiMetricTrend } from './pages/training/MultiMetricTrend'
import { metricLabels, recordingTypes } from './pages/training/recording'
import { PerformanceTrend as TrendDialog } from './pages/training/PerformanceTrend'
import type { Session } from '@supabase/supabase-js'
import { FormSelect } from './shared/FormSelect'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  Cloud,
  KeyRound,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Search,
  Settings,
  TimerReset,
  Trash2,
  UserRound,
  XCircle
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
  type Student,
  type StudentAgeRange
} from './api'
import { changePassword, signOutCurrentDevice, updatePassword } from './account-auth'
import {
  useStudentDetailRouteQuery,
  useStudentRouteMutations,
  useStudentsRouteQuery
} from './pages/students/queries'
import { selectStudentCourseRecords, selectStudentRosterResult } from './pages/students/state'
import { useSettingsRouteMutations, useSettingsRouteQueries } from './pages/settings/queries'
import { invalidateTodayRoute } from './pages/today/queries'
import { queryKeys } from './query-keys'
import { useSchedulingMutations } from './pages/calendar/queries'
import { isoToLocalDateTime, localDateTimeToIso } from './pages/calendar/calendar-time'
import { SchedulingDialog } from './pages/calendar/SchedulingDialog'
import { SeriesDatePicker } from './pages/students/SeriesDatePicker'
import { selectCollectionRouteState, selectDetailRouteState } from './route-state'
import { Confirmation, Page, SettingsPanelHeading } from './shared/primitives'
import { useDialogBehavior } from './shared/useDialogBehavior'
import { supabase } from './supabase'
import { useStudentPerformance, useStudentTrend } from './pages/training/queries'
import type { PerformanceEntry } from './api'

const studentAgeRangeOptions: { value: StudentAgeRange | ''; label: string }[] = [
  { value: '', label: '未設定' },
  { value: 'UNDER_18', label: '未滿 18 歲' },
  { value: 'AGE_18_24', label: '18–24 歲' },
  { value: 'AGE_25_34', label: '25–34 歲' },
  { value: 'AGE_35_44', label: '35–44 歲' },
  { value: 'AGE_45_54', label: '45–54 歲' },
  { value: 'AGE_55_64', label: '55–64 歲' },
  { value: 'AGE_65_PLUS', label: '65 歲以上' }
]

function studentAgeRangeLabel(value: StudentAgeRange | null) {
  return studentAgeRangeOptions.find((option) => option.value === (value ?? ''))?.label ?? '未設定'
}

export function StudentsPage({
  session,
  timeZone = 'Asia/Taipei'
}: {
  session: Session
  timeZone?: string
}) {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'active' | 'archived'>('active')
  const [createOpen, setCreateOpen] = useState(false)
  const { students: studentsQuery } = useStudentsRouteQuery(session)
  const students = studentsQuery.data ?? []
  const activeCount = students.filter((student) => student.active).length
  const archivedCount = students.length - activeCount
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
            placeholder="搜尋姓名或學生簡介"
          />
        </label>
        <div className="student-view-switch" role="group" aria-label="學生狀態">
          <button type="button" onClick={() => setView('active')} aria-pressed={view === 'active'}>
            進行中 <span>{activeCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setView('archived')}
            aria-pressed={view === 'archived'}
          >
            已封存 <span>{archivedCount}</span>
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
      {routeState === 'loading' ? (
        <StudentListSkeleton />
      ) : routeState === 'error' ? (
        <StudentListError onRetry={() => void studentsQuery.refetch()} />
      ) : rosterResult.state === 'first-empty' ? (
        <section className="empty-state">
          <UserRound />
          <h2>建立第一位學生</h2>
          <p>先留下姓名，學生簡介與備註之後可再補上。</p>
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
              timeZone={timeZone}
            />
          ))}
        </section>
      )}
      <Link className="student-finance-entry" to="/students/finances">
        <span>每月收支</span>
        <ArrowRight aria-hidden="true" />
      </Link>
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
  coachId,
  timeZone
}: {
  student: Student
  index: number
  accessToken: string
  coachId: string
  timeZone: string
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
      <p>{student.goal || '尚未填寫學生簡介'}</p>
      <div className="student-balance">
        <div>
          <span>剩餘堂數</span>
          <strong
            className={
              student.lessonSummary && student.lessonSummary.remaining <= 2
                ? 'lesson-attention'
                : undefined
            }
          >
            {student.lessonSummary?.remaining ?? '—'}
            <small> / {student.lessonSummary?.purchased ?? '—'}</small>
          </strong>
        </div>
        <div
          className="student-balance-track"
          role="img"
          aria-label={`剩餘 ${student.lessonSummary?.remaining ?? '未知'} 堂，共購買 ${student.lessonSummary?.purchased ?? '未知'} 堂`}
        >
          <span
            style={{
              width: `${student.lessonSummary?.purchased ? Math.min(100, Math.max(0, (student.lessonSummary.remaining / student.lessonSummary.purchased) * 100)) : 0}%`
            }}
          />
        </div>
      </div>
      <div className="roster-next-session">
        <CalendarClock aria-hidden="true" />
        <span>
          下次課程
          <strong>
            {student.nextSessionAt
              ? `${formatScheduleDateInTimeZone(student.nextSessionAt, timeZone)}・${formatScheduleTimeInTimeZone(student.nextSessionAt, timeZone)}`
              : '尚未安排'}
          </strong>
        </span>
        <ArrowRight aria-hidden="true" />
      </div>
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
  const [purchaseCreateOpen, setPurchaseCreateOpen] = useState(false)
  const [purchaseDate, setPurchaseDate] = useState(() =>
    new Date().toLocaleDateString('sv-SE', { timeZone })
  )
  const [profileEditing, setProfileEditing] = useState(false)
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
    saveMutation.mutate(
      {
        name: String(values.get('name') || '').trim(),
        phone: String(values.get('phone') || '').trim(),
        goal: String(values.get('goal') || '').trim(),
        privateNote: String(values.get('privateNote') || '').trim(),
        ageRange: (String(values.get('ageRange') || '') || null) as StudentAgeRange | null,
        active: detail.student.active,
        lineLinked: detail.student.lineLinked,
        version: detail.student.version
      },
      {
        onSuccess: () => {
          setProfileEditing(false)
        }
      }
    )
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
      {
        onSuccess: () => {
          form.reset()
          setPurchaseCreateOpen(false)
        }
      }
    )
  }
  const changeActive = (active: boolean) => {
    setNotice('')
    saveMutation.mutate({
      name: detail.student.name,
      phone: detail.student.phone,
      goal: detail.student.goal,
      privateNote: detail.student.privateNote,
      ageRange: detail.student.ageRange,
      active,
      lineLinked: detail.student.lineLinked,
      version: detail.student.version
    })
  }
  const remove = async () => {
    deleteMutation.mutate(detail.student.version)
  }
  return (
    <section className="page student-detail-page">
      <Link className="student-detail-back" to="/students">
        <ArrowLeft aria-hidden="true" />
        回到學生列表
      </Link>
      <header className="student-detail-hero">
        <div className="student-detail-heading">
          <div className="student-detail-identity">
            <div className="student-detail-avatar" aria-hidden="true">
              {detail.student.name.slice(-2)}
            </div>
            <div className="student-detail-name">
              <span className="eyebrow dark">
                STUDENT / {detail.student.active ? 'ACTIVE' : 'ARCHIVED'}
              </span>
              <div className="student-detail-title-row">
                <h1>{detail.student.name}</h1>
                <div
                  className={`student-hero-balance${detail.lessonSummary.remaining <= 2 ? ' is-low' : ''}`}
                >
                  <span>剩餘堂數</span>
                  <strong>
                    {detail.lessonSummary.remaining}
                    <small> 堂</small>
                  </strong>
                </div>
              </div>
              <p>{detail.student.goal || '尚未填寫學生簡介'}</p>
            </div>
          </div>
        </div>
        <section className="student-detail-profile" aria-label="學生個人資料">
          <div className="student-detail-profile-heading">
            <span>基本資料</span>
            <button
              type="button"
              className="secondary-button compact"
              onClick={() => {
                saveMutation.reset()
                setProfileEditing(true)
              }}
            >
              <Pencil aria-hidden="true" />
              編輯
            </button>
          </div>
          <div className="student-detail-profile-facts">
            <div className="student-detail-contact">
              <span>電話</span>
              <strong>{detail.student.phone || '—'}</strong>
            </div>
            <div className="student-detail-age-range">
              <span>年齡區間</span>
              <strong>{studentAgeRangeLabel(detail.student.ageRange)}</strong>
            </div>
            <div className="student-detail-note-field">
              <span>備註</span>
              <p className="student-detail-note">{detail.student.privateNote || '[ 無備註 ]'}</p>
            </div>
          </div>
        </section>
        {profileEditing && (
          <SchedulingDialog
            title="編輯基本資料"
            variant="profile"
            onClose={() => setProfileEditing(false)}
          >
            <form className="student-detail-profile-form" onSubmit={save}>
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
                  年齡區間
                  <FormSelect
                    label="年齡區間"
                    name="ageRange"
                    options={studentAgeRangeOptions}
                    defaultValue={detail.student.ageRange ?? ''}
                  />
                </label>
              </div>
              <label>
                學生簡介
                <input
                  name="goal"
                  defaultValue={detail.student.goal}
                  maxLength={1000}
                  placeholder="例如：設計師、晨型人、喜歡跑步"
                />
              </label>
              <label>
                備註
                <textarea
                  name="privateNote"
                  defaultValue={detail.student.privateNote}
                  maxLength={4000}
                />
              </label>
              {saveMutation.isError && (
                <p className="form-error" role="alert">
                  {saveMutation.error instanceof Error
                    ? saveMutation.error.message
                    : '暫時無法儲存，請重試。'}
                </p>
              )}
              <footer>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setProfileEditing(false)}
                >
                  取消
                </button>
                <button className="primary-button compact" disabled={submitting}>
                  {saveMutation.isPending ? '儲存中…' : '儲存資料'}
                </button>
              </footer>
            </form>
          </SchedulingDialog>
        )}
      </header>
      <section className="detail-page-grid">
        <StudentSchedule
          session={session}
          studentId={studentId}
          studentName={detail.student.name}
          timeZone={timeZone}
          schedule={detail.schedule}
        />
        <StudentPerformance
          session={session}
          studentId={studentId}
          studentName={detail.student.name}
        />
        <StudentCourseRecord schedule={detail.schedule} />
        <section className="detail-section purchase-history">
          <div className="purchase-history-heading">
            <div>
              <span className="eyebrow dark">PURCHASE LEDGER</span>
              <h2>購課紀錄</h2>
            </div>
            <button
              type="button"
              className="detail-add-button"
              onClick={() => {
                purchaseMutation.reset()
                setPurchaseDate(new Date().toLocaleDateString('sv-SE', { timeZone }))
                setPurchaseCreateOpen(true)
              }}
            >
              <Plus aria-hidden="true" />
              <span className="detail-add-button-full">新增購課</span>
              <span className="detail-add-button-short">新增</span>
            </button>
          </div>
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
                <small className="purchase-ledger-note">{item.privateNote || '—'}</small>
                <span className="purchase-ledger-actions">
                  <button
                    type="button"
                    className="purchase-ledger-icon"
                    aria-label={`編輯 ${new Date(item.purchasedAt).toLocaleDateString('zh-TW')} 的購課紀錄`}
                    onClick={() => {
                      setPurchaseConflict(null)
                      setPurchaseEditor(item)
                    }}
                    disabled={submitting}
                  >
                    <Pencil aria-hidden="true" />
                  </button>
                  <button
                    className="purchase-ledger-icon danger-button"
                    type="button"
                    aria-label={`刪除 ${new Date(item.purchasedAt).toLocaleDateString('zh-TW')} 的購課紀錄`}
                    onClick={() => setPurchaseToDelete({ id: item.id, version: item.version })}
                    disabled={submitting}
                  >
                    <XCircle aria-hidden="true" />
                  </button>
                </span>
              </div>
            ))
          ) : (
            <p>尚無購課紀錄。</p>
          )}
        </section>
        {notice && (
          <p className="form-error" role="alert">
            {notice}
          </p>
        )}
      </section>
      <div className="student-detail-management" aria-label="學生狀態管理">
        <div className="student-detail-hero-actions">
          <button
            type="button"
            className="secondary-button compact"
            disabled={submitting}
            onClick={() => changeActive(!detail.student.active)}
          >
            {detail.student.active ? '封存' : '恢復'}
          </button>
          {!detail.student.active && (
            <button
              type="button"
              className="text-button danger-button"
              disabled={submitting}
              onClick={() => setDeleteOpen(true)}
            >
              永久刪除
            </button>
          )}
        </div>
      </div>
      {purchaseCreateOpen && (
        <SchedulingDialog
          title="新增購課紀錄"
          onClose={() => setPurchaseCreateOpen(false)}
          variant="profile"
        >
          <form className="purchase-create-form" onSubmit={purchase}>
            <div className="field-row">
              <SeriesDatePicker label="購買日期" value={purchaseDate} onChange={setPurchaseDate} />
              <input type="hidden" name="purchasedAt" value={purchaseDate} />
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
              <textarea name="purchaseNote" maxLength={4000} />
            </label>
            {purchaseMutation.isError && (
              <p className="form-error" role="alert">
                {purchaseMutation.error instanceof Error
                  ? purchaseMutation.error.message
                  : '暫時無法新增，請重試。'}
              </p>
            )}
            <footer>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setPurchaseCreateOpen(false)}
                disabled={submitting}
              >
                取消
              </button>
              <button className="primary-button compact" disabled={submitting}>
                {purchaseMutation.isPending ? '登錄中…' : '新增購課紀錄'}
              </button>
            </footer>
          </form>
        </SchedulingDialog>
      )}
      {deleteOpen && !detail.student.active && (
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
          saving={updatePurchaseMutation.isPending}
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
    </section>
  )
}

function StudentCourseRecord({
  schedule
}: {
  schedule?: {
    nearestFuture: import('./api').CalendarSession | null
    history: import('./api').CalendarSession[]
  }
}) {
  if (!schedule) return null
  const records = selectStudentCourseRecords(schedule)
  return (
    <section className="student-course-record" aria-labelledby="student-course-record-title">
      <header className="student-course-record-heading">
        <div>
          <span className="eyebrow">SESSION HISTORY</span>
          <h2 id="student-course-record-title">課程紀錄</h2>
        </div>
      </header>
      {records.length ? (
        <div className="student-course-record-list">
          {records.map((item) => {
            const isNext = item.status === 'scheduled'
            return (
              <Link
                key={item.id}
                className={`student-course-record-row${isNext ? ' is-next' : ''}`}
                to={`/sessions/${item.id}`}
              >
                <span className="student-course-record-index">
                  {isNext ? <CalendarClock /> : <Check />}
                </span>
                <span className="student-course-record-date">
                  <strong>{formatScheduleDate(item.startsAt)}</strong>
                </span>
                <span className="student-course-record-meta">
                  {formatScheduleTime(item.startsAt)}–{formatScheduleTime(item.endsAt)}
                  <span aria-hidden="true">・</span>
                  {item.location || '未設定地點'}
                </span>
                <span className="student-course-record-status">
                  {isNext ? '最近未上課' : '已完成'}
                </span>
                <ArrowRight />
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="student-course-record-empty">
          <CalendarClock />
          <div>
            <strong>還沒有課程紀錄</strong>
            <span>安排下一堂課或完成課堂後，就會顯示在這裡。</span>
          </div>
        </div>
      )}
    </section>
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
  const [seriesToDelete, setSeriesToDelete] = useState<ScheduleSeries | null>(null)
  const [seriesDeleteError, setSeriesDeleteError] = useState('')
  const [seriesNotice, setSeriesNotice] = useState('')
  if (!schedule) return null
  return (
    <section className="detail-section student-schedule" aria-labelledby="student-schedule-title">
      <div className="student-schedule-heading">
        <div>
          <span className="eyebrow dark">FIXED SCHEDULE</span>
          <h2 id="student-schedule-title">固定課程時間</h2>
        </div>
        <button className="detail-add-button" onClick={() => setEditor('new')}>
          <Plus aria-hidden="true" />
          <span className="detail-add-button-full">新增時段</span>
          <span className="detail-add-button-short">新增</span>
        </button>
      </div>
      <div className="student-series-list">
        {seriesQuery.isLoading ? (
          <p>正在載入固定課表…</p>
        ) : seriesQuery.isError ? (
          <p className="notice error">暫時無法讀取固定課表。</p>
        ) : seriesQuery.data?.length ? (
          seriesQuery.data.map((series) => {
            const monthlyDay = Number(
              isoToLocalDateTime(series.anchorStartsAt, timeZone).date.slice(-2)
            )
            const when =
              series.intervalWeeks === 0
                ? `每月 ${monthlyDay} 日`
                : weekdayLabel(series.localWeekday)
            return (
              <div className="student-series-row" key={series.id}>
                <span
                  className={`student-series-day${series.active ? ' is-active' : ''}`}
                  aria-hidden="true"
                >
                  {series.intervalWeeks === 0
                    ? monthlyDay
                    : weekdayLabel(series.localWeekday).slice(-1)}
                </span>
                <div className="student-series-copy">
                  <strong>
                    {when} · {series.localStartTime}
                  </strong>
                  <span>
                    {series.intervalWeeks === 0
                      ? '每月'
                      : series.intervalWeeks === 1
                        ? '每週'
                        : '隔週'}{' '}
                    · {series.durationMinutes} 分鐘
                    {series.location ? ` · ${series.location}` : ''}
                  </span>
                </div>
                <span className={`student-series-status${series.active ? ' is-active' : ''}`}>
                  {series.active ? '使用中' : '已停用'}
                </span>
                <button
                  type="button"
                  className="student-series-edit"
                  onClick={() => setEditor(series)}
                  aria-label={`編輯${when} ${series.localStartTime}固定時段`}
                >
                  <Pencil aria-hidden="true" />
                </button>
              </div>
            )
          })
        ) : (
          <p>尚未建立固定課表。</p>
        )}
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
          timeZone={timeZone}
          pending={mutations.createSeries.isPending || mutations.updateSeries.isPending}
          onClose={() => setEditor(null)}
          onDelete={
            editor === 'new'
              ? undefined
              : () => {
                  setSeriesDeleteError('')
                  setSeriesToDelete(editor)
                }
          }
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
                    version: editor.version
                  }
                },
                callbacks
              )
          }}
        />
      ) : null}
      {seriesToDelete && (
        <Confirmation
          title="刪除固定課表？"
          text={
            seriesDeleteError || '刪除後不會再依此課表自動安排課堂；已建立的課堂和過去紀錄會保留。'
          }
          onCancel={() => {
            setSeriesToDelete(null)
            setSeriesDeleteError('')
          }}
          onConfirm={() =>
            mutations.deleteSeries.mutate(
              { seriesId: seriesToDelete.id, version: seriesToDelete.version },
              {
                onSuccess: () => {
                  setSeriesToDelete(null)
                  setSeriesDeleteError('')
                  setEditor(null)
                  setSeriesNotice('固定課表已刪除；已建立的課堂仍保留。')
                },
                onError: (error) => {
                  if (error instanceof ApiError && error.status === 409 && error.details.current) {
                    setSeriesToDelete(error.details.current as ScheduleSeries)
                    setSeriesDeleteError(
                      '固定課表已在其他裝置變更；請確認後再刪除。已建立的課堂和過去紀錄會保留。'
                    )
                  } else {
                    setSeriesDeleteError('暫時無法刪除固定課表，請稍後重試。')
                  }
                }
              }
            )
          }
          disabled={mutations.deleteSeries.isPending}
          confirmLabel="刪除固定課表"
          confirmOnDelete
          shortcutHint="也可以按 Delete 鍵確認。"
        />
      )}
    </section>
  )
}

function SeriesEditor({
  series,
  studentId,
  studentName,
  timeZone,
  pending,
  onClose,
  onDelete,
  onSave
}: {
  series: ScheduleSeries | null
  studentId: string
  studentName: string
  timeZone: string
  pending: boolean
  onClose: () => void
  onDelete?: () => void
  onSave: (input: {
    startsAt: string
    endsAt: string
    location: string
    intervalWeeks: 0 | 1 | 2
    autoScheduleHorizon: ScheduleSeries['autoScheduleHorizon']
    active?: boolean
  }) => void
}) {
  const initial = series
    ? isoToLocalDateTime(series.anchorStartsAt, timeZone)
    : { date: new Date().toISOString().slice(0, 10), time: '09:00' }
  const [date, setDate] = useState(initial.date),
    [start, setStart] = useState(initial.time)
  const [duration, setDuration] = useState(series?.durationMinutes ?? 60),
    [location, setLocation] = useState(series?.location ?? '')
  const [interval, setInterval] = useState<0 | 1 | 2>(series?.intervalWeeks ?? 1),
    [horizon, setHorizon] = useState<ScheduleSeries['autoScheduleHorizon']>(
      String(series?.autoScheduleHorizon) === 'MAX_WINDOW'
        ? '2_WEEKS'
        : (series?.autoScheduleHorizon ?? 'NONE')
    )
  const [active, setActive] = useState(series?.active ?? true),
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
        active
      })
    } catch {
      setError('日期或時間無效。')
    }
  }
  return (
    <SchedulingDialog
      variant="series"
      title={series ? '編輯固定課表' : `為 ${studentName} 建立固定課表`}
      description="固定課表只補齊未來需要的課程，不會改動過去紀錄。"
      onClose={onClose}
      onDelete={onDelete}
    >
      <form className="scheduling-form student-series-editor" onSubmit={submit}>
        <div className="field-row">
          <SeriesDatePicker value={date} onChange={setDate} />
          <label>
            開始時間
            <FormSelect
              label="開始時間"
              value={start}
              onChange={setStart}
              options={[
                ...(start < '06:00' || start > '23:00' ? [{ value: start, label: start }] : []),
                ...Array.from({ length: 69 }, (_, index) => {
                  const minutes = 360 + index * 15
                  const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
                  return { value: time, label: time }
                })
              ]}
            />
          </label>
        </div>
        <div className="field-row">
          <label>
            課程長度
            <FormSelect
              label="課程長度"
              value={String(duration)}
              onChange={(value) => setDuration(Number(value))}
              options={[
                ...([30, 60, 90, 120, 150, 180].includes(duration)
                  ? []
                  : [{ value: String(duration), label: `${duration} 分鐘（目前）` }]),
                ...[30, 60, 90, 120, 150, 180].map((minutes) => ({
                  value: String(minutes),
                  label: `${minutes} 分鐘`
                }))
              ]}
            />
          </label>
          <label>
            地點
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              maxLength={160}
              required
            />
          </label>
        </div>
        <div className="student-series-settings">
          <label>
            頻率
            <FormSelect
              label="頻率"
              value={String(interval)}
              onChange={(value) => setInterval(Number(value) as 0 | 1 | 2)}
              options={[
                { value: '1', label: '每週' },
                { value: '2', label: '隔週' },
                { value: '0', label: '每一個月' }
              ]}
            />
          </label>
          <label>
            自動安排範圍
            <FormSelect
              label="自動安排範圍"
              value={horizon}
              onChange={(value) => setHorizon(value as ScheduleSeries['autoScheduleHorizon'])}
              options={[
                { value: 'NONE', label: '只建立首堂' },
                { value: '1_WEEK', label: '未來 1 週' },
                { value: '2_WEEKS', label: '未來 2 週' }
              ]}
            />
          </label>
          <label className="student-series-toggle">
            使用狀態
            <span>
              <strong>{active ? '使用中' : '已停用'}</strong>
              <input
                type="checkbox"
                role="switch"
                aria-label="固定課表狀態"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
            </span>
          </label>
        </div>
        {error ? <p className="notice error">{error}</p> : null}
        <div className="scheduling-form-actions">
          {onDelete && (
            <button
              type="button"
              className="text-button danger-button student-series-delete"
              onClick={onDelete}
            >
              <Trash2 aria-hidden="true" />
              刪除固定課表
            </button>
          )}
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
function formatScheduleDateInTimeZone(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    timeZone
  }).format(new Date(value))
}
function formatScheduleTimeInTimeZone(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone
  }).format(new Date(value))
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
  saving,
  onCancel,
  onSave
}: {
  purchase: LessonPurchase
  conflict: LessonPurchase | null
  error: unknown
  disabled: boolean
  saving: boolean
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
  const { dialogRef, onBackdropPointerDown } = useDialogBehavior(onCancel, {
    submitOnEnter: true,
    focusDialog: true
  })
  return (
    <section
      ref={dialogRef}
      tabIndex={-1}
      className="purchase-editor"
      role="dialog"
      aria-modal="true"
      aria-label="編輯購課紀錄"
      onPointerDown={onBackdropPointerDown}
    >
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
          <button className="secondary-button" type="button" onClick={onCancel} disabled={disabled}>
            取消
          </button>
          <button className="primary-button compact" disabled={disabled}>
            {saving ? '儲存中…' : '儲存購課紀錄'}
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
            {settingsMutation.isPending ? '儲存中…' : '儲存設定'}
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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { dialogRef, onBackdropPointerDown } = useDialogBehavior(onClose, {
    submitOnEnter: true,
    focusDialog: true
  })
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
          privateNote: String(values.get('privateNote') || '').trim(),
          ageRange: (String(values.get('ageRange') || '') || null) as StudentAgeRange | null
        })
      )
    } catch (reason) {
      setError(readError(reason))
      setSubmitting(false)
    }
  }
  return (
    <div className="modal-backdrop" onPointerDown={onBackdropPointerDown}>
      <section ref={dialogRef} tabIndex={-1} className="modal" role="dialog" aria-modal="true">
        <header>
          <div>
            <span className="eyebrow dark">學生</span>
            <h2>新增學生</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="關閉新增學生">
            ×
          </button>
        </header>
        <form onSubmit={submit}>
          <label>
            姓名
            <input name="name" required maxLength={120} />
          </label>
          <label>
            電話
            <input name="phone" maxLength={40} />
          </label>
          <label>
            年齡區間
            <FormSelect label="年齡區間" name="ageRange" options={studentAgeRangeOptions} />
          </label>
          <label>
            學生簡介
            <input name="goal" maxLength={1000} placeholder="例如：設計師、晨型人、喜歡跑步" />
          </label>
          <label>
            備註
            <textarea name="privateNote" maxLength={4000} />
          </label>
          {error && <p className="form-error">{error}</p>}
          <footer>
            <button className="secondary-button" type="button" onClick={onClose}>
              取消
            </button>
            <button className="primary-button compact" disabled={submitting}>
              {submitting ? '建立中…' : '建立學生'}
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

function StudentPerformance({
  session,
  studentId,
  studentName
}: {
  session: Session
  studentId: string
  studentName: string
}) {
  const query = useStudentPerformance(session, studentId)
  const [selected, setSelected] = useState<PerformanceEntry | null>(null)
  const [allOpen, setAllOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'count' | 'latest'>('count')
  const entries = [...(query.data ?? [])].sort(
    (a, b) =>
      (sortBy === 'count'
        ? b.sessionCount - a.sessionCount || Date.parse(b.latestAt) - Date.parse(a.latestAt)
        : Date.parse(b.latestAt) - Date.parse(a.latestAt) || b.sessionCount - a.sessionCount) ||
      a.name.localeCompare(b.name, 'zh-TW')
  )
  const renderEntry = (entry: PerformanceEntry) => {
    const bests = entry.recording
      ? (entry.series ?? [])
          .filter(
            (series) => entry.recording!.metrics.includes(series.metric) && series.points.length
          )
          .map((series) => {
            const best = (series.direction === 'lower' ? Math.min : Math.max)(
              ...series.points.map((point) => point.value)
            )
            return `${Number(best.toFixed(3))}${series.unit ? ` ${series.unit}` : ''}${series.distanceMetres !== undefined ? ` (${series.distanceMetres} m)` : ''}`
          })
      : [`${entry.personal}${entry.metric === 'weight' ? ` ${entry.unit}` : ' 次'}`]
    return (
      <button
        className="performance-row"
        key={`${entry.definitionId}:${entry.recording?.type ?? entry.metric}`}
        onClick={() => {
          setAllOpen(false)
          setSelected(entry)
        }}
      >
        <span className="performance-row-mark" aria-hidden="true">
          ↗
        </span>
        <span className="performance-row-identity">
          <strong>{entry.name}</strong>
          <small>
            {entry.recording
              ? recordingTypes[entry.recording.type].label
              : metricLabels[entry.metric]}
          </small>
        </span>
        <span className="performance-row-count">
          <strong>{entry.sessionCount}</strong>
          <small>筆記錄</small>
        </span>
        <span className="performance-row-latest">
          <small>最近紀錄</small>
          <strong>{new Date(entry.latestAt).toLocaleDateString('zh-TW')}</strong>
        </span>
        <span className="performance-row-best">
          <small>個人最佳</small>
          <strong>{bests.length ? bests.join(' / ') : '—'}</strong>
        </span>
        <ArrowRight aria-hidden="true" />
      </button>
    )
  }
  return (
    <section className="performance-directory" aria-label="動作表現">
      {query.isLoading ? (
        <p>載入動作表現中…</p>
      ) : query.isError ? (
        <p>
          無法載入動作表現。 <button onClick={() => void query.refetch()}>重試</button>
        </p>
      ) : (
        <button className="performance-portal" type="button" onClick={() => setAllOpen(true)}>
          <span className="performance-portal-copy">
            <small>PERFORMANCE / MOVEMENT RECORDS</small>
            <strong>個人運動表現</strong>
            <span>查看所有動作的紀錄與成長軌跡</span>
          </span>
          <span className="performance-portal-count">
            <strong>{entries.length}</strong>
            <small>項動作</small>
          </span>
          <ArrowRight aria-hidden="true" />
        </button>
      )}
      {allOpen && (
        <SchedulingDialog
          variant="performance"
          title={`${studentName}・個人運動表現`}
          onClose={() => setAllOpen(false)}
        >
          <div className="performance-directory-intro">
            <div>
              <span className="eyebrow dark">MOVEMENT RECORDS</span>
              <p>選擇動作查看完整紀錄與成長軌跡。</p>
            </div>
            <div className="performance-directory-controls">
              <span>排序方式</span>
              <FormSelect
                label="排序方式"
                value={sortBy}
                onChange={(value) => setSortBy(value as 'count' | 'latest')}
                options={[
                  { value: 'count', label: '最多筆數' },
                  { value: 'latest', label: '最新紀錄' }
                ]}
              />
              <strong>{String(entries.length).padStart(2, '0')}</strong>
            </div>
          </div>
          {entries.length ? (
            <div className="performance-list performance-all-list">{entries.map(renderEntry)}</div>
          ) : (
            <div className="empty-state">
              <strong>尚無動作紀錄</strong>
              <p>完成課堂並記錄動作後，紀錄會顯示在這裡。</p>
            </div>
          )}
        </SchedulingDialog>
      )}
      {selected?.recording ? (
        <MultiMetricTrend
          session={session}
          definitionId={selected.definitionId}
          recording={selected.recording}
          name={selected.name}
          studentName={studentName}
          series={
            query.data?.find(
              (e) =>
                e.definitionId === selected.definitionId &&
                e.recording?.type === selected.recording!.type
            )?.series ??
            selected.series ??
            []
          }
          onClose={() => setSelected(null)}
        />
      ) : (
        selected && (
          <PerformanceTrend
            studentName={studentName}
            session={session}
            studentId={studentId}
            entry={selected}
            onClose={() => setSelected(null)}
          />
        )
      )}
    </section>
  )
}

function PerformanceTrend({
  studentName,
  session,
  studentId,
  entry,
  onClose
}: {
  studentName: string
  session: Session
  studentId: string
  entry: PerformanceEntry
  onClose: () => void
}) {
  const query = useStudentTrend(session, studentId, entry.definitionId, entry.metric)
  return (
    <TrendDialog
      studentName={studentName}
      name={entry.name}
      points={query.data?.points ?? []}
      metric={entry.metric}
      loading={query.isLoading}
      error={query.isError}
      refreshing={query.isFetching && !query.isLoading}
      onRetry={() => void query.refetch()}
      onClose={onClose}
    />
  )
}

function readError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return '登入已失效，請重新登入。'
  return error instanceof Error ? error.message : '目前無法完成這項操作。'
}
