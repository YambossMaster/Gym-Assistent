import type { Session } from '@supabase/supabase-js'
import { AlertTriangle, Cloud, UsersRound, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Page } from '../../shared/primitives'
import { useTodayRouteQuery } from './queries'
import { selectTodayRouteState } from './state'

export function TodayPage({ session }: { session: Session }) {
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
      title="今日概覽"
      eyebrow={today ? formatToday(today.date, today.timeZone) : '工作台'}
    >
      {state === 'loading' ? <TodaySkeleton /> : null}
      {state === 'error' ? <TodayError onRetry={() => void todayQuery.refetch()} /> : null}
      {today ? <TodaySignals today={today} refreshing={state === 'refreshing'} /> : null}
    </Page>
  )
}

function TodaySignals({
  today,
  refreshing
}: {
  today: NonNullable<ReturnType<typeof useTodayRouteQuery>['data']>
  refreshing: boolean
}) {
  return (
    <>
      {refreshing ? (
        <p className="cloud-state" role="status">
          <Cloud />
          正在更新
        </p>
      ) : null}
      <section className="today-signals" aria-label="工作台訊號">
        <div className="today-signal">
          <UsersRound />
          <span>活躍學生</span>
          <strong>{today.summary.activeStudents}</strong>
        </div>
        <div className="today-signal income">
          <WalletCards />
          <span>{formatPeriod(today.summary.incomePeriod)}</span>
          <div>
            {today.summary.incomeByCurrency.length ? (
              today.summary.incomeByCurrency.map((income) => (
                <strong key={income.currency}>
                  {formatMoney(income.amountMinor, income.currency)}
                </strong>
              ))
            ) : (
              <strong>尚無實收紀錄</strong>
            )}
          </div>
        </div>
        <div className="today-signal">
          <AlertTriangle />
          <span>堂數提醒</span>
          <strong>{today.summary.attentionCount}</strong>
        </div>
      </section>
      <section className="today-attention" aria-labelledby="today-attention-title">
        <div>
          <span className="eyebrow dark">堂數帳戶</span>
          <h2 id="today-attention-title">需要留意的堂數</h2>
        </div>
        {today.attention.length ? (
          <div className="attention-list">
            {today.attention.map((item) => (
              <Link key={item.student.id} to={item.targetRoute} className="attention-item">
                <div>
                  <strong>{item.student.name}</strong>
                  <span>{lessonText(item.lessonSummary.remaining)}</span>
                </div>
                <small>查看學生</small>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-inline">目前沒有需要處理的堂數提醒。</p>
        )}
      </section>
    </>
  )
}

function TodaySkeleton() {
  return (
    <section className="today-signals" aria-label="載入中">
      <div className="skeleton-block" />
      <div className="skeleton-block" />
      <div className="skeleton-block" />
    </section>
  )
}
function TodayError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="notice error" role="alert">
      <span>暫時無法整理目前的工作台訊號。</span>
      <button onClick={onRetry}>重試</button>
    </section>
  )
}
function formatToday(date: string, _timeZone: string) {
  return new Intl.DateTimeFormat('zh-TW', { dateStyle: 'full', timeZone: 'UTC' }).format(
    new Date(`${date}T12:00:00Z`)
  )
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
