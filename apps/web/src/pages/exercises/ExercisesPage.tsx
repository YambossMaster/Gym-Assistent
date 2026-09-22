import {
  choosePrimaryMetric,
  metricLabels,
  recordingTypes,
  type RecordingConfig,
  type RecordingType
} from '../training/recording'
import { ProgressMetricSelector } from '../training/ProgressMetricSelector'
import type { Session } from '@supabase/supabase-js'
import { Check, ChevronDown, Dumbbell, Heart, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { ExerciseDefinition } from '../../api'
import { FormSelect } from '../../shared/FormSelect'
import { Confirmation, Page } from '../../shared/primitives'
import { useDialogBehavior } from '../../shared/useDialogBehavior'
import { useExerciseLibrary, useTrainingMutations } from '../training/queries'
import { filterExerciseDefinitions } from './filter'
import { EquipmentGlyph } from './EquipmentGlyph'

type DefinitionFields = Pick<
  ExerciseDefinition,
  'name' | 'equipment' | 'bodyParts' | 'movementType' | 'performanceMetric' | 'recording'
>

export function ExercisesPage({ session }: { session: Session }) {
  const [q, setQ] = useState(''),
    [view, setView] = useState<'all' | 'favorite' | 'custom'>('all'),
    [equipment, setEquipment] = useState(''),
    [bodyParts, setBodyParts] = useState<string[]>([]),
    [movementType, setMovementType] = useState(''),
    [editing, setEditing] = useState<ExerciseDefinition | null | undefined>(undefined),
    [deleting, setDeleting] = useState<ExerciseDefinition | null>(null),
    [message, setMessage] = useState('')
  const query = useExerciseLibrary(session),
    mutations = useTrainingMutations(session)
  const definitions = useMemo(
    () =>
      filterExerciseDefinitions(query.data?.definitions ?? [], {
        q,
        view,
        equipment,
        bodyParts,
        movementType
      }),
    [bodyParts, equipment, movementType, q, query.data?.definitions, view]
  )
  const clear = () => {
    setQ('')
    setEquipment('')
    setBodyParts([])
    setMovementType('')
  }
  return (
    <Page
      className="exercises-page"
      title="動作庫"
      eyebrow={query.data ? `${query.data.totals.all} EXERCISES` : 'EXERCISE LIBRARY'}
      actions={
        <button
          className="primary-button compact"
          onClick={() => {
            setMessage('')
            setEditing(null)
          }}
        >
          <Plus />
          新增自訂動作
        </button>
      }
    >
      <section className="library-toolbar">
        <label className="library-search">
          <Search />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜尋名稱、器材、類型或部位"
          />
        </label>
        <div className="library-tabs">
          {(
            [
              ['all', '全部'],
              ['favorite', '常用'],
              ['custom', '自訂']
            ] as const
          ).map(([key, label]) => (
            <button key={key} aria-pressed={view === key} onClick={() => setView(key)}>
              {label}
              <small>{query.data?.totals[key] ?? 0}</small>
            </button>
          ))}
        </div>
      </section>
      {query.data && (
        <section className="filter-shelf" aria-label="篩選動作">
          <FormSelect
            label="器材"
            value={equipment}
            onChange={setEquipment}
            options={[
              { value: '', label: '所有器材' },
              ...query.data.filters.equipment.map((x) => ({ value: x, label: x }))
            ]}
          />
          <FormSelect
            label="動作類型"
            value={movementType}
            onChange={setMovementType}
            options={[
              { value: '', label: '所有類型' },
              ...query.data.filters.movementTypes.map((x) => ({ value: x, label: x }))
            ]}
          />
          <div className="body-part-filters">
            {query.data.filters.bodyParts.map((part) => (
              <button
                key={part}
                aria-pressed={bodyParts.includes(part)}
                onClick={() =>
                  setBodyParts((items) =>
                    items.includes(part) ? items.filter((x) => x !== part) : [...items, part]
                  )
                }
              >
                {part}
              </button>
            ))}
          </div>
          {(q || equipment || movementType || bodyParts.length > 0) && (
            <button className="text-button" onClick={clear}>
              <X />
              清除篩選
            </button>
          )}
        </section>
      )}
      {message && editing === undefined && (
        <p className="form-notice" role="status">
          {message}
        </p>
      )}
      {query.isLoading ? (
        <div className="library-grid" aria-label="載入動作庫中">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : query.isError ? (
        <section className="empty-state">
          <h2>無法載入動作庫。</h2>
          <button onClick={() => void query.refetch()}>重試</button>
        </section>
      ) : definitions.length ? (
        <section className="library-grid">
          {definitions.map((definition) => {
            const busy =
              definition.version === 0 ||
              (mutations.updateExercise.isPending &&
                mutations.updateExercise.variables?.id === definition.id) ||
              (mutations.remove.isPending && mutations.remove.variables?.id === definition.id)
            return (
              <article className="exercise-library-card" key={definition.id}>
                <header className="exercise-card-heading">
                  <EquipmentGlyph equipment={definition.equipment} />
                  <button
                    className="icon-button favorite-button"
                    aria-label={definition.favorite ? '取消常用' : '加入常用'}
                    aria-pressed={definition.favorite}
                    disabled={busy}
                    onClick={() => {
                      setMessage('')
                      mutations.favorite.toggle(definition.id, () =>
                        setMessage('常用更新失敗，已恢復原狀。')
                      )
                    }}
                  >
                    <Heart />
                  </button>
                </header>
                <div className="exercise-card-identity">
                  <h2>{definition.name}</h2>
                  <p>
                    {definition.equipment} · {definition.movementType}
                  </p>
                </div>
                {definition.recording && (
                  <p className="exercise-recording-label">
                    {recordingTypes[definition.recording.type].label} · 主要：
                    {metricLabels[definition.recording.metrics[0]]}
                    {definition.recording.metrics[1]
                      ? ` · 次要：${metricLabels[definition.recording.metrics[1]]}`
                      : ' · 已鎖定'}
                  </p>
                )}
                <div className="tag-row">
                  {definition.bodyParts.map((part) => (
                    <span key={part}>{part}</span>
                  ))}
                </div>
                <footer>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => {
                      setMessage('')
                      setEditing(definition)
                    }}
                  >
                    <Pencil />
                    編輯
                  </button>
                  <button
                    className="text-button danger"
                    disabled={busy}
                    onClick={() => setDeleting(definition)}
                  >
                    <Trash2 />
                    刪除
                  </button>
                </footer>
              </article>
            )
          })}
        </section>
      ) : (
        <section className="empty-state">
          <Dumbbell />
          <h2>{query.data?.totals.all === 0 ? '尚無動作' : '沒有符合的動作'}</h2>
          <button
            className="primary-button compact"
            onClick={
              query.data?.totals.all === 0
                ? () => {
                    setEditing(null)
                  }
                : clear
            }
          >
            {query.data?.totals.all === 0 ? '新增自訂動作' : '清除篩選'}
          </button>
        </section>
      )}
      {editing !== undefined && (
        <DefinitionEditor
          key={editing?.id ?? 'new'}
          definition={editing}
          filters={query.data?.filters}
          onClose={() => {
            setEditing(undefined)
            setMessage('')
          }}
          onSave={async (fields) => {
            const target = editing
            setMessage('')
            if (target)
              await mutations.updateExercise.mutateAsync({
                id: target.id,
                input: {
                  ...fields,
                  version:
                    query.data?.definitions.find((item) => item.id === target.id)?.version ??
                    target.version,
                  operationId: crypto.randomUUID()
                }
              })
            else
              await mutations.createExercise.mutateAsync({
                ...fields,
                operationId: crypto.randomUUID()
              })
            setEditing(undefined)
          }}
        />
      )}
      {deleting && (
        <Confirmation
          title="刪除動作？"
          text={`「${deleting.name}」將從動作庫移除，已保存的課堂紀錄仍會保留。`}
          disabled={mutations.remove.isPending}
          confirmLabel="刪除動作"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            const target = deleting
            setDeleting(null)
            mutations.remove.mutate(
              { id: target.id, version: target.version },
              { onError: () => setMessage('刪除失敗，動作已還原。') }
            )
          }}
        />
      )}
    </Page>
  )
}
export function DefinitionEditor({
  definition,
  filters,
  onClose,
  onSave
}: {
  definition: ExerciseDefinition | null
  filters?: { equipment: string[]; bodyParts: string[] }
  onClose: () => void
  onSave: (fields: DefinitionFields) => Promise<void> | void
}) {
  const [parts, setParts] = useState(definition?.bodyParts ?? [])
  const [equipment, setEquipment] = useState(definition?.equipment ?? '')
  const [equipmentOpen, setEquipmentOpen] = useState(false)
  const equipmentRef = useRef<HTMLDivElement>(null)
  const [equipmentActive, setEquipmentActive] = useState(0)
  const [equipmentQuery, setEquipmentQuery] = useState<string | null>(null)
  const [customPart, setCustomPart] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [movement, setMovement] = useState<'系統動作' | '局部動作'>(
    definition?.movementType ?? '系統動作'
  )
  const [recording, setRecording] = useState<RecordingConfig>(
    definition?.recording ?? { type: 'weight_reps', metrics: ['weight', 'reps'] }
  )
  const { dialogRef, onBackdropPointerDown } = useDialogBehavior(onClose, {
    submitOnEnter: true,
    focusDialog: true
  })
  useEffect(() => {
    if (!equipmentOpen) return
    const outside = (event: PointerEvent) => {
      if (!equipmentRef.current?.contains(event.target as Node)) setEquipmentOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [equipmentOpen])
  const equipmentSuggestions = (filters?.equipment ?? [])
    .filter(
      (item) =>
        equipmentQuery === null ||
        item.toLocaleLowerCase().includes(equipmentQuery.toLocaleLowerCase())
    )
    .slice(0, 12)
  const customParts = parts.filter((part) => !filters?.bodyParts.includes(part))
  const addCustomPart = () => {
    const value = customPart.trim()
    if (value && !parts.includes(value) && parts.length < 12) setParts([...parts, value])
    setCustomPart('')
  }
  const chooseEquipment = (value: string) => {
    setEquipment(value)
    setEquipmentQuery(null)
    setEquipmentOpen(false)
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    const data = new FormData(event.currentTarget)
    setSaving(true)
    setSaveError('')
    try {
      await onSave({
        name: String(data.get('name') || ''),
        equipment: equipment.trim(),
        bodyParts: parts,
        movementType: movement,
        performanceMetric: recording.metrics.includes('weight') ? 'weight' : 'reps',
        recording
      })
    } catch {
      setSaveError('儲存失敗，輸入內容已保留。請確認後重試。')
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="dialog-backdrop" onPointerDown={onBackdropPointerDown}>
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="definition-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="definition-title"
      >
        <header>
          <div>
            <span>EXERCISE DETAILS</span>
            <h2 id="definition-title">{definition ? '編輯動作' : '新增自訂動作'}</h2>
          </div>
          <button className="icon-button" aria-label="關閉" onClick={onClose}>
            <X />
          </button>
        </header>
        <form onSubmit={submit}>
          <div className="editor-top-grid">
            <label className="editor-field">
              動作名稱
              <input name="name" defaultValue={definition?.name} required maxLength={120} />
            </label>
            <div className="editor-field equipment-field" ref={equipmentRef}>
              <label htmlFor="editor-equipment">器材</label>
              <div className="equipment-combobox">
                <input
                  id="editor-equipment"
                  name="equipment"
                  value={equipment}
                  onChange={(event) => {
                    setEquipment(event.target.value)
                    setEquipmentQuery(event.target.value)
                    setEquipmentActive(0)
                    setEquipmentOpen(true)
                  }}
                  onClick={() => {
                    setEquipmentQuery(null)
                    setEquipmentOpen(true)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape' && equipmentOpen) {
                      event.preventDefault()
                      event.stopPropagation()
                      setEquipmentOpen(false)
                    } else if (event.key === 'ArrowDown' && equipmentSuggestions.length) {
                      event.preventDefault()
                      setEquipmentOpen(true)
                      setEquipmentActive((index) =>
                        Math.min(index + 1, equipmentSuggestions.length - 1)
                      )
                    } else if (event.key === 'ArrowUp' && equipmentSuggestions.length) {
                      event.preventDefault()
                      setEquipmentActive((index) => Math.max(index - 1, 0))
                    } else if (
                      event.key === 'Enter' &&
                      equipmentOpen &&
                      equipmentSuggestions.length
                    ) {
                      event.preventDefault()
                      chooseEquipment(equipmentSuggestions[equipmentActive])
                      event.currentTarget.blur()
                    }
                  }}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={equipmentOpen && equipmentSuggestions.length > 0}
                  aria-controls={equipmentOpen ? 'equipment-suggestions' : undefined}
                  aria-activedescendant={
                    equipmentOpen && equipmentSuggestions.length
                      ? `equipment-option-${equipmentActive}`
                      : undefined
                  }
                  required
                  maxLength={120}
                />
                <button
                  type="button"
                  aria-label="選擇器材"
                  aria-expanded={equipmentOpen}
                  onClick={() => {
                    setEquipmentQuery(null)
                    setEquipmentActive(0)
                    setEquipmentOpen((current) => !current)
                  }}
                >
                  <ChevronDown aria-hidden="true" />
                </button>
                {equipmentOpen && equipmentSuggestions.length > 0 && (
                  <div
                    id="equipment-suggestions"
                    className="equipment-suggestions"
                    role="listbox"
                    aria-label="器材選項"
                  >
                    {equipmentSuggestions.map((item, index) => (
                      <button
                        type="button"
                        role="option"
                        id={`equipment-option-${index}`}
                        aria-selected={item === equipment}
                        className={index === equipmentActive ? 'active' : ''}
                        key={item}
                        onPointerDown={(event) => {
                          event.preventDefault()
                          chooseEquipment(item)
                        }}
                        onClick={() => chooseEquipment(item)}
                      >
                        {item}
                        {item === equipment && <Check aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="editor-field editor-body-parts">
            <div className="editor-field-heading">
              <strong>部位標籤</strong>
              <small>可複選</small>
            </div>
            <div className="body-part-filters">
              {filters?.bodyParts.map((part) => (
                <button
                  type="button"
                  key={part}
                  aria-pressed={parts.includes(part)}
                  onClick={() =>
                    setParts((items) =>
                      items.includes(part) ? items.filter((x) => x !== part) : [...items, part]
                    )
                  }
                >
                  {parts.includes(part) && <Check aria-hidden="true" />}
                  {part}
                </button>
              ))}
            </div>
            <div className="editor-tag-entry">
              <input
                aria-label="新增部位標籤"
                placeholder="輸入其他部位"
                value={customPart}
                onChange={(event) => setCustomPart(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addCustomPart()
                    event.currentTarget.blur()
                  }
                }}
              />
              <button
                type="button"
                disabled={!customPart.trim() || parts.length >= 12}
                onClick={addCustomPart}
              >
                <Plus aria-hidden="true" />
                加入
              </button>
            </div>
            {customParts.length > 0 && (
              <div className="editor-custom-tags" aria-label="已新增部位">
                {customParts.map((part) => (
                  <button
                    type="button"
                    key={part}
                    onClick={() => setParts(parts.filter((item) => item !== part))}
                  >
                    {part}
                    <X aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="editor-choice-grid">
            <div className="editor-field" role="group" aria-label="動作類型">
              <strong className="editor-field-label">動作類型</strong>
              <div className="editor-segmented">
                {(['系統動作', '局部動作'] as const).map((option) => (
                  <button
                    type="button"
                    key={option}
                    aria-pressed={movement === option}
                    onClick={() => setMovement(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="editor-field">
              <strong className="editor-field-label">紀錄類型</strong>
              <FormSelect
                label="紀錄類型"
                value={recording.type}
                options={Object.entries(recordingTypes).map(([value, item]) => ({
                  value,
                  label: item.label
                }))}
                onChange={(value) =>
                  setRecording({
                    type: value as RecordingType,
                    metrics: [...recordingTypes[value as RecordingType].metrics]
                  })
                }
              />
              <strong className="editor-field-label">主要進步指標</strong>
              <ProgressMetricSelector
                recording={recording}
                onChoose={(metric) => setRecording(choosePrimaryMetric(recording, metric))}
              />
            </div>
          </div>
          {saveError && (
            <p className="form-error" role="alert">
              {saveError}
            </p>
          )}
          <footer>
            <p className="editor-note">修改動作庫不會覆寫已保存的課堂內容。</p>
            <div className="editor-actions">
              <button type="button" className="secondary-button" onClick={onClose}>
                取消
              </button>
              <button className="primary-button compact" disabled={saving || parts.length === 0}>
                {saving ? '儲存中…' : definition ? '儲存修改' : '建立動作'}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  )
}
function Skeleton() {
  return (
    <div className="exercise-library-card skeleton">
      <span />
      <span />
      <span />
    </div>
  )
}
