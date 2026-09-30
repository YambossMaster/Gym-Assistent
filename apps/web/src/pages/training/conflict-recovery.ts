import type { ExerciseDefinition, SessionTraining, TrainingDraftPayload } from '../../api'

export async function adoptTrainingDraft({
  draft,
  refresh,
  getDefinitions,
  save,
  isConflict,
  operationId = () => crypto.randomUUID()
}: {
  draft: TrainingDraftPayload
  refresh: () => Promise<SessionTraining | undefined>
  getDefinitions: () => Promise<ExerciseDefinition[]>
  save: (payload: TrainingDraftPayload) => Promise<SessionTraining>
  isConflict: (error: unknown) => boolean
  operationId?: () => string
}): Promise<SessionTraining> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await refresh()
    if (!current) throw new Error('training_refresh_unavailable')
    const existingIds = new Set(current.record.exercises.map((exercise) => exercise.id))
    const missing = draft.exercises.filter((exercise) => !existingIds.has(exercise.id))
    const definitions = missing.length
      ? new Map((await getDefinitions()).map((definition) => [definition.id, definition]))
      : new Map<string, ExerciseDefinition>()
    if (missing.some((exercise) => !definitions.has(exercise.definitionId)))
      throw new Error('training_definition_unavailable')
    const payload = {
      ...draft,
      exercises: draft.exercises.map((exercise) =>
        existingIds.has(exercise.id)
          ? exercise
          : { ...exercise, definitionVersion: definitions.get(exercise.definitionId)!.version }
      ),
      recordVersion: current.record.version,
      sessionVersion: current.session.version,
      operationId: operationId()
    }
    try {
      return await save(payload)
    } catch (error) {
      if (!isConflict(error) || attempt === 2) throw error
    }
  }
  throw new Error('training_conflict_unresolved')
}
