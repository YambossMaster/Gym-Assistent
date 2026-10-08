import type { ScheduleSeries } from '../../api'

export function initialScheduleHorizon(
  value: ScheduleSeries['autoScheduleHorizon'] | 'MAX_WINDOW' | null | undefined
): ScheduleSeries['autoScheduleHorizon'] {
  if (value === 'MAX_WINDOW') return '2_WEEKS'
  return value ?? '1_WEEK'
}
