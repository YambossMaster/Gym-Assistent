import { format, parseISO } from 'date-fns'
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  Plus,
  Sparkles,
  TrendingUp,
  XCircle
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Badge, FormSelect, Modal } from '../components'
import { formatPerformance, PerformanceTrendModal } from '../components/PerformanceTrendModal'
import {
  getStudent,
  lessonSummary,
  studentCourseRecordSessions,
  studentExercisePerformanceEntries
} from '../domain'
import { useStore } from '../store'
import type { Purchase, ScheduleSeries } from '../types'
import { dateText, money, timeText } from '../utils/formatters'

export function StudentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    data,
    addPurchase,
    updatePurchase,
    deletePurchase,
    addSeries,
    updateSeries,
    deleteSeries,
    updateStudent,
    deleteStudent
  } = useStore()
  const [purchaseEditor, setPurchaseEditor] = useState<Purchase | 'new' | null>(null)
  const [editModal, setEditModal] = useState(false)
  const [seriesEditor, setSeriesEditor] = useState<ScheduleSeries | 'new' | null>(null)
  const [performanceDirectoryOpen, setPerformanceDirectoryOpen] = useState(false)
  const [selectedPerformanceKey, setSelectedPerformanceKey] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: 'purchase' | 'series' | 'student'
    id: string
    name: string
  } | null>(null)
  const student = id ? getStudent(data, id) : undefined
  if (!student) return <Navigate to="/students" />
  const summary = lessonSummary(data, student.id)
  const sessions = studentCourseRecordSessions(data, student.id)
  const purchases = data.purchases
    .filter((p) => p.studentId === student.id)
    .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))
  const fixedSeries = data.series.filter(
    (series) => series.studentId === student.id && series.active
  )
  const performanceEntries = studentExercisePerformanceEntries(data, student.id)
  const selectedPerformance = performanceEntries.find(
    (entry) => entry.key === selectedPerformanceKey
  )
  const closePerformance = () => {
    setSelectedPerformanceKey(null)
    setPerformanceDirectoryOpen(false)
  }
  const submitPurchase = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const updates = {
      purchasedAt: new Date(String(values.get('date'))).toISOString(),
      amount: Number(values.get('amount')),
      lessonCount: Number(values.get('count')),
      note: String(values.get('note'))
    }
    if (purchaseEditor === 'new') addPurchase({ studentId: student.id, ...updates })
    else if (purchaseEditor) updatePurchase(purchaseEditor.id, updates)
    setPurchaseEditor(null)
  }
  const submitEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    updateStudent(student.id, {
      name: String(values.get('name')),
      phone: String(values.get('phone')),
      goal: String(values.get('goal')),
      privateNote: String(values.get('note'))
    })
    setEditModal(false)
  }
  const submitSeries = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const updates = {
      weekday: Number(values.get('weekday')),
      localStartTime: String(values.get('time')),
      durationMinutes: Number(values.get('duration')),
      intervalWeeks: Number(values.get('interval')),
      active: true
    }
    if (seriesEditor === 'new') addSeries({ studentId: student.id, ...updates })
    else if (seriesEditor) updateSeries(seriesEditor.id, updates)
    setSeriesEditor(null)
  }
  const confirmDelete = () => {
    if (!deleteTarget) return
    if (deleteTarget.kind === 'purchase') deletePurchase(deleteTarget.id)
    if (deleteTarget.kind === 'series') deleteSeries(deleteTarget.id)
    if (deleteTarget.kind === 'student') {
      deleteStudent(deleteTarget.id)
      navigate('/students')
    }
    setDeleteTarget(null)
  }
  return (
    <div className="page detail-page">
      <Link className="back-link" to="/students">
        <ChevronLeft /> 回到學生列表
      </Link>
      <div className="profile-hero reveal">
        <div className="profile-identity">
          <div className="profile-avatar">{student.name.slice(-2)}</div>
          <div>
            <span className="eyebrow">CLIENT / {student.active ? 'ACTIVE' : 'ARCHIVED'}</span>
            <h1>{student.name}</h1>
            <p>{student.goal}</p>
          </div>
        </div>
        <div className="profile-actions">
          <button
            className="button ghost"
            onClick={() => updateStudent(student.id, { active: !student.active })}
          >
            {student.active ? '封存' : '恢復'}
          </button>
          <button className="button ghost" onClick={() => setEditModal(true)}>
            <Edit3 />
            編輯資料
          </button>
          <button className="button accent" onClick={() => setPurchaseEditor('new')}>
            <Plus />
            記錄購課
          </button>
        </div>
      </div>
      <div className="detail-grid">
        <section className="panel balance-feature reveal delay-1">
          <span className="eyebrow">LESSON ACCOUNT</span>
          <div className="balance-main">
            <strong className={summary.remaining < 0 ? 'warning-text' : ''}>
              {summary.remaining}
            </strong>
            <span>
              堂<br />
              剩餘
            </span>
          </div>
          <div className="balance-equation">
            <div>
              <strong>{summary.purchased}</strong>
              <span>購買</span>
            </div>
            <span>−</span>
            <div>
              <strong>{summary.completed}</strong>
              <span>完成</span>
            </div>
            <span>=</span>
            <div>
              <strong>{summary.remaining}</strong>
              <span>可用</span>
            </div>
          </div>
          {summary.remaining <= 2 && (
            <div className="inline-alert">
              <AlertTriangle />
              堂數偏低，但不會阻止排課。
            </div>
          )}
        </section>
        <section className="panel private-note reveal delay-2">
          <div className="section-head">
            <div>
              <span className="eyebrow">PRIVATE NOTE</span>
              <h2>教練私人備註</h2>
            </div>
            <Badge>不會分享</Badge>
          </div>
          <p>{student.privateNote || '尚未填寫私人備註。'}</p>
          <div className="contact-row">
            <span>聯絡方式</span>
            <strong>{student.phone || '—'}</strong>
          </div>
          <div className="contact-row">
            <span>LINE 提醒</span>
            <Badge tone={student.lineLinked ? 'lime' : 'neutral'}>
              {student.lineLinked ? '已綁定' : '未綁定'}
            </Badge>
          </div>
        </section>
      </div>
      <section className="panel series-panel reveal delay-2">
        <div className="section-head">
          <div>
            <span className="eyebrow">FIXED RHYTHM</span>
            <h2>固定課程節奏</h2>
          </div>
          <button className="button ghost small" onClick={() => setSeriesEditor('new')}>
            <Plus />
            新增時段
          </button>
        </div>
        <div className="series-list">
          {fixedSeries.length ? (
            fixedSeries.map((series) => (
              <div className="series-row" key={series.id}>
                <div className="series-day">
                  {['日', '一', '二', '三', '四', '五', '六'][series.weekday]}
                </div>
                <div>
                  <strong>
                    星期{['日', '一', '二', '三', '四', '五', '六'][series.weekday]}・
                    {series.localStartTime}
                  </strong>
                  <span>
                    {series.intervalWeeks === 1 ? '每週' : '每兩週'}・{series.durationMinutes} 分鐘
                  </span>
                </div>
                <div className="inline-actions">
                  <button onClick={() => setSeriesEditor(series)} aria-label="編輯固定時段">
                    <Edit3 />
                  </button>
                  <button
                    className="delete"
                    onClick={() =>
                      setDeleteTarget({
                        kind: 'series',
                        id: series.id,
                        name: `星期${['日', '一', '二', '三', '四', '五', '六'][series.weekday]} ${series.localStartTime}`
                      })
                    }
                    aria-label="刪除固定時段"
                  >
                    <XCircle />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="compact-empty">
              <CalendarClock />
              <span>尚未設定固定時段，仍可在行事曆單獨排課。</span>
            </div>
          )}
        </div>
      </section>
      <button
        type="button"
        className="performance-entry reveal delay-3"
        onClick={() => setPerformanceDirectoryOpen(true)}
      >
        <span className="performance-entry-icon">
          <TrendingUp />
        </span>
        <span className="performance-entry-copy">
          <strong>個人運動表現</strong>
          <small>查看所有動作的成功紀錄與成長軌跡</small>
        </span>
        <span className="performance-entry-count">
          <strong>{performanceEntries.length}</strong>
          <small>個動作</small>
        </span>
        <ChevronRight />
      </button>
      <section className="panel history-panel reveal delay-3">
        <div className="section-head">
          <div>
            <span className="eyebrow">SESSION HISTORY</span>
            <h2>課程紀錄</h2>
          </div>
          <span className="muted">{sessions.length} 堂顯示中</span>
        </div>
        <div className="history-list">
          {sessions.map((s) => (
            <Link key={s.id} to={`/sessions/${s.id}`} className="history-row">
              <div className={`status-glyph ${s.status}`}>
                {s.status === 'completed' ? (
                  <Check />
                ) : s.status === 'cancelled' ? (
                  <XCircle />
                ) : (
                  <Clock3 />
                )}
              </div>
              <div>
                <strong>{dateText(s.startsAt)}</strong>
                <span>
                  {timeText(s.startsAt)}–{timeText(s.endsAt)}・{s.location}
                </span>
              </div>
              <Badge tone={s.status === 'scheduled' ? 'lime' : 'neutral'}>
                {s.status === 'completed'
                  ? '已完成'
                  : s.status === 'cancelled'
                    ? '已取消'
                    : '已排定'}
              </Badge>
              <ChevronRight />
            </Link>
          ))}
        </div>
      </section>
      <section className="panel purchase-panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">PURCHASE LEDGER</span>
            <h2>購課紀錄</h2>
          </div>
          <button className="button ghost small" onClick={() => setPurchaseEditor('new')}>
            <Plus />
            新增
          </button>
        </div>
        {purchases.map((p) => (
          <div className="purchase-row" key={p.id}>
            <span>{format(parseISO(p.purchasedAt), 'yyyy.MM.dd')}</span>
            <strong>+{p.lessonCount} 堂</strong>
            <span>{money.format(p.amount)}</span>
            <small>{p.note || '—'}</small>
            <div className="inline-actions">
              <button onClick={() => setPurchaseEditor(p)} aria-label="編輯購課">
                <Edit3 />
              </button>
              <button
                className="delete"
                onClick={() =>
                  setDeleteTarget({
                    kind: 'purchase',
                    id: p.id,
                    name: `${format(parseISO(p.purchasedAt), 'yyyy.MM.dd')} 的 ${p.lessonCount} 堂購課`
                  })
                }
                aria-label="刪除購課"
              >
                <XCircle />
              </button>
            </div>
          </div>
        ))}
      </section>
      {performanceDirectoryOpen && !selectedPerformance && (
        <Modal
          wide
          className="performance-directory-modal"
          title={`${student.name}・個人運動表現`}
          onClose={closePerformance}
        >
          <div className="performance-directory-head">
            <div>
              <span className="eyebrow">MOVEMENT RECORDS</span>
              <p>只統計成功完成的組別，並依擁有有效紀錄的課堂次數排序。</p>
            </div>
            <strong>{String(performanceEntries.length).padStart(2, '0')}</strong>
          </div>
          {performanceEntries.length ? (
            <div className="performance-directory-list">
              {performanceEntries.map((entry, index) => {
                const latest = entry.summary.history.at(-1)
                return (
                  <button
                    type="button"
                    key={entry.key}
                    onClick={() => setSelectedPerformanceKey(entry.key)}
                  >
                    <span className="performance-rank">{String(index + 1).padStart(2, '0')}</span>
                    <span className="performance-movement-mark">
                      <TrendingUp />
                    </span>
                    <span className="performance-movement-name">
                      <strong>{entry.exercise.name}</strong>
                      <small>
                        {entry.exercise.region}・
                        {entry.summary.metric === 'weight' ? '重量最佳' : '次數最佳'}
                      </small>
                    </span>
                    <span className="performance-record-count">
                      <strong>{entry.sessionCount}</strong>
                      <small>次紀錄</small>
                    </span>
                    <span className="performance-latest">
                      <small>最近紀錄</small>
                      <strong>
                        {latest ? format(parseISO(latest.startsAt), 'yyyy.MM.dd') : '—'}
                      </strong>
                    </span>
                    <span className="performance-personal-best">
                      <small>個人最佳</small>
                      <strong>
                        {formatPerformance(entry.summary.personal, entry.summary.unit)}
                      </strong>
                    </span>
                    <ChevronRight />
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="performance-directory-empty">
              <TrendingUp />
              <strong>尚無成功完成的動作紀錄</strong>
              <span>課堂中的組別標記為「已完成」後，會自動出現在這裡。</span>
            </div>
          )}
        </Modal>
      )}
      {performanceDirectoryOpen && selectedPerformance && (
        <PerformanceTrendModal
          studentName={student.name}
          exercise={selectedPerformance.exercise}
          summary={selectedPerformance.summary}
          context="student-history"
          onBack={() => setSelectedPerformanceKey(null)}
          onClose={closePerformance}
        />
      )}
      {purchaseEditor && (
        <Modal
          title={purchaseEditor === 'new' ? `記錄 ${student.name} 的購課` : '編輯購課紀錄'}
          onClose={() => setPurchaseEditor(null)}
        >
          <form className="form-stack" onSubmit={submitPurchase}>
            <div className="field-row">
              <label>
                購課日期
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={
                    purchaseEditor === 'new'
                      ? format(new Date(), 'yyyy-MM-dd')
                      : format(parseISO(purchaseEditor.purchasedAt), 'yyyy-MM-dd')
                  }
                />
              </label>
              <label>
                購買堂數
                <input
                  type="number"
                  name="count"
                  min="1"
                  required
                  defaultValue={purchaseEditor === 'new' ? 8 : purchaseEditor.lessonCount}
                />
              </label>
            </div>
            <label>
              實收金額（TWD）
              <input
                type="number"
                name="amount"
                min="0"
                required
                defaultValue={purchaseEditor === 'new' ? 16000 : purchaseEditor.amount}
              />
            </label>
            <label>
              備註
              <input
                name="note"
                defaultValue={purchaseEditor === 'new' ? '' : purchaseEditor.note}
                placeholder="例如：8 堂續課方案"
              />
            </label>
            <div className="form-note">
              <Sparkles />
              修改或刪除後，堂數會立即重新計算；系統不會阻止負數餘額。
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => setPurchaseEditor(null)}
              >
                取消
              </button>
              <button className="button accent">
                {purchaseEditor === 'new' ? '儲存購課' : '儲存修改'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {editModal && (
        <Modal title="編輯學生資料" onClose={() => setEditModal(false)}>
          <form className="form-stack" onSubmit={submitEdit}>
            <label>
              學生姓名
              <input name="name" required defaultValue={student.name} />
            </label>
            <div className="field-row">
              <label>
                聯絡電話
                <input name="phone" defaultValue={student.phone} />
              </label>
              <label>
                訓練目標
                <input name="goal" required defaultValue={student.goal} />
              </label>
            </div>
            <label>
              私人備註
              <textarea name="note" defaultValue={student.privateNote} />
            </label>
            <div className="modal-danger-row">
              <span>永久刪除學生、購課、課程與紀錄</span>
              <button
                type="button"
                onClick={() => {
                  setEditModal(false)
                  setDeleteTarget({ kind: 'student', id: student.id, name: student.name })
                }}
              >
                刪除學生
              </button>
            </div>
            <div className="form-actions">
              <button type="button" className="button ghost" onClick={() => setEditModal(false)}>
                取消
              </button>
              <button className="button accent">儲存變更</button>
            </div>
          </form>
        </Modal>
      )}
      {seriesEditor && (
        <Modal
          title={seriesEditor === 'new' ? '新增固定課程時段' : '編輯固定課程時段'}
          onClose={() => setSeriesEditor(null)}
        >
          <form className="form-stack" onSubmit={submitSeries}>
            <div className="field-row">
              <FormSelect
                label="星期"
                name="weekday"
                defaultValue={seriesEditor === 'new' ? 3 : seriesEditor.weekday}
                options={['一', '二', '三', '四', '五', '六'].map((day, index) => ({
                  value: index + 1,
                  label: `星期${day}`
                }))}
              />
              <label>
                開始時間
                <input
                  type="time"
                  name="time"
                  required
                  defaultValue={seriesEditor === 'new' ? '10:00' : seriesEditor.localStartTime}
                />
              </label>
            </div>
            <div className="field-row">
              <FormSelect
                label="課程長度"
                name="duration"
                defaultValue={seriesEditor === 'new' ? 60 : seriesEditor.durationMinutes}
                options={[45, 60, 75, 90].map((minutes) => ({
                  value: minutes,
                  label: `${minutes} 分鐘`
                }))}
              />
              <FormSelect
                label="週期"
                name="interval"
                defaultValue={seriesEditor === 'new' ? 1 : seriesEditor.intervalWeeks}
                options={[
                  { value: 1, label: '每週' },
                  { value: 2, label: '每兩週' }
                ]}
              />
            </div>
            <div className="form-note">
              <CalendarClock />
              修改固定時段不會偷偷移動既有課程；既有課程仍可逐堂編輯。
            </div>
            <div className="form-actions">
              <button type="button" className="button ghost" onClick={() => setSeriesEditor(null)}>
                取消
              </button>
              <button className="button accent">
                {seriesEditor === 'new' ? '新增並調和排程' : '儲存修改'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleteTarget && (
        <Modal
          title={`刪除${deleteTarget.kind === 'student' ? '學生' : deleteTarget.kind === 'purchase' ? '購課紀錄' : '固定時段'}？`}
          onClose={() => setDeleteTarget(null)}
        >
          <div className="delete-confirm">
            <div className="delete-confirm-icon">
              <XCircle />
            </div>
            <p>
              <strong>{deleteTarget.name}</strong>
              {deleteTarget.kind === 'student'
                ? '及其所有本機資料將永久刪除。'
                : '將從目前資料中移除。既有課堂不會被偷偷移動。'}
            </p>
            <div className="form-actions">
              <button className="button ghost" onClick={() => setDeleteTarget(null)}>
                保留
              </button>
              <button className="button danger" onClick={confirmDelete}>
                確認刪除
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
