import type { Session } from '@supabase/supabase-js'
import { Dumbbell, Heart, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import type { ExerciseDefinition, PerformanceMetric } from '../../api'
import { Page } from '../../shared/primitives'
import { useExerciseLibrary, useTrainingMutations } from '../training/queries'
import { filterExerciseDefinitions } from './filter'

export function ExercisesPage({ session }: { session: Session }) {
  const [q, setQ] = useState(''),
    [view, setView] = useState<'all' | 'favorite' | 'custom'>('all'),
    [equipment, setEquipment] = useState(''),
    [bodyParts, setBodyParts] = useState<string[]>([]),
    [movementType, setMovementType] = useState(''),
    [editing, setEditing] = useState<ExerciseDefinition | null | undefined>(undefined),
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
        <button className="primary-button compact" onClick={() => setEditing(null)}>
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
          <select
            aria-label="器材"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
          >
            <option value="">所有器材</option>
            {query.data.filters.equipment.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            aria-label="動作類型"
            value={movementType}
            onChange={(e) => setMovementType(e.target.value)}
          >
            <option value="">所有類型</option>
            {query.data.filters.movementTypes.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
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
      {message && (
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
          {definitions.map((definition) => (
            <article className="exercise-library-card" key={definition.id}>
              <header>
                <span>{definition.isSystem ? 'FORM CATALOG' : 'CUSTOM'}</span>
                <button
                  className="icon-button favorite-button"
                  aria-label={definition.favorite ? '取消常用' : '加入常用'}
                  aria-pressed={definition.favorite}
                  onClick={() =>
                    mutations.favorite.mutate({
                      id: definition.id,
                      input: {
                        favorite: !definition.favorite,
                        version: definition.version,
                        operationId: crypto.randomUUID()
                      }
                    })
                  }
                >
                  <Heart />
                </button>
              </header>
              <Dumbbell />
              <h2>{definition.name}</h2>
              <p>
                {definition.equipment} · {definition.movementType}
              </p>
              <div className="tag-row">
                {definition.bodyParts.map((part) => (
                  <span key={part}>{part}</span>
                ))}
              </div>
              <footer>
                <span>{definition.performanceMetric === 'weight' ? '重量表現' : '次數表現'}</span>
                <button className="text-button" onClick={() => setEditing(definition)}>
                  <Pencil />
                  編輯
                </button>
                <button
                  className="text-button danger"
                  onClick={() => {
                    if (confirm('刪除這個動作？\n既有課堂紀錄會保留。'))
                      mutations.remove.mutate(
                        { id: definition.id, version: definition.version },
                        { onSuccess: () => setMessage('動作已從動作庫移除。') }
                      )
                  }}
                >
                  <Trash2 />
                  刪除
                </button>
              </footer>
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-state">
          <Dumbbell />
          <h2>{query.data?.totals.all === 0 ? '尚無動作' : '沒有符合的動作'}</h2>
          <button
            className="primary-button compact"
            onClick={query.data?.totals.all === 0 ? () => setEditing(null) : clear}
          >
            {query.data?.totals.all === 0 ? '新增自訂動作' : '清除篩選'}
          </button>
        </section>
      )}
      {editing !== undefined && (
        <DefinitionEditor
          definition={editing}
          filters={query.data?.filters}
          pending={mutations.createExercise.isPending || mutations.updateExercise.isPending}
          onClose={() => setEditing(undefined)}
          onSave={(fields) => {
            const done = () => {
              setEditing(undefined)
              setMessage(editing ? '動作已更新。' : '動作已建立。')
            }
            if (editing)
              mutations.updateExercise.mutate(
                {
                  id: editing.id,
                  input: { ...fields, version: editing.version, operationId: crypto.randomUUID() }
                },
                { onSuccess: done, onError: () => setMessage('此動作已變更，請重新選擇。') }
              )
            else
              mutations.createExercise.mutate(
                { ...fields, operationId: crypto.randomUUID() },
                { onSuccess: done }
              )
          }}
        />
      )}
    </Page>
  )
}
function DefinitionEditor({
  definition,
  filters,
  pending,
  onClose,
  onSave
}: {
  definition: ExerciseDefinition | null
  filters?: { equipment: string[]; bodyParts: string[] }
  pending: boolean
  onClose: () => void
  onSave: (fields: {
    name: string
    equipment: string
    bodyParts: string[]
    movementType: '系統動作' | '局部動作'
    performanceMetric: PerformanceMetric
  }) => void
}) {
  const [parts, setParts] = useState(definition?.bodyParts ?? [])
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onSave({
      name: String(data.get('name') || ''),
      equipment: String(data.get('equipment') || ''),
      bodyParts: parts,
      movementType: String(data.get('movementType')) as any,
      performanceMetric: String(data.get('performanceMetric')) as PerformanceMetric
    })
  }
  return (
    <div className="dialog-backdrop">
      <section
        className="definition-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="definition-title"
      >
        <header>
          <div>
            <span>CUSTOM EXERCISE</span>
            <h2 id="definition-title">{definition ? '儲存修改' : '建立動作'}</h2>
          </div>
          <button className="icon-button" aria-label="關閉" onClick={onClose}>
            <X />
          </button>
        </header>
        <form onSubmit={submit}>
          <label>
            動作名稱
            <input name="name" defaultValue={definition?.name} required maxLength={120} autoFocus />
          </label>
          <label>
            器材
            <input
              name="equipment"
              defaultValue={definition?.equipment}
              list="equipment-list"
              required
              maxLength={120}
            />
            <datalist id="equipment-list">
              {filters?.equipment.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </datalist>
          </label>
          <fieldset>
            <legend>部位標籤（可複選）</legend>
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
                  {part}
                </button>
              ))}
            </div>
            <input
              aria-label="新增部位標籤"
              placeholder="輸入其他部位後按 Enter"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const value = e.currentTarget.value.trim()
                  if (value && !parts.includes(value) && parts.length < 12) {
                    setParts([...parts, value])
                    e.currentTarget.value = ''
                  }
                }
              }}
            />
          </fieldset>
          <label>
            動作類型
            <select name="movementType" defaultValue={definition?.movementType ?? '系統動作'}>
              <option>系統動作</option>
              <option>局部動作</option>
            </select>
          </label>
          <fieldset>
            <legend>最佳表現指標</legend>
            <label>
              <input
                type="radio"
                name="performanceMetric"
                value="weight"
                defaultChecked={!definition || definition.performanceMetric === 'weight'}
              />
              重量（每堂最高工作重量）
            </label>
            <label>
              <input
                type="radio"
                name="performanceMetric"
                value="reps"
                defaultChecked={definition?.performanceMetric === 'reps'}
              />
              次數（每堂最高實際次數）
            </label>
          </fieldset>
          <p>修改動作庫不會覆寫已保存的課堂內容。</p>
          <footer>
            <button type="button" className="secondary-button" onClick={onClose}>
              取消
            </button>
            <button className="primary-button compact" disabled={pending || parts.length === 0}>
              {pending ? '儲存中…' : definition ? '儲存修改' : '建立動作'}
            </button>
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
