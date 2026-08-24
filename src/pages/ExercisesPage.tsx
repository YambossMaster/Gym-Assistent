import { Check, Dumbbell, Edit3, Heart, Plus, RotateCcw, Search, XCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { EmptyState, FormSelect, Modal, PageHeader } from '../components'
import { ExerciseFilterShelf } from '../components/ExerciseFilterShelf'
import { filterExercises } from '../exerciseFilters'
import { useStore } from '../store'
import type { ExerciseDefinition } from '../types'

export function ExercisesPage() {
  const { data, addExercise, updateExercise, deleteExercise, toggleFavoriteExercise } = useStore()
  const [query, setQuery] = useState('')
  const [equipment, setEquipment] = useState('全部')
  const [bodyParts, setBodyParts] = useState<string[]>([])
  const [movementType, setMovementType] = useState('全部')
  const [view, setView] = useState<'all' | 'favorite' | 'custom'>('all')
  const [editing, setEditing] = useState<ExerciseDefinition | 'new' | null>(null)
  const [editorBodyParts, setEditorBodyParts] = useState<string[]>([])
  const [customBodyPart, setCustomBodyPart] = useState('')
  const [deleting, setDeleting] = useState<ExerciseDefinition | null>(null)
  const equipmentTags = [...new Set(data.exercises.map((exercise) => exercise.equipment))].sort()
  const bodyPartTags = [...new Set(data.exercises.flatMap((exercise) => exercise.bodyParts))].sort()
  const exercises = filterExercises(data.exercises, {
    query,
    equipment,
    bodyParts,
    movementType
  }).filter(
    (exercise) =>
      view === 'all' ||
      (view === 'favorite' && exercise.favorite) ||
      (view === 'custom' && !exercise.isSystem)
  )
  const resetFilters = () => {
    setQuery('')
    setEquipment('全部')
    setBodyParts([])
    setMovementType('全部')
    setView('all')
  }
  const openEditor = (target: ExerciseDefinition | 'new') => {
    setEditing(target)
    setEditorBodyParts(target === 'new' ? [] : target.bodyParts)
    setCustomBodyPart('')
  }
  const toggleEditorBodyPart = (part: string) =>
    setEditorBodyParts((parts) =>
      parts.includes(part) ? parts.filter((value) => value !== part) : [...parts, part]
    )
  const addCustomBodyPart = () => {
    const part = customBodyPart.trim()
    if (part && !editorBodyParts.includes(part)) setEditorBodyParts((parts) => [...parts, part])
    setCustomBodyPart('')
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    if (!editorBodyParts.length) return
    const input = {
      name: String(values.get('name')).trim(),
      equipment: String(values.get('equipment')).trim(),
      bodyParts: editorBodyParts,
      movementType: String(values.get('movementType')) as ExerciseDefinition['movementType'],
      performanceMetric: String(
        values.get('performanceMetric')
      ) as ExerciseDefinition['performanceMetric']
    }
    if (editing && editing !== 'new') updateExercise(editing.id, input)
    else addExercise(input)
    setEditing(null)
  }
  const activeFilters =
    (equipment === '全部' ? 0 : 1) +
    bodyParts.length +
    (movementType === '全部' ? 0 : 1) +
    (view === 'all' ? 0 : 1) +
    (query ? 1 : 0)
  return (
    <div className="page exercise-page">
      <PageHeader
        eyebrow={`EXERCISE DATABASE / ${String(data.exercises.length).padStart(3, '0')}`}
        title="動作庫"
        description="整理動作標籤與最佳表現指標，讓每堂課都能用一致標準追蹤進步。"
        actions={
          <button className="button accent" onClick={() => openEditor('new')}>
            <Plus />
            新增動作
          </button>
        }
      />
      <section className="exercise-command panel reveal delay-1">
        <div className="exercise-search-row">
          <label className="search-box">
            <Search />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜尋動作名稱、器材或部位"
            />
          </label>
          <div className="filter-pills">
            <button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>
              所有動作
            </button>
            <button
              className={view === 'favorite' ? 'active' : ''}
              onClick={() => setView('favorite')}
            >
              常用
            </button>
            <button className={view === 'custom' ? 'active' : ''} onClick={() => setView('custom')}>
              我的新增
            </button>
          </div>
        </div>
        <ExerciseFilterShelf
          equipmentTags={equipmentTags}
          bodyPartTags={bodyPartTags}
          equipment={equipment}
          onEquipmentChange={setEquipment}
          bodyParts={bodyParts}
          onBodyPartsChange={setBodyParts}
          movementType={movementType}
          onMovementTypeChange={setMovementType}
        />
        {activeFilters > 0 && (
          <div className="global-filter-clear">
            <span>搜尋與標籤共套用 {activeFilters} 個條件</span>
            <button type="button" onClick={resetFilters}>
              <RotateCcw />
              全部清除
            </button>
          </div>
        )}
      </section>
      <div className="result-heading">
        <div>
          <strong>{exercises.length}</strong>
          <span>個符合結果</span>
        </div>
        <small>總資料庫 {data.exercises.length} 個動作</small>
      </div>
      <div className="exercise-library advanced reveal delay-2">
        {exercises.length ? (
          exercises.map((exercise, i) => (
            <article className="library-row" key={exercise.id}>
              <span>{String(i + 1).padStart(3, '0')}</span>
              <div className="movement-glyph">
                <Dumbbell />
              </div>
              <div className="exercise-row-main">
                <strong>{exercise.name}</strong>
                <small>{exercise.isSystem ? '預設資料' : '自訂資料'}</small>
              </div>
              <div className="exercise-tag-stack">
                <span className="exercise-tag equipment">{exercise.equipment}</span>
                {exercise.bodyParts.map((part) => (
                  <span className="exercise-tag body" key={part}>
                    {part}
                  </span>
                ))}
                <span
                  className={`exercise-tag type ${exercise.movementType === '局部動作' ? 'local' : ''}`}
                >
                  {exercise.movementType}
                </span>
                <span className={`exercise-tag metric ${exercise.performanceMetric}`}>
                  {exercise.performanceMetric === 'weight' ? '重量最佳' : '次數最佳'}
                </span>
              </div>
              <button
                className={`favorite-button ${exercise.favorite ? 'active' : ''}`}
                onClick={() => toggleFavoriteExercise(exercise.id)}
                aria-label={`${exercise.favorite ? '取消常用' : '設為常用'} ${exercise.name}`}
              >
                <Heart />
              </button>
              <div className="row-actions">
                <button onClick={() => openEditor(exercise)} aria-label={`編輯 ${exercise.name}`}>
                  <Edit3 />
                </button>
                <button
                  className="delete"
                  onClick={() => setDeleting(exercise)}
                  aria-label={`刪除 ${exercise.name}`}
                >
                  <XCircle />
                </button>
              </div>
            </article>
          ))
        ) : (
          <EmptyState title="沒有符合的動作" text="清除部分條件，或建立自己的動作與標籤。" />
        )}
      </div>
      {editing && (
        <Modal
          title={editing === 'new' ? '新增自訂動作' : `編輯 ${editing.name}`}
          onClose={() => setEditing(null)}
        >
          <form className="form-stack" onSubmit={submit}>
            <label>
              動作名稱
              <input
                name="name"
                required
                autoFocus
                defaultValue={editing === 'new' ? '' : editing.name}
                placeholder="例如：箱式深蹲"
              />
            </label>
            <label>
              器材標籤
              <input
                name="equipment"
                required
                list="equipment-options"
                defaultValue={editing === 'new' ? '' : editing.equipment}
                placeholder="選擇或直接輸入新器材"
              />
              <datalist id="equipment-options">
                {equipmentTags.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
            </label>
            <fieldset className="body-part-editor">
              <legend>部位標籤（可複選）</legend>
              <div className="editor-chip-cloud">
                {bodyPartTags.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    className={
                      editorBodyParts.includes(tag) ? 'editor-chip selected' : 'editor-chip'
                    }
                    onClick={() => toggleEditorBodyPart(tag)}
                  >
                    {editorBodyParts.includes(tag) && <Check />}
                    {tag}
                  </button>
                ))}
              </div>
              <div className="custom-tag-row">
                <input
                  value={customBodyPart}
                  onChange={(event) => setCustomBodyPart(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addCustomBodyPart()
                    }
                  }}
                  placeholder="輸入自訂部位標籤"
                />
                <button type="button" onClick={addCustomBodyPart} disabled={!customBodyPart.trim()}>
                  <Plus />
                  加入
                </button>
              </div>
              {editorBodyParts.length > 0 ? (
                <div className="editor-selected-summary">
                  <span>已選</span>
                  {editorBodyParts.map((part) => (
                    <button type="button" key={part} onClick={() => toggleEditorBodyPart(part)}>
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
              defaultValue={editing === 'new' ? '系統動作' : editing.movementType}
              options={['系統動作', '局部動作'].map((option) => ({
                value: option,
                label: option
              }))}
            />
            <FormSelect
              label="最佳表現指標"
              name="performanceMetric"
              defaultValue={editing === 'new' ? 'weight' : editing.performanceMetric}
              options={[
                { value: 'weight', label: '重量（每堂最高工作重量）' },
                { value: 'reps', label: '次數（每堂最高實際次數）' }
              ]}
            />
            <div className="form-note">
              <Dumbbell />
              指標會跟著動作加入課堂；修改動作庫不會覆寫已保存的課堂內容。
            </div>
            <div className="form-actions">
              <button type="button" className="button ghost" onClick={() => setEditing(null)}>
                取消
              </button>
              <button className="button accent" disabled={!editorBodyParts.length}>
                {editing === 'new' ? '建立動作' : '儲存修改'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal title="刪除這個動作？" onClose={() => setDeleting(null)}>
          <div className="delete-confirm">
            <div className="delete-confirm-icon">
              <XCircle />
            </div>
            <p>
              <strong>{deleting.name}</strong>會從動作庫移除。既有課堂中已保存的紀錄不會被刪除。
            </p>
            <div className="form-actions">
              <button className="button ghost" onClick={() => setDeleting(null)}>
                保留
              </button>
              <button
                className="button danger"
                onClick={() => {
                  deleteExercise(deleting.id)
                  setDeleting(null)
                }}
              >
                確認刪除
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
