import { describe, expect, it } from 'vitest'
import type { SessionTraining } from '../training/training.js'
import { withoutTrainingHistory } from './training-visibility.js'

describe('Free training projection', () => {
  it('hides personal growth points for both single and group summaries while keeping previous best', () => {
    const summary = {
      occurrenceId: 'exercise-1',
      definitionId: 'squat',
      metric: 'weight',
      unit: 'kg',
      current: null,
      previous: 60,
      personal: 90,
      history: [{ sessionId: 'prior-1', startsAt: new Date(), value: 60, unit: 'kg' }],
      series: [
        { metric: 'weight', unit: 'kg', current: null, previous: 60, points: [{ value: 60 }] },
      ],
    }
    const record = {
      exerciseSummaries: [summary],
      groupExerciseSummaries: [{ ...summary, studentId: 'person-1' }],
    } as unknown as SessionTraining

    const visible = withoutTrainingHistory(record)

    expect(visible.exerciseSummaries[0]).toMatchObject({
      previous: 60,
      history: [],
      series: [{ points: [] }],
    })
    expect(visible.groupExerciseSummaries?.[0]).toMatchObject({
      studentId: 'person-1',
      previous: 60,
      history: [],
      series: [{ points: [] }],
    })
    expect(record.groupExerciseSummaries?.[0]?.history).toHaveLength(1)
  })
})
