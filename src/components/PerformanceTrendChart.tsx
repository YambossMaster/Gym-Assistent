import { format, parseISO } from 'date-fns'
import type { ExercisePerformancePoint } from '../domain'

const WIDTH = 720
const HEIGHT = 280
const PADDING = { top: 28, right: 24, bottom: 48, left: 58 }

const displayValue = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1))

export function PerformanceTrendChart({
  history,
  unit
}: {
  history: ExercisePerformancePoint[]
  unit: 'kg' | 'lb' | '次'
}) {
  if (!history.length)
    return (
      <div className="trend-empty">
        <span>NO PERFORMANCE DATA</span>
        <strong>還沒有可繪製的最佳表現</strong>
        <p>只有標記為已完成的組別會進入最佳表現紀錄。</p>
      </div>
    )

  const values = history.map((point) => point.value)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const spread = Math.max(rawMax - rawMin, Math.max(rawMax * 0.15, 1))
  const minValue = Math.max(0, rawMin - spread * 0.35)
  const maxValue = rawMax + spread * 0.35
  const plotWidth = WIDTH - PADDING.left - PADDING.right
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom
  const xFor = (index: number) =>
    history.length === 1
      ? PADDING.left + plotWidth / 2
      : PADDING.left + (index / (history.length - 1)) * plotWidth
  const yFor = (value: number) =>
    PADDING.top + ((maxValue - value) / (maxValue - minValue)) * plotHeight
  const coordinates = history.map((point, index) => ({
    ...point,
    x: xFor(index),
    y: yFor(point.value)
  }))
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(' ')
  const area = `${PADDING.left},${PADDING.top + plotHeight} ${line} ${coordinates.at(-1)!.x},${PADDING.top + plotHeight}`
  const labelStep = Math.max(1, Math.ceil(history.length / 6))
  const visibleLabels = new Set(
    history.flatMap((_, index) =>
      index === 0 || index === history.length - 1 || index % labelStep === 0 ? [index] : []
    )
  )
  const gridValues = Array.from({ length: 4 }, (_, index) =>
    rounded(minValue + ((maxValue - minValue) * index) / 3)
  ).reverse()

  return (
    <div className="performance-chart-wrap">
      <div className="performance-chart" role="img" aria-label={`共 ${history.length} 次最佳表現`}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
          <defs>
            <linearGradient id="performance-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d9ff43" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#d9ff43" stopOpacity="0" />
            </linearGradient>
          </defs>
          {gridValues.map((value) => {
            const y = yFor(value)
            return (
              <g key={value}>
                <line
                  x1={PADDING.left}
                  x2={WIDTH - PADDING.right}
                  y1={y}
                  y2={y}
                  className="trend-grid-line"
                />
                <text x={PADDING.left - 12} y={y + 4} className="trend-axis-value">
                  {displayValue(value)}
                </text>
              </g>
            )
          })}
          <polygon points={area} fill="url(#performance-area)" />
          {coordinates.length > 1 && <polyline points={line} className="trend-line" />}
          {coordinates.map((point, index) => (
            <g key={point.sessionId}>
              <circle cx={point.x} cy={point.y} r="5" className="trend-dot-halo" />
              <circle cx={point.x} cy={point.y} r="2.6" className="trend-dot" />
              <text x={point.x} y={point.y - 13} textAnchor="middle" className="trend-dot-value">
                {displayValue(point.value)}
              </text>
              {visibleLabels.has(index) && (
                <text x={point.x} y={HEIGHT - 18} textAnchor="middle" className="trend-date-label">
                  {format(parseISO(point.startsAt), 'M/d')}
                </text>
              )}
            </g>
          ))}
          <text x={WIDTH - PADDING.right} y={15} textAnchor="end" className="trend-unit-label">
            UNIT / {unit.toUpperCase()}
          </text>
        </svg>
      </div>
      <div className="trend-history-list" aria-label="歷史最佳表現列表">
        {history
          .slice()
          .reverse()
          .map((point, index) => (
            <div key={point.sessionId}>
              <span>{String(history.length - index).padStart(2, '0')}</span>
              <time dateTime={point.startsAt}>
                {format(parseISO(point.startsAt), 'yyyy.MM.dd')}
              </time>
              <strong>
                {displayValue(point.value)} <small>{unit}</small>
              </strong>
            </div>
          ))}
      </div>
    </div>
  )
}

const rounded = (value: number) => Math.round(value * 10) / 10
