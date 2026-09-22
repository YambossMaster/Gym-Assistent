import { describe, expect, it } from 'vitest'
import { choosePrimaryMetric, type RecordingConfig } from './recording'

describe('primary progress metric selection', () => {
  it('locks and unlocks the current primary without ever creating two primaries', () => {
    const unlocked: RecordingConfig = { type: 'weight_reps', metrics: ['weight', 'reps'] }
    expect(choosePrimaryMetric(unlocked, 'weight').metrics).toEqual(['weight'])
    expect(choosePrimaryMetric({ ...unlocked, metrics: ['weight'] }, 'weight').metrics).toEqual([
      'weight',
      'reps'
    ])
  })

  it('switches the primary and keeps the former primary as unlocked context', () => {
    expect(
      choosePrimaryMetric({ type: 'weight_reps', metrics: ['weight'] }, 'reps').metrics
    ).toEqual(['reps', 'weight'])
  })

  it('keeps single-metric recording types fixed', () => {
    const config: RecordingConfig = { type: 'duration', metrics: ['duration'] }
    expect(choosePrimaryMetric(config, 'duration')).toBe(config)
  })
})
