import { TrendingUp, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { FormSelect } from '../../shared/FormSelect'
import { useDialogBehavior } from '../../shared/useDialogBehavior'

export type TrendPoint = {
  sessionId: string
  startsAt: string
  value: number
  unit: 'kg' | 'lb' | null
}
export const trendNumber = (value: number) =>
  new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 6 }).format(value)
export function trendDomain(points: TrendPoint[]) {
  const values = points.map((point) => point.value)
  const low = Math.min(...values),
    high = Math.max(...values)
  const padding = high === low ? Math.max(Math.abs(high) * 0.05, 1) : (high - low) * 0.25
  return { min: Math.max(0, low - padding), max: high + padding }
}
const date = (value: string) =>
  new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(value)
  )

export function PerformanceTrend({
  name,
  studentName,
  points,
  metric,
  loading = false,
  error = false,
  refreshing = false,
  updateNotice,
  onRetry,
  onClose
}: {
  name: string
  studentName: string
  points: TrendPoint[]
  metric: 'weight' | 'reps'
  loading?: boolean
  error?: boolean
  refreshing?: boolean
  updateNotice?: string
  onRetry?: () => void
  onClose: () => void
}) {
  const { dialogRef, onBackdropPointerDown } = useDialogBehavior(onClose, { focusDialog: true })
  const id = useId()
  const chartRef = useRef<HTMLDivElement>(null)
  const historyRef = useRef<HTMLOListElement>(null)
  const [width, setWidth] = useState(640)
  const [expanded, setExpanded] = useState(false)
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 600px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px)')
    const update = () => setMobile(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const range = expanded ? (mobile ? 10 : 20) : mobile ? 5 : 10
  const sorted = useMemo(
    () => [...points].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)),
    [points]
  )
  const selected = sorted.slice(-range)
  const visible = selected
  const dense = selected.length > (mobile ? 5 : 10)
  useEffect(() => {
    const element = chartRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, entry.contentRect.width))
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [points.length, loading])
  const unit = metric === 'reps' ? '次' : (sorted.at(-1)?.unit ?? 'kg')
  const latest = selected.at(-1)
  const delta = latest ? latest.value - selected[0].value : 0
  const domain = visible.length ? trendDomain(visible) : { min: 0, max: 1 }
  const top = 42,
    bottom = 152,
    left = mobile ? 40 : 56,
    right = width - (mobile ? 18 : 24)
  const y = (value: number) =>
    top + ((domain.max - value) / (domain.max - domain.min)) * (bottom - top)
  const coordinates = visible.map((point, index) => ({
    ...point,
    x:
      visible.length === 1
        ? (left + right) / 2
        : left + (index / (visible.length - 1)) * (right - left),
    y: y(point.value)
  }))
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(' ')
  return (
    <div className="dialog-backdrop trajectory-backdrop" onPointerDown={onBackdropPointerDown}>
      <section
        ref={dialogRef}
        tabIndex={-1}
        className={`performance-trend trajectory ${dense ? 'trajectory-dense' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <header>
          <div>
            <span>PERFORMANCE / 成長軌跡</span>
            <h2 id={id}>
              {studentName} <span className="trajectory-title-divider">—</span> {name}
            </h2>
            <p className="trajectory-description">
              每堂課已完成組別的最高{metric === 'weight' ? '重量' : '次數'}
            </p>
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
        {loading ? (
          <div className="trajectory-empty" role="status">
            載入運動表現紀錄中…
          </div>
        ) : error && !points.length ? (
          <div className="trajectory-empty" role="alert">
            <strong>無法載入成長軌跡</strong>
            <button className="secondary-button" onClick={onRetry}>
              重新載入
            </button>
          </div>
        ) : !points.length ? (
          <div className="trajectory-empty">
            <div className="trajectory-empty-icon">
              <TrendingUp size={30} />
            </div>
            <strong>尚無此動作的紀錄</strong>
            <p>這名學生不曾有此項動作的運動表現紀錄。</p>
            <small>
              記錄此動作已完成組別的{metric === 'weight' ? '重量' : '次數'}
              後，即可在這裡查看。
            </small>
          </div>
        ) : (
          <>
            {(error || refreshing) && (
              <p className="trajectory-status" role="status">
                {error ? (
                  <>
                    更新失敗，仍顯示已載入紀錄。 <button onClick={onRetry}>重試</button>
                  </>
                ) : (
                  '更新紀錄中…'
                )}
              </p>
            )}
            <div className="trajectory-overview">
              <div className="trajectory-stats">
                <div>
                  <span>最新紀錄</span>
                  <strong>
                    {trendNumber(latest!.value)} <small>{unit}</small>
                  </strong>
                </div>
                <div>
                  <span>區間最高</span>
                  <strong>
                    {trendNumber(Math.max(...selected.map((point) => point.value)))}{' '}
                    <small>{unit}</small>
                  </strong>
                </div>
                <div>
                  <span>區間變化</span>
                  <strong>
                    {selected.length < 2 ? '—' : `${delta > 0 ? '+' : ''}${trendNumber(delta)}`}{' '}
                    <small>{selected.length < 2 ? '' : unit}</small>
                  </strong>
                </div>
              </div>
              <div className="trajectory-toolbar">
                <FormSelect
                  label="紀錄範圍"
                  value={expanded ? 'long' : 'short'}
                  options={[
                    { value: 'short', label: `最近 ${mobile ? 5 : 10} 次` },
                    { value: 'long', label: `最近 ${mobile ? 10 : 20} 次` }
                  ]}
                  onChange={(value) => {
                    setExpanded(value === 'long')
                    historyRef.current?.scrollTo?.(0, 0)
                  }}
                />
              </div>
            </div>
            <div className="trajectory-chart" ref={chartRef}>
              <div className="trajectory-chart-caption">
                <span>
                  {date(visible[0].startsAt)} — {date(visible.at(-1)!.startsAt)}
                </span>
                <span>{unit} · 自動縮放</span>
              </div>
              <svg
                viewBox={`0 0 ${width} 224`}
                role="img"
                aria-label={`${name}，${visible.length} 次紀錄，依課堂先後排列；縱軸 ${trendNumber(domain.min)} 至 ${trendNumber(domain.max)} ${unit}。詳細數值見歷史紀錄。`}
              >
                <defs>
                  <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d9ff43" stopOpacity=".2" />
                    <stop offset="100%" stopColor="#d9ff43" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3].map((index) => {
                  const value = domain.min + ((domain.max - domain.min) * index) / 3
                  return (
                    <g key={index}>
                      <line
                        x1={left}
                        x2={right}
                        y1={y(value)}
                        y2={y(value)}
                        className="trajectory-grid"
                      />
                      <text
                        x={left - 16}
                        y={y(value) + 4}
                        textAnchor="end"
                        className="trajectory-axis"
                      >
                        {new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(value)}
                      </text>
                    </g>
                  )
                })}
                {coordinates.length > 1 && (
                  <>
                    <polygon
                      points={`${coordinates[0].x},${bottom} ${line} ${coordinates.at(-1)!.x},${bottom}`}
                      fill={`url(#${id}-fill)`}
                    />
                    <polyline points={line} className="trajectory-line" />
                  </>
                )}
                {coordinates.map((point, index) => (
                  <g key={`${point.sessionId}-${point.startsAt}`}>
                    <title>
                      {date(point.startsAt)}：{trendNumber(point.value)} {unit}
                    </title>
                    <circle cx={point.x} cy={point.y} r="4" className="trajectory-dot" />
                    <text
                      x={point.x}
                      y={point.y - (dense && index % 2 ? 27 : 12)}
                      textAnchor="middle"
                      className="trajectory-value"
                    >
                      {trendNumber(point.value)}
                    </text>
                    <text
                      x={point.x}
                      y={dense && index % 2 ? 200 : 178}
                      textAnchor="middle"
                      className="trajectory-date"
                    >
                      {new Intl.DateTimeFormat('zh-TW', {
                        month: 'numeric',
                        day: 'numeric'
                      }).format(new Date(point.startsAt))}
                    </text>
                    <text
                      x={point.x}
                      y={dense && index % 2 ? 214 : 192}
                      textAnchor="middle"
                      className="trajectory-year"
                    >
                      {date(point.startsAt).slice(0, 4)}
                    </text>
                  </g>
                ))}
              </svg>
              <p className="trajectory-chart-note">
                依課堂先後排列 · 顯示最近 {selected.length} 次紀錄
              </p>
            </div>
            <div className="trajectory-history-heading">
              <strong>
                歷史紀錄 <small>{selected.length}</small>
              </strong>
              <span>最新在前</span>
            </div>
            <ol
              ref={historyRef}
              className="trajectory-history"
              tabIndex={0}
              aria-label="歷史紀錄，最新在前"
            >
              {selected
                .slice()
                .reverse()
                .map((point, index) => (
                  <li key={`${point.sessionId}-${point.startsAt}`}>
                    <span className="trajectory-index">
                      {String(selected.length - index).padStart(2, '0')}
                    </span>
                    <time dateTime={point.startsAt}>{date(point.startsAt)}</time>
                    {index === 0 && <span className="trajectory-latest">最新</span>}
                    <strong>
                      {trendNumber(point.value)}{' '}
                      <small>{metric === 'reps' ? '次' : point.unit}</small>
                    </strong>
                  </li>
                ))}
            </ol>
          </>
        )}
      </section>
    </div>
  )
}
