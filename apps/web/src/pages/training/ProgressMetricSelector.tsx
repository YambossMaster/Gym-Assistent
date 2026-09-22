import { LockKeyhole, UnlockKeyhole } from 'lucide-react'
import {
  metricLabels,
  recordingTypes,
  type ProgressMetric,
  type RecordingConfig
} from './recording'

export function ProgressMetricSelector({
  recording,
  onChoose,
  disabled = false,
  compact = false
}: {
  recording: RecordingConfig
  onChoose: (metric: ProgressMetric) => void
  disabled?: boolean
  compact?: boolean
}) {
  const metrics = recordingTypes[recording.type].metrics
  const primary = recording.metrics[0]!

  if (metrics.length === 1) {
    return (
      <div className={`progress-metric-static${compact ? ' is-compact' : ''}`}>
        <span>主要指標</span>
        <strong>{metricLabels[primary]}</strong>
      </div>
    )
  }

  const locked = recording.metrics.length === 1
  return (
    <div
      className={`progress-metric-selector${compact ? ' is-compact' : ''}`}
      role="group"
      aria-label="主要進步指標"
    >
      {metrics.map((metric) => {
        const selected = primary === metric
        return (
          <button
            key={metric}
            type="button"
            aria-pressed={selected}
            data-locked={selected && locked ? 'true' : undefined}
            aria-label={
              selected
                ? `${metricLabels[metric]}，主要指標，${locked ? '比較已鎖定' : '比較已開啟'}`
                : `${metricLabels[metric]}，設為主要指標`
            }
            title={selected ? (locked ? '解鎖比較' : '鎖定比較') : undefined}
            disabled={disabled}
            onClick={() => onChoose(metric)}
          >
            <span>{metricLabels[metric]}</span>
            {selected &&
              (locked ? (
                <LockKeyhole className="metric-lock-icon" aria-hidden="true" />
              ) : (
                <UnlockKeyhole className="metric-lock-icon" aria-hidden="true" />
              ))}
          </button>
        )
      })}
    </div>
  )
}
