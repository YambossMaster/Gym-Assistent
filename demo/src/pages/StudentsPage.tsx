import { format, isAfter, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import {
  ArrowRight,
  CalendarClock,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FormSelect, Modal, PageHeader } from '../components'
import { lessonSummary } from '../domain'
import { useStore } from '../store'
import { timeText } from '../utils/formatters'

export function StudentsPage() {
  const { data, addStudent, addPurchase, addSeries } = useStore()
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'active' | 'archived'>('active')
  const [modal, setModal] = useState(false)
  const navigate = useNavigate()
  const filtered = data.students.filter(
    (s) => s.active === (view === 'active') && (s.name.includes(query) || s.goal.includes(query))
  )
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const id = addStudent({
      name: String(values.get('name')),
      phone: String(values.get('phone')),
      goal: String(values.get('goal')),
      privateNote: String(values.get('note'))
    })
    const lessonCount = Number(values.get('lessons') || 0)
    const fixedTime = String(values.get('time') || '')
    if (fixedTime)
      addSeries({
        studentId: id,
        weekday: Number(values.get('weekday')),
        localStartTime: fixedTime,
        durationMinutes: Number(values.get('duration')),
        intervalWeeks: Number(values.get('interval')),
        active: true
      })
    if (lessonCount > 0)
      addPurchase({
        studentId: id,
        purchasedAt: new Date().toISOString(),
        amount: Number(values.get('amount') || 0),
        lessonCount,
        note: '初始購課'
      })
    setModal(false)
    navigate(`/students/${id}`)
  }
  return (
    <div className="page">
      <PageHeader
        eyebrow="CLIENT ROSTER / 04 ACTIVE"
        title="學生"
        description="每位學生的課程、堂數與訓練脈絡，都在同一個地方。"
        actions={
          <button className="button accent" onClick={() => setModal(true)}>
            <Plus />
            新增學生
          </button>
        }
      />
      <div className="toolbar reveal delay-1">
        <label className="search-box">
          <Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋姓名或訓練目標"
          />
        </label>
        <div className="segmented">
          <button className={view === 'active' ? 'active' : ''} onClick={() => setView('active')}>
            進行中 <span>{data.students.filter((s) => s.active).length}</span>
          </button>
          <button
            className={view === 'archived' ? 'active' : ''}
            onClick={() => setView('archived')}
          >
            已封存 <span>{data.students.filter((s) => !s.active).length}</span>
          </button>
        </div>
      </div>
      <div className="student-grid reveal delay-2">
        {filtered.map((student, index) => {
          const summary = lessonSummary(data, student.id)
          const next = data.sessions
            .filter(
              (s) =>
                s.studentId === student.id &&
                s.status === 'scheduled' &&
                isAfter(parseISO(s.startsAt), new Date())
            )
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
          const ratio = summary.purchased
            ? Math.max(0, summary.remaining / summary.purchased) * 100
            : 0
          return (
            <Link to={`/students/${student.id}`} className="student-card" key={student.id}>
              <div className="student-card-top">
                <span className="student-index">{String(index + 1).padStart(2, '0')}</span>
                <button className="icon-button">
                  <MoreHorizontal />
                </button>
              </div>
              <div className="large-avatar">
                {student.name.slice(-2)}
                <span className={student.lineLinked ? 'online' : ''} />
              </div>
              <h2>{student.name}</h2>
              <p>{student.goal}</p>
              <div className="lesson-balance">
                <div>
                  <span>剩餘堂數</span>
                  <strong className={summary.remaining <= 2 ? 'warning-text' : ''}>
                    {summary.remaining}
                  </strong>
                  <small>/ {summary.purchased}</small>
                </div>
                <div className="balance-bar">
                  <span style={{ width: `${ratio}%` }} />
                </div>
              </div>
              <div className="next-session">
                <CalendarClock />
                <div>
                  <span>下次課程</span>
                  <strong>
                    {next
                      ? `${format(parseISO(next.startsAt), 'M/d EEE', { locale: zhTW })}・${timeText(next.startsAt)}`
                      : '尚未安排'}
                  </strong>
                </div>
                <ChevronRight />
              </div>
            </Link>
          )
        })}
      </div>
      {modal && (
        <Modal title="建立學生與第一期安排" onClose={() => setModal(false)}>
          <form className="form-stack" onSubmit={onSubmit}>
            <div className="form-section-label">
              <span>01</span>基本資料
            </div>
            <label>
              學生姓名
              <input name="name" required placeholder="例如：陳品妤" autoFocus />
            </label>
            <div className="field-row">
              <label>
                聯絡電話
                <input name="phone" placeholder="僅供教練辨識" />
              </label>
              <label>
                訓練目標
                <input name="goal" required placeholder="提升肌力・改善肩頸" />
              </label>
            </div>
            <label>
              私人備註
              <textarea name="note" placeholder="這些內容絕不會出現在學生分享頁" />
            </label>
            <div className="form-section-label">
              <span>02</span>初始購課
            </div>
            <div className="field-row">
              <label>
                購買堂數
                <input type="number" name="lessons" min="0" defaultValue="8" />
              </label>
              <label>
                實收金額
                <input type="number" name="amount" min="0" defaultValue="16000" />
              </label>
            </div>
            <div className="form-section-label">
              <span>03</span>固定課程（可稍後設定）
            </div>
            <div className="field-row">
              <FormSelect
                label="星期"
                name="weekday"
                defaultValue="3"
                options={['一', '二', '三', '四', '五', '六'].map((day, index) => ({
                  value: index + 1,
                  label: `星期${day}`
                }))}
              />
              <label>
                開始時間
                <input name="time" type="time" defaultValue="10:00" />
              </label>
            </div>
            <div className="field-row">
              <FormSelect
                label="每堂長度"
                name="duration"
                defaultValue="60"
                options={[45, 60, 75, 90].map((minutes) => ({
                  value: minutes,
                  label: `${minutes} 分鐘`
                }))}
              />
              <FormSelect
                label="頻率"
                name="interval"
                defaultValue="1"
                options={[
                  { value: 1, label: '每週' },
                  { value: 2, label: '每兩週' }
                ]}
              />
            </div>
            <div className="form-note">
              <Sparkles />
              建立後會依購買堂數，自動沿固定時段產生未來課程。
            </div>
            <div className="form-actions">
              <button type="button" className="button ghost" onClick={() => setModal(false)}>
                取消
              </button>
              <button className="button accent">
                建立並開始排課 <ArrowRight />
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
