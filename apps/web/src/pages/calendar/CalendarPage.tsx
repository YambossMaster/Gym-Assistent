import type { Session } from '@supabase/supabase-js'
import {
  CalendarDays,
  CalendarClock,
  Ban,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  List,
  MousePointer2,
  Plus,
  Rows3,
  ShieldCheck,
  Table2
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  type Ref
} from 'react'
import { Link } from 'react-router-dom'
import {
  ApiError,
  type CalendarBlock,
  type CalendarProjection,
  type CalendarSession,
  type Student
} from '../../api'
import { FormSelect } from '../../shared/FormSelect'
import { Confirmation } from '../../shared/primitives'
import { useStudentsRouteQuery } from '../students/queries'
import { isoToLocalDateTime, localDateTimeToIso } from './calendar-time'
import { useCalendarRouteQuery, useSchedulingMutations } from './queries'
import { SchedulingDialog } from './SchedulingDialog'
import { SchedulingTimeInput } from './SchedulingTimeInput'
import { calendarSessionVisualState, selectCalendarRouteState } from './state'
import { calendarHeaderWheelAction } from './calendar-header-wheel'

type CalendarView = 'agenda' | 'day' | 'week' | 'month'
type Draft =
  | {
      kind: 'session'
      date: string
      start: string
      end: string
      studentId: string
      location: string
      repeat?: 0 | 1 | 2
      current?: CalendarSession
    }
  | {
      kind: 'block'
      date: string
      start: string
      end: string
      note: string
      repeatCount: number
      scope: 'single' | 'future' | 'all'
      current?: CalendarBlock
    }
  | {
      kind: 'availability'
      date: string
      start: string
      end: string
      scope: 'date' | 'weekday'
      action: 'add' | 'remove'
    }

export function CalendarPage({ session, timeZone }: { session: Session; timeZone: string }) {
  const [view, setView] = useState<CalendarView>(() =>
    window.matchMedia('(max-width: 720px)').matches ? 'agenda' : 'week'
  )
  const [anchor, setAnchor] = useState(() => localDate(new Date(), timeZone))
  const [draft, setDraft] = useState<Draft | null>(null)
  const [draftError, setDraftError] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const pageRef = useRef<HTMLElement | null>(null)
  const calendarViewportRef = useRef<HTMLDivElement | null>(null)
  const collapsedRef = useRef(false)
  const headerGestureLockUntilRef = useRef(0)
  const range = rangeFor(anchor, view)
  const query = useCalendarRouteQuery(session, range)
  const students =
    useStudentsRouteQuery(session).students.data?.filter((student) => student.active) ?? []
  const mutations = useSchedulingMutations(session)
  const state = selectCalendarRouteState({
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error
  })
  const initialDraft = (date = anchor, start = '09:00', end = '10:00'): Draft => ({
    kind: 'session',
    date,
    start,
    end,
    studentId: students[0]?.id ?? '',
    location: ''
  })
  useEffect(() => {
    const page = pageRef.current
    if (!page) return
    const handleWheel = (event: WheelEvent) => {
      const now = performance.now()
      if (now < headerGestureLockUntilRef.current) {
        event.preventDefault()
        headerGestureLockUntilRef.current = now + 180
        return
      }
      const action = calendarHeaderWheelAction(
        collapsedRef.current,
        calendarViewportRef.current?.scrollTop ?? 0,
        event.deltaY
      )
      if (action === 'pass') return
      event.preventDefault()
      const next = action === 'collapse'
      collapsedRef.current = next
      headerGestureLockUntilRef.current = now + 300
      setCollapsed(next)
    }
    page.addEventListener('wheel', handleWheel, { capture: true, passive: false })
    return () => page.removeEventListener('wheel', handleWheel, { capture: true })
  }, [])
  return (
    <section
      ref={pageRef}
      className={`page calendar-page compact-calendar-page${collapsed ? ' calendar-focus-mode' : ''}`}
    >
      <div className="calendar-collapsible-header">
        <div className="calendar-header-inner">
          <header className="page-header reveal">
            <div>
              <span className="eyebrow dark">{formatRange(range, timeZone)}</span>
              <h1>行事曆</h1>
            </div>
            <button className="primary-button compact" onClick={() => setDraft(initialDraft())}>
              <Plus /> 安排課程
            </button>
          </header>
        </div>
      </div>
      <div className="calendar-shell">
        <section className="calendar-controls" aria-label="行事曆控制項">
          <div className="calendar-pager">
            <button
              className="icon-button"
              onClick={() => setAnchor(shiftPeriod(anchor, view, -1))}
              aria-label="上一個期間"
            >
              <ChevronLeft />
            </button>
            <button
              className="secondary-button"
              onClick={() => setAnchor(localDate(new Date(), timeZone))}
            >
              今天
            </button>
            <button
              className="icon-button"
              onClick={() => setAnchor(shiftPeriod(anchor, view, 1))}
              aria-label="下一個期間"
            >
              <ChevronRight />
            </button>
          </div>
          <h2 className="calendar-period-title">{formatCalendarPeriod(anchor, range, view)}</h2>
          <div className="calendar-view-switch" role="group" aria-label="行事曆檢視">
            <ViewButton view="agenda" current={view} onSelect={setView} icon={<List />}>
              課表
            </ViewButton>
            <ViewButton view="day" current={view} onSelect={setView} icon={<Rows3 />}>
              日
            </ViewButton>
            <ViewButton view="week" current={view} onSelect={setView} icon={<Table2 />}>
              週
            </ViewButton>
            <ViewButton view="month" current={view} onSelect={setView} icon={<CalendarDays />}>
              月
            </ViewButton>
          </div>
        </section>
        <div className="calendar-legend" aria-label="行事曆圖例">
          <span>
            <MousePointer2 />
            <span className="calendar-hint-pointer">點按開啟・拖曳空白選時段／事件改時間</span>
            <span className="calendar-hint-touch">點按開啟・長按空白選時段／事件改時間</span>
          </span>
          <span>
            <GripVertical />
            拖曳期間可跨日移動
          </span>
          <span>
            <i className="scheduled" />
            未到課程
          </span>
          <span>
            <i className="overdue" />
            逾時未完成
          </span>
          <span>
            <i className="completed" />
            已完成
          </span>
          <span>
            <i className="available" />
            可排課
          </span>
          <span>
            <i className="blocked" />
            封鎖
          </span>
        </div>
        {state === 'loading' ? <CalendarSkeleton /> : null}
        {state === 'error' ? <CalendarError onRetry={() => void query.refetch()} /> : null}
        {query.data ? (
          <section className="calendar-surface" aria-label="課程與可排課時段">
            {state === 'refreshing' ? (
              <p className="calendar-refreshing" role="status">
                正在更新行事曆
              </p>
            ) : null}
            {view === 'agenda' ? (
              <Agenda
                calendar={query.data}
                viewportRef={calendarViewportRef}
                onOpen={(item) => setDraft(sessionDraft(item, timeZone))}
                onOpenDay={(date) => {
                  setAnchor(date)
                  setView('day')
                }}
              />
            ) : null}
            {view === 'day' || view === 'week' ? (
              <Timeline
                calendar={query.data}
                viewportRef={calendarViewportRef}
                defaultStudentId={students[0]?.id ?? ''}
                onDraft={(next) => {
                  setDraftError('')
                  setDraft(next)
                }}
                onMove={(next, done) => {
                  if (!next.current) return
                  let startsAt: string, endsAt: string
                  try {
                    startsAt = localDateTimeToIso({ date: next.date, time: next.start }, timeZone)
                    endsAt = localDateTimeToIso({ date: next.date, time: next.end }, timeZone)
                  } catch {
                    setDraftError('這個本地時間不存在，請另選時間。')
                    setDraft(next)
                    done()
                    return
                  }
                  const onError = (error: unknown) => {
                    if (error instanceof ApiError && error.status === 409) void query.refetch()
                    setDraftError(
                      error instanceof ApiError && error.status === 409
                        ? '此安排已在其他裝置變更。行事曆正在重新載入；請取消編輯後查看目前安排。'
                        : error instanceof Error
                          ? error.message
                          : '暫時無法移動，請確認後重試。'
                    )
                    setDraft(next)
                    done()
                  }
                  if (next.kind === 'session')
                    mutations.updateSession.mutate(
                      {
                        sessionId: next.current.id,
                        input: {
                          startsAt,
                          endsAt,
                          location: next.location,
                          version: next.current.version!
                        }
                      },
                      { onSuccess: done, onError }
                    )
                  else
                    mutations.updateBlock.mutate(
                      {
                        blockId: next.current.id,
                        input: {
                          startsAt,
                          endsAt,
                          note: next.note,
                          scope: 'single',
                          version: next.current.version
                        }
                      },
                      { onSuccess: done, onError }
                    )
                }}
              />
            ) : null}
            {view === 'month' ? (
              <Month
                calendar={query.data}
                anchor={anchor}
                viewportRef={calendarViewportRef}
                onOpenDay={(date) => {
                  setAnchor(date)
                  setView('day')
                }}
              />
            ) : null}
          </section>
        ) : null}
      </div>
      {draft && query.data ? (
        <Editor
          draft={draft}
          calendar={query.data}
          students={students}
          timeZone={timeZone}
          mutations={mutations}
          initialError={draftError}
          onChange={setDraft}
          onClose={() => {
            setDraft(null)
            setDraftError('')
          }}
          onSaved={() => {
            setDraft(null)
            setDraftError('')
          }}
        />
      ) : null}
    </section>
  )
}

function Editor({
  draft,
  calendar,
  students,
  timeZone,
  mutations,
  initialError,
  onChange,
  onClose,
  onSaved
}: {
  draft: Draft
  calendar: CalendarProjection
  students: Student[]
  timeZone: string
  mutations: ReturnType<typeof useSchedulingMutations>
  initialError: string
  onChange: (draft: Draft) => void
  onClose: () => void
  onSaved: () => void
}) {
  const [error, setError] = useState(initialError)
  const [sessionMode, setSessionMode] = useState<'view' | 'edit'>(initialError ? 'edit' : 'view')
  const [deleteTarget, setDeleteTarget] = useState<'session' | 'block' | null>(null)
  const quickEditRef = useRef<HTMLButtonElement>(null)
  const editDateRef = useRef<HTMLInputElement>(null)
  const pending = Object.values(mutations).some((mutation) => mutation.isPending)
  const mutateError = (value: unknown) =>
    setError(
      value instanceof ApiError && value.status === 409
        ? '此安排已在其他裝置變更。草稿已保留，請重新載入目前版本後再套用。'
        : value instanceof ApiError && value.details.error === 'student_not_found'
          ? '找不到選取的學生，請重新選擇。'
          : value instanceof Error
            ? value.message
            : '暫時無法儲存，草稿仍保留。'
    )
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!validTime(draft.start) || !validTime(draft.end) || draft.end <= draft.start) {
      setError('結束時間必須晚於開始時間。')
      return
    }
    if (draft.kind === 'session' && !draft.studentId) {
      setError('請選擇學生。')
      return
    }
    if (draft.kind === 'session') {
      let startsAt: string, endsAt: string
      try {
        startsAt = localDateTimeToIso({ date: draft.date, time: draft.start }, timeZone)
        endsAt = localDateTimeToIso({ date: draft.date, time: draft.end }, timeZone)
      } catch {
        setError('這個本地時間不存在，請避開日光節約時間切換區間。')
        return
      }
      const input = { startsAt, endsAt, location: draft.location }
      if (draft.current)
        mutations.updateSession.mutate(
          {
            sessionId: draft.current.id,
            previousStudentId: draft.current.studentId,
            input: {
              ...input,
              ...(draft.studentId !== draft.current.studentId
                ? { studentId: draft.studentId }
                : {}),
              version: draft.current.version!
            }
          },
          { onSuccess: onSaved, onError: mutateError }
        )
      else if (draft.repeat)
        mutations.createSeries.mutate(
          {
            studentId: draft.studentId,
            input: {
              ...input,
              intervalWeeks: draft.repeat,
              autoScheduleHorizon: 'NONE'
            }
          },
          { onSuccess: onSaved, onError: mutateError }
        )
      else
        mutations.createSession.mutate(
          { ...input, studentId: draft.studentId },
          {
            onSuccess: onSaved,
            onError: mutateError
          }
        )
    } else if (draft.kind === 'block') {
      let startsAt: string, endsAt: string
      try {
        startsAt = localDateTimeToIso({ date: draft.date, time: draft.start }, timeZone)
        endsAt = localDateTimeToIso({ date: draft.date, time: draft.end }, timeZone)
      } catch {
        setError('這個本地時間不存在。')
        return
      }
      if (draft.current)
        mutations.updateBlock.mutate(
          {
            blockId: draft.current.id,
            input: {
              startsAt,
              endsAt,
              note: draft.note,
              version: draft.current.version,
              scope: draft.scope
            }
          },
          { onSuccess: onSaved, onError: mutateError }
        )
      else
        mutations.createBlock.mutate(
          { startsAt, endsAt, note: draft.note, repeatCount: draft.repeatCount },
          {
            onSuccess: onSaved,
            onError: mutateError
          }
        )
    } else {
      const weekday = isoWeekday(draft.date)
      const current =
        draft.scope === 'date'
          ? (calendar.availabilityByDate[draft.date] ?? [])
          : (calendar.availabilityRulesByWeekday[String(weekday)]?.windows ?? [])
      const next =
        draft.action === 'add'
          ? addWindow(current, { startTime: draft.start, endTime: draft.end })
          : removeWindow(current, { startTime: draft.start, endTime: draft.end })
      if (!next) {
        setError('可排課時段不能重疊，移除範圍也必須落在既有時段內。')
        return
      }
      const target =
        draft.scope === 'date'
          ? { kind: 'override' as const, date: draft.date }
          : { kind: 'rule' as const, weekday }
      const version =
        draft.scope === 'date'
          ? (calendar.availabilityVersionsByDate[draft.date] ?? 1)
          : (calendar.availabilityRulesByWeekday[String(weekday)]?.version ?? 1)
      mutations.replaceAvailability.mutate(
        { target, input: { windows: next, version } },
        {
          onSuccess: onSaved,
          onError: mutateError
        }
      )
    }
  }
  const removeBlock = () => {
    if (draft.kind === 'block' && draft.current)
      mutations.deleteBlock.mutate(
        {
          blockId: draft.current.id,
          input: { version: draft.current.version, scope: draft.scope }
        },
        { onSuccess: onSaved, onError: mutateError }
      )
  }
  const transition = (action: 'complete' | 'reopen' | 'cancel') => {
    if (draft.kind !== 'session' || !draft.current?.version) return
    mutations.transitionSession.mutate(
      { sessionId: draft.current.id, input: { action, version: draft.current.version } },
      {
        onSuccess: onSaved,
        onError: mutateError
      }
    )
  }
  const removeSession = () => {
    if (draft.kind !== 'session' || !draft.current?.version || draft.current.status !== 'scheduled')
      return
    if (draft.current.seriesId) {
      transition('cancel')
      return
    }
    mutations.deleteSession.mutate(
      { sessionId: draft.current.id, version: draft.current.version },
      { onSuccess: onSaved, onError: mutateError }
    )
  }
  const cancelEdit = () => {
    if (draft.kind !== 'session' || !draft.current) return onClose()
    onChange(sessionDraft(draft.current, timeZone))
    setError('')
    setSessionMode('view')
    requestAnimationFrame(() => quickEditRef.current?.focus({ preventScroll: true }))
  }
  const beginEdit = () => {
    setSessionMode('edit')
    requestAnimationFrame(() => editDateRef.current?.focus({ preventScroll: true }))
  }
  if (deleteTarget)
    return (
      <Confirmation
        title={deleteTarget === 'session' ? '是否確認刪除此課堂？' : '是否確認刪除此封鎖時段？'}
        text={
          deleteTarget === 'session'
            ? '此課堂的所有內容變更將不被保存。刪除後無法復原。'
            : '刪除後無法復原。'
        }
        confirmLabel="確認刪除"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteTarget === 'session' ? removeSession : removeBlock}
        disabled={pending}
      />
    )
  if (draft.kind === 'session' && draft.current && sessionMode === 'view') {
    const current = draft.current
    const canRemove = current.status === 'scheduled'
    const dateLabel = new Intl.DateTimeFormat('zh-TW', {
      timeZone,
      month: 'numeric',
      day: 'numeric',
      weekday: 'long'
    }).format(new Date(current.startsAt!))
    return (
      <SchedulingDialog
        title={current.studentName}
        onClose={onClose}
        onDelete={canRemove && !pending ? () => setDeleteTarget('session') : undefined}
        variant="quick"
      >
        <div className="calendar-session-quickview">
          <div className="calendar-quick-time">
            <CalendarClock aria-hidden="true" />
            <div>
              <span>{dateLabel}</span>
              <strong>
                {draft.start}–{draft.end}
              </strong>
              <small>
                {draft.location || '未設定地點'}
                {current.seriesId ? '・週期課程' : ''}
              </small>
            </div>
            {current.status === 'scheduled' ? (
              <button
                ref={quickEditRef}
                type="button"
                className="calendar-quick-edit"
                disabled={pending}
                onClick={beginEdit}
              >
                編輯安排
              </button>
            ) : null}
          </div>
          {error ? (
            <p className="notice error" role="alert">
              {error}
            </p>
          ) : null}
          <div className={`calendar-quick-actions${canRemove ? ' has-remove' : ''}`}>
            <Link className="secondary-button calendar-open-session" to={`/sessions/${current.id}`}>
              開啟課堂
            </Link>
            {current.status === 'scheduled' ? (
              <button
                type="button"
                className="primary-button compact"
                disabled={pending}
                onClick={() => transition('complete')}
              >
                {mutations.transitionSession.isPending ? '處理中…' : '完成上課'}
              </button>
            ) : current.status === 'completed' ? (
              <button
                type="button"
                className="secondary-button"
                disabled={pending}
                onClick={() => transition('reopen')}
              >
                改回待上課
              </button>
            ) : null}
            {canRemove ? (
              <button
                type="button"
                className="calendar-delete-button"
                disabled={pending}
                onClick={() => setDeleteTarget('session')}
              >
                刪除
              </button>
            ) : null}
          </div>
          {current.status === 'scheduled' && current.startsAt ? (
            <div className="calendar-quick-secondary">
              <Link className="text-button" to={`/sessions/${current.id}?link=reschedule`}>
                建立改期連結
              </Link>
            </div>
          ) : null}
          <span className="scheduling-shortcut-hint">
            {canRemove ? 'DELETE 刪除 · ' : ''}ESC 取消
          </span>
        </div>
      </SchedulingDialog>
    )
  }
  return (
    <SchedulingDialog
      title={
        draft.kind !== 'availability' && draft.current
          ? draft.kind === 'session'
            ? '編輯課程'
            : '封鎖選項'
          : '安排這個時段'
      }
      onClose={draft.kind === 'session' && draft.current ? cancelEdit : onClose}
      onDelete={
        draft.kind === 'block' && draft.current && !pending
          ? () => setDeleteTarget('block')
          : undefined
      }
      variant={
        draft.kind === 'block' && draft.current
          ? 'block'
          : draft.kind === 'session' && draft.current
            ? 'session-edit'
            : undefined
      }
    >
      <form className="scheduling-form" onSubmit={submit}>
        <div className="scheduling-form-body">
          {!('current' in draft && draft.current) ? (
            <div className="composer-kind" role="group" aria-label="安排類型">
              <button
                type="button"
                aria-pressed={draft.kind === 'session'}
                onClick={() =>
                  onChange({
                    kind: 'session',
                    date: draft.date,
                    start: draft.start,
                    end: draft.end,
                    studentId: students[0]?.id ?? '',
                    location: ''
                  })
                }
              >
                <CalendarClock aria-hidden="true" /> 課程
              </button>
              <button
                type="button"
                aria-pressed={draft.kind === 'availability'}
                onClick={() =>
                  onChange({
                    kind: 'availability',
                    date: draft.date,
                    start: draft.start,
                    end: draft.end,
                    scope: 'date',
                    action: 'add'
                  })
                }
              >
                <ShieldCheck aria-hidden="true" /> 可排課
              </button>
              <button
                type="button"
                aria-pressed={draft.kind === 'block'}
                onClick={() =>
                  onChange({
                    kind: 'block',
                    date: draft.date,
                    start: draft.start,
                    end: draft.end,
                    note: '',
                    repeatCount: 1,
                    scope: 'single'
                  })
                }
              >
                <Ban aria-hidden="true" /> 封鎖
              </button>
            </div>
          ) : null}
          <div className="scheduling-time-fields">
            <label>
              日期
              <input
                ref={editDateRef}
                type="date"
                value={draft.date}
                onChange={(event) => onChange({ ...draft, date: event.target.value })}
                required
              />
            </label>
            <SchedulingTimeInput
              label="開始"
              value={draft.start}
              onChange={(start) => {
                const duration = timeMinutes(draft.end) - timeMinutes(draft.start)
                const end =
                  validTime(start) &&
                  validTime(draft.start) &&
                  validTime(draft.end) &&
                  duration > 0 &&
                  timeMinutes(start) + duration < 1440
                    ? minutesToTime(timeMinutes(start) + duration)
                    : draft.end
                onChange({ ...draft, start, end })
              }}
            />
            <span className="scheduling-time-arrow" aria-hidden="true">
              →
            </span>
            <SchedulingTimeInput
              label="結束"
              value={draft.end}
              start={draft.start}
              onChange={(end) => onChange({ ...draft, end })}
            />
          </div>
          {draft.kind === 'session' ? (
            <>
              <label>
                學生
                <FormSelect
                  label="學生"
                  value={draft.studentId}
                  onChange={(value) => onChange({ ...draft, studentId: value })}
                  required
                  options={[
                    { value: '', label: '選擇學生' },
                    ...students.map((student) => ({
                      value: student.id,
                      label: student.lessonSummary
                        ? `${student.name}・剩餘 ${student.lessonSummary.remaining} 堂`
                        : student.name
                    }))
                  ]}
                />
              </label>
              <div className="field-row">
                {!draft.current ? (
                  <label>
                    重複
                    <FormSelect
                      label="重複"
                      name="repeat"
                      value={String(draft.repeat ?? 0)}
                      onChange={(value) =>
                        onChange({ ...draft, repeat: Number(value) as 0 | 1 | 2 })
                      }
                      options={[
                        { value: '0', label: '僅這一次' },
                        { value: '1', label: '每週' },
                        { value: '2', label: '每兩週' }
                      ]}
                    />
                  </label>
                ) : null}
                <label>
                  地點
                  <input
                    value={draft.location}
                    onChange={(event) => onChange({ ...draft, location: event.target.value })}
                    maxLength={160}
                    required
                  />
                </label>
              </div>
            </>
          ) : null}
          {draft.kind === 'block' ? (
            <>
              <label>
                備註（選填）
                <input
                  value={draft.note}
                  onChange={(event) => onChange({ ...draft, note: event.target.value })}
                  placeholder="不填也可以"
                  maxLength={1000}
                />
              </label>
              {!draft.current ? (
                <label>
                  重複
                  <FormSelect
                    label="重複"
                    value={String(draft.repeatCount)}
                    onChange={(value) => onChange({ ...draft, repeatCount: Number(value) })}
                    options={[1, 4, 8, 12].map((count) => ({
                      value: String(count),
                      label: count === 1 ? '僅這一次' : `每週，共 ${count} 次`
                    }))}
                  />
                </label>
              ) : draft.current.recurrenceId ? (
                <label>
                  套用範圍
                  <FormSelect
                    label="套用範圍"
                    value={draft.scope}
                    onChange={(value) =>
                      onChange({ ...draft, scope: value as 'single' | 'future' | 'all' })
                    }
                    options={[
                      { value: 'single', label: '只有這一次' },
                      { value: 'future', label: '這次及之後' },
                      { value: 'all', label: '全部重複時段' }
                    ]}
                  />
                </label>
              ) : null}
            </>
          ) : null}
          {draft.kind === 'availability' ? (
            <>
              <div className="scheduling-segmented" role="group" aria-label="可排課操作">
                <button
                  type="button"
                  aria-pressed={draft.action === 'add'}
                  onClick={() => onChange({ ...draft, action: 'add' })}
                >
                  加入可排課
                </button>
                <button
                  type="button"
                  aria-pressed={draft.action === 'remove'}
                  onClick={() => onChange({ ...draft, action: 'remove' })}
                >
                  從可排課移除
                </button>
              </div>
              <div className="scheduling-segmented" role="group" aria-label="套用範圍">
                <button
                  type="button"
                  aria-pressed={draft.scope === 'date'}
                  onClick={() => onChange({ ...draft, scope: 'date' })}
                >
                  只改這一天
                </button>
                <button
                  type="button"
                  aria-pressed={draft.scope === 'weekday'}
                  onClick={() => onChange({ ...draft, scope: 'weekday' })}
                >
                  每週這一天
                </button>
              </div>
              <p className="scheduling-availability-note">
                <ShieldCheck aria-hidden="true" />
                可新增多段，也能從中間移除一段；單日修改不會影響其他週。
              </p>
            </>
          ) : null}
          {error ? (
            <p className="notice error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className="scheduling-form-footer">
          <span className="scheduling-shortcut-hint">
            ENTER 確認 · {draft.kind === 'block' && draft.current ? 'DELETE 刪除 · ' : ''}ESC 取消
          </span>
          <div className="scheduling-form-actions">
            {draft.kind === 'block' && draft.current ? (
              <button
                type="button"
                className="calendar-delete-button"
                onClick={() => setDeleteTarget('block')}
                disabled={pending}
              >
                刪除封鎖
              </button>
            ) : null}
            <button
              type="button"
              className="secondary-button"
              onClick={draft.kind === 'session' && draft.current ? cancelEdit : onClose}
            >
              取消
            </button>
            <button className="primary-button compact" disabled={pending}>
              {pending
                ? '儲存中…'
                : draft.kind === 'block' && draft.current
                  ? '儲存修改'
                  : '儲存安排'}
            </button>
          </div>
        </div>
      </form>
    </SchedulingDialog>
  )
}

function Timeline({
  calendar,
  onDraft,
  onMove,
  defaultStudentId,
  viewportRef
}: {
  calendar: CalendarProjection
  onDraft: (draft: Draft) => void
  onMove: (draft: Extract<Draft, { kind: 'session' | 'block' }>, done: () => void) => void
  defaultStudentId: string
  viewportRef: Ref<HTMLDivElement>
}) {
  const days = dateRange(calendar.range.start, calendar.range.end)
  type ItemDraft = Extract<Draft, { kind: 'session' | 'block' }>
  type Preview = { date: string; start: string; end: string; kind: 'create' | 'move' }
  type Gesture = {
    pointerId: number
    pointerType: string
    originX: number
    originY: number
    date: string
    minute: number
    item?: ItemDraft
    movable: boolean
    grabOffset: number
    dragging: boolean
    touchReady: boolean
    panning: boolean
    scrollLeft: number
    scrollTop: number
  }
  const timelineRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const gestureRef = useRef<Gesture | null>(null)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [moving, setMoving] = useState(false)
  const clearGesture = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current)
    holdTimer.current = null
    gestureRef.current = null
  }
  useEffect(() => {
    const cancelWithEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !gestureRef.current) return
      clearGesture()
      setPreview(null)
    }
    window.addEventListener('keydown', cancelWithEscape)
    return () => {
      window.removeEventListener('keydown', cancelWithEscape)
      clearGesture()
    }
  }, [])
  const point = (x: number, y: number) => {
    const grids = [
      ...(timelineRef.current?.querySelectorAll<HTMLElement>('.calendar-time-grid') ?? [])
    ]
    const index = Math.max(
      0,
      grids.findIndex((grid, index) => {
        const rect = grid.getBoundingClientRect()
        return x < rect.right || index === grids.length - 1
      })
    )
    const grid = grids[index]
    return {
      date: days[index] ?? days[0]!,
      minute: Math.max(
        360,
        Math.min(1320, timeMinutes(yToTime(y - (grid?.getBoundingClientRect().top ?? 0))))
      )
    }
  }
  const rangeForPointer = (gesture: Gesture, x: number, y: number): Preview => {
    const target = point(x, y)
    if (!gesture.item) {
      const startMinute = Math.min(gesture.minute, target.minute)
      const endMinute = Math.min(1320, Math.max(gesture.minute, target.minute) + 15)
      return {
        date: gesture.date,
        start: minutesToTime(startMinute),
        end: minutesToTime(endMinute),
        kind: 'create'
      }
    }
    const duration = timeMinutes(gesture.item.end) - timeMinutes(gesture.item.start)
    const startMinute = Math.max(360, Math.min(1320 - duration, target.minute - gesture.grabOffset))
    return {
      date: target.date,
      start: minutesToTime(startMinute),
      end: minutesToTime(startMinute + duration),
      kind: 'move'
    }
  }
  const begin = (
    event: React.PointerEvent<HTMLElement>,
    date: string,
    item?: ItemDraft,
    movable = true
  ) => {
    if (event.button !== 0 || moving) return
    event.stopPropagation()
    const hit = point(event.clientX, event.clientY)
    const gesture: Gesture = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      originX: event.clientX,
      originY: event.clientY,
      date,
      minute: hit.minute,
      item,
      movable,
      grabOffset: item ? Math.max(0, hit.minute - timeMinutes(item.start)) : 0,
      dragging: false,
      touchReady: event.pointerType !== 'touch',
      panning: false,
      scrollLeft: scrollRef.current?.scrollLeft ?? 0,
      scrollTop: scrollRef.current?.scrollTop ?? 0
    }
    gestureRef.current = gesture
    event.currentTarget.setPointerCapture(event.pointerId)
    if (event.pointerType === 'touch' && movable)
      holdTimer.current = setTimeout(() => {
        if (gestureRef.current === gesture && !gesture.panning) {
          gesture.touchReady = true
          gesture.dragging = true
          setPreview(rangeForPointer(gesture, gesture.originX, gesture.originY))
        }
      }, 300)
  }
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    const dx = event.clientX - gesture.originX
    const dy = event.clientY - gesture.originY
    const distance = Math.hypot(dx, dy)
    if (gesture.pointerType === 'touch' && !gesture.touchReady) {
      if (distance >= 6) {
        gesture.panning = true
        if (holdTimer.current) clearTimeout(holdTimer.current)
      }
      if (gesture.panning && scrollRef.current) {
        scrollRef.current.scrollLeft = gesture.scrollLeft - dx
        scrollRef.current.scrollTop = gesture.scrollTop - dy
      }
      return
    }
    if (!gesture.movable) return
    if (gesture.panning || (distance < 6 && !gesture.dragging)) return
    event.preventDefault()
    gesture.dragging = true
    const scroll = scrollRef.current
    if (scroll && days.length > 1) {
      const rect = scroll.getBoundingClientRect()
      if (event.clientX > rect.right - 24) scroll.scrollLeft += 18
      if (event.clientX < rect.left + 24) scroll.scrollLeft -= 18
    }
    if (scroll) {
      const rect = scroll.getBoundingClientRect()
      if (event.clientY > rect.bottom - 24) scroll.scrollTop += 18
      if (event.clientY < rect.top + 24) scroll.scrollTop -= 18
    }
    setPreview(rangeForPointer(gesture, event.clientX, event.clientY))
  }
  const finish = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    clearGesture()
    if (gesture.panning) return
    if (!gesture.dragging) {
      if (gesture.item) onDraft(gesture.item)
      else {
        const start = Math.min(1260, gesture.minute)
        onDraft({
          kind: 'session',
          date: gesture.date,
          start: minutesToTime(start),
          end: minutesToTime(start + 60),
          studentId: defaultStudentId,
          location: ''
        })
      }
      return
    }
    const range = rangeForPointer(gesture, event.clientX, event.clientY)
    if (!gesture.item) {
      setPreview(null)
      onDraft({ ...range, kind: 'session', studentId: defaultStudentId, location: '' })
      return
    }
    const next = { ...gesture.item, date: range.date, start: range.start, end: range.end }
    if (
      next.date === gesture.item.date &&
      next.start === gesture.item.start &&
      next.end === gesture.item.end
    ) {
      setPreview(null)
      return
    }
    setMoving(true)
    onMove(next, () => {
      setMoving(false)
      setPreview(null)
    })
  }
  return (
    <div
      ref={(node) => {
        scrollRef.current = node
        if (typeof viewportRef === 'function') viewportRef(node)
        else if (viewportRef) viewportRef.current = node
      }}
      className="calendar-timeline-scroll"
    >
      <div
        ref={timelineRef}
        className={`calendar-timeline${days.length === 1 ? ' single-day' : ''}`}
        style={{ '--calendar-days': days.length } as CSSProperties}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={() => {
          clearGesture()
          setPreview(null)
        }}
      >
        <div className="calendar-time-corner">
          {calendar.timeZone === 'Asia/Taipei' ? 'GMT+8' : calendar.timeZone}
        </div>
        {days.map((date) => (
          <div
            key={`${date}-head`}
            className={`calendar-day-header${date === localDate(new Date(), calendar.timeZone) ? ' today' : ''}`}
          >
            <span>
              {new Intl.DateTimeFormat('zh-TW', { weekday: 'short', timeZone: 'UTC' }).format(
                new Date(`${date}T12:00:00Z`)
              )}
            </span>
            <strong>{Number(date.slice(-2))}</strong>
            <small>
              {
                calendar.sessions.filter(
                  ({ session }) =>
                    session.status !== 'cancelled' &&
                    localDay(session.startsAt, calendar.timeZone) === date
                ).length
              }{' '}
              堂
            </small>
          </div>
        ))}
        <div className="calendar-time-axis" aria-hidden="true">
          {Array.from({ length: 17 }, (_, index) => (
            <span key={index} style={{ top: `${(index / 16) * 100}%` }}>
              {String(index + 6).padStart(2, '0')}:00
            </span>
          ))}
        </div>
        {days.map((date) => (
          <div
            key={date}
            className={`calendar-time-grid${date === localDate(new Date(), calendar.timeZone) ? ' today' : ''}`}
            tabIndex={0}
            aria-label={`${date} 時間格，按 Enter 建立安排`}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget || event.key !== 'Enter') return
              onDraft({
                kind: 'session',
                date,
                start: '09:00',
                end: '10:00',
                studentId: defaultStudentId,
                location: ''
              })
            }}
            onPointerDown={(event) => begin(event, date)}
            onContextMenu={(event) => event.preventDefault()}
          >
            <div className="availability-layer">
              {(calendar.availabilityByDate[date] ?? []).map((window) => (
                <span
                  key={`${window.startTime}-${window.endTime}`}
                  style={timeStyle(window.startTime, window.endTime)}
                  title={`可排課 ${window.startTime}–${window.endTime}`}
                />
              ))}
            </div>
            {calendar.blocks
              .filter((block) => localDay(block.startsAt, calendar.timeZone) === date)
              .map((block) => {
                const local = blockDraft(block, calendar.timeZone)
                return (
                  <button
                    className="calendar-block positioned"
                    style={timeStyle(local.start, local.end)}
                    key={block.id}
                    onPointerDown={(event) => begin(event, date, local)}
                    onClick={(event) => {
                      if (event.detail === 0) onDraft(local)
                    }}
                    onContextMenu={(event) => event.preventDefault()}
                  >
                    <GripVertical aria-hidden="true" />
                    <strong>封鎖</strong>
                    <span>{block.note || '私人時段'}</span>
                  </button>
                )
              })}
            {calendar.sessions
              .filter(
                ({ session }) =>
                  session.status !== 'cancelled' &&
                  localDay(session.startsAt, calendar.timeZone) === date
              )
              .map((entry) => {
                const local = sessionDraft(entry.session, calendar.timeZone)
                return (
                  <button
                    className={`calendar-session positioned ${calendarSessionVisualState(entry.session)}${entry.conflicts.length ? ' has-conflict' : ''}`}
                    style={timeStyle(local.start, local.end)}
                    key={entry.session.id}
                    onPointerDown={(event) => {
                      event.stopPropagation()
                      begin(event, date, local, entry.session.status === 'scheduled')
                    }}
                    onClick={(event) => {
                      if (event.detail === 0) onDraft(local)
                    }}
                    onContextMenu={(event) => event.preventDefault()}
                  >
                    {entry.session.status === 'scheduled' ? (
                      <GripVertical aria-hidden="true" />
                    ) : null}
                    <time>{local.start}</time>
                    <strong>{entry.session.studentName}</strong>
                    <span>{entry.session.location || '未設定地點'}</span>
                  </button>
                )
              })}
            {preview?.date === date ? (
              <div
                className={`calendar-drag-preview${preview.kind === 'move' ? ' moving' : ''}`}
                style={timeStyle(preview.start, preview.end)}
                aria-hidden="true"
              >
                <strong>
                  {preview.start}—{preview.end}
                </strong>
                <span>
                  {moving ? '儲存中…' : preview.kind === 'move' ? '放開以移動' : '放開以安排'}
                </span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function Agenda({
  calendar,
  onOpen,
  onOpenDay,
  viewportRef
}: {
  calendar: CalendarProjection
  onOpen: (session: CalendarSession) => void
  onOpenDay: (date: string) => void
  viewportRef: Ref<HTMLDivElement>
}) {
  const days = dateRange(calendar.range.start, calendar.range.end)
  return (
    <div ref={viewportRef} className="calendar-agenda-board">
      {days.map((date) => {
        const entries = calendar.sessions.filter(
          ({ session }) =>
            session.status !== 'cancelled' && localDay(session.startsAt, calendar.timeZone) === date
        )
        return (
          <section
            key={date}
            className={`calendar-agenda-day${date === localDate(new Date(), calendar.timeZone) ? ' today' : ''}`}
          >
            <button
              className="calendar-agenda-date"
              onClick={() => onOpenDay(date)}
              aria-label={`查看 ${formatDate(date, calendar.timeZone)} 的日檢視`}
            >
              <span>
                {new Intl.DateTimeFormat('zh-TW', { weekday: 'short', timeZone: 'UTC' }).format(
                  new Date(`${date}T12:00:00Z`)
                )}
              </span>
              <strong>{Number(date.slice(-2))}</strong>
            </button>
            {entries.length ? (
              <div className="calendar-agenda-lessons">
                {entries.map(({ session, conflicts }) => (
                  <button
                    key={session.id}
                    className={`calendar-agenda-lesson ${calendarSessionVisualState(session)}${conflicts.length ? ' has-conflict' : ''}`}
                    onClick={() => onOpen(session)}
                  >
                    <time>{formatTime(session.startsAt, calendar.timeZone)}</time>
                    <strong>{session.studentName}</strong>
                    <small>
                      {session.startsAt && session.endsAt
                        ? `${Math.round((Date.parse(session.endsAt) - Date.parse(session.startsAt)) / 60000)} 分`
                        : statusLabel(session)}
                    </small>
                  </button>
                ))}
              </div>
            ) : (
              <p className="calendar-agenda-none">無課程</p>
            )}
          </section>
        )
      })}
    </div>
  )
}
function Month({
  calendar,
  anchor,
  onOpenDay,
  viewportRef
}: {
  calendar: CalendarProjection
  anchor: string
  onOpenDay: (date: string) => void
  viewportRef: Ref<HTMLDivElement>
}) {
  const days = dateRange(calendar.range.start, calendar.range.end)
  return (
    <div ref={viewportRef} className="calendar-month">
      <div className="calendar-weekdays">
        {['一', '二', '三', '四', '五', '六', '日'].map((label) => (
          <span key={label}>週{label}</span>
        ))}
      </div>
      <div className="calendar-month-grid">
        {days.map((date) => {
          const entries = calendar.sessions.filter(
            ({ session }) =>
              localDay(session.startsAt, calendar.timeZone) === date &&
              session.status !== 'cancelled'
          )
          return (
            <button
              key={date}
              className={date.slice(0, 7) === anchor.slice(0, 7) ? '' : 'outside'}
              onClick={() => onOpenDay(date)}
            >
              <time>{Number(date.slice(-2))}</time>
              {entries.slice(0, 2).map(({ session }) => (
                <span
                  key={session.id}
                  className={`calendar-month-session ${calendarSessionVisualState(session)}`}
                >
                  {formatTime(session.startsAt, calendar.timeZone)} {session.studentName}
                </span>
              ))}
              {entries.length > 2 ? (
                <small className="calendar-month-more">還有 {entries.length - 2} 堂</small>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
function ViewButton({
  view,
  current,
  onSelect,
  icon,
  children
}: {
  view: CalendarView
  current: CalendarView
  onSelect: (view: CalendarView) => void
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <button type="button" aria-pressed={view === current} onClick={() => onSelect(view)}>
      {icon}
      <span>{children}</span>
    </button>
  )
}
function CalendarSkeleton() {
  return (
    <section className="calendar-skeleton" aria-label="正在載入行事曆">
      <span />
      <span />
      <span />
      <span />
    </section>
  )
}
function CalendarError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="notice error" role="alert">
      <span>暫時無法讀取行事曆，現有安排沒有被變更。</span>
      <button onClick={onRetry}>重新載入</button>
    </section>
  )
}

export function addWindow(
  current: Array<{ startTime: string; endTime: string }>,
  added: { startTime: string; endTime: string }
) {
  if (added.endTime <= added.startTime) return null
  const all = [...current, added].sort((a, b) => a.startTime.localeCompare(b.startTime))
  if (all.some((item, index) => index > 0 && all[index - 1]!.endTime > item.startTime)) return null
  return all
}
export function removeWindow(
  current: Array<{ startTime: string; endTime: string }>,
  removed: { startTime: string; endTime: string }
) {
  if (removed.endTime <= removed.startTime) return null
  const owner = current.find(
    (item) => item.startTime <= removed.startTime && item.endTime >= removed.endTime
  )
  if (!owner) return null
  return current.flatMap((item) =>
    item !== owner
      ? [item]
      : [
          { startTime: item.startTime, endTime: removed.startTime },
          { startTime: removed.endTime, endTime: item.endTime }
        ].filter((part) => part.endTime > part.startTime)
  )
}
function sessionDraft(
  item: CalendarSession,
  timeZone: string
): Extract<Draft, { kind: 'session' }> {
  const start = isoToLocalDateTime(item.startsAt!, timeZone),
    end = isoToLocalDateTime(item.endsAt!, timeZone)
  return {
    kind: 'session',
    date: start.date,
    start: start.time,
    end: end.time,
    studentId: item.studentId,
    location: item.location ?? '',
    current: item
  }
}
function blockDraft(item: CalendarBlock, timeZone: string): Extract<Draft, { kind: 'block' }> {
  const start = isoToLocalDateTime(item.startsAt, timeZone),
    end = isoToLocalDateTime(item.endsAt, timeZone)
  return {
    kind: 'block',
    date: start.date,
    start: start.time,
    end: end.time,
    note: item.note,
    repeatCount: 1,
    scope: 'single',
    current: item
  }
}
function timeStyle(start: string, end: string): CSSProperties {
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3))
  return {
    top: `${((minutes(start) - 360) / 960) * 100}%`,
    height: `${Math.max(2, ((minutes(end) - minutes(start)) / 960) * 100)}%`
  }
}
function yToTime(y: number) {
  const minutes = Math.max(0, Math.min(945, Math.round(((y / 720) * 960) / 15) * 15)) + 360
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}
function timeMinutes(value: string) {
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3))
}
function validTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}
function minutesToTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}
export function rangeFor(anchor: string, view: CalendarView) {
  if (view === 'day') return { start: anchor, end: addDays(anchor, 1) }
  if (view === 'month') {
    const start = monthGridStart(anchor)
    const [year, month] = anchor.split('-').map(Number)
    const nextMonth = new Date(Date.UTC(year!, month!, 1)).toISOString().slice(0, 10)
    const lastWeekStart = monday(nextMonth)
    return { start, end: nextMonth === lastWeekStart ? lastWeekStart : addDays(lastWeekStart, 7) }
  }
  const start = monday(anchor)
  return { start, end: addDays(start, 7) }
}
export function shiftPeriod(anchor: string, view: CalendarView, direction: -1 | 1) {
  if (view !== 'month') return addDays(anchor, direction * (view === 'day' ? 1 : 7))
  const [year, month] = anchor.split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 1 + direction, 1)).toISOString().slice(0, 10)
}
function dateRange(start: string, end: string) {
  const result: string[] = []
  for (let cursor = start; cursor < end; cursor = addDays(cursor, 1)) result.push(cursor)
  return result
}
function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}
function monday(date: string) {
  const value = new Date(`${date}T12:00:00Z`)
  return addDays(date, -((value.getUTCDay() + 6) % 7))
}
function monthGridStart(date: string) {
  return monday(`${date.slice(0, 7)}-01`)
}
function localDate(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(value)
}
function localDay(value: string | null, timeZone: string) {
  return value ? localDate(new Date(value), timeZone) : ''
}
function isoWeekday(date: string) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay()
  return day === 0 ? 7 : day
}
function formatDate(date: string, timeZone: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone,
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(new Date(`${date}T12:00:00Z`))
}
function formatShortDate(date: string, timeZone: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone,
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
  }).format(new Date(`${date}T12:00:00Z`))
}
function formatTime(value: string | null, timeZone: string) {
  return value
    ? new Intl.DateTimeFormat('zh-TW', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date(value))
    : '—'
}
function formatRange(range: { start: string; end: string }, timeZone: string) {
  return `${formatShortDate(range.start, timeZone)} — ${formatShortDate(addDays(range.end, -1), timeZone)}`
}
function formatCalendarPeriod(
  anchor: string,
  range: { start: string; end: string },
  view: CalendarView
) {
  const [year, month, day] = anchor.split('-').map(Number)
  if (view === 'month') return `${year} 年 ${month} 月`
  if (view === 'day') {
    const weekday = new Intl.DateTimeFormat('zh-TW', { weekday: 'long', timeZone: 'UTC' }).format(
      new Date(`${anchor}T12:00:00Z`)
    )
    return `${year} 年 ${month} 月 ${day} 日 ${weekday}`
  }
  const start = range.start.split('-').map(Number)
  const end = addDays(range.end, -1).split('-').map(Number)
  return `${start[0]} 年 ${start[1]} 月・${start[1]}/${start[2]}—${end[1]}/${end[2]}`
}
function statusLabel(item: CalendarSession) {
  if (item.status === 'cancelled') return '已取消'
  const state = calendarSessionVisualState(item)
  return state === 'completed' ? '已完成' : state === 'overdue' ? '逾時未完成' : '未到課程'
}
