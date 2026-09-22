import { z } from 'zod'

export const recordingTypeSchema = z.enum([
  'weight_reps',
  'reps',
  'weight_duration',
  'duration',
  'distance_duration',
  'weight_distance',
  'distance',
  'duration_rounds',
])
export const progressMetricSchema = z.enum([
  'weight',
  'reps',
  'duration',
  'distance',
  'pace',
  'rounds',
])
export type RecordingType = z.infer<typeof recordingTypeSchema>
export type ProgressMetric = z.infer<typeof progressMetricSchema>

export const recordingMetrics: Record<RecordingType, readonly ProgressMetric[]> = {
  weight_reps: ['weight', 'reps'],
  reps: ['reps'],
  weight_duration: ['duration', 'weight'],
  duration: ['duration'],
  distance_duration: ['duration', 'pace'],
  weight_distance: ['weight', 'distance'],
  distance: ['distance'],
  duration_rounds: ['rounds'],
}

export const recordingConfigSchema = z
  .object({
    type: recordingTypeSchema,
    metrics: z.array(progressMetricSchema).min(1).max(2),
  })
  .strict()
  .refine(
    ({ type, metrics }) =>
      new Set(metrics).size === metrics.length &&
      metrics.every((metric) => recordingMetrics[type].includes(metric)),
    'Select unique progress metrics supported by this recording type.',
  )
export type RecordingConfig = z.infer<typeof recordingConfigSchema>

const measurement = z.number().finite().min(0).max(1_000_000).multipleOf(0.001).nullable()
const count = z.number().int().min(0).max(10_000).nullable()
export const measurementsSchema = z
  .object({
    weight: z.number().finite().min(0).max(10_000).multipleOf(0.001).nullable(),
    reps: count,
    duration: measurement,
    distance: measurement,
    rounds: count,
    weightUnit: z.enum(['kg', 'lb']),
    durationUnit: z.enum(['sec', 'min']),
    distanceUnit: z.enum(['m', 'km', 'ft', 'mi']),
  })
  .strict()
export type Measurements = z.infer<typeof measurementsSchema>
export type MeasurementDimension = 'weight' | 'reps' | 'duration' | 'distance' | 'rounds'

export const recordingDimensions: Record<RecordingType, readonly MeasurementDimension[]> = {
  weight_reps: ['weight', 'reps'],
  reps: ['reps'],
  weight_duration: ['weight', 'duration'],
  duration: ['duration'],
  distance_duration: ['distance', 'duration'],
  weight_distance: ['weight', 'distance'],
  distance: ['distance'],
  duration_rounds: ['duration', 'rounds'],
}

/** Empty fields are valid while planning; dimensions from another type are not. */
export function measurementsMatchType(type: RecordingType, values: Measurements) {
  const allowed = recordingDimensions[type]
  return (['weight', 'reps', 'duration', 'distance', 'rounds'] as const).every(
    (dimension) => allowed.includes(dimension) || values[dimension] === null,
  )
}

export function measurementsComplete(type: RecordingType, values: Measurements) {
  return (
    measurementsMatchType(type, values) &&
    recordingDimensions[type].every((dimension) => values[dimension] !== null)
  )
}

/** Normalize for comparison only; never replace the entered numbers or units. */
export function normalizedMeasurements(values: Measurements) {
  return {
    weight:
      values.weight === null ? null : values.weight * (values.weightUnit === 'lb' ? 0.45359237 : 1),
    reps: values.reps,
    duration:
      values.duration === null ? null : values.duration * (values.durationUnit === 'min' ? 60 : 1),
    distance:
      values.distance === null
        ? null
        : values.distance *
          (values.distanceUnit === 'km'
            ? 1000
            : values.distanceUnit === 'ft'
              ? 0.3048
              : values.distanceUnit === 'mi'
                ? 1609.344
                : 1),
    rounds: values.rounds,
  }
}

export type ProgressPoint = {
  sessionId: string
  startsAt: string
  value: number
}
export type ProgressSeries = {
  metric: ProgressMetric
  unit: string
  direction: 'higher' | 'lower'
  distanceMetres?: number
  personal?: number | null
  current?: number | null
  previous?: number | null
  points: ProgressPoint[]
}
export type MeasurementPreference = {
  defaultWeightUnit: 'kg' | 'lb'
  /** The Coach's distance convention; each set keeps its chosen compatible scale. */
  defaultDistanceUnit?: 'km' | 'mi'
}

export function progressValues(
  type: RecordingType,
  values: Measurements,
  pref: MeasurementPreference,
  requireComplete = true,
) {
  if (requireComplete && !measurementsComplete(type, values)) return []
  const normalized = normalizedMeasurements(values)
  if (type === 'distance_duration' && (!(normalized.distance! > 0) || !(normalized.duration! > 0)))
    return []
  return recordingMetrics[type].flatMap((metric) => {
    const value =
      metric === 'pace'
        ? normalized.distance! > 0 && normalized.duration! > 0
          ? ((normalized.duration! / normalized.distance!) * 1000) / 60
          : null
        : normalized[metric]
    if (value === null || !Number.isFinite(value)) return []
    const divisor =
      metric === 'weight' && pref.defaultWeightUnit === 'lb'
        ? 0.45359237
        : metric === 'distance' && pref.defaultDistanceUnit === 'mi'
          ? 1609.344
          : metric === 'distance' && pref.defaultDistanceUnit === 'km'
            ? 1000
            : 1
    return [
      {
        metric,
        value: value / divisor,
        unit:
          metric === 'weight'
            ? pref.defaultWeightUnit
            : metric === 'duration'
              ? 'sec'
              : metric === 'distance'
                ? (pref.defaultDistanceUnit ?? 'km')
                : metric === 'pace'
                  ? 'min/km'
                  : metric === 'rounds'
                    ? '回合'
                    : '次',
        direction: (metric === 'pace' || (type === 'distance_duration' && metric === 'duration')
          ? 'lower'
          : 'higher') as 'lower' | 'higher',
        ...(type === 'distance_duration' && metric === 'duration'
          ? { distanceMetres: normalized.distance! }
          : {}),
      },
    ]
  })
}

export function buildProgressSeries(
  rows: Array<{
    sessionId: string
    startsAt: string
    type: RecordingType
    measurements: Measurements
    result: 'completed' | 'incomplete' | null
    legacy?: boolean
  }>,
  pref: MeasurementPreference,
): ProgressSeries[] {
  const series = new Map<string, ProgressSeries>()
  for (const row of rows) {
    if (row.result !== 'completed') continue
    for (const item of progressValues(row.type, row.measurements, pref, !row.legacy)) {
      const key = `${item.metric}:${item.distanceMetres ?? ''}`
      const entry = series.get(key) ?? { ...item, points: [] }
      const point = entry.points.find((p) => p.sessionId === row.sessionId)
      if (point)
        point.value = (item.direction === 'lower' ? Math.min : Math.max)(point.value, item.value)
      else
        entry.points.push({ sessionId: row.sessionId, startsAt: row.startsAt, value: item.value })
      series.set(key, entry)
    }
  }
  return [...series.values()].map((entry) => ({
    ...entry,
    personal: entry.points.length
      ? (entry.direction === 'lower' ? Math.min : Math.max)(...entry.points.map((p) => p.value))
      : null,
    points: entry.points.sort(
      (a, b) => a.startsAt.localeCompare(b.startsAt) || a.sessionId.localeCompare(b.sessionId),
    ),
  }))
}
