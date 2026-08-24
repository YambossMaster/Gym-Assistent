import { format, isAfter, isSameDay, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Sparkles,
  UserPlus,
  UsersRound,
  Zap
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, EmptyState, PageHeader } from '../components'
import { getStudent, lessonSummary, sessionIssues } from '../domain'
import { useStore } from '../store'
import type { CourseSession } from '../types'
import { money, nowGreeting, timeText } from '../utils/formatters'

export function TodayPage() {
  const { data } = useStore()
  const todaySessions = data.sessions
    .filter((s) => isSameDay(parseISO(s.startsAt), new Date()) && s.status !== 'cancelled')
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const activeStudents = data.students.filter((s) => s.active)
  const lowBalance = activeStudents.filter((s) => lessonSummary(data, s.id).remaining <= 2)
  const conflicts = data.sessions.filter(
    (session) => session.status !== 'cancelled' && sessionIssues(data, session).hasIssues
  )
  const completedToday = todaySessions.filter((s) => s.status === 'completed').length

  return (
    <div className="page dashboard-page">
      <PageHeader
        eyebrow={format(new Date(), 'yyyy.MM.dd / EEEE', { locale: zhTW })}
        title={`${nowGreeting()}，${data.settings.displayName.replace(' 教練', '')}`}
        description="今天的節奏已經排好。專注每一堂，其餘交給系統。"
        actions={
          <Link to="/students" className="button dark">
            <UserPlus />
            新增學生
          </Link>
        }
      />

      <section className="metric-strip reveal delay-1">
        <div className="hero-metric">
          <span>今日課程</span>
          <strong>{String(todaySessions.length).padStart(2, '0')}</strong>
          <small>
            {completedToday} 已完成 / {todaySessions.length - completedToday} 待進行
          </small>
        </div>
        <div className="metric">
          <div className="metric-icon">
            <UsersRound />
          </div>
          <div>
            <span>活躍學生</span>
            <strong>{activeStudents.length}</strong>
          </div>
          <small>本月 +2</small>
        </div>
        <div className="metric">
          <div className="metric-icon">
            <CircleDollarSign />
          </div>
          <div>
            <span>本月購課</span>
            <strong>
              {money.format(
                data.purchases
                  .filter((p) => parseISO(p.purchasedAt).getMonth() === new Date().getMonth())
                  .reduce((n, p) => n + p.amount, 0)
              )}
            </strong>
          </div>
          <small>依紀錄計算</small>
        </div>
        <div className="metric">
          <div className="metric-icon">
            <AlertTriangle />
          </div>
          <div>
            <span>需要注意</span>
            <strong>{lowBalance.length + Math.ceil(conflicts.length / 2)}</strong>
          </div>
          <small>堂數 / 衝突</small>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel schedule-panel reveal delay-2">
          <div className="section-head">
            <div>
              <span className="eyebrow">TODAY'S FLOW</span>
              <h2>今天的課</h2>
            </div>
            <Link to="/calendar" className="text-link">
              完整行事曆 <ArrowRight />
            </Link>
          </div>
          <div className="day-progress">
            <span
              style={{
                width: `${todaySessions.length ? (completedToday / todaySessions.length) * 100 : 0}%`
              }}
            />
          </div>
          <div className="session-list">
            {todaySessions.length ? (
              todaySessions.map((session, index) => (
                <SessionRow key={session.id} session={session} index={index} />
              ))
            ) : (
              <EmptyState title="今天沒有排課" text="留一點空白給自己，也是一種安排。" />
            )}
          </div>
        </section>

        <aside className="dashboard-aside reveal delay-3">
          <section className="panel pulse-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">COACH PULSE</span>
                <h2>待處理</h2>
              </div>
              <span className="signal-dot" />
            </div>
            <div className="attention-list">
              {lowBalance.slice(0, 3).map((student) => (
                <Link to={`/students/${student.id}`} key={student.id} className="attention-item">
                  <div className="attention-icon amber">
                    <Zap />
                  </div>
                  <div>
                    <strong>{student.name} 堂數偏低</strong>
                    <span>目前剩餘 {lessonSummary(data, student.id).remaining} 堂</span>
                  </div>
                  <ChevronRight />
                </Link>
              ))}
              {conflicts.length > 0 && (
                <Link to="/calendar" className="attention-item">
                  <div className="attention-icon red">
                    <AlertTriangle />
                  </div>
                  <div>
                    <strong>行事曆有時間衝突</strong>
                    <span>系統保留課程，請確認安排</span>
                  </div>
                  <ChevronRight />
                </Link>
              )}
              {!lowBalance.length && !conflicts.length && (
                <div className="all-clear">
                  <CheckCircle2 />
                  <strong>一切正常</strong>
                  <span>目前沒有需要處理的提醒。</span>
                </div>
              )}
            </div>
          </section>
          <section className="quote-card">
            <Sparkles />
            <p>
              「好的系統不替你做決定，
              <br />
              而是讓每個決定都有脈絡。」
            </p>
            <span>FORM PRINCIPLE / 01</span>
          </section>
        </aside>
      </div>
    </div>
  )
}

function SessionRow({ session, index }: { session: CourseSession; index: number }) {
  const { data } = useStore()
  const student = getStudent(data, session.studentId)
  const record = data.records.find((r) => r.sessionId === session.id)
  const isComplete = session.status === 'completed'
  return (
    <Link to={`/sessions/${session.id}`} className={`session-row ${isComplete ? 'completed' : ''}`}>
      <div className="time-block">
        <strong>{timeText(session.startsAt)}</strong>
        <span>{format(parseISO(session.startsAt), 'a', { locale: zhTW })}</span>
      </div>
      <div className="timeline-node">
        <span>{isComplete ? <Check /> : String(index + 1).padStart(2, '0')}</span>
      </div>
      <div className="session-person">
        <div className="mini-avatar">{student?.name.slice(-2)}</div>
        <div>
          <strong>{student?.name}</strong>
          <span>
            {record ? `${record.exercises.length} 個動作・計畫已建立` : '尚未建立訓練計畫'}
          </span>
        </div>
      </div>
      <div className="session-meta">
        <Badge tone={isComplete ? 'neutral' : record ? 'lime' : 'amber'}>
          {isComplete ? '已完成' : record ? '已就緒' : '待規劃'}
        </Badge>
        <span>
          {Math.round(
            (parseISO(session.endsAt).getTime() - parseISO(session.startsAt).getTime()) / 60000
          )}{' '}
          分鐘
        </span>
      </div>
      <ChevronRight />
    </Link>
  )
}
