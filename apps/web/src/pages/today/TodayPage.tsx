import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronRight,
  Sparkles,
  UsersRound,
  WalletCards,
  X
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  dismissTodayNotification,
  readTodayNotification,
  type TodayNotification,
  type TodayProjection,
  type TodaySchedule
} from '../../api'
import { queryKeys } from '../../query-keys'
import { Page } from '../../shared/primitives'
import { trainingQuotes } from './quotes'
import { useTodayRouteQuery } from './queries'
import { selectTodayRouteState, todayErrorMessage } from './state'

export function TodayPage({ session, coachName }: { session: Session; coachName: string }) {
  const todayQuery = useTodayRouteQuery(session)
  const state = selectTodayRouteState({
    data: todayQuery.data,
    isLoading: todayQuery.isLoading,
    isFetching: todayQuery.isFetching,
    error: todayQuery.error
  })
  const today = todayQuery.data
  return (
    <Page
      className="today-page"
      title={
        today
          ? `${dayGreeting(today.timeZone)}，${coachName.replace(/(?:教練|老師)$/, '').trim() || '教練'}`
          : '今日'
      }
      eyebrow={today ? formatToday(today.date, today.timeZone) : '工作台'}
      description="今天，又是有條有理的一天。"
    >
      {state === 'loading' ? <TodaySkeleton /> : null}
      {state === 'error' ? (
        <TodayError error={todayQuery.error} onRetry={() => void todayQuery.refetch()} />
      ) : null}
      {todayQuery.isRefetchError && today ? (
        <p className="cloud-state error" role="status">
          暫時無法更新；顯示上次資料。
        </p>
      ) : null}
      {today ? <TodaySignals today={today} session={session} /> : null}
    </Page>
  )
}

function TodaySignals({
  today,
  session
}: {
  today: NonNullable<ReturnType<typeof useTodayRouteQuery>['data']>
  session: Session
}) {
  return (
    <>
      <section className="today-signals" aria-label="今日數字">
        <div className="today-signal today-signal-hero">
          <span>今日課程</span>
          <strong>
            {today.schedule ? String(today.schedule.sessions.length).padStart(2, '0') : '—'}
          </strong>
          <small>
            {today.schedule
              ? `${today.schedule.counts.completed} 已完成 / ${today.schedule.counts.scheduled} 待進行`
              : '課程資料尚未提供'}
          </small>
        </div>
        <div className="today-signal">
          <span className="today-signal-icon">
            <UsersRound />
          </span>
          <div>
            <span>活躍學生</span>
            <strong>{today.summary.activeStudents}</strong>
          </div>
        </div>
        <div className="today-signal income">
          <span className="today-signal-icon">
            <WalletCards />
          </span>
          <div>
            <span>{formatPeriod(today.summary.incomePeriod)}</span>
            {today.summary.incomeByCurrency.length ? (
              today.summary.incomeByCurrency.map((income) => (
                <strong key={income.currency}>
                  {formatMoney(income.amountMinor, income.currency)}
                </strong>
              ))
            ) : (
              <strong className="today-no-income">尚無實收紀錄</strong>
            )}
          </div>
        </div>
        <TodayNotificationCenter
          session={session}
          notifications={today.notifications ?? []}
          timeZone={today.timeZone}
        />
      </section>
      <div className="today-workspace">
        {today.schedule ? <TodaySchedule schedule={today.schedule} /> : null}
        <aside className="today-aside">
          <TrainingQuote />
        </aside>
      </div>
    </>
  )
}

function TodayNotificationCenter({
  session,
  notifications,
  timeZone
}: {
  session: Session
  notifications: TodayNotification[]
  timeZone: string
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const unreadCount = notifications.filter((item) => !item.readAt).length
  const [actionError, setActionError] = useState('')
  const mutation = useMutation({
    mutationFn: (id: string) => readTodayNotification(session.access_token, id),
    onSuccess: ({ id, readAt }) => {
      queryClient.setQueryData<TodayProjection>(queryKeys.today(session.user.id), (previous) =>
        previous
          ? {
              ...previous,
              notifications: previous.notifications?.map((item) =>
                item.id === id ? { ...item, readAt } : item
              )
            }
          : previous
      )
    }
  })
  const dismissMutation = useMutation({
    mutationFn: (id: string) => dismissTodayNotification(session.access_token, id),
    onSuccess: ({ id }) => {
      queryClient.setQueryData<TodayProjection>(queryKeys.today(session.user.id), (previous) =>
        previous
          ? { ...previous, notifications: previous.notifications?.filter((item) => item.id !== id) }
          : previous
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.today(session.user.id) })
    }
  })
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        root.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])
  const markRead = (id: string) => {
    setActionError('')
    return mutation.mutateAsync(id).catch(() => {
      setActionError('暫時無法標記已讀，請再試一次。')
    })
  }
  const openNotification = (event: MouseEvent<HTMLAnchorElement>, item: TodayNotification) => {
    if (!item.targetRoute) return
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return void (item.readAt ? undefined : markRead(item.id))
    event.preventDefault()
    void (item.readAt ? Promise.resolve() : markRead(item.id)).finally(() => {
      setOpen(false)
      navigate(item.targetRoute!)
    })
  }
  return (
    <div
      className={`today-signal today-notification-center${open ? ' is-open' : ''}${unreadCount ? ' has-unread' : ''}`}
      ref={root}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="today-notification-list"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="today-signal-icon">
          <Bell />
        </span>
        <span className="today-notification-summary">
          <span>待處理與課程提醒</span>
          <strong>{unreadCount}</strong>
        </span>
        <ChevronRight className="today-notification-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div
          className="today-notification-panel"
          id="today-notification-list"
          role="region"
          aria-label="待處理與課程提醒"
        >
          <div className="today-notification-panel-head">
            <strong>
              通知 <small>({notifications.length}/30)</small>
            </strong>
          </div>
          {actionError ? (
            <p className="today-notification-error" role="alert">
              {actionError}
            </p>
          ) : null}
          {notifications.length ? (
            <div className="today-notification-scroll">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={`today-notification-item${item.readAt ? ' is-read' : ''}`}
                >
                  <span className="today-notification-indicator" aria-hidden="true" />
                  {item.targetRoute ? (
                    <Link
                      to={item.targetRoute}
                      className="today-notification-main is-link"
                      onClick={(event) => openNotification(event, item)}
                    >
                      <span className="today-notification-copy">
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                      </span>
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  ) : (
                    <span className="today-notification-main">
                      <span className="today-notification-copy">
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                      </span>
                    </span>
                  )}
                  <div className="today-notification-meta">
                    {!item.readAt ? (
                      <button
                        type="button"
                        onClick={() => void markRead(item.id)}
                        disabled={mutation.isPending}
                        aria-label={`標記已讀：${item.title}`}
                      >
                        已讀
                      </button>
                    ) : (
                      <span className="today-notification-read-state">已讀</span>
                    )}
                    <time dateTime={item.occurredAt}>
                      {formatNoticeTime(item.occurredAt, timeZone)}
                    </time>
                  </div>
                  <button
                    className="today-notification-dismiss"
                    type="button"
                    onClick={() => {
                      setActionError('')
                      dismissMutation.mutate(item.id, {
                        onError: () => setActionError('暫時無法移除通知，請再試一次。')
                      })
                    }}
                    disabled={dismissMutation.isPending}
                    aria-label={`移除通知：${item.title}`}
                    title="移除通知"
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="today-notification-empty">目前沒有需要留意的提醒。</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

function TrainingQuote() {
  const [index] = useState(() => Math.floor(Math.random() * trainingQuotes.length))
  const quote = trainingQuotes[index]!
  return (
    <section className="today-quote" aria-label="訓練名言">
      <div className="today-quote-head">
        <Sparkles aria-hidden="true" />
      </div>
      <p>「{quote.text}」</p>
      <div className="today-quote-credit">
        <span>
          — {quote.author} · {quote.title}
        </span>
        <a href={quote.source} target="_blank" rel="noreferrer">
          原文來源 ↗
        </a>
      </div>
    </section>
  )
}

function formatNoticeTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(value))
}

function TodaySchedule({
  schedule
}: {
  schedule: NonNullable<ReturnType<typeof useTodayRouteQuery>['data']>['schedule']
}) {
  if (!schedule) return null
  return (
    <section className="today-schedule" aria-labelledby="today-schedule-title">
      <div className="today-schedule-heading">
        <div>
          <span className="eyebrow dark">TODAY'S FLOW</span>
          <h2 id="today-schedule-title">今日課表</h2>
        </div>
        <Link className="text-button" to="/calendar">
          完整行事曆 <ArrowRight aria-hidden="true" />
        </Link>
      </div>
      <div className="today-progress" aria-hidden="true">
        <span
          style={{
            width: `${schedule.sessions.length ? (schedule.counts.completed / schedule.sessions.length) * 100 : 0}%`
          }}
        />
      </div>
      {schedule.sessions.length ? (
        <ol>
          {schedule.sessions.map((item, index) => (
            <TodaySessionRow
              key={item.session.id}
              item={item}
              index={index}
              timeZone={schedule.timeZone}
            />
          ))}
        </ol>
      ) : (
        <p className="empty-inline">
          <CalendarDays /> 行事曆保持空白；可直接前往安排下一堂課。
        </p>
      )}
    </section>
  )
}

function TodaySessionRow({
  item,
  index,
  timeZone
}: {
  item: TodaySchedule['sessions'][number]
  index: number
  timeZone: string
}) {
  const { session, conflicts, trainingPlan } = item
  const planStatus = session.status === 'completed' ? 'complete' : trainingPlan?.status
  const planLabel =
    planStatus === 'complete'
      ? '已完成'
      : planStatus === 'ready'
        ? '已就緒'
        : planStatus === 'in_progress'
          ? '規劃中'
          : planStatus === 'unplanned'
            ? '待規劃'
            : null
  return (
    <li className={session.status === 'completed' ? 'today-session-completed' : undefined}>
      <Link to={`/sessions/${session.id}`}>
        <time dateTime={session.startsAt ?? undefined}>
          <strong>{formatSessionTime(session.startsAt, timeZone)}</strong>
          <small>{formatSessionPeriod(session.startsAt, timeZone)}</small>
        </time>
        <span className="today-timeline-node" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="today-session-person">
          <span className="today-session-avatar" aria-hidden="true">
            {session.studentName.slice(-2)}
          </span>
          <span className="today-session-copy">
            <strong>{session.studentName}</strong>
            <small>
              {session.location || '未設定地點'}
              {trainingPlan ? ` · ${trainingPlanDescription(trainingPlan)}` : ''}
            </small>
          </span>
        </span>
        <span className="today-session-meta">
          {planLabel ? <span className={planStatus}>{planLabel}</span> : null}
          <small className="today-session-duration">
            {formatSessionDuration(session.startsAt, session.endsAt)}
          </small>
          {conflicts.length ? <small>安排提醒</small> : null}
        </span>
        <ChevronRight className="today-session-arrow" aria-hidden="true" />
      </Link>
    </li>
  )
}

function trainingPlanDescription(plan: { exerciseCount: number; status: string }) {
  return plan.status === 'unplanned'
    ? '尚未建立訓練安排'
    : `${plan.exerciseCount} 個動作${plan.status === 'ready' ? '・安排已完成' : '・規劃中'}`
}

function TodaySkeleton() {
  return (
    <section className="today-signals" aria-label="載入中">
      <div className="skeleton-block" />
      <div className="skeleton-block" />
      <div className="skeleton-block" />
      <div className="skeleton-block" />
    </section>
  )
}
function TodayError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <section className="notice error" role="alert">
      <span>{todayErrorMessage(error, import.meta.env.DEV)}</span>
      <button onClick={onRetry}>重試</button>
    </section>
  )
}
function formatToday(date: string, _timeZone: string) {
  const weekday = new Intl.DateTimeFormat('zh-TW', { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(`${date}T12:00:00Z`)
  )
  return `${date.replaceAll('-', '.')} / ${weekday}`
}
function dayGreeting(timeZone: string) {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone
    }).format(new Date())
  )
  return hour < 12 ? '早安' : hour < 18 ? '午安' : '晚安'
}
function formatPeriod(period: { startsOn: string; endsOn: string }) {
  const [year, month] = period.startsOn.split('-')
  return `${year} 年 ${Number(month)} 月實收`
}
function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'TWD' ? 0 : undefined
  }).format(amountMinor)
}
function lessonText(remaining: number) {
  return remaining < 0
    ? `尚欠 ${Math.abs(remaining)} 堂`
    : remaining === 0
      ? '堂數不足'
      : `剩餘 ${remaining} 堂`
}
function formatSessionTime(value: string | null, timeZone: string) {
  return value
    ? new Intl.DateTimeFormat('zh-TW', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date(value))
    : '—'
}
function formatSessionPeriod(value: string | null, timeZone: string) {
  return value
    ? (new Intl.DateTimeFormat('zh-TW', { timeZone, hour: 'numeric', hour12: true })
        .formatToParts(new Date(value))
        .find((part) => part.type === 'dayPeriod')?.value ?? '')
    : ''
}
function formatSessionDuration(startsAt: string | null, endsAt: string | null) {
  if (!startsAt || !endsAt) return '時長未設定'
  const minutes = Math.round((Date.parse(endsAt) - Date.parse(startsAt)) / 60_000)
  return minutes > 0 ? `${minutes} 分鐘` : '時長未設定'
}
