import type {
  AppData,
  CapabilityLink,
  CoachSettings,
  ExerciseDefinition,
  TrainingExercise,
  TrainingRecord,
  TrainingSet
} from './types'

type PersistedAppData = Omit<Partial<AppData>, 'settings'> & {
  settings?: Partial<CoachSettings>
}

export const migrateCalendarFields = (parsed: PersistedAppData, fallback: AppData) => ({
  availability: parsed.availability ?? fallback.availability,
  availabilityOverrides: parsed.availabilityOverrides ?? []
})

export const migrateCoachSettings = (parsed: PersistedAppData, fallback: AppData) => ({
  ...fallback.settings,
  ...(parsed.settings ?? {})
})

export const migrateCapabilityLinks = (links: CapabilityLink[] = []): CapabilityLink[] =>
  links.map((link) => ({ ...link, includeNote: link.includeNote ?? false }))

type LegacyTrainingSet = TrainingSet & { actualWeight?: number }
type LegacyTrainingExercise = Omit<TrainingExercise, 'performanceMetric' | 'sets'> & {
  performanceMetric?: TrainingExercise['performanceMetric']
  sets: LegacyTrainingSet[]
}
type LegacyTrainingRecord = Omit<TrainingRecord, 'exercises'> & {
  exercises: LegacyTrainingExercise[]
}

const legacyDefinitionAliases: Record<string, string> = {
  高腳杯深蹲: 'builtin-019'
}

type LegacyExerciseDefinition = Partial<ExerciseDefinition> &
  Pick<ExerciseDefinition, 'id' | 'name'> & { region?: string }

export const migrateExerciseDefinitions = (
  exercises: LegacyExerciseDefinition[] = []
): ExerciseDefinition[] =>
  exercises.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    equipment: exercise.equipment ?? '其他',
    bodyParts: exercise.bodyParts ?? [exercise.region ?? '其他'],
    movementType: exercise.movementType ?? '系統動作',
    performanceMetric: exercise.performanceMetric ?? 'weight',
    isSystem: exercise.isSystem ?? false,
    favorite: exercise.favorite ?? false
  }))

export const mergeExerciseDefinitions = (
  fallback: ExerciseDefinition[],
  persisted: LegacyExerciseDefinition[] = []
): ExerciseDefinition[] => {
  const migrated = migrateExerciseDefinitions(persisted)
  return fallback
    .map((builtin) => {
      const existing = migrated.find(
        (exercise) => exercise.id === builtin.id || exercise.name === builtin.name
      )
      if (!existing) return builtin
      const original = persisted.find(
        (exercise) => exercise.id === builtin.id || exercise.name === builtin.name
      )
      return {
        ...builtin,
        ...existing,
        id: builtin.id,
        isSystem: true,
        performanceMetric: original?.performanceMetric ?? builtin.performanceMetric
      }
    })
    .concat(
      migrated.filter(
        (exercise) =>
          !exercise.isSystem && !fallback.some((builtin) => builtin.name === exercise.name)
      )
    )
}

const matchingDefinition = (
  exercise: LegacyTrainingExercise,
  definitions: ExerciseDefinition[]
) => {
  if (exercise.definitionId)
    return definitions.find((definition) => definition.id === exercise.definitionId)
  const name = exercise.name.trim().toLocaleLowerCase('zh-TW')
  const aliased = definitions.find((definition) => definition.id === legacyDefinitionAliases[name])
  if (aliased) return aliased
  const exact = definitions.find(
    (definition) => definition.name.trim().toLocaleLowerCase('zh-TW') === name
  )
  if (exact) return exact
  const partial = definitions.filter((definition) => {
    const definitionName = definition.name.trim().toLocaleLowerCase('zh-TW')
    return definitionName.includes(name) || name.includes(definitionName)
  })
  return partial.length === 1 ? partial[0] : undefined
}

export const migrateTrainingRecords = (
  records: LegacyTrainingRecord[] = [],
  definitions: ExerciseDefinition[] = []
): TrainingRecord[] =>
  records.map((record) => ({
    ...record,
    exercises: record.exercises.map((exercise) => {
      const definition = matchingDefinition(exercise, definitions)
      return {
        ...exercise,
        definitionId: exercise.definitionId ?? definition?.id,
        performanceMetric: exercise.performanceMetric ?? definition?.performanceMetric ?? 'weight',
        sets: exercise.sets.map((persistedSet) => {
          const { actualWeight, ...set } = persistedSet as LegacyTrainingSet
          const result =
            set.result ??
            (set.actualReps === undefined
              ? undefined
              : set.plannedReps === undefined || set.actualReps >= set.plannedReps
                ? 'completed'
                : 'incomplete')
          return { ...set, plannedWeight: actualWeight ?? set.plannedWeight, result }
        })
      }
    })
  }))
