import type { Session } from '@supabase/supabase-js'
import { Check, ChevronRight, Dumbbell, Plus, RotateCcw, Trash2, WifiOff, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ApiError,
  type ExerciseDefinition,
  type SessionTraining,
  type TrainingDraftPayload,
  type TrainingSet
} from '../../api'
import {
  AutosaveCoordinator,
  DRAFT_SCHEMA_VERSION,
  TrainingDraftStore,
  draftKey,
  type StoredTrainingDraft
} from './drafts'
import { useExerciseLibrary, useSessionTraining, useTrainingMutations } from './queries'
import { useSchedulingMutations } from '../calendar/queries'

type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'conflict'

export function TrainingWorkspace({ session, sessionId }: { session: Session; sessionId: string }) {
  const query = useSessionTraining(session, sessionId)
  if (query.isLoading)
    return (
      <section className="training-workspace training-loading" aria-live="polite">
        載入訓練紀錄中…
      </section>
    )
  if (query.isError || !query.data)
    return (
      <section className="training-workspace empty-state">
        <h2>
          {query.error instanceof ApiError && query.error.status === 404
            ? '找不到這堂課。'
            : '無法載入訓練紀錄。'}
        </h2>
        {query.error instanceof ApiError && query.error.status === 404 ? (
          <a className="secondary-button" href="/calendar">
            返回行事曆
          </a>
        ) : (
          <button className="secondary-button" onClick={() => void query.refetch()}>
            重試
          </button>
        )}
      </section>
    )
  return (
    <TrainingEditor
      session={session}
      initial={query.data}
      refreshing={query.isFetching}
      onRefresh={() => void query.refetch()}
    />
  )
}

function TrainingEditor({
  session,
  initial,
  refreshing,
  onRefresh
}: {
  session: Session
  initial: SessionTraining
  refreshing: boolean
  onRefresh: () => void
}) {
  const mutations = useTrainingMutations(session),
    scheduling = useSchedulingMutations(session)
  const [draft, setDraft] = useState(() => toDraft(initial)),
    [revision, setRevision] = useState(0),
    [saveState, setSaveState] = useState<SaveState>('idle'),
    [picker, setPicker] = useState(false),
    [recovery, setRecovery] = useState<StoredTrainingDraft | null>(null),
    [offline, setOffline] = useState(!navigator.onLine),
    [storageError, setStorageError] = useState(false),
    [notice, setNotice] = useState('')
  const store = useMemo(() => new TrainingDraftStore(), []),
    tabId = useRef(crypto.randomUUID()),
    versions = useRef({ record: initial.record.version, session: initial.session.version }),
    revisionRef = useRef(revision),
    saveMutationRef = useRef(mutations.save),
    conflictRef = useRef(false)
  const key = draftKey(import.meta.env.MODE, session.user.id, initial.session.id, tabId.current)
  const latest = useRef(draft)
  latest.current = draft
  revisionRef.current = revision
  saveMutationRef.current = mutations.save
  const coordinator = useMemo(
    () =>
      new AutosaveCoordinator<TrainingDraftPayload>(
        async (payload, sentRevision) => {
          if (!navigator.onLine) throw new Error('offline')
          let accepted: SessionTraining
          try {
            accepted = await saveMutationRef.current.mutateAsync({
              sessionId: initial.session.id,
              payload
            })
          } catch (error) {
            if (error instanceof ApiError && error.status === 409) {
              conflictRef.current = true
              setSaveState('conflict')
            }
            throw error
          }
          versions.current = { record: accepted.record.version, session: accepted.session.version }
          if (sentRevision === revisionRef.current) await store.delete(key)
        },
        650,
        (state) => {
          if (conflictRef.current) return
          setSaveState(state === 'error' ? (navigator.onLine ? 'error' : 'pending') : state)
        }
      ),
    [initial.session.id, key, store]
  )
  useEffect(() => {
    const online = () => setOffline(false),
      off = () => setOffline(true)
    addEventListener('online', online)
    addEventListener('offline', off)
    return () => {
      removeEventListener('online', online)
      removeEventListener('offline', off)
    }
  }, [])
  useEffect(() => {
    void store
      .list(session.user.id, initial.session.id)
      .then((items) => setRecovery(items.find((x) => x.tabId !== tabId.current) ?? null))
      .catch(() => setStorageError(true))
  }, [initial.session.id, session.user.id, store])
  useEffect(() => {
    if (!revision) return
    const payload = {
      ...draft,
      recordVersion: versions.current.record,
      sessionVersion: versions.current.session,
      operationId: crypto.randomUUID()
    }
    const local: StoredTrainingDraft = {
      key,
      schemaVersion: DRAFT_SCHEMA_VERSION,
      environment: import.meta.env.MODE,
      coachId: session.user.id,
      sessionId: initial.session.id,
      tabId: tabId.current,
      revision,
      savedAt: Date.now(),
      payload
    }
    void store
      .put(local)
      .then(() => setStorageError(false))
      .catch(() => setStorageError(true))
    if (valid(payload) && !offline && !conflictRef.current) coordinator.change(payload, revision)
  }, [coordinator, draft, initial.session.id, key, offline, revision, session.user.id, store])
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (coordinator.pending) {
        event.preventDefault()
      }
    }
    addEventListener('beforeunload', before)
    return () => removeEventListener('beforeunload', before)
  }, [coordinator])
  const change = (next: TrainingDraftPayload) => {
    setDraft(next)
    setRevision((x) => x + 1)
    setSaveState('pending')
  }
  const addDefinition = (definition: ExerciseDefinition) => {
    change({
      ...draft,
      exercises: [
        ...draft.exercises,
        {
          id: crypto.randomUUID(),
          definitionId: definition.id,
          definitionName: definition.name,
          definitionVersion: definition.version,
          sets: []
        }
      ],
      operationId: crypto.randomUUID()
    })
    setPicker(false)
  }
  const complete = async () => {
    try {
      await coordinator.flush()
      const payload = {
        ...latest.current,
        recordVersion: versions.current.record,
        sessionVersion: versions.current.session,
        operationId: crypto.randomUUID()
      }
      const accepted = await mutations.save.mutateAsync({
        sessionId: initial.session.id,
        payload,
        complete: true
      })
      versions.current = { record: accepted.record.version, session: accepted.session.version }
      await store.delete(key)
      setNotice('課程已完成。')
    } catch (error) {
      setSaveState(error instanceof ApiError && error.status === 409 ? 'conflict' : 'error')
    }
  }
  const reopen = () =>
    scheduling.transitionSession.mutate(
      {
        sessionId: initial.session.id,
        input: { action: 'reopen', version: versions.current.session }
      },
      {
        onSuccess: (accepted) => {
          versions.current.session = accepted.session.version!
          setNotice('課程已改回待上課。')
        }
      }
    )
  return (
    <section className="training-workspace">
      <header className="training-heading">
        <div>
          <span>TRAINING LOG</span>
          <h2>訓練紀錄</h2>
        </div>
        <div className={`save-indicator ${saveState}`} role="status" aria-live="polite">
          {saveState === 'saving'
            ? '儲存中…'
            : saveState === 'saved'
              ? '已儲存'
              : saveState === 'conflict'
                ? '紀錄已在其他裝置變更；你的草稿仍保留。'
                : offline
                  ? '離線中，草稿已保留於此裝置。'
                  : saveState === 'error'
                    ? '暫時無法儲存，草稿已保留。'
                    : ''}
        </div>
      </header>
      {refreshing && <p className="refresh-note">正在更新紀錄…</p>}
      {storageError && <p className="notice error">無法保留本機草稿，請保持此頁開啟並重試儲存。</p>}
      {recovery && (
        <section className="recovery-banner">
          <div>
            <strong>有尚未送出的草稿。</strong>
            <p>本機草稿保留至最後編輯後 7 天。</p>
          </div>
          <button
            onClick={() => {
              if (
                recovery.schemaVersion === DRAFT_SCHEMA_VERSION &&
                recovery.payload.recordVersion === initial.record.version &&
                recovery.payload.sessionVersion === initial.session.version
              ) {
                setDraft(recovery.payload)
                setRevision(recovery.revision)
                setRecovery(null)
              } else {
                conflictRef.current = true
                setSaveState('conflict')
              }
            }}
          >
            恢復草稿
          </button>
          <button onClick={() => void store.delete(recovery.key).then(() => setRecovery(null))}>
            捨棄草稿
          </button>
        </section>
      )}
      {saveState === 'conflict' && (
        <section className="conflict-banner">
          <strong>紀錄已在其他裝置變更；你的草稿仍保留。</strong>
          <button
            onClick={() => {
              onRefresh()
              setNotice('已載入最新紀錄，草稿仍保留於此裝置。')
            }}
          >
            保留草稿並檢視最新紀錄
          </button>
          <button
            onClick={() => {
              if (confirm('捨棄本機草稿？')) {
                void store.delete(key).then(() => location.reload())
              }
            }}
          >
            捨棄草稿，載入最新紀錄
          </button>
        </section>
      )}
      {draft.exercises.length === 0 ? (
        <section className="training-empty">
          <Dumbbell />
          <h3>尚未安排動作</h3>
          <p>加入第一個動作，開始記錄這堂課的訓練。</p>
          <button className="primary-button compact" onClick={() => setPicker(true)}>
            <Plus />
            加入動作
          </button>
        </section>
      ) : (
        <div className="exercise-stack">
          {draft.exercises.map((exercise, index) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              summary={initial.exerciseSummaries.find((x) => x.occurrenceId === exercise.id)}
              defaultUnit={initial.defaultWeightUnit}
              onChange={(next) =>
                change({
                  ...draft,
                  exercises: draft.exercises.map((x, i) => (i === index ? next : x)),
                  operationId: crypto.randomUUID()
                })
              }
              onRemove={() => {
                if (!exercise.sets.length || confirm('移除這個動作與所有組數？'))
                  change({
                    ...draft,
                    exercises: draft.exercises.filter((_, i) => i !== index),
                    operationId: crypto.randomUUID()
                  })
              }}
            />
          ))}
        </div>
      )}
      {draft.exercises.length > 0 && (
        <button className="secondary-button add-exercise" onClick={() => setPicker(true)}>
          <Plus />
          加入動作
        </button>
      )}
      <label className="training-note">
        <span>教練私人筆記</span>
        <small>僅供你查看。</small>
        <textarea
          maxLength={5000}
          value={draft.privateNote}
          onChange={(e) =>
            change({ ...draft, privateNote: e.target.value, operationId: crypto.randomUUID() })
          }
        />
        <small>{draft.privateNote.length} / 5000</small>
      </label>
      <div className="training-sticky-actions">
        {offline && (
          <span>
            <WifiOff />
            離線中
          </span>
        )}
        <button
          className="secondary-button"
          disabled={mutations.save.isPending || offline}
          onClick={() => void coordinator.flush()}
        >
          儲存紀錄
        </button>
        {initial.allowedActions.canComplete && (
          <button
            className="primary-button compact"
            disabled={mutations.save.isPending || offline}
            onClick={() => void complete()}
          >
            <Check />
            完成上課
          </button>
        )}
        {initial.allowedActions.canReopen && (
          <button
            className="secondary-button"
            disabled={scheduling.transitionSession.isPending || offline}
            onClick={reopen}
          >
            <RotateCcw />
            改回待上課
          </button>
        )}
      </div>
      {notice && (
        <p className="form-notice" role="status">
          {notice}
        </p>
      )}
      {picker && (
        <ExercisePicker session={session} onPick={addDefinition} onClose={() => setPicker(false)} />
      )}
    </section>
  )
}

function ExerciseCard({
  exercise,
  summary,
  defaultUnit,
  onChange,
  onRemove
}: {
  exercise: TrainingDraftPayload['exercises'][number]
  summary: SessionTraining['exerciseSummaries'][number] | undefined
  defaultUnit: 'kg' | 'lb'
  onChange: (value: TrainingDraftPayload['exercises'][number]) => void
  onRemove: () => void
}) {
  const addSet = () => {
    const previous = exercise.sets.at(-1)
    onChange({
      ...exercise,
      sets: [
        ...exercise.sets,
        {
          id: crypto.randomUUID(),
          plannedWeight: previous?.plannedWeight ?? null,
          plannedReps: previous?.plannedReps ?? null,
          actualReps: null,
          rpe: null,
          result: null,
          unit: previous?.unit ?? defaultUnit
        }
      ]
    })
  }
  return (
    <article className="training-exercise-card">
      <header>
        <div>
          <span>{exercise.sets.length} SETS</span>
          <h3>{exercise.definitionName || '訓練動作'}</h3>
        </div>
        <button className="icon-button" aria-label="移除動作" onClick={onRemove}>
          <Trash2 />
        </button>
      </header>
      {summary && (
        <div className="performance-strip">
          <span>
            本次最佳 <strong>{formatValue(summary.current, summary.metric, summary.unit)}</strong>
          </span>
          <span>
            上次最佳 <strong>{formatValue(summary.previous, summary.metric, summary.unit)}</strong>
          </span>
          <span>
            個人最佳 <strong>{formatValue(summary.personal, summary.metric, summary.unit)}</strong>
          </span>
        </div>
      )}
      {exercise.sets.map((set, index) => (
        <SetCard
          key={set.id}
          index={index}
          set={set}
          onChange={(next) =>
            onChange({ ...exercise, sets: exercise.sets.map((x, i) => (i === index ? next : x)) })
          }
          onRemove={() =>
            onChange({ ...exercise, sets: exercise.sets.filter((_, i) => i !== index) })
          }
        />
      ))}
      <button className="text-button set-add" onClick={addSet}>
        <Plus />
        新增一組
      </button>
    </article>
  )
}
function SetCard({
  set,
  index,
  onChange,
  onRemove
}: {
  set: TrainingSet
  index: number
  onChange: (set: TrainingSet) => void
  onRemove: () => void
}) {
  const number = (value: string) => (value === '' ? null : Number(value))
  return (
    <div className="training-set-card">
      <strong>第 {index + 1} 組</strong>
      <label>
        工作重量
        <input
          inputMode="decimal"
          type="number"
          min="0"
          max="10000"
          step="0.001"
          value={set.plannedWeight ?? ''}
          onChange={(e) => onChange({ ...set, plannedWeight: number(e.target.value) })}
        />
      </label>
      <label>
        單位
        <select
          value={set.unit}
          onChange={(e) => onChange({ ...set, unit: e.target.value as 'kg' | 'lb' })}
        >
          <option>kg</option>
          <option>lb</option>
        </select>
      </label>
      <label>
        目標次數
        <input
          inputMode="numeric"
          type="number"
          min="0"
          max="10000"
          value={set.plannedReps ?? ''}
          onChange={(e) => onChange({ ...set, plannedReps: number(e.target.value) })}
        />
      </label>
      <label>
        實際次數
        <input
          inputMode="numeric"
          type="number"
          min="0"
          max="10000"
          value={set.actualReps ?? ''}
          onChange={(e) => {
            const actual = number(e.target.value)
            onChange({
              ...set,
              actualReps: actual,
              result:
                actual === null || set.plannedReps === null
                  ? null
                  : actual < set.plannedReps
                    ? 'incomplete'
                    : 'completed'
            })
          }}
        />
      </label>
      <label>
        RPE（自覺用力程度，1–10）
        <input
          inputMode="decimal"
          type="number"
          min="1"
          max="10"
          step="0.5"
          value={set.rpe ?? ''}
          onChange={(e) => onChange({ ...set, rpe: number(e.target.value) })}
        />
      </label>
      <div className="result-toggle">
        <button
          aria-pressed={set.result === 'completed'}
          onClick={() =>
            onChange({
              ...set,
              result: set.result === 'completed' ? null : 'completed',
              actualReps: set.result === 'completed' ? null : set.plannedReps
            })
          }
        >
          已完成
        </button>
        <button
          aria-pressed={set.result === 'incomplete'}
          onClick={() =>
            onChange({
              ...set,
              result: set.result === 'incomplete' ? null : 'incomplete',
              actualReps: null
            })
          }
        >
          未完成
        </button>
      </div>
      <button className="icon-button" aria-label={`移除第 ${index + 1} 組`} onClick={onRemove}>
        <X />
      </button>
    </div>
  )
}

function ExercisePicker({
  session,
  onPick,
  onClose
}: {
  session: Session
  onPick: (definition: ExerciseDefinition) => void
  onClose: () => void
}) {
  const [q, setQ] = useState(''),
    [view, setView] = useState<'all' | 'favorite' | 'custom'>('all')
  const query = useExerciseLibrary(session, { q, view })
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    addEventListener('keydown', escape)
    return () => removeEventListener('keydown', escape)
  }, [onClose])
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="exercise-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
      >
        <header>
          <div>
            <span>EXERCISE LIBRARY</span>
            <h2 id="picker-title">加入動作</h2>
          </div>
          <button className="icon-button" aria-label="關閉" onClick={onClose}>
            <X />
          </button>
        </header>
        <input
          autoFocus
          type="search"
          placeholder="搜尋動作、器材或部位"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
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
            </button>
          ))}
        </div>
        {query.isLoading ? (
          <p>載入動作庫中…</p>
        ) : query.isError ? (
          <p>
            無法載入動作庫。 <button onClick={() => void query.refetch()}>重試</button>
          </p>
        ) : query.data?.definitions.length ? (
          <div className="picker-list">
            {query.data.definitions.map((definition) => (
              <button key={definition.id} onClick={() => onPick(definition)}>
                <span>
                  <strong>{definition.name}</strong>
                  <small>
                    {definition.equipment} · {definition.bodyParts.join('、')}
                  </small>
                </span>
                <ChevronRight />
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>沒有符合的動作</strong>
            <button onClick={() => setQ('')}>清除篩選</button>
          </div>
        )}
      </section>
    </div>
  )
}
function toDraft(value: SessionTraining): TrainingDraftPayload {
  return {
    privateNote: value.record.privateNote,
    exercises: value.record.exercises.map((exercise) => ({
      id: exercise.id,
      definitionId: exercise.definitionId,
      definitionName: exercise.definitionName,
      sets: exercise.sets
    })),
    recordVersion: value.record.version,
    sessionVersion: value.session.version,
    operationId: crypto.randomUUID()
  }
}
function valid(value: TrainingDraftPayload) {
  return (
    value.privateNote.length <= 5000 &&
    value.exercises.length <= 100 &&
    value.exercises.every(
      (exercise) =>
        exercise.sets.length <= 100 &&
        exercise.sets.every(
          (set) =>
            (set.plannedWeight === null ||
              (set.plannedWeight >= 0 && set.plannedWeight <= 10000)) &&
            (set.plannedReps === null ||
              (Number.isInteger(set.plannedReps) &&
                set.plannedReps >= 0 &&
                set.plannedReps <= 10000)) &&
            (set.actualReps === null ||
              (Number.isInteger(set.actualReps) &&
                set.actualReps >= 0 &&
                set.actualReps <= 10000)) &&
            (set.rpe === null ||
              (set.rpe >= 1 && set.rpe <= 10 && set.rpe * 2 === Math.round(set.rpe * 2)))
        )
    )
  )
}
function formatValue(value: number | null, metric: 'weight' | 'reps', unit: 'kg' | 'lb' | null) {
  return value === null ? '尚無紀錄' : `${value}${metric === 'weight' ? ` ${unit}` : ' 次'}`
}
