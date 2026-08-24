import {
  addDays,
  addMinutes,
  addMonths,
  addWeeks,
  differenceInMinutes,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek
} from 'date-fns'
import { zhTW } from 'date-fns/locale'
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Columns3,
  GripVertical,
  List,
  MousePointer2,
  Plus,
  Repeat2,
  RotateCcw,
  ShieldCheck,
  XCircle
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent
} from 'react'
import { Link } from 'react-router-dom'
import { classifyPointerGesture, draggedStartMinute } from '../calendarInteraction'
import { timeRangeFromForm } from '../calendarTime'
import { calendarHeaderWheelAction } from '../calendarViewport'
import { FormSelect, Modal, PageHeader } from '../components'
import { TimeRangeFields } from '../components/TimeRangeFields'
import {
  availabilityWindowsForDate,
  availableWindowsForDay,
  calendarSessionState,
  getStudent,
  lessonSummary,
  sessionIssues
} from '../domain'
import { useStore } from '../store'
import type { CalendarBlock, CourseSession } from '../types'
import { dateText, timeText } from '../utils/formatters'

type CalendarView = 'agenda' | 'day' | 'week' | 'month'
type DraftKind = 'session' | 'availability' | 'block'
type DraftRange = { start: Date; end: Date }
type GestureKind = 'create' | 'session' | 'block'
type Gesture = {
  kind: GestureKind
  id?: string
  origin: { x: number; y: number }
  originDayIndex: number
  originMinute: number
  durationMinutes: number
  grabOffsetMinutes: number
  dragging: boolean
}

const snapMinute = (minute: number) => Math.round(minute / 15) * 15
const timeValue = (date: Date) => format(date, 'HH:mm')

export function CalendarPage() {
  const {
    data,
    updateSession,
    deleteSession,
    updateStatus,
    addSession,
    addRecurringSession,
    addBlock,
    addRecurringBlocks,
    updateBlock,
    updateRecurringBlock,
    deleteBlock,
    deleteRecurringBlock,
    changeAvailability
  } = useStore()
  const [view, setView] = useState<CalendarView>('week')
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [selected, setSelected] = useState<CourseSession | null>(null)
  const [selectedBlock, setSelectedBlock] = useState<CalendarBlock | null>(null)
  const [blockScope, setBlockScope] = useState<'single' | 'future' | 'all'>('single')
  const [draft, setDraft] = useState<DraftRange | null>(null)
  const [draftKind, setDraftKind] = useState<DraftKind>('session')
  const [composerOpen, setComposerOpen] = useState(false)
  const [warning, setWarning] = useState('')
  const [formError, setFormError] = useState('')
  const [gesture, setGesture] = useState<Gesture | null>(null)
  const [preview, setPreview] = useState<DraftRange | null>(null)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const gestureRef = useRef<Gesture | null>(null)
  const plannerRef = useRef<HTMLDivElement | null>(null)
  const calendarPageRef = useRef<HTMLDivElement | null>(null)
  const timelineViewportRef = useRef<HTMLDivElement | null>(null)
  const headerCollapsedRef = useRef(false)
  const headerGestureLockUntilRef = useRef(0)

  const startHour = Math.max(0, Math.min(23, data.settings.calendarStartHour))
  const endHour = Math.max(startHour + 1, Math.min(24, data.settings.calendarEndHour))
  const totalMinutes = (endHour - startHour) * 60
  useEffect(() => {
    if (view !== 'day' && view !== 'week') {
      headerCollapsedRef.current = false
      setHeaderCollapsed(false)
    }
  }, [view])

  useEffect(() => {
    const page = calendarPageRef.current
    if (!page || (view !== 'day' && view !== 'week')) return

    const handleWheel = (event: WheelEvent) => {
      const now = performance.now()
      if (now < headerGestureLockUntilRef.current) {
        event.preventDefault()
        headerGestureLockUntilRef.current = now + 180
        return
      }

      const action = calendarHeaderWheelAction(
        headerCollapsedRef.current,
        timelineViewportRef.current?.scrollTop ?? 0,
        event.deltaY
      )
      if (action === 'pass') return

      event.preventDefault()
      const collapsed = action === 'collapse'
      headerCollapsedRef.current = collapsed
      headerGestureLockUntilRef.current = now + 300
      setHeaderCollapsed(collapsed)
    }

    page.addEventListener('wheel', handleWheel, { capture: true, passive: false })
    return () => page.removeEventListener('wheel', handleWheel, { capture: true })
  }, [view])

  const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  const timelineDays = view === 'day' ? [anchorDate] : days
  const monthStart = startOfMonth(anchorDate)
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const monthDays = Array.from({ length: 42 }, (_, index) => addDays(monthGridStart, index))
  const visibleSessions = data.sessions
    .filter((session) => session.status !== 'cancelled')
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const sessionsForDay = (day: Date) =>
    visibleSessions.filter((session) => isSameDay(parseISO(session.startsAt), day))
  const sessionState = (session: CourseSession) => calendarSessionState(session)
  const blocksForDay = (day: Date) =>
    data.blocks
      .filter((block) => isSameDay(parseISO(block.startsAt), day))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  const movePeriod = (direction: -1 | 1) =>
    setAnchorDate((current) =>
      view === 'day'
        ? addDays(current, direction)
        : view === 'month'
          ? addMonths(current, direction)
          : addWeeks(current, direction)
    )
  const periodTitle =
    view === 'day'
      ? format(anchorDate, 'yyyy 年 M 月 d 日 EEEE', { locale: zhTW })
      : view === 'month'
        ? format(anchorDate, 'yyyy 年 M 月')
        : `${format(weekStart, 'yyyy 年 M 月')} · ${format(weekStart, 'M/d')}—${format(addDays(weekStart, 6), 'M/d')}`

  const timelineStyle = (startsAt: string, endsAt: string) => {
    const day = startOfDay(parseISO(startsAt))
    const start = differenceInMinutes(parseISO(startsAt), day) - startHour * 60
    const end = differenceInMinutes(parseISO(endsAt), day) - startHour * 60
    const clippedStart = Math.max(0, start)
    const clippedEnd = Math.min(totalMinutes, end)
    return {
      top: `${(clippedStart / totalMinutes) * 100}%`,
      height: `${Math.max(((clippedEnd - clippedStart) / totalMinutes) * 100, 2.1)}%`
    }
  }
  const rangeAt = (day: Date, minute: number, duration = data.settings.defaultDurationMinutes) => {
    const start = addMinutes(startOfDay(day), startHour * 60 + minute)
    return { start, end: addMinutes(start, duration) }
  }
  const setGestureState = (next: Gesture | null) => {
    gestureRef.current = next
    setGesture(next)
  }
  const positionFromPointer = (clientX: number, clientY: number) => {
    const planner = plannerRef.current
    if (!planner) return { dayIndex: 0, minute: 0 }
    const rect = planner.getBoundingClientRect()
    const axisWidth = view === 'day' ? 54 : 54
    const columnWidth = (rect.width - axisWidth) / timelineDays.length
    const dayIndex = Math.max(
      0,
      Math.min(timelineDays.length - 1, Math.floor((clientX - rect.left - axisWidth) / columnWidth))
    )
    const trackTop = rect.top + 54
    const trackHeight = rect.height - 54
    const minute = Math.max(
      0,
      Math.min(totalMinutes - 15, snapMinute(((clientY - trackTop) / trackHeight) * totalMinutes))
    )
    return { dayIndex, minute }
  }
  const beginGesture = (
    kind: GestureKind,
    dayIndex: number,
    event: PointerEvent<HTMLElement>,
    item?: CourseSession | CalendarBlock
  ) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const { minute } = positionFromPointer(event.clientX, event.clientY)
    const durationMinutes = item
      ? differenceInMinutes(parseISO(item.endsAt), parseISO(item.startsAt))
      : data.settings.defaultDurationMinutes
    const itemStartMinute = item
      ? differenceInMinutes(parseISO(item.startsAt), startOfDay(parseISO(item.startsAt))) -
        startHour * 60
      : minute
    setGestureState({
      kind,
      id: item?.id,
      origin: { x: event.clientX, y: event.clientY },
      originDayIndex: dayIndex,
      originMinute: minute,
      durationMinutes,
      grabOffsetMinutes: Math.max(0, minute - itemStartMinute),
      dragging: false
    })
  }
  const updateGesture = (event: PointerEvent<HTMLDivElement>) => {
    const current = gestureRef.current
    if (!current) return
    const dragging =
      current.dragging ||
      classifyPointerGesture(current.origin, { x: event.clientX, y: event.clientY }) === 'drag'
    if (!dragging) return
    const point = positionFromPointer(event.clientX, event.clientY)
    const day = timelineDays[current.kind === 'create' ? current.originDayIndex : point.dayIndex]
    const range =
      current.kind === 'create'
        ? (() => {
            const startMinute = Math.min(current.originMinute, point.minute)
            const endMinute = Math.max(current.originMinute + 15, point.minute + 15)
            return rangeAt(day, startMinute, endMinute - startMinute)
          })()
        : rangeAt(
            day,
            draggedStartMinute(
              point.minute,
              current.grabOffsetMinutes,
              totalMinutes - current.durationMinutes
            ),
            current.durationMinutes
          )
    setPreview(range)
    setGestureState({ ...current, dragging: true })
  }
  const finishGesture = () => {
    const current = gestureRef.current
    if (!current) return
    if (!current.dragging) {
      if (current.kind === 'create')
        openComposer(rangeAt(timelineDays[current.originDayIndex], current.originMinute))
      if (current.kind === 'session')
        setSelected(data.sessions.find((item) => item.id === current.id) ?? null)
      if (current.kind === 'block') {
        setBlockScope('single')
        setSelectedBlock(data.blocks.find((item) => item.id === current.id) ?? null)
      }
    } else if (preview) {
      if (current.kind === 'create') openComposer(preview)
      if (current.kind === 'session' && current.id) {
        const session = data.sessions.find((item) => item.id === current.id)
        if (session) {
          const issues = updateSession(session.id, {
            startsAt: preview.start.toISOString(),
            endsAt: preview.end.toISOString()
          })
          if (issues.hasIssues) setWarning('課程已移動；新位置與其他安排重疊。')
        }
      }
      if (current.kind === 'block' && current.id)
        updateBlock(current.id, {
          startsAt: preview.start.toISOString(),
          endsAt: preview.end.toISOString()
        })
    }
    setGestureState(null)
    setPreview(null)
  }
  const cancelGesture = () => {
    setGestureState(null)
    setPreview(null)
  }
  const openComposer = (range: DraftRange, kind: DraftKind = 'session') => {
    setDraft(range)
    setDraftKind(kind)
    setFormError('')
    setComposerOpen(true)
  }
  const openQuickComposer = (kind: DraftKind) => {
    const base = addMinutes(new Date(), 60)
    base.setMinutes(snapMinute(base.getMinutes()), 0, 0)
    const duration = kind === 'block' ? 120 : data.settings.defaultDurationMinutes
    const dayStart = startOfDay(base)
    const earliest = addMinutes(dayStart, startHour * 60)
    const latestEnd = addMinutes(dayStart, endHour * 60)
    let start = base < earliest ? earliest : base
    if (addMinutes(start, duration) > latestEnd)
      start = addMinutes(addDays(dayStart, 1), startHour * 60)
    openComposer(
      {
        start,
        end: addMinutes(start, duration)
      },
      kind
    )
  }
  const closeComposer = () => {
    setComposerOpen(false)
    setDraft(null)
    setFormError('')
  }

  const submitDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const range = timeRangeFromForm(values)
    if (range.end <= range.start) {
      setFormError('結束時間必須晚於開始時間。')
      return
    }
    if (draftKind === 'session') {
      const session = {
        studentId: String(values.get('studentId')),
        startsAt: range.start.toISOString(),
        endsAt: range.end.toISOString(),
        location: String(values.get('location') || 'FORM Studio')
      }
      const intervalWeeks = Number(values.get('repeat'))
      const issues = intervalWeeks
        ? addRecurringSession(session, intervalWeeks)
        : addSession(session)
      if (issues.hasIssues) setWarning('安排已儲存，但與其他課程或封鎖時段重疊。')
    }
    if (draftKind === 'block') {
      const block = {
        startsAt: range.start.toISOString(),
        endsAt: range.end.toISOString(),
        note: String(values.get('note')).trim()
      }
      const count = Number(values.get('repeatCount'))
      if (count > 1) addRecurringBlocks(block, count)
      else addBlock(block)
    }
    if (draftKind === 'availability')
      changeAvailability({
        day: format(range.start, 'yyyy-MM-dd'),
        startTime: timeValue(range.start),
        endTime: timeValue(range.end),
        scope: String(values.get('availabilityScope')) as 'day' | 'weekly',
        mode: String(values.get('availabilityMode')) as 'add' | 'remove'
      })
    closeComposer()
  }
  const editBlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedBlock) return
    const values = new FormData(event.currentTarget)
    const range = timeRangeFromForm(values)
    const updates = {
      note: String(values.get('note')).trim(),
      startsAt: range.start.toISOString(),
      endsAt: range.end.toISOString()
    }
    if (selectedBlock.recurrenceId && blockScope !== 'single')
      updateRecurringBlock(selectedBlock.id, updates, blockScope)
    else updateBlock(selectedBlock.id, updates)
    setSelectedBlock(null)
  }
  const removeSelectedSession = () => {
    if (!selected) return
    deleteSession(selected.id)
    setSelected(null)
  }
  const removeSelectedBlock = () => {
    if (!selectedBlock) return
    if (selectedBlock.recurrenceId && blockScope !== 'single')
      deleteRecurringBlock(selectedBlock.id, blockScope)
    else deleteBlock(selectedBlock.id)
    setSelectedBlock(null)
  }

  return (
    <div
      ref={calendarPageRef}
      className={`page calendar-page compact-calendar-page ${headerCollapsed ? 'calendar-focus-mode' : ''}`}
    >
      <div className="calendar-collapsible-header">
        <div className="calendar-header-inner">
          <PageHeader
            eyebrow="SCHEDULE / DIRECT MANIPULATION"
            title="行事曆"
            description="點一下選取；按住並移動即可建立或搬動安排。"
            actions={
              <>
                <button className="button ghost" onClick={() => openQuickComposer('availability')}>
                  <ShieldCheck />
                  可排課
                </button>
                <button className="button ghost" onClick={() => openQuickComposer('block')}>
                  <Ban />
                  封鎖
                </button>
                <button className="button accent" onClick={() => openQuickComposer('session')}>
                  <Plus />
                  課程
                </button>
              </>
            }
          />
        </div>
      </div>
      {warning && (
        <div className="global-alert compact-alert">
          <AlertTriangle />
          <div>
            <strong>安排已保留</strong>
            <span>{warning}</span>
          </div>
          <button onClick={() => setWarning('')} aria-label="關閉提醒">
            <XCircle />
          </button>
        </div>
      )}
      <section className="panel calendar-shell compact-shell">
        <div className="calendar-toolbar compact-toolbar">
          <div className="calendar-nav">
            <button className="icon-button" aria-label="上一個期間" onClick={() => movePeriod(-1)}>
              <ChevronLeft />
            </button>
            <button className="button ghost" onClick={() => setAnchorDate(new Date())}>
              今天
            </button>
            <button className="icon-button" aria-label="下一個期間" onClick={() => movePeriod(1)}>
              <ChevronRight />
            </button>
          </div>
          <h2>{periodTitle}</h2>
          <div className="calendar-view-switch" aria-label="行事曆檢視模式">
            <button className={view === 'agenda' ? 'active' : ''} onClick={() => setView('agenda')}>
              <List />
              課表
            </button>
            <button className={view === 'day' ? 'active' : ''} onClick={() => setView('day')}>
              <CalendarClock />日
            </button>
            <button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>
              <Columns3 />週
            </button>
            <button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>
              <CalendarDays />月
            </button>
          </div>
        </div>
        <div className="calendar-instruction compact-instruction">
          <span>
            <MousePointer2 />
            點按開啟・按住移動
          </span>
          <span>
            <GripVertical />
            超過 6px 即進入拖曳
          </span>
          <span>
            <i className="lime-dot" />
            未到課程
          </span>
          <span>
            <i className="overdue-dot" />
            逾時未完成
          </span>
          <span>
            <i className="completed-dot" />
            已完成
          </span>
          <span>
            <i className="open-dot" />
            可排課
          </span>
          <span>
            <i className="block-dot" />
            封鎖
          </span>
        </div>

        {view === 'agenda' && (
          <div className="compact-agenda-grid">
            {days.map((day) => (
              <section
                className={`compact-agenda-day ${isSameDay(day, new Date()) ? 'today' : ''}`}
                key={day.toISOString()}
              >
                <button
                  className="compact-agenda-date"
                  onClick={() => {
                    setAnchorDate(day)
                    setView('day')
                  }}
                >
                  <span>{format(day, 'EEE', { locale: zhTW })}</span>
                  <strong>{format(day, 'd')}</strong>
                </button>
                <div>
                  {sessionsForDay(day).length ? (
                    sessionsForDay(day).map((session) => (
                      <button
                        className={`compact-lesson ${sessionState(session)}`}
                        key={session.id}
                        onClick={() => setSelected(session)}
                      >
                        <time>{timeText(session.startsAt)}</time>
                        <strong>{getStudent(data, session.studentId)?.name}</strong>
                        <span>
                          {differenceInMinutes(
                            parseISO(session.endsAt),
                            parseISO(session.startsAt)
                          )}{' '}
                          分
                        </span>
                      </button>
                    ))
                  ) : (
                    <span className="no-lessons">無課程</span>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}

        {(view === 'day' || view === 'week') && (
          <div ref={timelineViewportRef} className="calendar-timeline-viewport">
            <div
              ref={plannerRef}
              className={`week-planner gesture-planner ${view === 'day' ? 'single-day refined-day' : ''}`}
              style={
                {
                  '--day-count': timelineDays.length,
                  '--timeline-height': `${Math.max(720, (endHour - startHour) * 48)}px`
                } as CSSProperties
              }
              onPointerMove={updateGesture}
              onPointerUp={finishGesture}
              onPointerCancel={cancelGesture}
            >
              <div className="week-corner">GMT+8</div>
              {timelineDays.map((day) => (
                <button
                  className={`week-day-head ${isSameDay(day, new Date()) ? 'today' : ''}`}
                  key={`head-${day.toISOString()}`}
                  onClick={() => {
                    setAnchorDate(day)
                    setView('day')
                  }}
                >
                  <span>{format(day, 'EEE', { locale: zhTW })}</span>
                  <strong>{format(day, 'd')}</strong>
                  <small>{sessionsForDay(day).length} 堂</small>
                </button>
              ))}
              <div className="week-time-axis">
                {Array.from({ length: endHour - startHour + 1 }, (_, index) => (
                  <span key={index} style={{ top: `${(index / (endHour - startHour)) * 100}%` }}>
                    {String(startHour + index).padStart(2, '0')}:00
                  </span>
                ))}
              </div>
              {timelineDays.map((day, dayIndex) => (
                <div
                  className={`week-day-track gesture-track ${isSameDay(day, new Date()) ? 'today' : ''}`}
                  key={day.toISOString()}
                  onPointerDown={(event) => beginGesture('create', dayIndex, event)}
                >
                  {availabilityWindowsForDate(data, day).map((window) => {
                    const start = new Date(day)
                    const end = new Date(day)
                    const [sh, sm] = window.startTime.split(':').map(Number)
                    const [eh, em] = window.endTime.split(':').map(Number)
                    start.setHours(sh, sm, 0, 0)
                    end.setHours(eh, em, 0, 0)
                    return (
                      <div
                        className="availability-band passive"
                        style={timelineStyle(start.toISOString(), end.toISOString())}
                        key={`${day.toISOString()}-${window.startTime}`}
                      >
                        <span>可排課</span>
                      </div>
                    )
                  })}
                  {blocksForDay(day).map((block) => (
                    <button
                      data-calendar-item
                      className="planner-event private draggable"
                      style={timelineStyle(block.startsAt, block.endsAt)}
                      key={block.id}
                      onPointerDown={(event) => beginGesture('block', dayIndex, event, block)}
                    >
                      <GripVertical />
                      <span>{timeText(block.startsAt)}</span>
                      <strong>{block.note || '封鎖'}</strong>
                    </button>
                  ))}
                  {sessionsForDay(day).map((session) => (
                    <button
                      data-calendar-item
                      className={`planner-event lesson draggable ${sessionState(session)} ${sessionIssues(data, session).hasIssues ? 'conflict' : ''}`}
                      style={timelineStyle(session.startsAt, session.endsAt)}
                      key={session.id}
                      onPointerDown={(event) => beginGesture('session', dayIndex, event, session)}
                    >
                      <GripVertical />
                      <span>{timeText(session.startsAt)}</span>
                      <strong>{getStudent(data, session.studentId)?.name}</strong>
                    </button>
                  ))}
                  {gesture?.dragging && preview && isSameDay(preview.start, day) && (
                    <div
                      className={`calendar-draft-range ${gesture.kind !== 'create' ? 'moving' : ''}`}
                      style={timelineStyle(preview.start.toISOString(), preview.end.toISOString())}
                    >
                      <strong>
                        {format(preview.start, 'HH:mm')}—{format(preview.end, 'HH:mm')}
                      </strong>
                      <span>{gesture.kind === 'create' ? '放開以安排' : '放開以移動'}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'month' && (
          <div className="month-grid compact-month">
            {['一', '二', '三', '四', '五', '六', '日'].map((label) => (
              <div className="month-weekday" key={label}>
                週{label}
              </div>
            ))}
            {monthDays.map((day) => (
              <div
                className={`month-day ${!isSameMonth(day, monthStart) ? 'outside' : ''} ${isSameDay(day, new Date()) ? 'today' : ''}`}
                key={day.toISOString()}
              >
                <button
                  className="month-date"
                  onClick={() => {
                    setAnchorDate(day)
                    setView('day')
                  }}
                >
                  {format(day, 'd')}
                  <small>
                    {sessionsForDay(day).length ? `${sessionsForDay(day).length} 堂` : ''}
                  </small>
                </button>
                <div className="month-events">
                  {sessionsForDay(day).map((session) => (
                    <button
                      className={`month-event lesson ${sessionState(session)}`}
                      key={session.id}
                      onClick={() => setSelected(session)}
                    >
                      <time>{timeText(session.startsAt)}</time>
                      <span>{getStudent(data, session.studentId)?.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {composerOpen && draft && (
        <Modal title="安排這個時段" onClose={closeComposer}>
          <form className="form-stack slot-composer" onSubmit={submitDraft}>
            <div className="slot-kind-switch" role="tablist" aria-label="時段類型">
              <button
                type="button"
                className={draftKind === 'session' ? 'active lesson' : ''}
                onClick={() => setDraftKind('session')}
              >
                <CalendarClock />
                課程
              </button>
              <button
                type="button"
                className={draftKind === 'availability' ? 'active available' : ''}
                onClick={() => setDraftKind('availability')}
              >
                <ShieldCheck />
                可排課
              </button>
              <button
                type="button"
                className={draftKind === 'block' ? 'active blocked' : ''}
                onClick={() => setDraftKind('block')}
              >
                <Ban />
                封鎖
              </button>
            </div>
            <TimeRangeFields range={draft} startHour={startHour} endHour={endHour} />
            {draftKind === 'session' && (
              <>
                <FormSelect
                  label="學生"
                  name="studentId"
                  required
                  options={data.students
                    .filter((student) => student.active)
                    .map((student) => ({
                      value: student.id,
                      label: `${student.name}・剩餘 ${lessonSummary(data, student.id).remaining} 堂`
                    }))}
                />
                <div className="field-row">
                  <FormSelect
                    label="重複"
                    name="repeat"
                    defaultValue="0"
                    options={[
                      { value: 0, label: '僅這一次' },
                      { value: 1, label: '每週' },
                      { value: 2, label: '每兩週' }
                    ]}
                  />
                  <label>
                    地點
                    <input name="location" defaultValue="FORM Studio" />
                  </label>
                </div>
              </>
            )}
            {draftKind === 'availability' && (
              <>
                <div className="segmented-choice">
                  <label>
                    <input type="radio" name="availabilityMode" value="add" defaultChecked />
                    <span>加入可排課</span>
                  </label>
                  <label>
                    <input type="radio" name="availabilityMode" value="remove" />
                    <span>從可排課移除</span>
                  </label>
                </div>
                <div className="segmented-choice">
                  <label>
                    <input type="radio" name="availabilityScope" value="day" defaultChecked />
                    <span>只改這一天</span>
                  </label>
                  <label>
                    <input type="radio" name="availabilityScope" value="weekly" />
                    <span>每週這一天</span>
                  </label>
                </div>
                <div className="form-note">
                  <ShieldCheck />
                  可新增多段，也能從中間移除一段；單日修改不會影響其他週。
                </div>
              </>
            )}
            {draftKind === 'block' && (
              <>
                <label>
                  備註（選填）
                  <input name="note" placeholder="不填也可以封鎖" />
                </label>
                <FormSelect
                  label="重複"
                  name="repeatCount"
                  defaultValue="1"
                  options={[
                    { value: 1, label: '僅這一次' },
                    { value: 4, label: '每週，共 4 次' },
                    { value: 8, label: '每週，共 8 次' },
                    { value: 12, label: '每週，共 12 次' }
                  ]}
                />
              </>
            )}
            {formError && (
              <div className="inline-alert">
                <AlertTriangle />
                {formError}
              </div>
            )}
            <div className="modal-shortcut-hint">ENTER 確認 · ESC 取消</div>
            <div className="form-actions">
              <button type="button" className="button ghost" onClick={closeComposer}>
                取消
              </button>
              <button className="button accent">儲存安排</button>
            </div>
          </form>
        </Modal>
      )}

      {selected && (
        <Modal
          title={getStudent(data, selected.studentId)?.name ?? '課程'}
          onClose={() => setSelected(null)}
          onDelete={removeSelectedSession}
        >
          <div className="session-quickview">
            <div className="quick-time">
              <CalendarClock />
              <div>
                <span>{dateText(selected.startsAt)}</span>
                <strong>
                  {timeText(selected.startsAt)}–{timeText(selected.endsAt)}
                </strong>
                <small>
                  {selected.location}
                  {selected.seriesId ? '・週期課程' : ''}
                </small>
              </div>
            </div>
            <div className="quick-actions calendar-session-actions">
              <Link className="button dark" to={`/sessions/${selected.id}`}>
                開啟課堂
              </Link>
              <button
                className={`button session-status-action ${selected.status === 'completed' ? 'undo' : 'complete'}`}
                onClick={() => {
                  updateStatus(
                    selected.id,
                    selected.status === 'completed' ? 'scheduled' : 'completed'
                  )
                  setSelected(null)
                }}
              >
                {selected.status === 'completed' ? <RotateCcw /> : <CheckCircle2 />}
                {selected.status === 'completed' ? '未完成' : '完成上課'}
              </button>
              <button className="button danger" onClick={removeSelectedSession}>
                刪除
              </button>
            </div>
            <div className="modal-shortcut-hint">DELETE 刪除 · ESC 取消</div>
          </div>
        </Modal>
      )}
      {selectedBlock && (
        <Modal
          title="封鎖選項"
          onClose={() => setSelectedBlock(null)}
          onDelete={removeSelectedBlock}
        >
          <form className="form-stack" onSubmit={editBlock}>
            <TimeRangeFields
              range={{
                start: parseISO(selectedBlock.startsAt),
                end: parseISO(selectedBlock.endsAt)
              }}
              startHour={startHour}
              endHour={endHour}
            />
            <label>
              備註（選填）
              <input name="note" defaultValue={selectedBlock.note} placeholder="不填也可以" />
            </label>
            {selectedBlock.recurrenceId && (
              <FormSelect
                label="套用範圍"
                value={blockScope}
                onChange={(next) => setBlockScope(next as 'single' | 'future' | 'all')}
                options={[
                  { value: 'single', label: '僅這一次' },
                  { value: 'future', label: '這次與之後' },
                  { value: 'all', label: '整組週期封鎖' }
                ]}
              />
            )}
            <div className="modal-shortcut-hint">ENTER 確認 · DELETE 刪除 · ESC 取消</div>
            <div className="form-actions spread">
              <button type="button" className="button danger" onClick={removeSelectedBlock}>
                刪除封鎖
              </button>
              <div>
                <button
                  type="button"
                  className="button ghost"
                  onClick={() => setSelectedBlock(null)}
                >
                  取消
                </button>
                <button className="button accent">儲存修改</button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
