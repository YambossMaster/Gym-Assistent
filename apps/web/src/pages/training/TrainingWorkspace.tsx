import { PerformanceTrend } from './PerformanceTrend'
import type { Session } from '@supabase/supabase-js'
import { FormSelect } from '../../shared/FormSelect'
import {
  Check,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  LoaderCircle,
  MapPin,
  Plus,
  RotateCcw,
  TrendingUp,
  WifiOff,
  X,
  XCircle
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
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
  DRAFT_TTL_MS,
  TrainingDraftStore,
  TRAINING_AUTOSAVE_IDLE_MS,
  draftKey,
  sameTrainingContent,
  type StoredTrainingDraft
} from './drafts'
import { useExerciseLibrary, useTrainingMutations } from './queries'
import { useDialogBehavior } from '../../shared/useDialogBehavior'
import { useSchedulingMutations } from '../calendar/queries'
import { filterExerciseDefinitions } from '../exercises/filter'
import {
  CoachLocalStore,
  OperationQueue,
  localRecord,
  payloadFingerprint,
  scopedKey,
  type QueuedOperation
} from '../../local-resilience'

type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'retrying' | 'conflict'

export function TrainingWorkspace({
  session,
  query,
  headerActions,
  onBack,
  sessionNotice,
  timeZone
}: {
  session: Session
  query: UseQueryResult<SessionTraining, Error>
  headerActions?: ReactNode
  onBack: () => void
  sessionNotice?: string
  timeZone: string
}) {
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
    <ExclusiveTrainingEditor
      session={session}
      initial={query.data}
      onRefresh={async () => (await query.refetch()).data}
      headerActions={headerActions}
      onBack={onBack}
      sessionNotice={sessionNotice}
      timeZone={timeZone}
    />
  )
}

function ExclusiveTrainingEditor(props: Parameters<typeof TrainingEditor>[0]) {
  const [ownsEditor, setOwnsEditor] = useState(false)
  const refreshRef = useRef(props.onRefresh)
  const ownerId = useRef(crypto.randomUUID())
  refreshRef.current = props.onRefresh
  useEffect(() => {
    let cancelled = false,
      waited = false
    const key = `form-training-editor:${import.meta.env.MODE}:${props.session.user.id}:${props.initial.session.id}`
    const readLease = () => {
      try {
        return JSON.parse(localStorage.getItem(key) ?? 'null') as {
          ownerId: string
          expiresAt: number
        } | null
      } catch {
        return null
      }
    }
    const release = () => {
      if (readLease()?.ownerId === ownerId.current) localStorage.removeItem(key)
      if (!cancelled) setOwnsEditor(false)
    }
    const acquire = async () => {
      if (cancelled || document.visibilityState === 'hidden') return
      const current = readLease()
      const now = Date.now()
      if (current && current.ownerId !== ownerId.current && current.expiresAt > now) {
        waited = true
        setOwnsEditor(false)
        return
      }
      localStorage.setItem(
        key,
        JSON.stringify({ ownerId: ownerId.current, expiresAt: now + EDITOR_LEASE_TTL_MS })
      )
      if (readLease()?.ownerId !== ownerId.current) {
        waited = true
        setOwnsEditor(false)
        return
      }
      if (waited) await refreshRef.current()
      if (!cancelled) setOwnsEditor(true)
      waited = false
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') release()
      else void acquire()
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) void acquire()
    }
    void acquire()
    const heartbeat = setInterval(() => void acquire(), EDITOR_LEASE_HEARTBEAT_MS)
    addEventListener('storage', onStorage)
    addEventListener('pagehide', release)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      release()
      clearInterval(heartbeat)
      removeEventListener('storage', onStorage)
      removeEventListener('pagehide', release)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [props.initial.session.id, props.session.user.id])
  if (!ownsEditor)
    return (
      <section className="training-workspace training-loading" aria-live="polite">
        這堂課已在另一個分頁編輯；原分頁關閉後，這裡會自動接手並載入最新內容。
      </section>
    )
  return <TrainingEditor {...props} />
}

const EDITOR_LEASE_TTL_MS = 10_000
const EDITOR_LEASE_HEARTBEAT_MS = 2_000

function TrainingEditor({
  session,
  initial,
  onRefresh,
  headerActions,
  onBack,
  sessionNotice,
  timeZone
}: {
  session: Session
  initial: SessionTraining
  onRefresh: () => Promise<SessionTraining | undefined>
  headerActions?: ReactNode
  onBack: () => void
  sessionNotice?: string
  timeZone: string
}) {
  const mutations = useTrainingMutations(session),
    scheduling = useSchedulingMutations(session)
  const [draft, setDraft] = useState(() => toDraft(initial)),
    [revision, setRevision] = useState(0),
    [saveState, setSaveState] = useState<SaveState>('idle'),
    [picker, setPicker] = useState(false),
    [offline, setOffline] = useState(!navigator.onLine),
    [storageError, setStorageError] = useState(false),
    [notice, setNotice] = useState(''),
    [trendId, setTrendId] = useState<string | null>(null),
    [completing, setCompleting] = useState(false)
  const localStore = useMemo(() => new CoachLocalStore(), []),
    store = useMemo(() => new TrainingDraftStore(localStore), [localStore]),
    tabId = useRef(crypto.randomUUID()),
    versions = useRef({ record: initial.record.version, session: initial.session.version }),
    revisionRef = useRef(revision),
    saveMutationRef = useRef(mutations.save),
    conflictRef = useRef(false)
  const key = draftKey(import.meta.env.MODE, session.user.id, initial.session.id)
  const latest = useRef(draft)
  latest.current = draft
  revisionRef.current = revision
  saveMutationRef.current = mutations.save
  const queue = useMemo(
    () =>
      new OperationQueue(
        localStore,
        { environment: import.meta.env.MODE, coachId: session.user.id },
        async (operation) => {
          try {
            const targetSessionId = operation.target.split(':')[1]
            if (!targetSessionId) return { kind: 'failed', message: 'invalid_training_target' }
            const accepted = await saveMutationRef.current.mutateAsync({
              sessionId: targetSessionId,
              payload: operation.payload as TrainingDraftPayload
            })
            versions.current = {
              record: accepted.record.version,
              session: accepted.session.version
            }
            await store.deleteSession(session.user.id, targetSessionId)
            return { kind: 'accepted' }
          } catch (error) {
            if (error instanceof ApiError && error.status === 409)
              return { kind: 'conflict', message: error.message }
            if (error instanceof ApiError && error.status < 500)
              return { kind: 'failed', message: error.message }
            return {
              kind: 'retry',
              message: error instanceof Error ? error.message : 'network_error'
            }
          }
        }
      ),
    [initial.session.id, localStore, session.user.id, store]
  )
  const coordinator = useMemo(
    () =>
      new AutosaveCoordinator<TrainingDraftPayload>(
        async (payload, sentRevision) => {
          if (!navigator.onLine) throw new Error('offline')
          if (sentRevision === revisionRef.current)
            await store.put(
              storedDraft({
                key,
                coachId: session.user.id,
                sessionId: initial.session.id,
                tabId: tabId.current,
                revision: sentRevision,
                payload
              })
            )
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
          if (sentRevision === revisionRef.current)
            await store.deleteSession(session.user.id, initial.session.id)
        },
        TRAINING_AUTOSAVE_IDLE_MS,
        (state) => {
          if (conflictRef.current) return
          setSaveState(state === 'error' ? (navigator.onLine ? 'error' : 'pending') : state)
        },
        (payload) => ({
          ...payload,
          recordVersion: versions.current.record,
          sessionVersion: versions.current.session
        }),
        (error) => !(error instanceof ApiError) || error.status >= 500
      ),
    [initial.session.id, key, session.user.id, store]
  )
  useEffect(() => {
    if (conflictRef.current) return
    versions.current.session = initial.session.version
    if (!coordinator.pending) versions.current.record = initial.record.version
  }, [coordinator, initial.record.version, initial.session.version])
  useEffect(() => {
    const online = () => {
        setOffline(false)
        void queue.replay()
      },
      off = () => setOffline(true)
    addEventListener('online', online)
    addEventListener('offline', off)
    return () => {
      removeEventListener('online', online)
      removeEventListener('offline', off)
    }
  }, [queue])
  useEffect(() => {
    if (navigator.onLine) void queue.replay()
  }, [queue])
  useEffect(() => {
    void store
      .list(session.user.id, initial.session.id)
      .then(async (items) => {
        const candidate = items.find((item) => item.tabId !== tabId.current)
        if (!candidate) return
        if (sameTrainingContent(candidate.payload, toDraft(initial))) {
          await store.deleteSession(session.user.id, initial.session.id)
          return
        }
        if (
          candidate.schemaVersion === DRAFT_SCHEMA_VERSION &&
          candidate.payload.recordVersion === initial.record.version &&
          candidate.payload.sessionVersion === initial.session.version
        ) {
          latest.current = candidate.payload
          revisionRef.current = Math.max(1, candidate.revision)
          setDraft(candidate.payload)
          setRevision(revisionRef.current)
          setNotice('已恢復尚未同步的內容，系統會繼續自動儲存。')
          return
        }
        conflictRef.current = true
        latest.current = candidate.payload
        revisionRef.current = Math.max(1, candidate.revision)
        setDraft(candidate.payload)
        setRevision(revisionRef.current)
        setSaveState('conflict')
      })
      .catch(() => setStorageError(true))
  }, [initial.session.id, session.user.id, store])
  useEffect(() => {
    if (!revision) return
    const payload = {
      ...draft,
      recordVersion: versions.current.record,
      sessionVersion: versions.current.session,
      operationId: draft.operationId
    }
    const local = storedDraft({
      key,
      coachId: session.user.id,
      sessionId: initial.session.id,
      tabId: tabId.current,
      revision,
      payload
    })
    void store
      .put(local)
      .then(() => setStorageError(false))
      .catch(() => setStorageError(true))
    if (valid(payload) && offline) {
      const operationKey = scopedKey(
        { environment: import.meta.env.MODE, coachId: session.user.id },
        'operation',
        'training',
        initial.session.id
      )
      void payloadFingerprint(payload)
        .then((payloadHash) => {
          const operation: QueuedOperation = localRecord(
            { environment: import.meta.env.MODE, coachId: session.user.id },
            operationKey,
            {
              operationId: payload.operationId,
              target: `training:${initial.session.id}:${key}`,
              payloadHash,
              payload,
              state: 'pending' as const,
              attempts: 0,
              nextAttemptAt: 0
            }
          )
          return queue.enqueue(operation)
        })
        .catch(() => setStorageError(true))
    }
    if (valid(payload) && !offline && !conflictRef.current) coordinator.change(payload, revision)
  }, [
    coordinator,
    draft,
    initial.session.id,
    key,
    offline,
    queue,
    revision,
    session.user.id,
    store
  ])
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (coordinator.pending) {
        event.preventDefault()
      }
    }
    addEventListener('beforeunload', before)
    return () => removeEventListener('beforeunload', before)
  }, [coordinator])
  useEffect(() => () => void coordinator.flush().catch(() => undefined), [coordinator])
  const change = (next: TrainingDraftPayload) => {
    latest.current = next
    revisionRef.current += 1
    setDraft(next)
    setRevision(revisionRef.current)
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
    if (completing) return
    setCompleting(true)
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
      await store.deleteSession(session.user.id, initial.session.id)
      setNotice('')
    } catch (error) {
      setSaveState(error instanceof ApiError && error.status === 409 ? 'conflict' : 'error')
    } finally {
      setCompleting(false)
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
          setNotice('')
        }
      }
    )
  const statusText =
    saveState === 'conflict'
      ? '儲存衝突'
      : offline
        ? '離線中，恢復連線後會繼續儲存。'
        : saveState === 'pending' || saveState === 'saving'
          ? '儲存中…'
          : saveState === 'error' || saveState === 'retrying'
            ? '暫時無法同步，系統會在背景重試。'
            : '已儲存'
  const completedSets = draft.exercises.reduce(
    (count, exercise) => count + exercise.sets.filter((set) => set.result !== null).length,
    0
  )
  const totalSets = draft.exercises.reduce((count, exercise) => count + exercise.sets.length, 0)
  const trend = initial.exerciseSummaries.find((summary) => summary.occurrenceId === trendId)
  return (
    <section className="session-workspace">
      <header className="session-topbar">
        <button className="session-back-button" onClick={onBack}>
          <ChevronLeft />
          返回
        </button>
        <Link
          className="session-title"
          to={`/students/${initial.session.studentId}`}
          aria-label={`前往${initial.session.studentName}的學生頁面`}
        >
          <span className="mini-avatar">{initial.session.studentName.slice(-2)}</span>
          <span>
            <strong>{initial.session.studentName}</strong>
            <small>
              {formatSessionRange(initial.session.startsAt, initial.session.endsAt, timeZone)}
            </small>
          </span>
        </Link>
        <div className="session-top-actions">
          {headerActions}
          <span className={`session-save-status ${saveState}`} role="status" aria-live="polite">
            {saveState === 'saved' || saveState === 'idle' ? <Check /> : null}
            {statusText}
          </span>
        </div>
      </header>
      {sessionNotice ? (
        <p className="session-feedback" role="status">
          {sessionNotice}
        </p>
      ) : null}
      <div className="session-body">
        <aside className="session-context">
          <div className="session-context-summary">
            <CalendarClock aria-hidden="true" />
            <div>
              <span>{formatSessionDate(initial.session.startsAt, timeZone)}</span>
              <h1>
                {formatSessionTime(initial.session.startsAt, initial.session.endsAt, timeZone)}
                <small>{initial.session.studentName}</small>
              </h1>
              <p>
                <MapPin aria-hidden="true" />
                {initial.session.location}
                <span aria-hidden="true">·</span>
                <span className={`state-indicator ${initial.session.status}`} />
                {initial.session.status === 'completed'
                  ? '已完成'
                  : initial.session.status === 'cancelled'
                    ? '已取消'
                    : '進行中'}
              </p>
            </div>
          </div>
          <div className="context-stat">
            <span>訓練動作</span>
            <p>
              {draft.exercises.length
                ? draft.exercises.map((exercise) => exercise.definitionName).join(', ')
                : '尚未安排動作'}
              <small>共 {draft.exercises.length} 項</small>
            </p>
          </div>
          <div className="context-divider" />
          <label className="session-note-label" htmlFor="session-private-note">
            NOTE
          </label>
          <textarea
            id="session-private-note"
            className="note-area"
            maxLength={5000}
            value={draft.privateNote}
            onChange={(event) =>
              change({
                ...draft,
                privateNote: event.target.value,
                operationId: crypto.randomUUID()
              })
            }
            placeholder="輸入本堂 Note…"
          />
          <small className="session-note-count">{draft.privateNote.length} / 5000</small>
        </aside>
        <main className="training-editor">
          <header className="training-heading">
            <div>
              <span>TRAINING LOG</span>
              <h2>訓練紀錄</h2>
              <p>設定本組重量與目標次數，再記錄實際完成次數。</p>
            </div>
            <button className="primary-button compact" onClick={() => setPicker(true)}>
              <Plus />
              加入動作
            </button>
          </header>
          {storageError && (
            <p className="notice error">此裝置暫時無法保護尚未同步的內容，請保持頁面開啟。</p>
          )}
          {saveState === 'conflict' && (
            <section className="conflict-banner">
              <strong>這堂課在其他裝置已有較新的紀錄。</strong>
              <p>目前輸入已安全保留。只有選擇採用目前內容時，才會更新伺服器紀錄。</p>
              <button
                onClick={async () => {
                  const latestServer = await onRefresh()
                  if (!latestServer) {
                    setNotice('暫時無法取得最新紀錄，系統會繼續保留目前輸入。')
                    return
                  }
                  versions.current = {
                    record: latestServer.record.version,
                    session: latestServer.session.version
                  }
                  conflictRef.current = false
                  coordinator.abandonOutstanding()
                  change({ ...draft, operationId: crypto.randomUUID() })
                }}
              >
                採用目前內容
              </button>
              <button
                onClick={() => {
                  if (confirm('載入伺服器上的最新紀錄？目前尚未同步的輸入將被捨棄。')) {
                    void store
                      .deleteSession(session.user.id, initial.session.id)
                      .then(() => location.reload())
                  }
                }}
              >
                載入最新紀錄
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
                  details={initial.record.exercises.find((x) => x.id === exercise.id)}
                  defaultUnit={initial.defaultWeightUnit}
                  index={index}
                  onShowTrend={() => setTrendId(exercise.id)}
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
        </main>
      </div>
      <footer className="session-bottom">
        <div>
          <span>
            {completedSets} / {totalSets}
          </span>{' '}
          組已記錄
        </div>
        <div>
          {offline && (
            <span>
              <WifiOff />
              離線中
            </span>
          )}
          {initial.allowedActions.canComplete && (
            <SessionLifecycleButton
              action="complete"
              pending={completing}
              offline={offline}
              onClick={() => void complete()}
            />
          )}
          {initial.allowedActions.canReopen && (
            <SessionLifecycleButton
              action="reopen"
              pending={scheduling.transitionSession.isPending}
              offline={offline}
              onClick={reopen}
            />
          )}
        </div>
      </footer>
      {notice && (
        <p className="form-notice" role="status">
          {notice}
        </p>
      )}
      {picker && (
        <ExercisePicker session={session} onPick={addDefinition} onClose={() => setPicker(false)} />
      )}
      {trend ? (
        <PerformanceTrend
          studentName={initial.session.studentName}
          name={
            initial.record.exercises.find((exercise) => exercise.id === trend.occurrenceId)
              ?.definitionName ?? '成長軌跡'
          }
          updateNotice={
            saveState === 'pending' || saveState === 'saving'
              ? '正在儲存，成長軌跡將自動更新…'
              : saveState === 'error' ||
                  saveState === 'retrying' ||
                  saveState === 'conflict' ||
                  offline
                ? '尚有未同步的紀錄，儲存成功後會更新成長軌跡。'
                : undefined
          }
          points={trend.history}
          metric={trend.metric}
          onClose={() => setTrendId(null)}
        />
      ) : null}
    </section>
  )
}

export function SessionLifecycleButton({
  action,
  pending,
  offline,
  onClick
}: {
  action: 'complete' | 'reopen'
  pending: boolean
  offline: boolean
  onClick: () => void
}) {
  const complete = action === 'complete'
  return (
    <button
      className={`${complete ? 'primary-button compact' : 'secondary-button'} session-lifecycle-button${pending ? ' is-processing' : ''}`}
      disabled={pending || offline}
      aria-busy={pending}
      onClick={onClick}
    >
      {pending ? <LoaderCircle className="button-spinner" /> : complete ? <Check /> : <RotateCcw />}
      {pending ? '處理中…' : complete ? '完成上課' : '改回未完成'}
    </button>
  )
}

function ExerciseCard({
  exercise,
  summary,
  details,
  defaultUnit,
  index,
  onShowTrend,
  onChange,
  onRemove
}: {
  exercise: TrainingDraftPayload['exercises'][number]
  summary: SessionTraining['exerciseSummaries'][number] | undefined
  details: SessionTraining['record']['exercises'][number] | undefined
  defaultUnit: 'kg' | 'lb'
  index: number
  onShowTrend: () => void
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
        <span className="exercise-number">{String(index + 1).padStart(2, '0')}</span>
        <div className="exercise-identity">
          <h3>{exercise.definitionName || '訓練動作'}</h3>
          <small>
            {details ? `${details.bodyParts.join('、')} · ${details.equipment}` : '訓練動作'}
          </small>
        </div>
        {summary ? (
          <div className="exercise-performance-inline">
            <div>
              <span>本次 / 上次 最佳</span>
              <strong>
                {formatValue(summary.current, summary.metric, summary.unit)} /{' '}
                {formatValue(summary.previous, summary.metric, summary.unit)}
              </strong>
            </div>
            <div>
              <span>個人最佳</span>
              <strong>{formatValue(summary.personal, summary.metric, summary.unit)}</strong>
            </div>
            <button type="button" onClick={onShowTrend}>
              <TrendingUp /> 成長軌跡
            </button>
          </div>
        ) : null}
        <button className="icon-button" aria-label="移除動作" onClick={onRemove}>
          <XCircle />
        </button>
      </header>
      <div className="training-sets-scroll">
        <div className="training-set-head" aria-hidden="true">
          <span>組</span>
          <span>重量 / 計畫次數</span>
          <span>實際次數</span>
          <span>RPE</span>
          <span>結果</span>
          <span />
        </div>
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
      </div>
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
    <div className={`training-set-card ${set.result ?? ''}`}>
      <strong>{index + 1}</strong>
      <div className="planned-inputs">
        <label aria-label="工作重量">
          <input
            inputMode="decimal"
            type="number"
            min="0"
            max="10000"
            step="0.001"
            value={set.plannedWeight ?? ''}
            onChange={(e) => onChange({ ...set, plannedWeight: number(e.target.value) })}
          />
          <FormSelect
            label="單位"
            value={set.unit}
            onChange={(value) => onChange({ ...set, unit: value as 'kg' | 'lb' })}
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' }
            ]}
          />
        </label>
        <span>×</span>
        <label aria-label="目標次數">
          <input
            inputMode="numeric"
            type="number"
            min="0"
            max="10000"
            value={set.plannedReps ?? ''}
            onChange={(e) => onChange({ ...set, plannedReps: number(e.target.value) })}
          />
        </label>
      </div>
      <label aria-label="實際次數">
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
      <label aria-label="RPE（自覺用力程度，1–10）">
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
          <Check />
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
          <XCircle />
          未完成
        </button>
      </div>
      <button className="icon-button" aria-label={`移除第 ${index + 1} 組`} onClick={onRemove}>
        <XCircle />
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
  const query = useExerciseLibrary(session)
  const { dialogRef, onBackdropPointerDown } = useDialogBehavior(onClose, {
    submitOnEnter: true,
    focusDialog: true
  })
  const definitions = useMemo(
    () => filterExerciseDefinitions(query.data?.definitions ?? [], { q, view }),
    [q, query.data?.definitions, view]
  )
  return (
    <div className="dialog-backdrop" role="presentation" onPointerDown={onBackdropPointerDown}>
      <section
        ref={dialogRef}
        tabIndex={-1}
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
        ) : definitions.length ? (
          <div className="picker-list">
            {definitions.map((definition) => (
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
function storedDraft({
  key,
  coachId,
  sessionId,
  tabId,
  revision,
  payload
}: {
  key: string
  coachId: string
  sessionId: string
  tabId: string
  revision: number
  payload: TrainingDraftPayload
}): StoredTrainingDraft {
  const now = Date.now()
  return {
    key,
    schemaVersion: DRAFT_SCHEMA_VERSION,
    environment: import.meta.env.MODE,
    coachId,
    sessionId,
    tabId,
    revision,
    savedAt: now,
    expiresAt: now + DRAFT_TTL_MS,
    payload
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

function formatSessionRange(startsAt: string, endsAt: string, timeZone?: string) {
  const date = new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    timeZone
  }).format(new Date(startsAt))
  const time = (value: string) =>
    new Intl.DateTimeFormat('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone
    }).format(new Date(value))
  return `${addWeekdaySpace(date)} · ${time(startsAt)}–${time(endsAt)}`
}

function formatSessionDate(startsAt: string, timeZone: string) {
  const date = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone
  }).format(new Date(startsAt))
  return addWeekdaySpace(date)
}

function addWeekdaySpace(value: string) {
  return value.replace(/日(?=(?:星期|週))/, '日 ')
}

function formatSessionTime(startsAt: string, endsAt: string, timeZone: string) {
  const time = (value: string) =>
    new Intl.DateTimeFormat('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone
    }).format(new Date(value))
  return `${time(startsAt)}–${time(endsAt)}`
}
