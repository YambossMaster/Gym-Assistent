import type { Session } from '@supabase/supabase-js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { setProgressMetrics, type ExerciseDefinition } from '../../api'
import { FormSelect } from '../../shared/FormSelect'
import { useDialogBehavior } from '../../shared/useDialogBehavior'
import { queryKeys } from '../../query-keys'
import { useExerciseLibrary } from './queries'
import {
  choosePrimaryMetric,
  metricLabels,
  type ProgressMetric,
  type ProgressSeries,
  type RecordingConfig
} from './recording'
import { ProgressMetricSelector } from './ProgressMetricSelector'
import { trendDomain, trendNumber } from './PerformanceTrend'

const date = (value: string) => new Date(value).toLocaleDateString('zh-TW')
export function MultiMetricTrend({
  session,
  definitionId,
  recording,
  name,
  studentName,
  series,
  updateNotice,
  onClose
}: {
  session: Session
  definitionId: string
  recording: RecordingConfig
  name: string
  studentName: string
  series: ProgressSeries[]
  updateNotice?: string
  onClose: () => void
}) {
  const { dialogRef, onBackdropPointerDown } = useDialogBehavior(onClose, { focusDialog: true })
  const id = useId(),
    chartRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600),
    [expanded, setExpanded] = useState(false),
    [distance, setDistance] = useState('')
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 600px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px)'),
      update = () => setMobile(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (!chartRef.current) return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(260, entry.contentRect.width))
    )
    observer.observe(chartRef.current)
    return () => observer.disconnect()
  }, [])
  const library = useExerciseLibrary(session),
    client = useQueryClient()
  const definition = library.data?.definitions.find((d) => d.id === definitionId)
  const compatible = definition?.recording?.type === recording.type
  const current = compatible ? definition!.recording! : recording
  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof setProgressMetrics>[2]) =>
      setProgressMetrics(session.access_token, definitionId, input),
    retry: (count, error: any) => error?.status !== 409 && error?.status !== 400 && count < 2,
    onSuccess: (accepted: ExerciseDefinition) => {
      client.setQueryData(queryKeys.exerciseLibrary(session.user.id), (old: any) =>
        old
          ? {
              ...old,
              definitions: old.definitions.map((d: ExerciseDefinition) =>
                d.id === accepted.id ? accepted : d
              )
            }
          : old
      )
      void client.invalidateQueries({ queryKey: ['student-performance', session.user.id] })
      void client.invalidateQueries({ queryKey: ['student-trend', session.user.id] })
      void client.invalidateQueries({ queryKey: ['session-training', session.user.id] })
    },
    onError: () => void library.refetch()
  })
  const metrics = mutation.isPending ? mutation.variables.metrics : current.metrics
  const choose = (metric: ProgressMetric) => {
    if (!definition || !compatible || mutation.isPending) return
    const next = choosePrimaryMetric({ ...current, metrics }, metric).metrics
    mutation.mutate({
      metrics: next,
      version: definition.version,
      operationId: crypto.randomUUID()
    })
  }
  const distances = [
    ...new Set(series.flatMap((s) => (s.distanceMetres === undefined ? [] : [s.distanceMetres])))
  ].sort((a, b) => a - b)
  const selectedDistance = distances.includes(Number(distance)) ? Number(distance) : distances[0]
  const available = series.filter(
    (s) => s.distanceMetres === undefined || s.distanceMetres === selectedDistance
  )
  const primaryMetric = metrics[0]!
  const secondaryMetric = metrics[1]
  const primarySeries = available.find((s) => s.metric === primaryMetric)
  const secondarySeries = secondaryMetric
    ? available.find((s) => s.metric === secondaryMetric)
    : undefined
  const shown = [primarySeries, secondarySeries].filter((item): item is ProgressSeries =>
    Boolean(item)
  )
  const range = expanded ? (mobile ? 10 : 20) : mobile ? 5 : 10
  const sessions = [
    ...new Map(shown.flatMap((s) => s.points).map((p) => [p.sessionId, p])).values()
  ]
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.sessionId.localeCompare(b.sessionId))
    .slice(-range)
  const left = 105,
    right = width - 34,
    top = 34,
    bottom = 246
  const x = (index: number) =>
    sessions.length === 1
      ? (left + right) / 2
      : left + (index / (sessions.length - 1)) * (right - left)
  const primaryBottom = 166,
    secondaryTop = 190,
    secondaryBottom = bottom
  const makePoints = (s: ProgressSeries | undefined) =>
    s
      ? sessions.flatMap((p, i) => {
          const value = s.points.find((v) => v.sessionId === p.sessionId)
          return value ? [{ ...value, index: i, unit: null }] : []
        })
      : []
  const primaryPoints = makePoints(primarySeries)
  const selectedPrimaryPoints = primaryPoints.filter((point) =>
    sessions.some((row) => row.sessionId === point.sessionId)
  )
  const primaryDomain = primaryPoints.length ? trendDomain(primaryPoints) : { min: 0, max: 1 }
  const primaryY = (value: number) =>
    top +
    ((primaryDomain.max - value) / (primaryDomain.max - primaryDomain.min)) * (primaryBottom - top)
  const secondaryPoints = makePoints(secondarySeries)
  const secondaryMax = Math.max(1, ...secondaryPoints.map((point) => point.value))
  const secondaryY = (value: number) =>
    secondaryBottom - (value / secondaryMax) * (secondaryBottom - secondaryTop)
  const barWidth = Math.max(8, Math.min(34, ((right - left) / Math.max(sessions.length, 1)) * 0.42))
  const primaryColor = '#d9ff43'
  const secondaryColor = '#31465c'
  return (
    <div className="dialog-backdrop trajectory-backdrop" onPointerDown={onBackdropPointerDown}>
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="performance-trend trajectory multi-metric-trend"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <header>
          <div>
            <span>PERFORMANCE / 成長軌跡</span>
            <h2 id={id}>
              {studentName} — {name}
            </h2>
          </div>
          <button className="icon-button" aria-label="關閉" onClick={onClose}>
            <X />
          </button>
        </header>
        {updateNotice && (
          <p className="trajectory-status" role="status">
            {updateNotice}
          </p>
        )}
        {mutation.isError && (
          <p role="alert" className="form-error">
            主要指標尚未儲存，原設定仍保留。
            <button
              disabled={!compatible || !definition}
              onClick={() =>
                mutation.mutate({
                  ...mutation.variables,
                  ...((mutation.error as any)?.status === 409
                    ? { version: definition!.version, operationId: crypto.randomUUID() }
                    : {})
                })
              }
            >
              重試
            </button>
          </p>
        )}
        {library.isError && (
          <button onClick={() => void library.refetch()}>重新載入動作設定</button>
        )}
        <div className="trajectory-control-row">
          <ProgressMetricSelector
            compact
            recording={{ ...current, metrics }}
            disabled={!compatible || mutation.isPending}
            onChoose={choose}
          />
          <div className="trajectory-primary-summary">
            <div>
              <span>最新紀錄</span>
              <strong>
                {selectedPrimaryPoints.at(-1)
                  ? `${trendNumber(selectedPrimaryPoints.at(-1)!.value)} ${primarySeries?.unit}`
                  : '—'}
              </strong>
            </div>
            <div>
              <span>區間最佳紀錄</span>
              <strong>
                {selectedPrimaryPoints.length && primarySeries
                  ? `${trendNumber(
                      (primarySeries.direction === 'lower' ? Math.min : Math.max)(
                        ...selectedPrimaryPoints.map((point) => point.value)
                      )
                    )} ${primarySeries.unit}`
                  : '—'}
              </strong>
            </div>
          </div>
          <div className="trajectory-toolbar metric-toolbar">
            {distances.length > 0 && (
              <FormSelect
                label="時間比較距離"
                value={String(selectedDistance)}
                options={distances.map((d) => ({ value: String(d), label: `${d} m` }))}
                onChange={setDistance}
              />
            )}
            <FormSelect
              label="紀錄範圍"
              value={expanded ? 'long' : 'short'}
              options={[
                { value: 'short', label: `最近 ${mobile ? 5 : 10} 次` },
                { value: 'long', label: `最近 ${mobile ? 10 : 20} 次` }
              ]}
              onChange={(v) => setExpanded(v === 'long')}
            />
          </div>
        </div>
        <div className="trajectory-chart" ref={chartRef}>
          {sessions.length === 0 ? (
            <div className="trajectory-empty">
              <strong>尚無此動作的紀錄</strong>
              <p>填寫數值並標記已完成後，即可查看成長軌跡。</p>
            </div>
          ) : (
            <>
              <svg
                viewBox={`0 0 ${width} 310`}
                role="img"
                aria-label={`${name}，${sessions.length} 次紀錄；主要指標 ${metricLabels[primaryMetric]}以折線呈現${secondarySeries ? `，次要指標 ${metricLabels[secondarySeries.metric]}以底部長條呈現` : ''}。完整數值見歷史紀錄。`}
              >
                {[0, 1, 2, 3].map((i) => (
                  <line
                    key={i}
                    x1={left}
                    x2={right}
                    y1={top + (i * (primaryBottom - top)) / 3}
                    y2={top + (i * (primaryBottom - top)) / 3}
                    className="trajectory-grid"
                  />
                ))}
                {primarySeries && (
                  <g className="primary-line-series">
                    <text x={left} y={15} textAnchor="start" fill={primaryColor} fontSize="11">
                      {metricLabels[primarySeries.metric]} · {primarySeries.unit}
                    </text>
                    {[0, 1, 2, 3].map((i) => {
                      const value =
                        primaryDomain.min + (i * (primaryDomain.max - primaryDomain.min)) / 3
                      return (
                        <text
                          key={i}
                          x={left - 29}
                          y={primaryY(value) + 4}
                          textAnchor="end"
                          fill={primaryColor}
                          fontSize="10"
                        >
                          {Number(value.toFixed(1))}
                        </text>
                      )
                    })}
                    {primaryPoints.map((point, i) => {
                      const previous = primaryPoints[i - 1]
                      return (
                        <g key={point.sessionId}>
                          <title>
                            {date(point.startsAt)}：{metricLabels[primarySeries.metric]}{' '}
                            {trendNumber(point.value)} {primarySeries.unit}
                          </title>
                          {previous && point.index === previous.index + 1 && (
                            <line
                              x1={x(previous.index)}
                              y1={primaryY(previous.value)}
                              x2={x(point.index)}
                              y2={primaryY(point.value)}
                              stroke={primaryColor}
                              strokeWidth="2.5"
                            />
                          )}
                          <circle
                            cx={x(point.index)}
                            cy={primaryY(point.value)}
                            r="4"
                            fill={primaryColor}
                          />
                          <text
                            x={x(point.index)}
                            y={primaryY(point.value) - 10}
                            textAnchor="middle"
                            fontSize={sessions.length > 10 ? 8 : 10}
                            fill={primaryColor}
                          >
                            {Number(point.value.toFixed(2))}
                          </text>
                        </g>
                      )
                    })}
                  </g>
                )}
                {secondarySeries && (
                  <g className="secondary-bar-series" fill={secondaryColor} fillOpacity="0.4">
                    {secondaryPoints.map((point) => {
                      const y = secondaryY(point.value)
                      return (
                        <g key={point.sessionId}>
                          <title>
                            {date(point.startsAt)}：{metricLabels[secondarySeries.metric]}{' '}
                            {trendNumber(point.value)} {secondarySeries.unit}
                          </title>
                          <rect
                            className="secondary-bar"
                            x={x(point.index) - barWidth / 2}
                            y={y}
                            width={barWidth}
                            height={secondaryBottom - y}
                            rx="2"
                          />
                          <text
                            className="secondary-bar-label"
                            x={x(point.index)}
                            y={y - 5}
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight="600"
                            fill="#b1c0cf"
                            fillOpacity="0.82"
                          >
                            {trendNumber(point.value)}
                          </text>
                        </g>
                      )
                    })}
                  </g>
                )}
                {sessions.map((p, i) => (
                  <text
                    key={p.sessionId}
                    x={x(i)}
                    y={272 + (i % 2) * 16}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#bac6a7"
                  >
                    {new Date(p.startsAt).toLocaleDateString('zh-TW', {
                      month: 'numeric',
                      day: 'numeric'
                    })}
                  </text>
                ))}
              </svg>
            </>
          )}
        </div>
        <div className="trajectory-history-heading">
          <strong>
            歷史紀錄 <small>{sessions.length}</small>
          </strong>
        </div>
        <ol
          className="trajectory-history metric-history"
          tabIndex={0}
          aria-label="歷史紀錄，最新在前"
        >
          {sessions
            .slice()
            .reverse()
            .map((p) => (
              <li key={p.sessionId}>
                <time dateTime={p.startsAt}>{date(p.startsAt)}</time>
                <div>
                  {[primaryMetric].map((metric) => {
                    const s = shown.find((s) => s.metric === metric),
                      point = s?.points.find((row) => row.sessionId === p.sessionId)
                    return (
                      <strong key={metric}>
                        <small>{metricLabels[metric]}</small>{' '}
                        {point ? trendNumber(point.value) : '—'} <small>{s?.unit}</small>
                      </strong>
                    )
                  })}
                </div>
              </li>
            ))}
        </ol>
      </section>
    </div>
  )
}
