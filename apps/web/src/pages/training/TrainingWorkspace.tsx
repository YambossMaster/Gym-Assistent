import { MeasurementInputs } from './MeasurementInputs'
import {
  emptyMeasurements,
  recordingTypes,
  metricLabels,
  validMeasurements,
  type Measurements,
  type RecordingConfig
} from './recording'
import { MultiMetricTrend } from './MultiMetricTrend'
import { PerformanceTrend } from './PerformanceTrend'
import {
  boundedDragScroll,
  clampDragTop,
  compactListHeight,
  compactRowTop,
  compactScrollCorrection,
  edgeScrollVelocity,
  ExerciseReorderBuffer,
  moveItem,
  shouldSwapAdjacent
} from './exercise-reorder'
import { consumeStartAnchor, startAnchorSpace } from './exercise-drag-start-anchor'
import type { Session } from '@supabase/supabase-js'
import {
  Check,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  GripVertical,
  Heart,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  TrendingUp,
  WifiOff,
  X,
  XCircle
} from 'lucide-react'
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode
} from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
import { FormSelect } from '../../shared/FormSelect'
import { Confirmation } from '../../shared/primitives'
import { useSchedulingMutations } from '../calendar/queries'
import { filterExerciseDefinitions } from '../exercises/filter'
import { DefinitionEditor } from '../exercises/ExercisesPage'
import {
  CoachLocalStore,
  OperationQueue,
  localRecord,
  payloadFingerprint,
  scopedKey,
  type QueuedOperation
} from '../../local-resilience'

type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'retrying' | 'conflict'
type DragLayout = {
  compactHeight: number
  leading: number
  trailing: number
  overlayTop: number
  offsetY: number
  ready: boolean
}

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
      key={`${session.user.id}:${query.data.session.id}`}
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

function findScrollContainer(source: HTMLElement) {
  let node = source.parentElement
  while (node && node !== document.body) {
    const overflowY = getComputedStyle(node).overflowY
    if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight) return node
    node = node.parentElement
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement
}

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
  const navigate = useNavigate()
  const routeLocation = useLocation()
  const focusedDefinitionId = new URLSearchParams(routeLocation.search).get('exercise')
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
    [completing, setCompleting] = useState(false),
    [dragOrder, setDragOrder] = useState<string[] | null>(null),
    [draggingId, setDraggingId] = useState<string | null>(null),
    [pressedDragId, setPressedDragId] = useState<string | null>(null),
    [dragLayout, setDragLayout] = useState<DragLayout | null>(null)
  const localStore = useMemo(() => new CoachLocalStore(), []),
    store = useMemo(() => new TrainingDraftStore(localStore), [localStore]),
    tabId = useRef(crypto.randomUUID()),
    versions = useRef({ record: initial.record.version, session: initial.session.version }),
    revisionRef = useRef(revision),
    saveMutationRef = useRef(mutations.save),
    conflictRef = useRef(false)
  const key = draftKey(import.meta.env.MODE, session.user.id, initial.session.id)
  const latest = useRef(draft)
  const dragBuffer = useRef<ExerciseReorderBuffer | null>(null)
  const dragTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragPointer = useRef<number | null>(null)
  const dragCapture = useRef<HTMLElement | null>(null)
  const dragPoint = useRef({ x: 0, y: 0 })
  const dragScrollTarget = useRef<HTMLElement | null>(null)
  const dragFrame = useRef<number | null>(null)
  const dragLastFrameTime = useRef<number | null>(null)
  const dragViewportBottom = useRef<number | null>(null)
  const dragViewportTop = useRef(0)
  const dragHeading = useRef<{
    element: HTMLElement
    bottomOffset: number
    visibility: string
    passed: boolean
  } | null>(null)
  const dropAnchor = useRef<{ id: string; top: number; scrollTarget: HTMLElement } | null>(null)
  const dragMotionPending = useRef(false)
  const dragScheduleFrame = useRef<(() => void) | null>(null)
  const dragReleaseCleanup = useRef<(() => void) | null>(null)
  const dragDirection = useRef<-1 | 0 | 1>(0)
  const dragLayoutRef = useRef<DragLayout | null>(null)
  const dragShellRef = useRef<HTMLDivElement | null>(null)
  const dragStackRef = useRef<HTMLDivElement | null>(null)
  const dragOverlayRef = useRef<HTMLDivElement | null>(null)
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
  const clearDragTimer = () => {
    if (dragTimer.current) clearTimeout(dragTimer.current)
    dragTimer.current = null
  }
  const restoreDragHeading = () => {
    const heading = dragHeading.current
    if (heading) heading.element.style.visibility = heading.visibility
    dragHeading.current = null
  }
  const trackDragHeading = (shellTop: number) => {
    const heading = dragHeading.current
    if (!heading || heading.passed || shellTop + heading.bottomOffset > dragViewportTop.current)
      return
    // Initial-space retirement compensates scrollTop. Never let that bring the
    // heading back into this gesture; visibility preserves all list geometry.
    heading.passed = true
    heading.element.style.visibility = 'hidden'
  }
  const resetDrag = () => {
    clearDragTimer()
    restoreDragHeading()
    dragReleaseCleanup.current?.()
    dragReleaseCleanup.current = null
    if (dragPointer.current !== null && dragCapture.current?.hasPointerCapture(dragPointer.current))
      dragCapture.current.releasePointerCapture(dragPointer.current)
    dragCapture.current = null
    if (dragFrame.current !== null) cancelAnimationFrame(dragFrame.current)
    dragFrame.current = null
    dragLastFrameTime.current = null
    dragViewportBottom.current = null
    dragMotionPending.current = false
    dragScheduleFrame.current = null
    dragPointer.current = null
    dragBuffer.current = null
    dragScrollTarget.current = null
    dragDirection.current = 0
    dragLayoutRef.current = null
    setPressedDragId(null)
    setDraggingId(null)
    setDragOrder(null)
    setDragLayout(null)
    document.body.classList.remove('is-reordering-exercise')
    document.body.style.removeProperty('--training-drag-footer-space')
  }
  useEffect(
    () => () => {
      clearDragTimer()
      restoreDragHeading()
      dragReleaseCleanup.current?.()
      if (
        dragPointer.current !== null &&
        dragCapture.current?.hasPointerCapture(dragPointer.current)
      )
        dragCapture.current.releasePointerCapture(dragPointer.current)
      if (dragFrame.current !== null) cancelAnimationFrame(dragFrame.current)
      document.body.classList.remove('is-reordering-exercise')
      document.body.style.removeProperty('--training-drag-footer-space')
    },
    []
  )
  const commitExerciseOrder = (order: string[]) => {
    const current = latest.current
    const next = order
      .map((id) => current.exercises.find((exercise) => exercise.id === id))
      .filter((exercise): exercise is TrainingDraftPayload['exercises'][number] =>
        Boolean(exercise)
      )
    if (
      next.length === current.exercises.length &&
      next.some((exercise, index) => exercise.id !== current.exercises[index]?.id)
    )
      change({ ...current, exercises: next, operationId: crypto.randomUUID() })
  }
  const moveExercise = (exerciseId: string, targetIndex: number) => {
    const ids = draft.exercises.map((exercise) => exercise.id)
    commitExerciseOrder(moveItem(ids, ids.indexOf(exerciseId), targetIndex))
  }
  const compactCards = () => [
    ...(dragStackRef.current?.querySelectorAll<HTMLElement>('[data-exercise-id]') ?? [])
  ]
  const animateExchangedCards = (exerciseIds: Set<string>, direction: -1 | 1) => {
    const buffer = dragBuffer.current
    requestAnimationFrame(() => {
      if (!buffer || dragBuffer.current !== buffer) return
      const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
      // Every crossed neighbour moves exactly one compact row. No layout reads
      // or one query/animation-frame per neighbour are needed for a fast jump.
      for (const card of compactCards()) {
        if (!exerciseIds.has(card.dataset.exerciseId!)) continue
        card.classList.add('is-swap-target')
        if (!reduceMotion) {
          card.getAnimations().forEach((animation) => animation.cancel())
          card.animate(
            [{ transform: `translateY(${direction * 66}px)` }, { transform: 'translateY(0)' }],
            { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }
          )
        }
        window.setTimeout(() => card.classList.remove('is-swap-target'), 190)
      }
    })
  }
  const advanceCompactOrder = (
    activeId: string,
    direction: -1 | 1,
    activeTop: number,
    activeHeight: number,
    shellTop: number
  ) => {
    const buffer = dragBuffer.current
    if (!buffer) return
    const order = buffer.order
    let index = order.indexOf(activeId)
    if (index < 0) return
    const exchanged = new Set<string>()
    while (order[index + direction]) {
      const neighbourIndex = index + direction
      const neighbourTop = compactRowTop(shellTop, neighbourIndex, activeHeight, 8)
      if (!shouldSwapAdjacent(direction, activeTop, activeHeight, neighbourTop, activeHeight)) break
      exchanged.add(order[neighbourIndex]!)
      buffer.step(activeId, direction)
      index = neighbourIndex
    }
    if (!exchanged.size) return
    // Catch up to the latest pointer in one render, without a per-row frame lock.
    setDragOrder(buffer.order)
    animateExchangedCards(exchanged, direction)
  }
  const updateDragOverlayPosition = (measuredRect?: DOMRect) => {
    const layout = dragLayoutRef.current
    const shell = dragShellRef.current
    const overlay = dragOverlayRef.current
    if (!layout || !shell || !overlay) return null
    const shellRect = measuredRect ?? shell.getBoundingClientRect()
    const shellTop = shellRect.top
    const listTop = shellTop + layout.leading
    const activeTop = clampDragTop(
      dragPoint.current.y - layout.offsetY,
      listTop,
      listTop + layout.compactHeight,
      dragViewportTop.current,
      dragViewportBottom.current ?? window.innerHeight,
      58
    )
    const nextTop = activeTop - shellTop
    overlay.style.setProperty('--drag-y', `${nextTop - layout.overlayTop}px`)
    return { activeTop, shellTop: listTop }
  }
  useLayoutEffect(() => {
    const anchor = dropAnchor.current
    if (draggingId || !anchor) return
    dropAnchor.current = null
    const card = compactCards().find((item) => item.dataset.exerciseId === anchor.id)
    if (!card) return
    const rect = card.getBoundingClientRect()
    const visibleTop = Math.max(
      dragViewportTop.current + 12,
      Math.min(
        anchor.top,
        (document.querySelector<HTMLElement>('.session-bottom')?.getBoundingClientRect().top ??
          window.innerHeight) -
          rect.height -
          12
      )
    )
    anchor.scrollTarget.scrollTop += rect.top - visibleTop
    card.querySelector<HTMLButtonElement>('.exercise-drag-handle')?.focus({ preventScroll: true })
  }, [draggingId])
  useLayoutEffect(() => {
    if (!draggingId || !dragLayout || dragLayout.ready) return
    const scrollTarget = dragScrollTarget.current
    const shell = dragShellRef.current
    const order = dragBuffer.current?.order
    if (!order || !scrollTarget || !shell) return
    const activeTop = compactRowTop(
      shell.getBoundingClientRect().top,
      order.indexOf(draggingId),
      58,
      8
    )
    const correction = compactScrollCorrection(activeTop, dragPoint.current.y, dragLayout.offsetY)
    if (Math.abs(correction) >= 0.5) scrollTarget.scrollTop += correction
    const remainingCorrection = compactScrollCorrection(
      compactRowTop(shell.getBoundingClientRect().top, order.indexOf(draggingId), 58, 8),
      dragPoint.current.y,
      dragLayout.offsetY
    )
    const space = startAnchorSpace(remainingCorrection)
    shell.style.paddingTop = `${space.leading}px`
    shell.style.paddingBottom = `${space.trailing}px`
    shell.style.height = `${dragLayout.compactHeight + space.leading + space.trailing}px`
    if (space.trailing) scrollTarget.scrollTop += space.trailing
    const shellRect = shell.getBoundingClientRect()
    trackDragHeading(shellRect.top)
    const positionedTop = clampDragTop(
      dragPoint.current.y - dragLayout.offsetY,
      shellRect.top + space.leading,
      shellRect.top + space.leading + dragLayout.compactHeight,
      dragViewportTop.current,
      dragViewportBottom.current ?? window.innerHeight,
      58
    )
    const positioned = {
      ...dragLayout,
      ...space,
      overlayTop: positionedTop - shellRect.top,
      ready: true
    }
    dragLayoutRef.current = positioned
    setDragLayout(positioned)
    dragMotionPending.current = true
    dragScheduleFrame.current?.()
  }, [dragLayout, draggingId])
  const beginDrag = (exerciseId: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || dragPointer.current !== null) return
    clearDragTimer()
    dragPointer.current = event.pointerId
    dragPoint.current = { x: event.clientX, y: event.clientY }
    setPressedDragId(exerciseId)
    const handle = event.currentTarget
    const card = handle.closest<HTMLElement>('[data-exercise-id]')
    const rect = card?.getBoundingClientRect()
    const shell = handle.closest<HTMLElement>('.exercise-stack-shell')
    if (!shell) return resetDrag()
    // The handle's keyed card moves during reconciliation; capturing there can
    // lose the pointer. This shell stays mounted and stationary in the DOM.
    shell.setPointerCapture(event.pointerId)
    dragCapture.current = shell
    const offsetY = rect ? event.clientY - rect.top : 0
    const trackPoint = (moveEvent: globalThis.PointerEvent) => {
      const deltaY = moveEvent.clientY - dragPoint.current.y
      dragPoint.current = { x: moveEvent.clientX, y: moveEvent.clientY }
      if (Math.abs(deltaY) >= 1) dragDirection.current = deltaY > 0 ? 1 : -1
    }
    const move = (moveEvent: globalThis.PointerEvent) => {
      if (moveEvent.pointerId !== dragPointer.current) return
      trackPoint(moveEvent)
      if (!dragBuffer.current) return
      moveEvent.preventDefault()
      dragMotionPending.current = true
      dragScheduleFrame.current?.()
    }
    const release = (releaseEvent: globalThis.PointerEvent) => {
      if (releaseEvent.pointerId !== dragPointer.current) return
      trackPoint(releaseEvent)
      // pointerup can precede the queued animation frame: include its final point.
      const position = updateDragOverlayPosition()
      if (position && dragDirection.current)
        advanceCompactOrder(
          exerciseId,
          dragDirection.current,
          position.activeTop,
          58,
          position.shellTop
        )
      dragBuffer.current?.commit()
      if (position && dragScrollTarget.current)
        dropAnchor.current = {
          id: exerciseId,
          top: position.activeTop,
          scrollTarget: dragScrollTarget.current
        }
      resetDrag()
    }
    const cancel = (cancelEvent: globalThis.PointerEvent) => {
      if (cancelEvent.pointerId === dragPointer.current) resetDrag()
    }
    const escape = (keyEvent: globalThis.KeyboardEvent) => {
      if (keyEvent.key === 'Escape') {
        keyEvent.preventDefault()
        resetDrag()
      }
    }
    const hidden = () => {
      if (document.visibilityState === 'hidden') resetDrag()
    }
    window.addEventListener('pointermove', move, { capture: true, passive: false })
    window.addEventListener('pointerup', release, true)
    window.addEventListener('pointercancel', cancel, true)
    window.addEventListener('blur', resetDrag)
    window.addEventListener('keydown', escape)
    document.addEventListener('visibilitychange', hidden)
    dragReleaseCleanup.current = () => {
      window.removeEventListener('pointermove', move, true)
      window.removeEventListener('pointerup', release, true)
      window.removeEventListener('pointercancel', cancel, true)
      window.removeEventListener('blur', resetDrag)
      window.removeEventListener('keydown', escape)
      document.removeEventListener('visibilitychange', hidden)
    }
    dragTimer.current = setTimeout(() => {
      const order = latest.current.exercises.map((exercise) => exercise.id)
      const rowHeight = 58
      const rowGap = 8
      const compactOffset = Math.min(offsetY, 48)
      const layout = {
        compactHeight: compactListHeight(order.length, rowHeight, rowGap),
        leading: 0,
        trailing: 0,
        overlayTop: 0,
        offsetY: compactOffset,
        ready: false
      }
      dragBuffer.current = new ExerciseReorderBuffer(order, commitExerciseOrder)
      dragLayoutRef.current = layout
      dragScrollTarget.current = findScrollContainer(shell)
      dragViewportBottom.current =
        document.querySelector<HTMLElement>('.session-bottom')?.getBoundingClientRect().top ?? null
      dragViewportTop.current =
        8 +
        Math.max(
          0,
          document.querySelector<HTMLElement>('.session-topbar')?.getBoundingClientRect().bottom ??
            0
        )
      const heading = shell
        .closest('.training-editor')
        ?.querySelector<HTMLElement>('.training-heading')
      if (heading)
        dragHeading.current = {
          element: heading,
          bottomOffset: heading.getBoundingClientRect().bottom - shell.getBoundingClientRect().top,
          visibility: heading.style.visibility,
          passed: false
        }
      document.body.style.setProperty(
        '--training-drag-footer-space',
        `${window.innerHeight - (dragViewportBottom.current ?? window.innerHeight)}px`
      )
      setDragOrder(order)
      setDraggingId(exerciseId)
      setPressedDragId(null)
      setDragLayout(layout)
      document.body.classList.add('is-reordering-exercise')
      const runDragFrame = (timestamp: number) => {
        dragFrame.current = null
        const scrollTarget = dragScrollTarget.current
        if (!scrollTarget || !dragBuffer.current) return
        const documentScroll =
          scrollTarget === document.documentElement ||
          scrollTarget === document.body ||
          scrollTarget === document.scrollingElement
        const rawBounds = documentScroll
          ? { top: 0, bottom: window.innerHeight, height: window.innerHeight }
          : scrollTarget.getBoundingClientRect()
        const bounds = {
          top: Math.max(rawBounds.top, dragViewportTop.current),
          bottom: Math.min(rawBounds.bottom, dragViewportBottom.current ?? rawBounds.bottom)
        }
        const velocity = edgeScrollVelocity(
          dragPoint.current.y,
          bounds.top,
          bounds.bottom,
          104,
          480
        )
        let shellRect = shell.getBoundingClientRect()
        const currentLayout = dragLayoutRef.current!
        let scrolled = false
        if (velocity) {
          const previousTime = dragLastFrameTime.current ?? timestamp - 16
          const elapsed = Math.min(32, Math.max(0, timestamp - previousTime))
          const previousScrollTop = scrollTarget.scrollTop
          scrollTarget.scrollTop += boundedDragScroll(
            (velocity * elapsed) / 1000,
            shellRect.top + currentLayout.leading,
            shellRect.top + currentLayout.leading + currentLayout.compactHeight,
            bounds.top,
            bounds.bottom
          )
          scrolled = Math.abs(scrollTarget.scrollTop - previousScrollTop) >= 0.5
          if (scrolled) shellRect = shell.getBoundingClientRect()
        }
        trackDragHeading(shellRect.top)
        if (scrolled && (currentLayout.leading || currentLayout.trailing)) {
          const space = consumeStartAnchor(
            currentLayout,
            shellRect.top + currentLayout.leading,
            shellRect.top + currentLayout.leading + currentLayout.compactHeight,
            bounds.top,
            bounds.bottom
          )
          if (
            space.leading !== currentLayout.leading ||
            space.trailing !== currentLayout.trailing
          ) {
            // Capture before shrinking: a layout flush may clamp native scrollTop.
            // Subtracting from that clamped value would compensate twice.
            const restoredScrollTop = scrollTarget.scrollTop - currentLayout.leading + space.leading
            shell.style.paddingTop = `${space.leading}px`
            shell.style.paddingBottom = `${space.trailing}px`
            shell.style.height = `${currentLayout.compactHeight + space.leading + space.trailing}px`
            scrollTarget.scrollTop = restoredScrollTop
            const nextLayout = { ...currentLayout, ...space }
            dragLayoutRef.current = nextLayout
            setDragLayout(nextLayout)
            shellRect = shell.getBoundingClientRect()
          }
        }
        dragLastFrameTime.current = velocity ? timestamp : null
        const position = updateDragOverlayPosition(shellRect)
        const direction = velocity ? (Math.sign(velocity) as -1 | 1) : dragDirection.current
        if (position !== null && direction && (dragMotionPending.current || scrolled))
          advanceCompactOrder(
            exerciseId,
            direction,
            position.activeTop,
            rowHeight,
            position.shellTop
          )
        dragMotionPending.current = false
        if (velocity && scrolled) dragFrame.current = requestAnimationFrame(runDragFrame)
      }
      const scheduleDragFrame = () => {
        if (dragFrame.current === null && dragBuffer.current)
          dragFrame.current = requestAnimationFrame(runDragFrame)
      }
      dragScheduleFrame.current = scheduleDragFrame
    }, 120)
  }
  const handleDragKey = (
    exerciseId: string,
    index: number,
    event: KeyboardEvent<HTMLButtonElement>
  ) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    moveExercise(exerciseId, index + (event.key === 'ArrowUp' ? -1 : 1))
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
          ...(definition.recording
            ? { recording: definition.recording, formatVersion: 2 as const }
            : {}),
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
  const focusedExerciseId = focusedDefinitionId
    ? draft.exercises.find((exercise) => exercise.definitionId === focusedDefinitionId)?.id
    : undefined
  useEffect(() => {
    if (!focusedExerciseId) return
    const frame = requestAnimationFrame(() => {
      const target = Array.from(document.querySelectorAll<HTMLElement>('[data-exercise-id]')).find(
        (element) => element.dataset.exerciseId === focusedExerciseId
      )
      target?.scrollIntoView({ block: 'center', behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [focusedExerciseId, initial.session.id])
  const openHistory = (historySessionId: string) => {
    if (!trend?.definitionId) return
    setTrendId(null)
    navigate(`/sessions/${historySessionId}?exercise=${encodeURIComponent(trend.definitionId)}`)
  }
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
              <p>依動作類型填寫本組數值，再標記完成結果。</p>
            </div>
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
            <div
              ref={dragShellRef}
              className={`exercise-stack-shell${draggingId ? ' is-reordering' : ''}`}
              style={
                dragLayout
                  ? {
                      height: dragLayout.compactHeight + dragLayout.leading + dragLayout.trailing,
                      paddingTop: dragLayout.leading,
                      paddingBottom: dragLayout.trailing
                    }
                  : undefined
              }
            >
              <div
                ref={dragStackRef}
                className={`exercise-stack${draggingId ? ' is-reordering' : ''}`}
                role="list"
              >
                {(dragOrder ?? draft.exercises.map((exercise) => exercise.id)).map(
                  (exerciseId, index) => {
                    const exercise = draft.exercises.find((item) => item.id === exerciseId)!
                    return (
                      <ExerciseCard
                        key={exercise.id}
                        exercise={exercise}
                        summary={initial.exerciseSummaries.find(
                          (x) => x.occurrenceId === exercise.id
                        )}
                        details={initial.record.exercises.find((x) => x.id === exercise.id)}
                        defaultUnit={initial.defaultWeightUnit}
                        preference={initial}
                        index={index}
                        dragging={draggingId === exercise.id}
                        dragPressed={pressedDragId === exercise.id}
                        onDragPointerDown={(event) => beginDrag(exercise.id, event)}
                        onDragKeyDown={(event) => handleDragKey(exercise.id, index, event)}
                        onShowTrend={() => setTrendId(exercise.id)}
                        focused={exercise.id === focusedExerciseId}
                        onChange={(next) =>
                          change({
                            ...draft,
                            exercises: draft.exercises.map((item) =>
                              item.id === exercise.id ? next : item
                            ),
                            operationId: crypto.randomUUID()
                          })
                        }
                        onRemove={() => {
                          if (!exercise.sets.length || confirm('移除這個動作與所有組數？'))
                            change({
                              ...draft,
                              exercises: draft.exercises.filter((item) => item.id !== exercise.id),
                              operationId: crypto.randomUUID()
                            })
                        }}
                      />
                    )
                  }
                )}
                <button className="training-add-exercise" onClick={() => setPicker(true)}>
                  <Plus />
                  加入動作
                </button>
              </div>
              {dragLayout && draggingId ? (
                <div
                  ref={dragOverlayRef}
                  className="exercise-drag-overlay"
                  style={{
                    top: dragLayout.overlayTop,
                    height: 58,
                    visibility: dragLayout.ready ? 'visible' : 'hidden'
                  }}
                  aria-hidden="true"
                >
                  <GripVertical />
                  <span>
                    {String(
                      (dragOrder ?? draft.exercises.map((exercise) => exercise.id)).indexOf(
                        draggingId
                      ) + 1
                    ).padStart(2, '0')}
                  </span>
                  <strong>
                    {draft.exercises.find((exercise) => exercise.id === draggingId)?.definitionName}
                  </strong>
                </div>
              ) : null}
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
      {trend && trend.recording ? (
        <MultiMetricTrend
          session={session}
          definitionId={trend.definitionId}
          recording={trend.recording}
          name={initial.record.exercises.find((e) => e.id === trend.occurrenceId)!.definitionName}
          studentName={initial.session.studentName}
          series={trend.series ?? []}
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
          onClose={() => setTrendId(null)}
          onOpenHistory={openHistory}
        />
      ) : trend ? (
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
          onOpenHistory={openHistory}
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
  preference,
  index,
  dragging,
  dragPressed,
  focused,
  onDragPointerDown,
  onDragKeyDown,
  onShowTrend,
  onChange,
  onRemove
}: {
  exercise: TrainingDraftPayload['exercises'][number]
  summary: SessionTraining['exerciseSummaries'][number] | undefined
  details: SessionTraining['record']['exercises'][number] | undefined
  defaultUnit: 'kg' | 'lb'
  preference: SessionTraining
  index: number
  dragging: boolean
  dragPressed: boolean
  focused: boolean
  onDragPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onDragKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
  onShowTrend: () => void
  onChange: (value: TrainingDraftPayload['exercises'][number]) => void
  onRemove: () => void
}) {
  const recording =
    details?.recording ??
    exercise.recording ??
    legacyRecording(details?.performanceMetric ?? summary?.metric ?? 'weight')
  const progressRecording = summary?.recording ?? recording
  const primarySummary =
    progressRecording && summary?.series
      ? summary.series.find((series) => series.metric === progressRecording.metrics[0])
      : undefined
  const summaryMetricPrefix =
    primarySummary && primarySummary.metric !== 'weight'
      ? `${metricLabels[primarySummary.metric]}${primarySummary.distanceMetres !== undefined ? `（${primarySummary.distanceMetres} m）` : ''}：`
      : ''
  const addSet = () => {
    const existingSets = exercise.sets.map((set) => normalizeSet(set, recording, preference))
    const previous = existingSets.at(-1)
    onChange({
      ...exercise,
      recording,
      formatVersion: 2,
      sets: [
        ...existingSets,
        {
          id: crypto.randomUUID(),
          measurements: previous?.measurements ?? emptyMeasurements(preference, recording.type),
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
    <article
      className={`training-exercise-card recording-v2${dragging ? ' is-dragging' : ''}${dragPressed ? ' is-drag-pending' : ''}`}
      data-exercise-id={exercise.id}
      data-focused-exercise={focused ? 'true' : undefined}
      role="listitem"
    >
      <header>
        <div className="exercise-order-control">
          <button
            type="button"
            className="exercise-drag-handle"
            aria-label={`${exercise.definitionName || '訓練動作'}排序，第 ${index + 1} 項`}
            onPointerDown={onDragPointerDown}
            onKeyDown={onDragKeyDown}
          >
            <GripVertical aria-hidden="true" />
          </button>
          <span className="exercise-number">{String(index + 1).padStart(2, '0')}</span>
        </div>
        <div className="exercise-identity">
          <h3>{exercise.definitionName || '訓練動作'}</h3>
          <small>
            {details ? `${details.bodyParts.join('、')} · ${details.equipment}` : '訓練動作'}
          </small>
        </div>
        {summary ? (
          <div
            className={`exercise-performance-inline${primarySummary?.metric === 'weight' ? ' is-weight-summary' : ''}`}
          >
            {primarySummary ? (
              <>
                <div>
                  <span>本次 / 上次 最佳</span>
                  <strong>
                    {summaryMetricPrefix}
                    {formatSeriesValue(primarySummary.current, primarySummary.unit)} /{' '}
                    {formatSeriesValue(primarySummary.previous, primarySummary.unit)}
                  </strong>
                </div>
                <div>
                  <span>個人最佳</span>
                  <strong>
                    {summaryMetricPrefix}
                    {formatSeriesValue(primarySummary.personal, primarySummary.unit)}
                  </strong>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
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
          <span
            className={`measurement-head measurement-head--${recordingTypes[recording.type].dimensions.length}`}
          >
            {recordingTypes[recording.type].dimensions.map((dimension) => (
              <span
                className={
                  dimension === 'duration' || dimension === 'distance'
                    ? 'has-unit-toggle'
                    : undefined
                }
                key={dimension}
              >
                {metricLabels[dimension]}
              </span>
            ))}
          </span>
          <span>RPE</span>
          <span>結果</span>
          <span />
        </div>
        {exercise.sets.map((set, index) => (
          <SetCard
            key={set.id}
            index={index}
            set={set}
            recording={recording}
            values={measurementValues(set, recording, preference)}
            onChange={(next) =>
              onChange({
                ...exercise,
                recording,
                formatVersion: 2,
                sets: exercise.sets.map((current, i) =>
                  normalizeSet(i === index ? next : current, recording, preference)
                )
              })
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
  recording,
  values,
  index,
  onChange,
  onRemove
}: {
  set: TrainingSet
  recording: RecordingConfig
  values: Measurements
  index: number
  onChange: (set: TrainingSet) => void
  onRemove: () => void
}) {
  const number = (value: string) => (value === '' ? null : Number(value))
  return (
    <div className={`training-set-card ${set.result ?? ''}`}>
      <strong>{index + 1}</strong>
      <MeasurementInputs
        config={recording}
        values={values}
        onChange={(measurements) => onChange({ ...set, measurements })}
      />
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
          <X />
          未完成
        </button>
      </div>
      <button className="icon-button" aria-label={`移除第 ${index + 1} 組`} onClick={onRemove}>
        <Trash2 />
      </button>
    </div>
  )
}

function legacyRecording(
  metric: SessionTraining['record']['exercises'][number]['performanceMetric']
): RecordingConfig {
  return metric === 'reps'
    ? { type: 'reps', metrics: ['reps'] }
    : { type: 'weight_reps', metrics: ['weight', 'reps'] }
}

function measurementValues(
  set: TrainingSet,
  recording: RecordingConfig,
  preference: Pick<SessionTraining, 'defaultWeightUnit' | 'defaultDistanceUnit'>
): Measurements {
  if (set.measurements) return set.measurements
  const values = emptyMeasurements(preference, recording.type)
  if (recordingTypes[recording.type].dimensions.includes('weight'))
    values.weight = set.plannedWeight
  if (recordingTypes[recording.type].dimensions.includes('reps')) {
    values.reps = set.plannedReps ?? set.actualReps
  }
  return values
}

function normalizeSet(
  set: TrainingSet,
  recording: RecordingConfig,
  preference: Pick<SessionTraining, 'defaultWeightUnit' | 'defaultDistanceUnit'>
): TrainingSet {
  return { ...set, measurements: measurementValues(set, recording, preference) }
}

export function ExercisePicker({
  session,
  onPick,
  onClose
}: {
  session: Session
  onPick: (definition: ExerciseDefinition) => void
  onClose: () => void
}) {
  const [q, setQ] = useState(''),
    [view, setView] = useState<'all' | 'favorite' | 'custom'>('all'),
    [equipment, setEquipment] = useState(''),
    [movementType, setMovementType] = useState(''),
    [bodyParts, setBodyParts] = useState<string[]>([]),
    [editing, setEditing] = useState<ExerciseDefinition | null | undefined>(undefined),
    [deleting, setDeleting] = useState<ExerciseDefinition | null>(null),
    [message, setMessage] = useState('')
  const query = useExerciseLibrary(session)
  const mutations = useTrainingMutations(session)
  const { dialogRef, onBackdropPointerDown } = useDialogBehavior(onClose, {
    submitOnEnter: true,
    focusDialog: true
  })
  const definitions = useMemo(
    () =>
      filterExerciseDefinitions(query.data?.definitions ?? [], {
        q,
        view,
        equipment,
        movementType,
        bodyParts
      }),
    [q, view, equipment, movementType, bodyParts, query.data?.definitions]
  )
  const clear = () => {
    setQ('')
    setEquipment('')
    setMovementType('')
    setBodyParts([])
  }
  return (
    <div className="dialog-backdrop" role="presentation" onPointerDown={onBackdropPointerDown}>
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="exercise-picker"
        role="dialog"
        aria-modal={editing === undefined && !deleting}
        aria-hidden={editing !== undefined || Boolean(deleting)}
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
        <div className="picker-toolbar">
          <label className="library-search picker-search">
            <Search aria-hidden="true" />
            <input
              type="search"
              placeholder="搜尋名稱、器材、類型或部位"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <div className="library-tabs picker-tabs">
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
          <button
            className="primary-button picker-create"
            onClick={() => {
              setMessage('')
              setEditing(null)
            }}
          >
            <Plus aria-hidden="true" />
            自訂動作
          </button>
        </div>
        {query.data && (
          <section className="filter-shelf picker-filters" aria-label="篩選動作">
            <FormSelect
              label="器材"
              value={equipment}
              onChange={setEquipment}
              options={[
                { value: '', label: '所有器材' },
                ...query.data.filters.equipment.map((value) => ({ value, label: value }))
              ]}
            />
            <FormSelect
              label="動作類型"
              value={movementType}
              onChange={setMovementType}
              options={[
                { value: '', label: '所有類型' },
                ...query.data.filters.movementTypes.map((value) => ({ value, label: value }))
              ]}
            />
            <div className="picker-filter-bottom">
              <div className="body-part-filters" aria-label="部位">
                {query.data.filters.bodyParts.map((part) => (
                  <button
                    key={part}
                    aria-pressed={bodyParts.includes(part)}
                    onClick={() =>
                      setBodyParts((items) =>
                        items.includes(part)
                          ? items.filter((item) => item !== part)
                          : [...items, part]
                      )
                    }
                  >
                    {part}
                  </button>
                ))}
              </div>
              {(q || equipment || movementType || bodyParts.length > 0) && (
                <button className="text-button picker-clear" onClick={clear}>
                  <X />
                  清除篩選
                </button>
              )}
            </div>
          </section>
        )}
        {message && (
          <p className="form-notice" role="status">
            {message}
          </p>
        )}
        {query.isLoading ? (
          <div className="picker-results">
            <p>載入動作庫中…</p>
          </div>
        ) : query.isError ? (
          <div className="picker-results">
            <p>
              無法載入動作庫。 <button onClick={() => void query.refetch()}>重試</button>
            </p>
          </div>
        ) : definitions.length ? (
          <div className="picker-results">
            <div className="picker-list">
              {definitions.map((definition) => {
                const busy =
                  definition.version === 0 ||
                  (mutations.updateExercise.isPending &&
                    mutations.updateExercise.variables?.id === definition.id) ||
                  (mutations.remove.isPending && mutations.remove.variables?.id === definition.id)
                return (
                  <div className="picker-item" key={definition.id}>
                    <button
                      className="picker-item-main"
                      disabled={busy}
                      onClick={() => onPick(definition)}
                    >
                      <span>
                        <strong>{definition.name}</strong>
                        <small>
                          {definition.equipment} · {definition.movementType} ·{' '}
                          {definition.bodyParts.join('、')}
                        </small>
                      </span>
                      <ChevronRight aria-hidden="true" />
                    </button>
                    <button
                      className="icon-button favorite-button"
                      aria-label={`${definition.favorite ? '取消常用' : '加入常用'}：${definition.name}`}
                      aria-pressed={definition.favorite}
                      disabled={busy}
                      onClick={() =>
                        mutations.favorite.toggle(definition.id, () =>
                          setMessage('常用更新失敗，已恢復原狀。')
                        )
                      }
                    >
                      <Heart />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`編輯：${definition.name}`}
                      disabled={busy}
                      onClick={() => setEditing(definition)}
                    >
                      <Pencil />
                    </button>
                    <button
                      className="icon-button danger"
                      aria-label={`刪除：${definition.name}`}
                      disabled={busy}
                      onClick={() => setDeleting(definition)}
                    >
                      <Trash2 />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="picker-results">
            <div className="empty-state">
              <strong>沒有符合的動作</strong>
              <button
                className="secondary-button"
                onClick={() => {
                  clear()
                  setView('all')
                }}
              >
                清除篩選
              </button>
            </div>
          </div>
        )}
      </section>
      {editing !== undefined && (
        <DefinitionEditor
          key={editing?.id ?? 'new'}
          definition={editing}
          filters={query.data?.filters}
          onClose={() => setEditing(undefined)}
          onSave={async (fields) => {
            if (editing) {
              await mutations.updateExercise.mutateAsync({
                id: editing.id,
                input: {
                  ...fields,
                  version:
                    query.data?.definitions.find((item) => item.id === editing.id)?.version ??
                    editing.version,
                  operationId: crypto.randomUUID()
                }
              })
              setEditing(undefined)
            } else {
              const created = await mutations.createExercise.mutateAsync({
                ...fields,
                operationId: crypto.randomUUID()
              })
              onPick(created)
            }
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
      ...(exercise.recording ? { recording: exercise.recording, formatVersion: 2 as const } : {}),
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
            (!set.measurements || validMeasurements(set.measurements)) &&
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

function formatSeriesValue(value: number | null | undefined, unit: string) {
  return value == null ? '—' : `${Number(value.toFixed(3))} ${unit}`
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
