import {
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronLeft,
  Copy,
  Dumbbell,
  Heart,
  Link2,
  Plus,
  RotateCcw,
  Search,
  Send,
  TrendingUp,
  XCircle
} from 'lucide-react'
import { parseISO } from 'date-fns'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { timeRangeFromForm } from '../calendarTime'
import { EmptyState, FormSelect, Modal } from '../components'
import { ExerciseFilterShelf } from '../components/ExerciseFilterShelf'
import {
  formatPerformance,
  formatPerformancePair,
  PerformanceTrendModal
} from '../components/PerformanceTrendModal'
import { TimeRangeFields } from '../components/TimeRangeFields'
import {
  exercisePerformanceSummary,
  getStudent,
  lessonSummary,
  previousExerciseSets,
  toggleTrainingSetResult,
  updateTrainingSetActualReps
} from '../domain'
import { filterExercises } from '../exerciseFilters'
import { useStore } from '../store'
import type { ExerciseDefinition, TrainingExercise, TrainingRecord, TrainingSet } from '../types'
import { dateText, timeText } from '../utils/formatters'

const trainingRecordContent = ({ updatedAt: _updatedAt, ...record }: TrainingRecord) =>
  JSON.stringify(record)

export function SessionPage() {
  const { id } = useParams()
  const {
    data,
    saveRecord,
    updateStatus,
    updateSession,
    issueLink,
    addExercise: addLibraryExercise
  } = useStore()
  const navigate = useNavigate()
  const session = data.sessions.find((s) => s.id === id)
  const [record, setRecord] = useState<TrainingRecord>(
    () =>
      data.records.find((r) => r.sessionId === id) ?? {
        sessionId: id ?? '',
        privateNote: '',
        exercises: [],
        updatedAt: new Date().toISOString()
      }
  )
  const [shareModal, setShareModal] = useState<{
    token?: string
    type: 'training' | 'reschedule'
    includeNote: boolean
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [moveModal, setMoveModal] = useState(false)
  const [moveFeedback, setMoveFeedback] = useState('')
  const [exercisePicker, setExercisePicker] = useState(false)
  const [exerciseCreator, setExerciseCreator] = useState(false)
  const [creatorBodyParts, setCreatorBodyParts] = useState<string[]>([])
  const [creatorCustomBodyPart, setCreatorCustomBodyPart] = useState('')
  const [exerciseQuery, setExerciseQuery] = useState('')
  const [pickerEquipment, setPickerEquipment] = useState('全部')
  const [pickerBodyParts, setPickerBodyParts] = useState<string[]>([])
  const [pickerMovementType, setPickerMovementType] = useState('全部')
  const [pickerView, setPickerView] = useState<'all' | 'favorite' | 'custom'>('all')
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved')
  const latestRecordRef = useRef(record)
  const saveRecordRef = useRef(saveRecord)
  const saveTimerRef = useRef<number | null>(null)
  const recordHasChangedRef = useRef(false)
  const savedRecordContentRef = useRef(trainingRecordContent(record))
  const [trendExerciseId, setTrendExerciseId] = useState<string | null>(null)

  useEffect(() => {
    saveRecordRef.current = saveRecord
  }, [saveRecord])

  useEffect(() => {
    latestRecordRef.current = record
    if (trainingRecordContent(record) === savedRecordContentRef.current) {
      recordHasChangedRef.current = false
      setSaveState('saved')
      return
    }

    recordHasChangedRef.current = true
    setSaveState('saving')
    saveTimerRef.current = window.setTimeout(() => {
      savedRecordContentRef.current = trainingRecordContent(record)
      saveRecordRef.current({ ...record, updatedAt: new Date().toISOString() })
      recordHasChangedRef.current = false
      saveTimerRef.current = null
      setSaveState('saved')
    }, 650)

    return () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    }
  }, [record])

  useEffect(
    () => () => {
      if (!recordHasChangedRef.current) return
      saveRecordRef.current({
        ...latestRecordRef.current,
        updatedAt: new Date().toISOString()
      })
    },
    []
  )

  if (!session) return <Navigate to="/today" />
  const student = getStudent(data, session.studentId)!
  const summary = lessonSummary(data, student.id)
  const trendExercise = record.exercises.find((exercise) => exercise.id === trendExerciseId)
  const trendSummary = trendExercise
    ? exercisePerformanceSummary(data, student.id, session.id, trendExercise, record)
    : null
  const pickerEquipmentTags = [
    ...new Set(data.exercises.map((exercise) => exercise.equipment))
  ].sort()
  const pickerBodyPartTags = [
    ...new Set(data.exercises.flatMap((exercise) => exercise.bodyParts))
  ].sort()
  const pickerResults = filterExercises(data.exercises, {
    query: exerciseQuery,
    equipment: pickerEquipment,
    bodyParts: pickerBodyParts,
    movementType: pickerMovementType
  })
    .filter(
      (exercise) =>
        pickerView === 'all' ||
        (pickerView === 'favorite' && exercise.favorite) ||
        (pickerView === 'custom' && !exercise.isSystem)
    )
    .sort((a, b) => Number(b.favorite) - Number(a.favorite))
  const updateSet = (
    exerciseId: string,
    setId: string,
    field: 'plannedWeight' | 'plannedReps' | 'rpe',
    value: number | undefined
  ) => {
    setRecord((r) => ({
      ...r,
      exercises: r.exercises.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((set) => (set.id === setId ? { ...set, [field]: value } : set))
            }
          : ex
      )
    }))
  }
  const transformSet = (
    exerciseId: string,
    setId: string,
    transform: (set: TrainingSet) => TrainingSet
  ) =>
    setRecord((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) => (set.id === setId ? transform(set) : set))
            }
          : exercise
      )
    }))
  const addRecordExercise = (
    source: Pick<ExerciseDefinition, 'id' | 'name' | 'bodyParts' | 'performanceMetric'>
  ) => {
    const exercise: TrainingExercise = {
      id: crypto.randomUUID(),
      definitionId: source.id,
      name: source.name,
      region: source.bodyParts.join('、'),
      performanceMetric: source.performanceMetric,
      sets: []
    }
    setRecord((r) => ({ ...r, exercises: [...r.exercises, exercise] }))
    setExercisePicker(false)
    setExerciseQuery('')
  }
  const createExercise = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const name = String(values.get('name')).trim()
    const equipment = String(values.get('equipment')).trim()
    if (!name || !equipment || !creatorBodyParts.length) return
    const movementType = String(values.get('movementType')) as ExerciseDefinition['movementType']
    const performanceMetric = String(
      values.get('performanceMetric')
    ) as ExerciseDefinition['performanceMetric']
    const definitionId = addLibraryExercise({
      name,
      equipment,
      bodyParts: creatorBodyParts,
      movementType,
      performanceMetric
    })
    addRecordExercise({ id: definitionId, name, bodyParts: creatorBodyParts, performanceMetric })
    setExerciseCreator(false)
  }
  const toggleCreatorBodyPart = (part: string) =>
    setCreatorBodyParts((parts) =>
      parts.includes(part) ? parts.filter((value) => value !== part) : [...parts, part]
    )
  const addCreatorBodyPart = () => {
    const part = creatorCustomBodyPart.trim()
    if (part && !creatorBodyParts.includes(part)) {
      setCreatorBodyParts((parts) => [...parts, part])
    }
    setCreatorCustomBodyPart('')
  }
  const appendSet = (exerciseId: string) =>
    setRecord((r) => ({
      ...r,
      exercises: r.exercises.map((ex) =>
        ex.id === exerciseId
          ? (() => {
              const history = previousExerciseSets(
                data,
                student.id,
                ex.name,
                session.startsAt,
                ex.definitionId
              )
              const historicalSet = history[ex.sets.length] ?? history.at(-1)
              const currentPrevious = ex.sets.at(-1)
              return {
                ...ex,
                sets: [
                  ...ex.sets,
                  {
                    id: crypto.randomUUID(),
                    plannedWeight: historicalSet?.plannedWeight ?? currentPrevious?.plannedWeight,
                    plannedReps: historicalSet?.plannedReps ?? currentPrevious?.plannedReps,
                    unit:
                      historicalSet?.unit ??
                      currentPrevious?.unit ??
                      data.settings.defaultWeightUnit
                  }
                ]
              }
            })()
          : ex
      )
    }))
  const removeSet = (exerciseId: string, setId: string) =>
    setRecord((r) => ({
      ...r,
      exercises: r.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, sets: ex.sets.filter((set) => set.id !== setId) } : ex
      )
    }))
  const removeExercise = (exerciseId: string) =>
    setRecord((r) => ({ ...r, exercises: r.exercises.filter((ex) => ex.id !== exerciseId) }))
  const persist = () => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    savedRecordContentRef.current = trainingRecordContent(record)
    saveRecord({ ...record, updatedAt: new Date().toISOString() })
    recordHasChangedRef.current = false
    saveTimerRef.current = null
    setSaveState('saved')
  }
  const issue = (type: 'training' | 'reschedule') => {
    setCopied(false)
    if (type === 'training') {
      setShareModal({ type, includeNote: false })
      return
    }
    const token = issueLink(session.id, 'reschedule_session')
    setShareModal({ token, type, includeNote: false })
  }
  const shareUrl = shareModal?.token
    ? `${window.location.origin}/${shareModal.type === 'training' ? 't' : 'r'}/${shareModal.token}`
    : ''
  const copyShareUrl = async () => {
    if (!shareUrl || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }
  const moveDirectly = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const range = timeRangeFromForm(values)
    if (range.end <= range.start) return
    const issues = updateSession(session.id, {
      startsAt: range.start.toISOString(),
      endsAt: range.end.toISOString(),
      location: String(values.get('location')).trim()
    })
    setMoveFeedback(
      issues.hasIssues ? '時間已更新；此時段與其他安排重疊，請再確認。' : '課程時間已更新。'
    )
    setMoveModal(false)
  }
  return (
    <div className="session-workspace">
      <div className="session-topbar">
        <button className="back-button" onClick={() => navigate(-1)}>
          <ChevronLeft />
          返回
        </button>
        <Link
          className="session-title session-student-link"
          to={`/students/${student.id}`}
          aria-label={`前往${student.name}的學生頁面`}
        >
          <div className="mini-avatar">{student.name.slice(-2)}</div>
          <div>
            <strong>{student.name}</strong>
            <span>
              {dateText(session.startsAt)}・{timeText(session.startsAt)}–{timeText(session.endsAt)}
            </span>
          </div>
        </Link>
        <div className="session-top-actions">
          <button className="button ghost" onClick={() => setMoveModal(true)}>
            <CalendarClock />
            變更課堂
          </button>
          <button className="button ghost" onClick={() => issue('reschedule')}>
            <CalendarClock />
            改期連結
          </button>
          <button className="button ghost" onClick={() => issue('training')}>
            <Link2 />
            分享結果
          </button>
          <span className={`session-save-status ${saveState}`} role="status" aria-live="polite">
            {saveState === 'saved' ? <Check /> : <span className="save-status-dot" />}
            {saveState === 'saved' ? '已儲存' : '儲存中…'}
          </span>
        </div>
      </div>
      {moveFeedback && <div className="session-feedback">{moveFeedback}</div>}
      <div className="session-body">
        <aside className="session-context">
          <span className="eyebrow">SESSION CONTEXT</span>
          <h1>第 {summary.completed + (session.status === 'completed' ? 0 : 1)} 堂</h1>
          <div className="session-state">
            <span className={`state-indicator ${session.status}`} />
            {session.status === 'completed'
              ? '已完成'
              : session.status === 'cancelled'
                ? '已取消'
                : '進行中'}
          </div>
          <div className="context-stat">
            <span>訓練動作</span>
            <strong>
              {record.exercises.length} <small>項</small>
            </strong>
          </div>
          <div className="context-divider" />
          <span className="eyebrow">NOTE</span>
          <textarea
            className="note-area"
            value={record.privateNote}
            onChange={(e) => setRecord((r) => ({ ...r, privateNote: e.target.value }))}
            placeholder="輸入本堂 Note…"
          />
        </aside>
        <main className="training-editor">
          <div className="training-head">
            <div>
              <span className="eyebrow">TRAINING LOG</span>
              <h2>訓練紀錄</h2>
              <p>設定本組重量與目標次數，再記錄實際完成次數。</p>
            </div>
            <button className="button accent" onClick={() => setExercisePicker(true)}>
              <Plus />
              加入動作
            </button>
          </div>
          {record.exercises.length ? (
            <div className="exercise-stack">
              {record.exercises.map((exercise, exerciseIndex) => {
                const performance = exercisePerformanceSummary(
                  data,
                  student.id,
                  session.id,
                  exercise,
                  record
                )
                return (
                  <section className="exercise-card" key={exercise.id}>
                    <div className="exercise-head">
                      <span className="exercise-number">
                        {String(exerciseIndex + 1).padStart(2, '0')}
                      </span>
                      <div className="exercise-identity">
                        <input
                          className="exercise-name-input"
                          value={exercise.name}
                          onChange={(e) =>
                            setRecord((r) => ({
                              ...r,
                              exercises: r.exercises.map((ex) =>
                                ex.id === exercise.id ? { ...ex, name: e.target.value } : ex
                              )
                            }))
                          }
                        />
                        <span>
                          {exercise.region}・
                          {exercise.performanceMetric === 'weight' ? '重量最佳' : '次數最佳'}
                        </span>
                      </div>
                      <div className="exercise-performance-inline">
                        <div>
                          <span>本次 / 上次 最佳</span>
                          <strong>
                            {formatPerformancePair(
                              performance.current,
                              performance.previous,
                              performance.unit
                            )}
                          </strong>
                        </div>
                        <div>
                          <span>個人最佳</span>
                          <strong>
                            {formatPerformance(performance.personal, performance.unit)}
                          </strong>
                        </div>
                        <button type="button" onClick={() => setTrendExerciseId(exercise.id)}>
                          <TrendingUp />
                          成長軌跡
                        </button>
                      </div>
                      <button
                        className="icon-button remove-action"
                        onClick={() => removeExercise(exercise.id)}
                        aria-label={`移除 ${exercise.name}`}
                      >
                        <XCircle />
                      </button>
                    </div>
                    <div className="sets-table">
                      <div className="set-table-head">
                        <span>組</span>
                        <span>重量 / 計畫次數</span>
                        <span>實際次數</span>
                        <span>RPE</span>
                        <span>結果</span>
                        <span />
                      </div>
                      {exercise.sets.map((set, setIndex) => {
                        return (
                          <div className={`set-row ${set.result ?? ''}`} key={set.id}>
                            <strong>{setIndex + 1}</strong>
                            <div className="planned-inputs">
                              <label>
                                <input
                                  type="number"
                                  value={set.plannedWeight ?? ''}
                                  onChange={(event) =>
                                    updateSet(
                                      exercise.id,
                                      set.id,
                                      'plannedWeight',
                                      event.target.value === ''
                                        ? undefined
                                        : Number(event.target.value)
                                    )
                                  }
                                />
                                <small>{set.unit}</small>
                              </label>
                              <span>×</span>
                              <label>
                                <input
                                  type="number"
                                  value={set.plannedReps ?? ''}
                                  onChange={(event) =>
                                    transformSet(exercise.id, set.id, (current) => {
                                      const next = {
                                        ...current,
                                        plannedReps:
                                          event.target.value === ''
                                            ? undefined
                                            : Number(event.target.value)
                                      }
                                      return current.actualReps === undefined
                                        ? next
                                        : updateTrainingSetActualReps(next, current.actualReps)
                                    })
                                  }
                                />
                              </label>
                            </div>
                            <label>
                              <input
                                type="number"
                                inputMode="numeric"
                                className="actual-reps-input"
                                value={set.actualReps ?? ''}
                                placeholder={
                                  set.plannedReps === undefined ? '—' : String(set.plannedReps)
                                }
                                onChange={(event) =>
                                  transformSet(exercise.id, set.id, (current) =>
                                    updateTrainingSetActualReps(
                                      current,
                                      event.target.value === ''
                                        ? undefined
                                        : Number(event.target.value)
                                    )
                                  )
                                }
                              />
                              <small>次</small>
                            </label>
                            <label>
                              <input
                                type="number"
                                inputMode="decimal"
                                min="1"
                                max="10"
                                value={set.rpe ?? ''}
                                placeholder="—"
                                onChange={(e) =>
                                  updateSet(
                                    exercise.id,
                                    set.id,
                                    'rpe',
                                    e.target.value ? Number(e.target.value) : undefined
                                  )
                                }
                              />
                            </label>
                            <div
                              className="set-result-actions"
                              aria-label={`第 ${setIndex + 1} 組結果`}
                            >
                              <button
                                type="button"
                                className={`set-result completed ${set.result === 'completed' ? 'selected' : ''}`}
                                onClick={() =>
                                  transformSet(exercise.id, set.id, (current) =>
                                    toggleTrainingSetResult(current, 'completed')
                                  )
                                }
                                aria-pressed={set.result === 'completed'}
                              >
                                <Check />
                                已完成
                              </button>
                              <button
                                type="button"
                                className={`set-result incomplete ${set.result === 'incomplete' ? 'selected' : ''}`}
                                onClick={() =>
                                  transformSet(exercise.id, set.id, (current) =>
                                    toggleTrainingSetResult(current, 'incomplete')
                                  )
                                }
                                aria-pressed={set.result === 'incomplete'}
                              >
                                <XCircle />
                                未完成
                              </button>
                            </div>
                            <div className="set-actions">
                              <button
                                className="set-delete"
                                onClick={() => removeSet(exercise.id, set.id)}
                                aria-label="刪除此組"
                              >
                                <XCircle />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                      <button className="add-set-button" onClick={() => appendSet(exercise.id)}>
                        <Plus />
                        新增一組
                      </button>
                    </div>
                  </section>
                )
              })}
            </div>
          ) : (
            <EmptyState title="尚未安排動作" text="加入第一個動作，開始建立這堂課的訓練計畫。" />
          )}
        </main>
      </div>
      <div className="session-bottom">
        <div>
          <span>
            {record.exercises.reduce(
              (n, e) => n + e.sets.filter((s) => s.result !== undefined).length,
              0
            )}{' '}
            / {record.exercises.reduce((n, e) => n + e.sets.length, 0)}
          </span>{' '}
          組已記錄
        </div>
        <div>
          {session.status !== 'completed' ? (
            <button
              className="button accent large"
              onClick={() => {
                persist()
                updateStatus(session.id, 'completed')
              }}
            >
              <CheckCircle2 />
              完成上課
            </button>
          ) : (
            <button className="button ghost" onClick={() => updateStatus(session.id, 'scheduled')}>
              <RotateCcw />
              改回未完成
            </button>
          )}
        </div>
      </div>
      {moveModal && (
        <Modal title="變更課堂" onClose={() => setMoveModal(false)}>
          <form className="form-stack session-time-form" onSubmit={moveDirectly}>
            <TimeRangeFields
              range={{ start: parseISO(session.startsAt), end: parseISO(session.endsAt) }}
              startHour={data.settings.calendarStartHour}
              endHour={data.settings.calendarEndHour}
            />
            <label>
              地點
              <input name="location" defaultValue={session.location} />
            </label>
            <div className="form-actions">
              <button type="button" className="button ghost" onClick={() => setMoveModal(false)}>
                取消
              </button>
              <button className="button accent">儲存課堂變更</button>
            </div>
          </form>
        </Modal>
      )}
      {exercisePicker && (
        <Modal
          wide
          className="exercise-picker-modal"
          title="從動作庫加入"
          onClose={() => setExercisePicker(false)}
        >
          <div className="picker-command-row">
            <div className="picker-search">
              <Search />
              <input
                autoFocus
                value={exerciseQuery}
                onChange={(event) => setExerciseQuery(event.target.value)}
                placeholder="搜尋名稱、器材、部位或類型"
              />
              {exerciseQuery && (
                <button
                  type="button"
                  className="picker-clear"
                  onClick={() => setExerciseQuery('')}
                  aria-label="清除搜尋"
                >
                  <XCircle />
                </button>
              )}
            </div>
            <div className="picker-view-switch" aria-label="動作來源">
              <button
                type="button"
                className={pickerView === 'all' ? 'active' : ''}
                onClick={() => setPickerView('all')}
              >
                所有動作
              </button>
              <button
                type="button"
                className={pickerView === 'favorite' ? 'active' : ''}
                onClick={() => setPickerView('favorite')}
              >
                常用
              </button>
              <button
                type="button"
                className={pickerView === 'custom' ? 'active' : ''}
                onClick={() => setPickerView('custom')}
              >
                自訂動作
              </button>
            </div>
            <button
              type="button"
              className="picker-create-button"
              onClick={() => {
                setExercisePicker(false)
                setCreatorBodyParts([])
                setCreatorCustomBodyPart('')
                setExerciseCreator(true)
              }}
            >
              <Plus />
              新增動作
            </button>
          </div>
          <ExerciseFilterShelf
            compact
            equipmentTags={pickerEquipmentTags}
            bodyPartTags={pickerBodyPartTags}
            equipment={pickerEquipment}
            onEquipmentChange={setPickerEquipment}
            bodyParts={pickerBodyParts}
            onBodyPartsChange={setPickerBodyParts}
            movementType={pickerMovementType}
            onMovementTypeChange={setPickerMovementType}
          />
          <div className="picker-result-head">
            <strong>{pickerResults.length}</strong>
            <span>個符合結果</span>
            <small>點選＋即可連續加入多個動作</small>
          </div>
          <div className="exercise-picker-list">
            {pickerResults.length ? (
              pickerResults.map((exercise) => (
                <button key={exercise.id} onClick={() => addRecordExercise(exercise)}>
                  <div className="movement-glyph">
                    <Dumbbell />
                  </div>
                  <div>
                    <strong>{exercise.name}</strong>
                    <span>
                      {exercise.equipment}・{exercise.bodyParts.join('、')}・{exercise.movementType}
                      ・{exercise.performanceMetric === 'weight' ? '重量最佳' : '次數最佳'}
                    </span>
                  </div>
                  {exercise.favorite && <Heart className="favorite-icon" />}
                  <Plus />
                </button>
              ))
            ) : (
              <div className="picker-empty">
                <Search />
                <strong>找不到符合的動作</strong>
                <span>試著取消部分標籤，或換一個搜尋詞。</span>
              </div>
            )}
          </div>
        </Modal>
      )}
      {exerciseCreator && (
        <Modal
          title="新增動作並加入本堂課"
          onClose={() => {
            setExerciseCreator(false)
            setExercisePicker(true)
          }}
        >
          <form className="form-stack" onSubmit={createExercise}>
            <label>
              動作名稱
              <input name="name" required autoFocus placeholder="例如：箱式深蹲" />
            </label>
            <label>
              器材標籤
              <input
                name="equipment"
                required
                list="session-equipment-options"
                placeholder="選擇或直接輸入新器材"
              />
              <datalist id="session-equipment-options">
                {pickerEquipmentTags.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
            </label>
            <fieldset className="body-part-editor">
              <legend>部位標籤（可複選）</legend>
              <div className="editor-chip-cloud">
                {pickerBodyPartTags.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    className={
                      creatorBodyParts.includes(tag) ? 'editor-chip selected' : 'editor-chip'
                    }
                    onClick={() => toggleCreatorBodyPart(tag)}
                  >
                    {creatorBodyParts.includes(tag) && <Check />}
                    {tag}
                  </button>
                ))}
              </div>
              <div className="custom-tag-row">
                <input
                  value={creatorCustomBodyPart}
                  onChange={(event) => setCreatorCustomBodyPart(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addCreatorBodyPart()
                    }
                  }}
                  placeholder="輸入自訂部位標籤"
                />
                <button
                  type="button"
                  onClick={addCreatorBodyPart}
                  disabled={!creatorCustomBodyPart.trim()}
                >
                  <Plus />
                  加入
                </button>
              </div>
              {creatorBodyParts.length > 0 ? (
                <div className="editor-selected-summary">
                  <span>已選</span>
                  {creatorBodyParts.map((part) => (
                    <button type="button" key={part} onClick={() => toggleCreatorBodyPart(part)}>
                      {part}
                      <XCircle />
                    </button>
                  ))}
                </div>
              ) : (
                <small className="field-error">請至少選擇或新增一個部位標籤。</small>
              )}
            </fieldset>
            <FormSelect
              label="動作類型"
              name="movementType"
              defaultValue="系統動作"
              options={['系統動作', '局部動作'].map((value) => ({ value, label: value }))}
            />
            <FormSelect
              label="最佳表現指標"
              name="performanceMetric"
              defaultValue="weight"
              options={[
                { value: 'weight', label: '重量（每堂最高工作重量）' },
                { value: 'reps', label: '次數（每堂最高實際次數）' }
              ]}
            />
            <div className="form-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => {
                  setExerciseCreator(false)
                  setExercisePicker(true)
                }}
              >
                返回動作庫
              </button>
              <button className="button accent" disabled={!creatorBodyParts.length}>
                <Plus />
                建立並加入
              </button>
            </div>
          </form>
        </Modal>
      )}
      {trendExercise && trendSummary && (
        <PerformanceTrendModal
          studentName={student.name}
          exercise={trendExercise}
          summary={trendSummary}
          onClose={() => setTrendExerciseId(null)}
        />
      )}
      {shareModal && (
        <Modal
          title={shareModal.type === 'training' ? '分享這堂訓練結果' : '建立 24 小時改期連結'}
          onClose={() => setShareModal(null)}
        >
          <div className="share-box">
            <div className="share-icon">
              <Link2 />
            </div>
            {shareModal.type === 'reschedule' && (
              <p>學生可從這堂課前後三天的可用時段中選擇新時間。</p>
            )}
            {shareModal.type === 'training' && !shareModal.token && (
              <label className="toggle-row share-note-toggle">
                <span>
                  <strong>分享 Note</strong>
                </span>
                <input
                  type="checkbox"
                  checked={shareModal.includeNote}
                  onChange={(event) =>
                    setShareModal((current) =>
                      current ? { ...current, includeNote: event.target.checked } : current
                    )
                  }
                />
              </label>
            )}
            {!shareModal.token && shareModal.type === 'training' && (
              <button
                className="button accent wide"
                onClick={() => {
                  const token = issueLink(session.id, 'read_training_session', {
                    includeNote: shareModal.includeNote
                  })
                  setShareModal({ ...shareModal, token })
                }}
              >
                <Link2 />
                建立分享連結
              </button>
            )}
            {shareModal.token && (
              <div className="copy-field">
                <input readOnly value={shareUrl} />
                <button onClick={copyShareUrl} aria-label={copied ? '已複製' : '複製連結'}>
                  {copied ? <Check /> : <Copy />}
                </button>
              </div>
            )}
            {shareModal.token && (
              <div className="share-link-meta">
                <small>連結將於 24 小時後失效</small>
                {copied && <span role="status">已複製</span>}
              </div>
            )}
            {shareModal.token && (
              <button
                className="button accent wide"
                onClick={() =>
                  navigator.share?.({
                    title: 'FORM 課程連結',
                    url: shareUrl
                  })
                }
              >
                <Send />
                使用系統分享
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
