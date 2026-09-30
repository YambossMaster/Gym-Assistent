import { formatMeasurements } from '../training/recording'
import { parseNote } from '../training/note-format'
import { QueryClient, QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query'
import { CalendarClock, Check, Download, Dumbbell, RefreshCw, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  ApiError,
  getPublicReschedule,
  getPublicTrainingResult,
  redeemPublicReschedule,
  type PublicReschedule,
  type PublicTrainingResult,
  type PublicUsedReschedule
} from '../../api'
import { Brand } from '../../shared/primitives'
import { useModalScrollLock } from '../../shared/useDialogBehavior'
import { createTrainingResultImage } from './trainingResultImage'

export function PublicCapabilityApp({ purpose }: { purpose: 'training' | 'reschedule' }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { gcTime: 0, retry: false, staleTime: 0 } }
      })
  )
  useEffect(() => () => client.clear(), [client])
  return (
    <QueryClientProvider client={client}>
      {purpose === 'training' ? <TrainingResultPage /> : <ReschedulePage />}
    </QueryClientProvider>
  )
}

function PublicFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="public-capability-shell">
      <header className="public-brandbar">
        <Brand />
        <span>PRIVATE SHARE</span>
      </header>
      {children}
      <footer>這是由 FORM Coach Desk 安全分享的限時頁面。</footer>
    </main>
  )
}

function TrainingResultPage() {
  const { token = '' } = useParams()
  const query = useQuery({
    queryKey: ['public-training-result', token],
    queryFn: () => getPublicTrainingResult(token)
  })
  const [downloadState, setDownloadState] = useState<'idle' | 'pending' | 'error'>('idle')
  if (query.isLoading)
    return (
      <PublicFrame>
        <PublicLoading icon={<Dumbbell />} text="正在載入訓練結果…" />
      </PublicFrame>
    )
  if (query.isError)
    return (
      <PublicFrame>
        <PublicError error={query.error} purpose="training" onRetry={() => void query.refetch()} />
      </PublicFrame>
    )
  if (!query.data)
    return (
      <PublicFrame>
        <PublicError
          error={new Error('missing response')}
          purpose="training"
          onRetry={() => void query.refetch()}
        />
      </PublicFrame>
    )
  const result = query.data
  return (
    <PublicFrame>
      <article className="public-result-card">
        <header className="public-result-heading">
          <div>
            <span className="eyebrow dark">TRAINING RESULT</span>
            <h1>{result.studentDisplayName} 的訓練結果</h1>
            <p>
              {formatSession(
                result.session.startsAt,
                result.session.endsAt,
                result.session.timeZone
              )}{' '}
              · {result.session.durationMinutes} 分鐘
            </p>
          </div>
          <div className="public-result-actions">
            <div className="public-coach-seal">
              <small>COACH</small>
              <strong>{result.coachDisplayName}</strong>
            </div>
            <button
              className="secondary-button ui-action-general public-download-button"
              disabled={downloadState === 'pending'}
              onClick={() => void downloadResult(result, setDownloadState)}
            >
              <Download /> {downloadState === 'pending' ? '正在製作圖片…' : '下載圖片'}
            </button>
            {downloadState === 'error' ? (
              <span role="status" className="public-download-error">
                無法下載圖片，請再試一次。
              </span>
            ) : null}
          </div>
        </header>
        {result.exercises.length ? (
          <div className="public-exercise-list">
            {result.exercises.map((exercise, exerciseIndex) => (
              <section className="public-exercise" key={exercise.position}>
                <header>
                  <span>{String(exerciseIndex + 1).padStart(2, '0')}</span>
                  <h2>{exercise.definitionName}</h2>
                </header>
                <div className="public-set-grid">
                  {exercise.sets.map((set, setIndex) => (
                    <div className="public-set" key={set.position}>
                      <strong>SET {setIndex + 1}</strong>
                      {exercise.recording && set.measurements ? (
                        <span className="public-set-measurement recording">
                          {formatMeasurements(exercise.recording, set.measurements)}
                        </span>
                      ) : (
                        <>
                          <span className="public-set-measurement">
                            {value(set.plannedWeight)} {set.plannedWeight === null ? '' : set.unit}
                          </span>
                          <span className="public-set-reps">
                            {set.actualReps === null ? '—' : `× ${set.actualReps}`}
                          </span>
                        </>
                      )}
                      <span className="public-set-rpe">RPE {set.rpe ?? '—'}</span>
                      <em data-result={set.result ?? 'none'}>
                        {set.result === 'completed' ? <Check aria-hidden="true" /> : null}
                        {set.result === 'incomplete' ? <X aria-hidden="true" /> : null}
                        {setResult(set.result)}
                      </em>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <section className="public-no-record">
            <Dumbbell />
            <h2>這堂課沒有動作紀錄。</h2>
          </section>
        )}
        {result.trainingNote !== undefined ? (
          <section className="public-note">
            <span>教練筆記</span>
            {result.trainingNote ? (
              <div className="public-note-content">
                {parseNote(result.trainingNote).map((block, index) => (
                  <p
                    className={`is-${block.kind}`}
                    style={{ paddingLeft: `${Math.min(2, block.indent) * 18}px` }}
                    key={index}
                  >
                    {block.kind === 'bullet' ? '• ' : null}
                    {block.kind === 'number' ? (block.marker ?? `${index + 1}. `) : null}
                    {block.bold ? (
                      <strong>{block.text || '\u00a0'}</strong>
                    ) : (
                      block.text || '\u00a0'
                    )}
                  </p>
                ))}
              </div>
            ) : (
              <p>—</p>
            )}
          </section>
        ) : null}
      </article>
    </PublicFrame>
  )
}

function ReschedulePage() {
  const { token = '' } = useParams()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  useModalScrollLock(confirming)
  const [used, setUsed] = useState<PublicUsedReschedule | null>(null)
  const [conflict, setConflict] = useState(false)
  const [rateDelay, setRateDelay] = useState(0)
  const query = useQuery({
    queryKey: ['public-reschedule', token],
    queryFn: () => getPublicReschedule(token)
  })
  const mutation = useMutation({
    mutationFn: (startsAt: string) => redeemPublicReschedule(token, startsAt),
    onSuccess: ({ used }) => {
      setUsed(used)
      setConfirming(false)
      requestAnimationFrame(() => headingRef.current?.focus())
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 429) {
        setRateDelay(error.details.retryAfter ?? 1)
        return
      }
      setConfirming(false)
      if (error instanceof ApiError && error.details.error === 'slot_unavailable') {
        setConflict(true)
        void query.refetch()
      } else if (error instanceof ApiError && error.details.error === 'used_link') {
        setUsed(error.details.current as PublicUsedReschedule)
      }
    }
  })
  useEffect(() => {
    if (rateDelay <= 0) return
    const timer = window.setInterval(() => setRateDelay((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [rateDelay > 0])
  useEffect(() => {
    if (!confirming) return
    const restore = () => focusSelectedSlot(selected)
    const close = () => {
      setConfirming(false)
      requestAnimationFrame(restore)
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (!mutation.isPending) close()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [
        ...dialogRef.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
      ]
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', keydown)
    requestAnimationFrame(() =>
      dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    )
    return () => window.removeEventListener('keydown', keydown)
  }, [confirming, selected, mutation.isPending])
  if (used)
    return (
      <PublicFrame>
        <UsedState used={used} headingRef={headingRef} success />
      </PublicFrame>
    )
  if (query.isLoading)
    return (
      <PublicFrame>
        <PublicLoading icon={<CalendarClock />} text="正在載入可改期時段…" />
      </PublicFrame>
    )
  if (query.isError) {
    const error = query.error
    if (error instanceof ApiError && error.details.error === 'used_link' && error.details.current)
      return (
        <PublicFrame>
          <UsedState used={error.details.current as PublicUsedReschedule} headingRef={headingRef} />
        </PublicFrame>
      )
    return (
      <PublicFrame>
        <PublicError error={error} purpose="reschedule" onRetry={() => void query.refetch()} />
      </PublicFrame>
    )
  }
  if (!query.data)
    return (
      <PublicFrame>
        <PublicError
          error={new Error('missing response')}
          purpose="reschedule"
          onRetry={() => void query.refetch()}
        />
      </PublicFrame>
    )
  const data = query.data
  const groups = groupSlots(data)
  const activeDate = groups.some(([date]) => date === selectedDate) ? selectedDate : groups[0]?.[0]
  return (
    <PublicFrame>
      <article className="public-reschedule-card">
        <header className="public-reschedule-heading">
          <span className="eyebrow dark">RESCHEDULE</span>
          <h1>{data.studentDisplayName}，選一個更適合的時間。</h1>
          <p>
            原課程：
            {formatSession(
              data.originalSession.startsAt,
              data.originalSession.endsAt,
              data.timeZone
            )}
          </p>
        </header>
        {conflict ? (
          <p className="public-alert" role="status">
            這個時段剛剛已被安排，請重新選擇。
          </p>
        ) : null}
        {groups.length ? (
          <div className="public-slot-picker">
            <h2 className="public-picker-label">選擇日期</h2>
            <div className="public-slot-dates" aria-label="選擇日期">
              {groups.map(([date, slots]) => (
                <button
                  key={date}
                  type="button"
                  className={date === activeDate ? 'active' : ''}
                  aria-pressed={date === activeDate}
                  onClick={() => {
                    setSelectedDate(date)
                    setSelected(null)
                    setConflict(false)
                  }}
                >
                  {formatLocalDate(slots[0]!.startsAt, data.timeZone)}
                </button>
              ))}
            </div>
            <h2 className="public-picker-label public-times-label">選擇時間</h2>
            <div className="public-slot-groups">
              {groups
                .filter(([date]) => date === activeDate)
                .map(([date, slots]) => (
                  <section
                    key={date}
                    aria-label={formatLocalDate(slots[0]!.startsAt, data.timeZone)}
                  >
                    <div className="public-slots">
                      {slots.map((slot) => (
                        <button
                          key={slot.startsAt}
                          data-slot-start={slot.startsAt}
                          className={selected === slot.startsAt ? 'selected' : ''}
                          aria-pressed={selected === slot.startsAt}
                          aria-label={`${formatLocalDate(slot.startsAt, data.timeZone)} ${formatRange(slot.startsAt, slot.endsAt, data.timeZone)}`}
                          onClick={() => {
                            setSelected(slot.startsAt)
                            setConflict(false)
                            setConfirming(true)
                          }}
                        >
                          <span>{period(slot.startsAt, data.timeZone)}</span>
                          <strong>{formatRange(slot.startsAt, slot.endsAt, data.timeZone)}</strong>
                          {selected === slot.startsAt ? <Check /> : null}
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          </div>
        ) : (
          <section className="public-no-slots">
            <CalendarClock />
            <h2>目前沒有可用時段</h2>
            <p>請直接聯絡教練討論其他安排。</p>
          </section>
        )}
      </article>
      {confirming && selected ? (
        <div
          className="public-dialog-backdrop"
          onPointerDown={(event) => {
            if (event.target !== event.currentTarget || mutation.isPending) return
            setConfirming(false)
            requestAnimationFrame(() => focusSelectedSlot(selected))
          }}
        >
          <section
            className="public-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reschedule-confirm-title"
            ref={dialogRef}
          >
            <span className="eyebrow dark">FINAL CHECK</span>
            <h2 id="reschedule-confirm-title">改到這個時間？</h2>
            <p>
              {formatLocalDate(selected, data.timeZone)}，
              {formatRange(
                selected,
                addMinutes(selected, data.originalSession.durationMinutes),
                data.timeZone
              )}
            </p>
            {mutation.isError &&
            mutation.error instanceof ApiError &&
            mutation.error.status === 429 ? (
              <p className="form-error">操作太頻繁，請稍後再試。</p>
            ) : null}
            <div>
              <button
                className="secondary-button ui-action-cancel"
                disabled={mutation.isPending}
                onClick={() => {
                  setConfirming(false)
                  requestAnimationFrame(() => focusSelectedSlot(selected))
                }}
              >
                取消
              </button>
              <button
                className="primary-button ui-action-save"
                disabled={mutation.isPending || rateDelay > 0}
                onClick={() => mutation.mutate(selected)}
              >
                {mutation.isPending
                  ? '正在改期…'
                  : rateDelay > 0
                    ? `稍後再試（${rateDelay}）`
                    : '確認改期'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </PublicFrame>
  )
}

function UsedState({
  used,
  headingRef,
  success = false
}: {
  used: PublicUsedReschedule
  headingRef: React.RefObject<HTMLHeadingElement | null>
  success?: boolean
}) {
  return (
    <section className="public-terminal success">
      <Check />
      <h1 ref={headingRef} tabIndex={-1}>
        {success ? '改期完成。' : '這個改期連結已使用。'}
      </h1>
      <p>
        {success
          ? `${used.coachDisplayName} 已收到最新安排，你可以關閉這個頁面。`
          : `已選擇 ${formatLocalDateTime(used.redeemedStartsAt, used.timeZone)}。`}
      </p>
      {success ? (
        <strong>{formatLocalDateTime(used.redeemedStartsAt, used.timeZone)}</strong>
      ) : null}
    </section>
  )
}

function PublicLoading({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <section className="public-terminal loading">
      {icon}
      <h1>{text}</h1>
      <span className="public-loading-line" />
    </section>
  )
}

function PublicError({
  error,
  purpose,
  onRetry
}: {
  error: unknown
  purpose: 'training' | 'reschedule'
  onRetry: () => void
}) {
  const reason = error instanceof ApiError ? error.details.error : undefined
  const [retryDelay, setRetryDelay] = useState(
    error instanceof ApiError ? (error.details.retryAfter ?? 0) : 0
  )
  useEffect(() => {
    if (retryDelay <= 0) return
    const timer = window.setInterval(() => setRetryDelay((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [retryDelay > 0])
  const terminal =
    reason === 'invalid_link' || reason === 'expired_link' || reason === 'revoked_link'
  const title =
    reason === 'invalid_link'
      ? purpose === 'training'
        ? '找不到這個分享連結。'
        : '找不到這個改期連結。'
      : reason === 'expired_link'
        ? purpose === 'training'
          ? '這個分享連結已過期。'
          : '這個改期連結已過期。'
        : reason === 'revoked_link'
          ? purpose === 'training'
            ? '這個分享連結已撤銷。'
            : '這個改期連結已撤銷。'
          : reason === 'rate_limited'
            ? '操作太頻繁，請稍後再試。'
            : purpose === 'training'
              ? '暫時無法載入訓練結果。'
              : '暫時無法載入可改期時段。'
  const detail =
    reason === 'invalid_link'
      ? '請向教練確認連結是否完整。'
      : terminal
        ? purpose === 'training'
          ? '請聯絡教練取得新的連結。'
          : '請直接聯絡教練安排時間。'
        : null
  return (
    <section className="public-terminal">
      <RefreshCw />
      <h1>{title}</h1>
      {detail ? <p>{detail}</p> : null}
      {!terminal && reason !== 'rate_limited' ? (
        <button className="secondary-button" onClick={onRetry}>
          重試
        </button>
      ) : reason === 'rate_limited' ? (
        <button className="secondary-button" disabled={retryDelay > 0} onClick={onRetry}>
          {retryDelay > 0 ? `稍後再試（${retryDelay}）` : '重試'}
        </button>
      ) : null}
    </section>
  )
}

function groupSlots(data: PublicReschedule) {
  const groups = new Map<string, PublicReschedule['slots']>()
  for (const slot of data.slots) {
    const date = localParts(slot.startsAt, data.timeZone).date
    groups.set(date, [...(groups.get(date) ?? []), slot])
  }
  return [...groups.entries()]
}
function localParts(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date(value))
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`
  }
}
function formatLocalDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone,
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(new Date(value))
}
function formatLocalDateTime(value: string, timeZone: string) {
  return `${formatLocalDate(value, timeZone)} ${localParts(value, timeZone).time}`
}
function formatRange(start: string, end: string, timeZone: string) {
  return `${localParts(start, timeZone).time}–${localParts(end, timeZone).time}`
}
function formatSession(start: string, end: string, timeZone: string) {
  return `${formatLocalDate(start, timeZone)} ${formatRange(start, end, timeZone)}`
}
function period(value: string, timeZone: string) {
  const hour = Number(localParts(value, timeZone).time.slice(0, 2))
  return hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上'
}
function addMinutes(value: string, minutes: number) {
  return new Date(new Date(value).getTime() + minutes * 60_000).toISOString()
}
function value(input: number | null) {
  return input === null ? '—' : String(input)
}
function setResult(result: 'completed' | 'incomplete' | null) {
  return result === 'completed' ? '已完成' : result === 'incomplete' ? '未完成' : '未記錄'
}
function focusSelectedSlot(selected: string | null) {
  Array.from(document.querySelectorAll<HTMLButtonElement>('[data-slot-start]'))
    .find((button) => button.dataset.slotStart === selected)
    ?.focus()
}

async function downloadResult(
  result: PublicTrainingResult,
  setState: (state: 'idle' | 'pending' | 'error') => void
) {
  setState('pending')
  try {
    const blob = await createTrainingResultImage(
      result,
      formatSession(result.session.startsAt, result.session.endsAt, result.session.timeZone)
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `FORM-訓練結果-${localParts(result.session.startsAt, result.session.timeZone).date}.png`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setState('idle')
  } catch {
    setState('error')
  }
}
