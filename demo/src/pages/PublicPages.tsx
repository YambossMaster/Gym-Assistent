import { format, isBefore, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { CalendarClock, Check, Clock3, Download } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  findAvailableSlots,
  getStudent,
  publicTrainingNote,
  publicTrainingProjection
} from '../domain'
import { useStore } from '../store'
import { downloadTrainingRecordImage } from '../trainingRecordImage'
import { dateText, timeText } from '../utils/formatters'

export function TrainingSharePage() {
  const { token } = useParams()
  const { data } = useStore()
  const [downloaded, setDownloaded] = useState(false)
  const link = data.links.find((l) => l.token === token && l.capability === 'read_training_session')
  if (!link || isBefore(parseISO(link.expiresAt), new Date())) return <PublicExpired />
  const session = data.sessions.find((s) => s.id === link.sessionId)!
  const student = getStudent(data, session.studentId)!
  const projection = publicTrainingProjection(data, session.id)
  const note = publicTrainingNote(data, session.id, link.includeNote)
  const sessionStart = parseISO(session.startsAt)
  const sessionEnd = parseISO(session.endsAt)
  const sessionDate = format(sessionStart, 'yyyy年M月d日')
  const sessionWeekday = format(sessionStart, 'EEEE', { locale: zhTW })
  const sessionTime = `${format(sessionStart, 'HH:mm')}–${format(sessionEnd, 'HH:mm')}`
  const durationMinutes = Math.round((sessionEnd.getTime() - sessionStart.getTime()) / 60000)
  return (
    <div className="public-layout">
      <div className="public-brand record-public-brand">
        <span className="brand-mark">F</span> FORM
      </div>
      <main className="public-card training-record-card">
        <header className="public-record-header">
          <div className="public-record-identity">
            <span className="eyebrow">TRAINING RECORD</span>
            <div className="public-record-date">
              <strong>{sessionDate}</strong>
              <strong>{sessionWeekday}</strong>
            </div>
            <time dateTime={session.startsAt}>{sessionTime}</time>
          </div>
          <div className="public-record-actions">
            <div className="public-record-duration">
              <span>訓練時間</span>
              <strong>
                {durationMinutes} <small>min</small>
              </strong>
            </div>
            <button
              className="download-record-button"
              onClick={async () => {
                await downloadTrainingRecordImage({
                  date: format(sessionStart, 'yyyy/MM/dd'),
                  weekday: sessionWeekday,
                  time: sessionTime,
                  studentName: student.name,
                  durationMinutes,
                  exercises: projection,
                  note
                })
                setDownloaded(true)
                window.setTimeout(() => setDownloaded(false), 1800)
              }}
            >
              <span className="download-record-icon">{downloaded ? <Check /> : <Download />}</span>
              <span>
                <strong>{downloaded ? '已下載' : '下載'}</strong>
                <small>PNG</small>
              </span>
            </button>
          </div>
        </header>
        <h1 className="public-record-title">{student.name}的訓練紀錄</h1>
        <div className="public-exercises">
          {projection.map((exercise, i) => (
            <section key={exercise.name}>
              <div>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <h2>{exercise.name}</h2>
              </div>
              {exercise.sets.map((set, j) => (
                <div className="public-set" key={j}>
                  <span>SET {j + 1}</span>
                  <strong>
                    {set.weight ?? '—'} {set.weight !== undefined ? set.unit : ''}
                  </strong>
                  <strong>× {set.reps ?? '—'}</strong>
                  <small>RPE {set.rpe ?? '—'}</small>
                  <em className={set.result ?? ''}>
                    {set.result === 'completed'
                      ? '已完成'
                      : set.result === 'incomplete'
                        ? '未完成'
                        : '未記錄'}
                  </em>
                </div>
              ))}
            </section>
          ))}
        </div>
        {note && (
          <section className="public-shared-note">
            <span>COACH NOTE</span>
            <p>{note}</p>
          </section>
        )}
      </main>
    </div>
  )
}

export function ReschedulePage() {
  const { token } = useParams()
  const { data, redeemReschedule } = useStore()
  const link = data.links.find((l) => l.token === token && l.capability === 'reschedule_session')
  const [done, setDone] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  if (done)
    return (
      <div className="public-layout">
        <div className="public-card success-card">
          <div className="success-mark">
            <Check />
          </div>
          <span className="eyebrow">RESCHEDULED</span>
          <h1>改期完成。</h1>
          <p>Kevin 教練已收到最新安排，你可以關閉這個頁面。</p>
        </div>
      </div>
    )
  if (!link || link.usedAt || isBefore(parseISO(link.expiresAt), new Date()))
    return <PublicExpired />
  const session = data.sessions.find((s) => s.id === link.sessionId)!
  const student = getStudent(data, session.studentId)!
  const slots = findAvailableSlots(data, session)
  const dates = [...new Set(slots.map((slot) => format(slot.start, 'yyyy-MM-dd')))]
  const originalDate = format(parseISO(session.startsAt), 'yyyy-MM-dd')
  const activeDate = dates.includes(selectedDate)
    ? selectedDate
    : dates.includes(originalDate)
      ? originalDate
      : dates[0]
  const slotsForDate = slots.filter((slot) => format(slot.start, 'yyyy-MM-dd') === activeDate)
  const periods = [
    { label: '早上時段', slots: slotsForDate.filter((slot) => slot.start.getHours() < 12) },
    {
      label: '下午時段',
      slots: slotsForDate.filter(
        (slot) => slot.start.getHours() >= 12 && slot.start.getHours() < 18
      )
    },
    { label: '晚上時段', slots: slotsForDate.filter((slot) => slot.start.getHours() >= 18) }
  ].filter((period) => period.slots.length)
  return (
    <div className="public-layout">
      <div className="public-brand">
        <span className="brand-mark">F</span> FORM <small>RESCHEDULE</small>
      </div>
      <main className="public-card">
        <span className="eyebrow">PRIVATE LINK / 24 HOURS</span>
        <h1>{student.name.slice(-2)}，選一個更適合的時間。</h1>
        <p>
          原課程：{dateText(session.startsAt)}　{timeText(session.startsAt)}
        </p>
        {slots.length ? (
          <div className="reschedule-picker">
            <div className="reschedule-dates" aria-label="選擇日期">
              {dates.map((date) => {
                const value = parseISO(date)
                return (
                  <button
                    key={date}
                    className={date === activeDate ? 'active' : ''}
                    onClick={() => setSelectedDate(date)}
                  >
                    <span>{format(value, 'EEE', { locale: zhTW })}</span>
                    <strong>{format(value, 'M/d')}</strong>
                  </button>
                )
              })}
            </div>
            <div className="reschedule-periods">
              {periods.map((period) => (
                <section key={period.label}>
                  <h2>{period.label}</h2>
                  <div className="reschedule-times">
                    {period.slots.map((slot) => (
                      <button
                        key={slot.start.toISOString()}
                        onClick={() => {
                          if (token && redeemReschedule(token, slot.start.toISOString()))
                            setDone(true)
                        }}
                      >
                        {format(slot.start, 'HH:mm')}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : (
          <div className="public-no-slots">
            <CalendarClock />
            <strong>目前沒有可用時段</strong>
            <span>請直接聯絡教練討論其他安排。</span>
          </div>
        )}
      </main>
    </div>
  )
}

const PublicExpired = () => (
  <div className="public-layout">
    <div className="public-card expired-card">
      <div className="expired-mark">
        <Clock3 />
      </div>
      <span className="eyebrow">LINK UNAVAILABLE</span>
      <h1>這個連結已失效。</h1>
      <p>請直接聯絡你的教練，取得新的分享連結。</p>
    </div>
  </div>
)
