export type RecordingType =
  | 'weight_reps'
  | 'reps'
  | 'weight_duration'
  | 'duration'
  | 'distance_duration'
  | 'weight_distance'
  | 'distance'
  | 'duration_rounds'
export type ProgressMetric = 'weight' | 'reps' | 'duration' | 'distance' | 'pace' | 'rounds'
export type Dimension = Exclude<ProgressMetric, 'pace'>
export type RecordingConfig = { type: RecordingType; metrics: ProgressMetric[] }
export type Measurements = Record<Dimension, number | null> & {
  weightUnit: 'kg' | 'lb'
  durationUnit: 'sec' | 'min'
  distanceUnit: 'm' | 'km' | 'ft' | 'mi'
}
export type ProgressSeries = {
  metric: ProgressMetric
  unit: string
  direction: 'higher' | 'lower'
  distanceMetres?: number
  personal?: number | null
  current?: number | null
  previous?: number | null
  points: Array<{ sessionId: string; startsAt: string; value: number }>
}
export const metricLabels: Record<ProgressMetric, string> = {
  weight: '重量',
  reps: '次數',
  duration: '時間',
  distance: '距離',
  pace: '配速',
  rounds: '回合數'
}
export const recordingTypes: Record<
  RecordingType,
  { label: string; dimensions: Dimension[]; metrics: ProgressMetric[] }
> = {
  weight_reps: {
    label: '重量 × 次數',
    dimensions: ['weight', 'reps'],
    metrics: ['weight', 'reps']
  },
  reps: { label: '次數', dimensions: ['reps'], metrics: ['reps'] },
  weight_duration: {
    label: '重量 × 時間',
    dimensions: ['weight', 'duration'],
    metrics: ['duration', 'weight']
  },
  duration: { label: '時間', dimensions: ['duration'], metrics: ['duration'] },
  distance_duration: {
    label: '距離 × 時間',
    dimensions: ['distance', 'duration'],
    metrics: ['duration', 'pace']
  },
  weight_distance: {
    label: '重量 × 距離',
    dimensions: ['weight', 'distance'],
    metrics: ['weight', 'distance']
  },
  distance: { label: '距離', dimensions: ['distance'], metrics: ['distance'] },
  duration_rounds: {
    label: '時間 × 回合數',
    dimensions: ['duration', 'rounds'],
    metrics: ['rounds']
  }
}

/**
 * The first selected metric is always the single primary metric. A second metric means the
 * comparison is unlocked and is rendered as supporting context; one metric means it is locked.
 */
export function choosePrimaryMetric(
  config: RecordingConfig,
  selected: ProgressMetric
): RecordingConfig {
  const allowed = recordingTypes[config.type].metrics
  if (!allowed.includes(selected) || allowed.length === 1) return config
  const secondary = allowed.find((metric) => metric !== selected)!
  const isPrimary = config.metrics[0] === selected
  return {
    ...config,
    metrics: isPrimary && config.metrics.length > 1 ? [selected] : [selected, secondary]
  }
}
export const emptyMeasurements = (
  pref: {
    defaultWeightUnit: 'kg' | 'lb'
    defaultDistanceUnit?: 'km' | 'mi'
  },
  type?: RecordingType
): Measurements => ({
  weight: null,
  reps: null,
  duration: null,
  distance: null,
  rounds: null,
  weightUnit: pref.defaultWeightUnit,
  durationUnit: 'sec',
  distanceUnit:
    type === 'distance_duration'
      ? (pref.defaultDistanceUnit ?? 'km')
      : pref.defaultDistanceUnit === 'mi'
        ? 'ft'
        : 'm'
})
export function measurementUnit(values: Measurements, dimension: Dimension) {
  return dimension === 'weight'
    ? values.weightUnit
    : dimension === 'duration'
      ? values.durationUnit
      : dimension === 'distance'
        ? values.distanceUnit
        : dimension === 'reps'
          ? '次'
          : '回合'
}
export function formatMeasurements(config: RecordingConfig, values: Measurements) {
  return recordingTypes[config.type].dimensions
    .map((d) => `${values[d] ?? '—'} ${measurementUnit(values, d)}`)
    .join(' × ')
}
export function validMeasurements(values: Measurements) {
  return Object.keys(metricLabels)
    .filter((d) => d !== 'pace')
    .every((d) => {
      const dimension = d as Dimension,
        value = values[dimension]
      return (
        value === null ||
        (Number.isFinite(value) &&
          value >= 0 &&
          value <= (dimension === 'duration' || dimension === 'distance' ? 1_000_000 : 10_000) &&
          (dimension === 'reps' || dimension === 'rounds'
            ? Number.isInteger(value)
            : Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-7))
      )
    })
}
