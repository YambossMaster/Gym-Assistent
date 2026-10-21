import type { SessionTraining } from '../training/training.js'

export function withoutTrainingHistory(record: SessionTraining): SessionTraining {
  const hideHistory = <T extends SessionTraining['exerciseSummaries'][number]>(summary: T): T => ({
    ...summary,
    history: [],
    series: summary.series?.map((series) => ({ ...series, points: [] })),
  })
  return {
    ...record,
    exerciseSummaries: record.exerciseSummaries.map(hideHistory),
    ...(record.groupExerciseSummaries
      ? { groupExerciseSummaries: record.groupExerciseSummaries.map(hideHistory) }
      : {}),
  }
}
