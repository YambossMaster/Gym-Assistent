import { z } from 'zod'

export const metricSchema = z.enum(['weight', 'reps'])
export const unitSchema = z.enum(['kg', 'lb'])
export const movementTypeSchema = z.enum(['系統動作', '局部動作'])
export const resultSchema = z.enum(['completed', 'incomplete']).nullable()
const uuid = z.string().uuid()
const weight = z.number().finite().min(0).max(10_000).multipleOf(0.001).nullable()
const reps = z.number().int().min(0).max(10_000).nullable()

export const definitionFieldsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  equipment: z.string().trim().min(1).max(120),
  bodyParts: z
    .array(z.string().trim().min(1).max(40))
    .min(1)
    .max(12)
    .refine((v) => new Set(v).size === v.length, 'Body parts must be unique.'),
  movementType: movementTypeSchema,
  performanceMetric: metricSchema,
})

export const createDefinitionSchema = definitionFieldsSchema.extend({ operationId: uuid })
export const updateDefinitionSchema = definitionFieldsSchema.extend({
  version: z.number().int().positive(),
  operationId: uuid,
})
export const favoriteDefinitionSchema = z.object({
  favorite: z.boolean(),
  version: z.number().int().positive(),
  operationId: uuid,
})
export const deleteDefinitionSchema = z.object({
  confirmation: z.literal('DELETE'),
  version: z.number().int().positive(),
  operationId: uuid,
})
export const preferenceSchema = z.object({
  defaultWeightUnit: unitSchema,
  version: z.number().int().nonnegative(),
  operationId: uuid,
})

export const trainingSetInputSchema = z.object({
  id: uuid,
  plannedWeight: weight,
  plannedReps: reps,
  actualReps: reps,
  rpe: z.number().min(1).max(10).multipleOf(0.5).nullable(),
  result: resultSchema,
  unit: unitSchema,
})
export const trainingExerciseInputSchema = z.object({
  id: uuid,
  definitionId: uuid,
  definitionVersion: z.number().int().positive().optional(),
  sets: z.array(trainingSetInputSchema).max(100),
})
export const saveTrainingSchema = z
  .object({
    privateNote: z.string().max(5000),
    exercises: z
      .array(trainingExerciseInputSchema)
      .max(100)
      .refine(
        (items) => new Set(items.map((x) => x.id)).size === items.length,
        'Exercise IDs must be unique.',
      ),
    recordVersion: z.number().int().nonnegative(),
    sessionVersion: z.number().int().positive(),
    operationId: uuid,
  })
  .refine((input) => {
    const ids = input.exercises.flatMap((exercise) => exercise.sets.map((set) => set.id))
    return new Set(ids).size === ids.length
  }, 'Set IDs must be unique.')

export type PerformanceMetric = z.infer<typeof metricSchema>
export type WeightUnit = z.infer<typeof unitSchema>
export type DefinitionFields = z.infer<typeof definitionFieldsSchema>
export type SaveTrainingInput = z.infer<typeof saveTrainingSchema>

export type ExerciseDefinition = DefinitionFields & {
  id: string
  catalogKey: string | null
  isSystem: boolean
  favorite: boolean
  version: number
  createdAt: Date
  updatedAt: Date
}

export type ExerciseLibrary = {
  definitions: ExerciseDefinition[]
  filters: {
    equipment: string[]
    bodyParts: string[]
    movementTypes: Array<'系統動作' | '局部動作'>
  }
  totals: { all: number; favorite: number; custom: number }
}

export type TrainingSet = z.infer<typeof trainingSetInputSchema>
export type TrainingExercise = {
  id: string
  definitionId: string
  definitionName: string
  equipment: string
  bodyParts: string[]
  movementType: '系統動作' | '局部動作'
  performanceMetric: PerformanceMetric
  sets: TrainingSet[]
}
export type PerformancePoint = {
  sessionId: string
  startsAt: Date
  value: number
  unit: WeightUnit | null
}
export type ExerciseSummary = {
  occurrenceId: string
  definitionId: string
  metric: PerformanceMetric
  unit: WeightUnit | null
  current: number | null
  previous: number | null
  personal: number | null
  history: PerformancePoint[]
}
export type SessionTraining = {
  session: {
    id: string
    studentId: string
    studentName: string
    startsAt: Date
    endsAt: Date
    location: string
    status: 'scheduled' | 'completed' | 'cancelled'
    version: number
    isLegacy: false
  }
  lessonSummary: { purchased: number; completed: number; remaining: number }
  record: {
    id: string | null
    version: number
    privateNote: string
    exercises: TrainingExercise[]
    updatedAt: Date | null
  }
  defaultWeightUnit: WeightUnit
  exerciseSummaries: ExerciseSummary[]
  allowedActions: { canEditTraining: boolean; canComplete: boolean; canReopen: boolean }
}

export type TodayTrainingPlan = {
  exerciseCount: number
  status: 'unplanned' | 'in_progress' | 'ready'
}

export function todayTrainingPlan(input: {
  exerciseCount: number
  exercisesWithSets: number
  setCount: number
  plannedSetCount: number
}): TodayTrainingPlan {
  return {
    exerciseCount: input.exerciseCount,
    status:
      input.exerciseCount === 0
        ? 'unplanned'
        : input.exercisesWithSets === input.exerciseCount &&
            input.setCount > 0 &&
            input.plannedSetCount === input.setCount
          ? 'ready'
          : 'in_progress',
  }
}

export function deriveResult(actualReps: number | null, plannedReps: number | null) {
  if (actualReps === null || plannedReps === null) return null
  return actualReps < plannedReps ? ('incomplete' as const) : ('completed' as const)
}

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit) {
  if (from === to) return value
  return from === 'lb' ? value * 0.45359237 : value / 0.45359237
}

export function displayWeight(value: number) {
  return Math.round(value * 10) / 10
}

export function qualifiedBest(
  metric: PerformanceMetric,
  sets: TrainingSet[],
  displayUnit: WeightUnit,
) {
  const values = sets
    .filter((set) => set.result === 'completed')
    .flatMap((set) => {
      if (metric === 'reps') return set.actualReps === null ? [] : [set.actualReps]
      return set.plannedWeight === null
        ? []
        : [convertWeight(set.plannedWeight, set.unit, displayUnit)]
    })
  return values.length ? Math.max(...values) : null
}

export function filterLibrary(
  library: ExerciseDefinition[],
  input: {
    q?: string
    equipment?: string
    bodyParts?: string[]
    movementType?: string
    view?: string
  },
) {
  const q = input.q?.trim().toLocaleLowerCase('zh-TW') ?? ''
  return library.filter((definition) => {
    const haystack = [
      definition.name,
      definition.equipment,
      definition.movementType,
      ...definition.bodyParts,
    ]
      .join(' ')
      .toLocaleLowerCase('zh-TW')
    return (
      (!q || haystack.includes(q)) &&
      (!input.equipment || definition.equipment === input.equipment) &&
      (!input.movementType || definition.movementType === input.movementType) &&
      (!input.bodyParts?.length ||
        input.bodyParts.every((part) => definition.bodyParts.includes(part))) &&
      (input.view !== 'favorite' || definition.favorite) &&
      (input.view !== 'custom' || !definition.isSystem)
    )
  })
}
