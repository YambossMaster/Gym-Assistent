import type { Session } from '@supabase/supabase-js'
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus, Rows3, Table2 } from 'lucide-react'
import { useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ApiError,
  type CalendarBlock,
  type CalendarProjection,
  type CalendarSession
} from '../../api'
import { Page } from '../../shared/primitives'
import { FormSelect } from '../../shared/FormSelect'
import { useStudentsRouteQuery } from '../students/queries'
import { addLocalMinutes, isoToLocalDateTime, localDateTimeToIso } from './calendar-time'
import { useCalendarRouteQuery, useSchedulingMutations } from './queries'
import { SchedulingDialog } from './SchedulingDialog'
import { selectCalendarRouteState } from './state'

type CalendarView = 'agenda' | 'day' | 'week' | 'month'
type Draft =
  | {
      kind: 'session'
      date: string
      start: string
      end: string
      studentId: string
      location: string
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
  const [notice, setNotice] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const wheelArmed = useRef(false)
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
  const onTimelineWheel = (event: React.WheelEvent<HTMLElement>) => {
    if (event.deltaY > 0 && !collapsed && !wheelArmed.current) {
      wheelArmed.current = true
      setCollapsed(true)
    } else if (
      event.deltaY < 0 &&
      collapsed &&
      event.currentTarget.scrollTop === 0 &&
      !wheelArmed.current
    ) {
      wheelArmed.current = true
      setCollapsed(false)
    }
    window.setTimeout(() => {
      wheelArmed.current = false
    }, 180)
  }
  return (
    <Page
      className={`calendar-page${collapsed ? ' calendar-header-collapsed' : ''}`}
      title="行事曆"
      eyebrow={formatRange(range, timeZone)}
      actions={
        <button className="primary-button compact" onClick={() => setDraft(initialDraft())}>
          <Plus /> 安排課程
        </button>
      }
    >
      <section className="calendar-controls" aria-label="行事曆控制項">
        <div className="calendar-pager">
          <button
            className="icon-button"
            onClick={() => setAnchor(addDays(anchor, -unitDays(view)))}
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
            onClick={() => setAnchor(addDays(anchor, unitDays(view)))}
            aria-label="下一個期間"
          >
            <ChevronRight />
          </button>
        </div>
        <div className="calendar-view-switch" role="group" aria-label="行事曆檢視">
          <ViewButton view="agenda" current={view} onSelect={setView} icon={<List />}>
            課表
          </ViewButton>
          <ViewButton view="day" current={view} onSelect={setView} icon={<Rows3 />}>
            日
          </ViewButton>
          <ViewButton view="week" current={view} onSelect={setView} icon={<Table2 />}>
            週<span className="mobile-only">（橫向捲動）</span>
          </ViewButton>
          <ViewButton view="month" current={view} onSelect={setView} icon={<CalendarDays />}>
            月
          </ViewButton>
        </div>
      </section>
      {notice ? (
        <p className="form-notice" role="status">
          {notice}
        </p>
      ) : null}
      {state === 'loading' ? <CalendarSkeleton /> : null}
      {state === 'error' ? <CalendarError onRetry={() => void query.refetch()} /> : null}
      {query.data ? (
        <section className="calendar-surface" aria-label="課程與可排課時段">
          {state === 'refreshing' ? (
            <p className="calendar-refreshing" role="status">
              正在更新行事曆
            </p>
          ) : null}
          {state === 'empty' ? <CalendarEmpty onCreate={() => setDraft(initialDraft())} /> : null}
          {view === 'agenda' ? (
            <Agenda
              calendar={query.data}
              onOpen={(item) => setDraft(sessionDraft(item, timeZone))}
            />
          ) : null}
          {view === 'day' || view === 'week' ? (
            <Timeline calendar={query.data} onWheel={onTimelineWheel} onDraft={setDraft} />
          ) : null}
          {view === 'month' ? (
            <Month
              calendar={query.data}
              anchor={anchor}
              onOpenDay={(date) => {
                setAnchor(date)
                setView('day')
              }}
            />
          ) : null}
        </section>
      ) : null}
      {draft && query.data ? (
        <Editor
          draft={draft}
          calendar={query.data}
          students={students}
          timeZone={timeZone}
          mutations={mutations}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onNotice={(message) => {
            setNotice(message)
            setDraft(null)
          }}
        />
      ) : null}
    </Page>
  )
}

function Editor({
  draft,
  calendar,
  students,
  timeZone,
  mutations,
  onChange,
  onClose,
  onNotice
}: {
  draft: Draft
  calendar: CalendarProjection
  students: Array<{ id: string; name: string }>
  timeZone: string
  mutations: ReturnType<typeof useSchedulingMutations>
  onChange: (draft: Draft) => void
  onClose: () => void
  onNotice: (message: string) => void
}) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const pending = Object.values(mutations).some((mutation) => mutation.isPending)
  const warning = draft.kind === 'session' ? conflictWarning(draft, calendar, timeZone) : ''
  const mutateError = (value: unknown) =>
    setError(
      value instanceof ApiError && value.status === 409
        ? '此安排已在其他裝置變更。草稿已保留，請重新載入目前版本後再套用。'
        : value instanceof Error
          ? value.message
          : '暫時無法儲存，草稿仍保留。'
    )
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (warning && !acknowledged) return
    if (draft.end <= draft.start) {
      setError('結束時間必須晚於開始時間。')
      return
    }
    if (draft.kind === 'session' && !draft.current && !draft.studentId) {
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
          { sessionId: draft.current.id, input: { ...input, version: draft.current.version! } },
          { onSuccess: () => onNotice('課程已更新。'), onError: mutateError }
        )
      else
        mutations.createSession.mutate(
          { ...input, studentId: draft.studentId },
          {
            onSuccess: (accepted) =>
              onNotice(
                accepted.conflicts.length
                  ? `課程已建立，保留 ${accepted.conflicts.length} 個安排提醒。`
                  : '課程已建立。'
              ),
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
          { onSuccess: () => onNotice('封鎖時段已更新。'), onError: mutateError }
        )
      else
        mutations.createBlock.mutate(
          { startsAt, endsAt, note: draft.note, repeatCount: draft.repeatCount },
          {
            onSuccess: (blocks) => onNotice(`已建立 ${blocks.length} 個封鎖時段。`),
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
          onSuccess: () =>
            onNotice(draft.scope === 'date' ? '當日可排課時段已更新。' : '每週可排課時段已更新。'),
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
        { onSuccess: () => onNotice('封鎖時段已刪除。'), onError: mutateError }
      )
  }
  const transition = (action: 'complete' | 'reopen' | 'cancel') => {
    if (draft.kind !== 'session' || !draft.current?.version) return
    mutations.transitionSession.mutate(
      { sessionId: draft.current.id, input: { action, version: draft.current.version } },
      {
        onSuccess: () =>
          onNotice(
            action === 'complete'
              ? '課程已完成。'
              : action === 'cancel'
                ? '課程已取消。'
                : '課程已改回待上課。'
          ),
        onError: mutateError
      }
    )
  }
  const removeSession = () => {
    if (draft.kind !== 'session' || !draft.current?.version || deleteConfirmation !== 'DELETE')
      return
    mutations.deleteSession.mutate(
      { sessionId: draft.current.id, version: draft.current.version },
      { onSuccess: () => onNotice('課程已刪除。'), onError: mutateError }
    )
  }
  return (
    <SchedulingDialog
      title={
        draft.kind === 'session'
          ? draft.current
            ? '查看與編輯課程'
            : '安排課程'
          : draft.kind === 'block'
            ? draft.current
              ? '編輯封鎖時段'
              : '建立封鎖時段'
            : '編輯可排課時段'
      }
      onClose={onClose}
    >
      <form className="scheduling-form" onSubmit={submit}>
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
              課程
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
              可排課
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
              封鎖
            </button>
          </div>
        ) : null}
        <div className="field-row">
          <label>
            日期
            <input
              type="date"
              value={draft.date}
              onChange={(event) => onChange({ ...draft, date: event.target.value })}
              required
            />
          </label>
          <label>
            開始
            <input
              type="time"
              step="900"
              value={draft.start}
              onChange={(event) => onChange({ ...draft, start: event.target.value })}
              required
            />
          </label>
          <label>
            結束
            <input
              type="time"
              step="900"
              value={draft.end}
              onChange={(event) => onChange({ ...draft, end: event.target.value })}
              required
            />
          </label>
        </div>
        {draft.kind === 'session' ? (
          <>
            <label>
              學生
              <FormSelect
                label="學生"
                value={draft.studentId}
                disabled={Boolean(draft.current)}
                onChange={(value) => onChange({ ...draft, studentId: value })}
                required
                options={[
                  { value: '', label: '選擇學生' },
                  ...students.map((student) => ({ value: student.id, label: student.name }))
                ]}
              />
            </label>
            <label>
              地點
              <input
                value={draft.location}
                onChange={(event) => onChange({ ...draft, location: event.target.value })}
                maxLength={160}
                required
              />
            </label>
          </>
        ) : null}
        {draft.kind === 'block' ? (
          <>
            <label>
              備註
              <textarea
                value={draft.note}
                onChange={(event) => onChange({ ...draft, note: event.target.value })}
                maxLength={1000}
              />
            </label>
            {!draft.current ? (
              <label>
                每週重複次數
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={draft.repeatCount}
                  onChange={(event) =>
                    onChange({ ...draft, repeatCount: Number(event.target.value) })
                  }
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
            <div className="field-row">
              <label>
                套用
                <FormSelect
                  label="套用"
                  value={draft.scope}
                  onChange={(value) => onChange({ ...draft, scope: value as 'date' | 'weekday' })}
                  options={[
                    { value: 'date', label: '僅此日期' },
                    { value: 'weekday', label: '每週這一天' }
                  ]}
                />
              </label>
              <label>
                操作
                <FormSelect
                  label="操作"
                  value={draft.action}
                  onChange={(value) => onChange({ ...draft, action: value as 'add' | 'remove' })}
                  options={[
                    { value: 'add', label: '加入時段' },
                    { value: 'remove', label: '移除時段' }
                  ]}
                />
              </label>
            </div>
            <p className="field-help">
              目前：{formatWindows(calendar.availabilityByDate[draft.date] ?? [])}
            </p>
          </>
        ) : null}
        {warning ? (
          <label className="schedule-warning">
            <strong>安排提醒</strong>
            <span>{warning}</span>
            <span>
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />{' '}
              我已確認，仍要儲存
            </span>
          </label>
        ) : null}
        {error ? (
          <p className="notice error" role="alert">
            {error}
          </p>
        ) : null}
        {draft.kind === 'session' && draft.current ? (
          <div className="session-quick-actions" aria-label="課程狀態操作">
            {draft.current.status === 'scheduled' ? (
              <>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={pending}
                  onClick={() => transition('complete')}
                >
                  完成上課
                </button>
                <button
                  type="button"
                  className="danger-outline-button"
                  disabled={pending}
                  onClick={() => transition('cancel')}
                >
                  取消課程
                </button>
              </>
            ) : draft.current.status === 'completed' ? (
              <button
                type="button"
                className="secondary-button"
                disabled={pending}
                onClick={() => transition('reopen')}
              >
                改回待上課
              </button>
            ) : null}
            {draft.current.status === 'scheduled' && !draft.current.seriesId ? (
              <label className="quick-delete">
                輸入 DELETE 後可永久刪除
                <span>
                  <input
                    value={deleteConfirmation}
                    onChange={(event) => setDeleteConfirmation(event.target.value)}
                  />
                  <button
                    type="button"
                    className="danger-button"
                    disabled={pending || deleteConfirmation !== 'DELETE'}
                    onClick={removeSession}
                  >
                    刪除
                  </button>
                </span>
              </label>
            ) : null}
          </div>
        ) : null}
        <div className="scheduling-form-actions">
          {draft.kind === 'session' && draft.current ? (
            <div className="scheduling-form-links">
              <Link className="text-button" to={`/sessions/${draft.current.id}`}>
                開啟課堂
              </Link>
              {draft.current.status === 'scheduled' &&
              draft.current.startsAt &&
              new Date(draft.current.startsAt) > new Date() ? (
                <Link className="text-button" to={`/sessions/${draft.current.id}?link=reschedule`}>
                  建立改期連結
                </Link>
              ) : null}
            </div>
          ) : null}
          {draft.kind === 'block' && draft.current ? (
            <button
              type="button"
              className="danger-button"
              onClick={removeBlock}
              disabled={pending}
            >
              刪除
            </button>
          ) : null}
          <button type="button" className="secondary-button" onClick={onClose}>
            取消
          </button>
          <button
            className="primary-button compact"
            disabled={pending || Boolean(warning && !acknowledged)}
          >
            {pending ? '儲存中…' : '儲存'}
          </button>
        </div>
      </form>
    </SchedulingDialog>
  )
}

function Timeline({
  calendar,
  onDraft,
  onWheel
}: {
  calendar: CalendarProjection
  onDraft: (draft: Draft) => void
  onWheel: (event: React.WheelEvent<HTMLElement>) => void
}) {
  const days = dateRange(calendar.range.start, calendar.range.end)
  const pointer = useRef<{ x: number; y: number; date: string; time: string } | null>(null)
  const itemPointer = useRef<{
    x: number
    y: number
    draft: Extract<Draft, { kind: 'session' | 'block' }>
  } | null>(null)
  const pointerDown = (event: React.PointerEvent<HTMLDivElement>, date: string) => {
    if (event.button !== 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    pointer.current = {
      x: event.clientX,
      y: event.clientY,
      date,
      time: yToTime(event.clientY - rect.top)
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const pointerUp = (event: React.PointerEvent<HTMLDivElement>, date: string) => {
    const began = pointer.current
    pointer.current = null
    if (!began || began.date !== date) return
    const distance = Math.hypot(event.clientX - began.x, event.clientY - began.y)
    const rect = event.currentTarget.getBoundingClientRect()
    const finish = yToTime(event.clientY - rect.top)
    const start = distance < 6 ? began.time : earlierTime(began.time, finish)
    const end =
      distance < 6 || finish === began.time
        ? addLocalMinutes({ date, time: start }, 60).time
        : laterTime(began.time, finish)
    onDraft({ kind: 'session', date, start, end, studentId: '', location: '' })
  }
  const itemDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    draft: Extract<Draft, { kind: 'session' | 'block' }>
  ) => {
    event.stopPropagation()
    itemPointer.current = { x: event.clientX, y: event.clientY, draft }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const itemUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const began = itemPointer.current
    itemPointer.current = null
    if (!began) return
    const distance = Math.hypot(event.clientX - began.x, event.clientY - began.y)
    if (distance < 6) {
      onDraft(began.draft)
      return
    }
    const timelineWidth = event.currentTarget.closest('.calendar-timeline')?.clientWidth ?? 1
    const dayShift = Math.round((event.clientX - began.x) / (timelineWidth / days.length))
    const minuteShift = Math.round((((event.clientY - began.y) / 720) * 960) / 15) * 15
    const duration = timeMinutes(began.draft.end) - timeMinutes(began.draft.start)
    const shiftedStart = addLocalMinutes(
      { date: addDays(began.draft.date, dayShift), time: began.draft.start },
      minuteShift
    )
    const shiftedEnd = addLocalMinutes(shiftedStart, duration)
    onDraft({
      ...began.draft,
      date: shiftedStart.date,
      start: shiftedStart.time,
      end: shiftedEnd.time
    })
  }
  return (
    <div className="calendar-timeline-scroll" onWheel={onWheel}>
      <div
        className="calendar-timeline"
        style={{ '--calendar-days': days.length } as CSSProperties}
      >
        {days.map((date) => (
          <section key={date} className="calendar-day-column">
            <header>
              <time dateTime={date}>{formatShortDate(date, calendar.timeZone)}</time>
            </header>
            <div
              className="calendar-time-grid"
              tabIndex={0}
              aria-label={`${date} 時間格，按 Enter 建立安排`}
              onKeyDown={(event) =>
                event.key === 'Enter' &&
                onDraft({
                  kind: 'session',
                  date,
                  start: '09:00',
                  end: '10:00',
                  studentId: '',
                  location: ''
                })
              }
              onPointerDown={(event) => pointerDown(event, date)}
              onPointerUp={(event) => pointerUp(event, date)}
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
                      onPointerDown={(event) => itemDown(event, local)}
                      onPointerUp={itemUp}
                    >
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
                      className={`calendar-session positioned ${entry.session.status}${entry.conflicts.length ? ' has-conflict' : ''}`}
                      style={timeStyle(local.start, local.end)}
                      key={entry.session.id}
                      onPointerDown={(event) => itemDown(event, local)}
                      onPointerUp={itemUp}
                    >
                      <time>{local.start}</time>
                      <strong>{entry.session.studentName}</strong>
                      <span>{entry.session.location || '未設定地點'}</span>
                    </button>
                  )
                })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function Agenda({
  calendar,
  onOpen
}: {
  calendar: CalendarProjection
  onOpen: (session: CalendarSession) => void
}) {
  const days = dateRange(calendar.range.start, calendar.range.end)
  return (
    <ol className="calendar-agenda">
      {days.map((date) => {
        const entries = calendar.sessions.filter(
          ({ session }) => localDay(session.startsAt, calendar.timeZone) === date
        )
        return (
          <li key={date}>
            <header>
              <time dateTime={date}>{formatDate(date, calendar.timeZone)}</time>
              <span>{entries.length ? `${entries.length} 堂` : '無課程'}</span>
            </header>
            {entries.length ? (
              <div>
                {entries.map(({ session, conflicts }) => (
                  <button
                    key={session.id}
                    className={`calendar-session ${session.status}${conflicts.length ? ' has-conflict' : ''}`}
                    onClick={() => onOpen(session)}
                  >
                    <time>{formatTime(session.startsAt, calendar.timeZone)}</time>
                    <strong>{session.studentName}</strong>
                    <span>
                      {statusLabel(session)} · {session.location || '未設定地點'}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p>保留給新的安排。</p>
            )}
          </li>
        )
      })}
    </ol>
  )
}
function Month({
  calendar,
  anchor,
  onOpenDay
}: {
  calendar: CalendarProjection
  anchor: string
  onOpenDay: (date: string) => void
}) {
  const start = monthGridStart(anchor)
  const days = Array.from({ length: 42 }, (_, index) => addDays(start, index))
  return (
    <div className="calendar-month">
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
                <span key={session.id}>
                  {formatTime(session.startsAt, calendar.timeZone)} {session.studentName}
                </span>
              ))}
              {entries.length > 2 ? <small>+{entries.length - 2}</small> : null}
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
function CalendarEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="calendar-empty">
      <CalendarDays />
      <h2>這段期間還沒有課程</h2>
      <p>可排課時段與封鎖時間仍會顯示在日、週檢視中。</p>
      <button className="text-button" onClick={onCreate}>
        建立第一堂課
      </button>
    </div>
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
function conflictWarning(
  draft: Extract<Draft, { kind: 'session' }>,
  calendar: CalendarProjection,
  timeZone: string
) {
  let start: number, end: number
  try {
    start = Date.parse(localDateTimeToIso({ date: draft.date, time: draft.start }, timeZone))
    end = Date.parse(localDateTimeToIso({ date: draft.date, time: draft.end }, timeZone))
  } catch {
    return ''
  }
  const overlap =
    calendar.sessions.some(
      ({ session }) =>
        session.id !== draft.current?.id &&
        session.status !== 'cancelled' &&
        session.startsAt &&
        session.endsAt &&
        start < Date.parse(session.endsAt) &&
        end > Date.parse(session.startsAt)
    ) ||
    calendar.blocks.some(
      (block) => start < Date.parse(block.endsAt) && end > Date.parse(block.startsAt)
    )
  const available = (calendar.availabilityByDate[draft.date] ?? []).some(
    (window) => window.startTime <= draft.start && window.endTime >= draft.end
  )
  return [
    overlap ? '時間與其他課程或封鎖時段重疊。' : '',
    !available ? '時間落在目前可排課時段之外。' : ''
  ]
    .filter(Boolean)
    .join(' ')
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
function earlierTime(a: string, b: string) {
  return a < b ? a : b
}
function laterTime(a: string, b: string) {
  return a > b ? a : b
}
function formatWindows(items: Array<{ startTime: string; endTime: string }>) {
  return items.length
    ? items.map((item) => `${item.startTime}–${item.endTime}`).join('、')
    : '全天不開放'
}
function rangeFor(anchor: string, view: CalendarView) {
  if (view === 'day') return { start: anchor, end: addDays(anchor, 1) }
  if (view === 'month') {
    const start = monthGridStart(anchor)
    return { start, end: addDays(start, 42) }
  }
  const start = monday(anchor)
  return { start, end: addDays(start, 7) }
}
function unitDays(view: CalendarView) {
  return view === 'day' ? 1 : view === 'month' ? 28 : 7
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
function statusLabel(item: CalendarSession) {
  return item.status === 'completed'
    ? '已完成'
    : item.status === 'cancelled'
      ? '已取消'
      : item.endsAt && Date.parse(item.endsAt) < Date.now()
        ? '待確認'
        : '即將開始'
}
