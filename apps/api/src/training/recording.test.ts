import { describe, expect, it } from 'vitest'
import {
  measurementsComplete,
  measurementsMatchType,
  measurementsSchema,
  normalizedMeasurements,
  recordingConfigSchema,
  recordingDimensions,
  recordingMetrics,
  type Measurements,
  type RecordingType,
  buildProgressSeries,
  progressValues,
} from './recording.js'

const empty: Measurements = {
  weight: null,
  reps: null,
  duration: null,
  distance: null,
  rounds: null,
  weightUnit: 'kg',
  durationUnit: 'sec',
  distanceUnit: 'm',
}

describe('exercise recording dimensions', () => {
  it('keeps fixed-distance time groups separate and chooses the fastest qualified set', () => {
    const rows = [
      { distance: 1000, duration: 300, sessionId: 'a' },
      { distance: 1, distanceUnit: 'km' as const, duration: 280, sessionId: 'a' },
      { distance: 500, duration: 140, sessionId: 'a' },
      { distance: 1000, duration: 290, sessionId: 'b' },
    ].map(({ sessionId, ...values }) => ({
      sessionId,
      startsAt: `2026-09-${sessionId === 'a' ? '01' : '02'}T00:00:00Z`,
      type: 'distance_duration' as const,
      result: 'completed' as const,
      measurements: { ...empty, ...values },
    }))
    const series = buildProgressSeries(rows, { defaultWeightUnit: 'kg' })
    expect(series.filter((s) => s.metric === 'duration')).toHaveLength(2)
    expect(series.find((s) => s.distanceMetres === 1000)?.points.map((p) => p.value)).toEqual([
      280, 290,
    ])
    expect(series.find((s) => s.distanceMetres === 500)?.points.map((p) => p.value)).toEqual([140])
    expect(series.find((s) => s.metric === 'pace')?.points[0]?.value).toBeCloseTo(4.6666667)
    expect(series.every((s) => s.direction === 'lower')).toBe(true)
    expect(
      progressValues(
        'distance_duration',
        { ...empty, distance: 0, duration: 10 },
        { defaultWeightUnit: 'kg' },
      ),
    ).toEqual([])
    expect(
      progressValues(
        'distance_duration',
        { ...empty, distance: 100, duration: 0 },
        { defaultWeightUnit: 'kg' },
      ),
    ).toEqual([])
  })
  it('derives two independent bests, excludes incomplete/blank sets, and retains numeric zero', () => {
    const series = buildProgressSeries(
      [
        { weight: 100, reps: 5, result: 'completed' as const },
        { weight: 80, reps: 10, result: 'completed' as const },
        { weight: 1000, reps: 100, result: 'incomplete' as const },
        { weight: 200, reps: null, result: 'completed' as const },
      ].map(({ result, ...values }) => ({
        sessionId: 'a',
        startsAt: '2026-09-01',
        type: 'weight_reps' as const,
        result,
        measurements: { ...empty, ...values },
      })),
      { defaultWeightUnit: 'kg' },
    )
    expect(series.map((s) => [s.metric, s.points[0]!.value])).toEqual([
      ['weight', 100],
      ['reps', 10],
    ])
    expect(
      progressValues('reps', { ...empty, reps: 0 }, { defaultWeightUnit: 'kg' })[0]?.value,
    ).toBe(0)
  })
  it('keeps every permitted single or dual selection and rejects unrelated or empty metrics', () => {
    for (const [type, metrics] of Object.entries(recordingMetrics)) {
      expect(recordingConfigSchema.parse({ type, metrics })).toEqual({ type, metrics })
      for (const metric of metrics)
        expect(recordingConfigSchema.safeParse({ type, metrics: [metric] }).success).toBe(true)
      expect(recordingConfigSchema.safeParse({ type, metrics: [] }).success).toBe(false)
      expect(
        recordingConfigSchema.safeParse({ type, metrics: [metrics[0], metrics[0]] }).success,
      ).toBe(false)
    }
    expect(recordingConfigSchema.safeParse({ type: 'duration', metrics: ['weight'] }).success).toBe(
      false,
    )
    expect(
      recordingConfigSchema.safeParse({ type: 'duration_rounds', metrics: ['reps'] }).success,
    ).toBe(false)
  })

  it('requires all dimensions for complete plans without fabricating blank values', () => {
    for (const type of Object.keys(recordingDimensions) as RecordingType[]) {
      expect(measurementsMatchType(type, empty)).toBe(true)
      expect(measurementsComplete(type, empty)).toBe(false)
      const values = { ...empty }
      for (const dimension of recordingDimensions[type]) values[dimension] = 0
      expect(measurementsComplete(type, values)).toBe(true)
      for (const dimension of recordingDimensions[type]) {
        expect(measurementsComplete(type, { ...values, [dimension]: null })).toBe(false)
      }
    }
    expect(measurementsMatchType('duration', { ...empty, duration: 60, reps: 10 })).toBe(false)
    expect(measurementsComplete('duration_rounds', { ...empty, duration: 60, rounds: 5 })).toBe(
      true,
    )
  })

  it('compares equivalent units without mutating the original record', () => {
    const entered = {
      ...empty,
      weight: 100,
      weightUnit: 'lb' as const,
      duration: 1.5,
      durationUnit: 'min' as const,
      distance: 0.4,
      distanceUnit: 'km' as const,
    }
    const before = structuredClone(entered)
    expect(normalizedMeasurements(entered)).toEqual({
      weight: 45.359237,
      reps: null,
      duration: 90,
      distance: 400,
      rounds: null,
    })
    expect(entered).toEqual(before)
    expect(normalizedMeasurements(empty)).toEqual({
      weight: null,
      reps: null,
      duration: null,
      distance: null,
      rounds: null,
    })
    expect(normalizedMeasurements({ ...empty, distance: 5280, distanceUnit: 'ft' })).toMatchObject({
      distance: 1609.344,
    })
    expect(normalizedMeasurements({ ...empty, distance: 1, distanceUnit: 'mi' })).toMatchObject({
      distance: 1609.344,
    })
  })

  it('rejects fractional counts, invalid units, nonfinite values and overprecision', () => {
    for (const change of [
      { rounds: 1.5 },
      { reps: -1 },
      { duration: Infinity },
      { distance: NaN },
      { duration: 0.0001 },
      { weight: 10_001 },
      { distanceUnit: 'sec' },
      { reps: 10_001 },
    ])
      expect(measurementsSchema.safeParse({ ...empty, ...change }).success).toBe(false)
    expect(measurementsSchema.parse({ ...empty, duration: 0, distance: 0.001 })).toMatchObject({
      duration: 0,
      distance: 0.001,
    })
  })
})
