import type { ReactNode } from 'react'
import { TimeSelect, parseTime } from '../../shared/TimeSelect'

export function SchedulingTimeInput({
  label,
  labelSuffix,
  value,
  start,
  onChange
}: {
  label: string
  labelSuffix?: ReactNode
  value: string
  start?: string
  onChange: (value: string) => void
}) {
  const parsedStart = start === undefined ? undefined : parseTime(start)
  const startMinutes =
    parsedStart !== undefined && Number.isFinite(parsedStart) ? parsedStart : undefined
  return (
    <div className="scheduling-time-field">
      <span>
        {label}
        {labelSuffix}
      </span>
      <TimeSelect
        label={label}
        value={value}
        onChange={onChange}
        minMinutes={startMinutes === undefined ? 360 : startMinutes + 30}
        maxMinutes={startMinutes === undefined ? 1380 : Math.min(1439, startMinutes + 360)}
        describeFrom={startMinutes}
      />
    </div>
  )
}
