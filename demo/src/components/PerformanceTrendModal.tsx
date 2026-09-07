import { ChevronLeft } from 'lucide-react'
import type { ExercisePerformanceSummary } from '../domain'
import type { TrainingExercise } from '../types'
import { Modal } from './index'
import { PerformanceTrendChart } from './PerformanceTrendChart'

export function PerformanceTrendModal({
  studentName,
  exercise,
  summary,
  onClose,
  onBack,
  context = 'session'
}: {
  studentName: string
  exercise: TrainingExercise
  summary: ExercisePerformanceSummary
  onClose: () => void
  onBack?: () => void
  context?: 'session' | 'student-history'
}) {
  return (
    <Modal
      wide
      className="performance-trend-modal"
      title={`${studentName}・${exercise.name}`}
      onClose={onClose}
    >
      {onBack && (
        <button type="button" className="trend-back-button" onClick={onBack}>
          <ChevronLeft />
          返回動作列表
        </button>
      )}
      <div className="trend-modal-intro">
        <div>
          <span className="eyebrow">PROGRESS TRAJECTORY</span>
          <p>
            每次課堂成功完成的
            {summary.metric === 'weight' ? '最高工作重量' : '最高實際次數'}，依日期排列。
          </p>
        </div>
        <span className="trend-metric-badge">
          {summary.metric === 'weight' ? 'WEIGHT' : 'REPETITIONS'}
        </span>
      </div>
      <div
        className={`trend-summary-grid ${context === 'student-history' ? 'student-history' : ''}`}
      >
        {context === 'session' && (
          <div>
            <span>本次最佳</span>
            <strong>{formatPerformance(summary.current, summary.unit)}</strong>
          </div>
        )}
        <div>
          <span>上次最佳</span>
          <strong>
            {formatPerformance(
              context === 'student-history' ? summary.current : summary.previous,
              summary.unit
            )}
          </strong>
        </div>
        <div className="personal-best">
          <span>個人最佳</span>
          <strong>{formatPerformance(summary.personal, summary.unit)}</strong>
        </div>
      </div>
      <PerformanceTrendChart history={summary.history} unit={summary.unit} />
    </Modal>
  )
}

export const formatPerformance = (value: number | undefined, unit: 'kg' | 'lb' | '次') =>
  value === undefined ? '尚無紀錄' : `${Number.isInteger(value) ? value : value.toFixed(1)} ${unit}`

export const formatPerformancePair = (
  current: number | undefined,
  previous: number | undefined,
  unit: 'kg' | 'lb' | '次'
) => {
  const value = (item: number | undefined) =>
    item === undefined ? '—' : Number.isInteger(item) ? String(item) : item.toFixed(1)
  return `${value(current)} / ${value(previous)} ${unit}`
}
