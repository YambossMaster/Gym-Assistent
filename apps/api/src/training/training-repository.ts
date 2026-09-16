import type { AuthenticatedIdentity } from '../identity/identity.js'
import type {
  DefinitionFields,
  ExerciseDefinition,
  ExerciseLibrary,
  PerformanceMetric,
  SaveTrainingInput,
  SessionTraining,
  TodayTrainingPlan,
  WeightUnit,
} from './training.js'

export class TrainingVersionConflictError extends Error {
  constructor(
    readonly reason: 'version_conflict' | 'definition_conflict' | 'operation_mismatch',
    readonly current?: unknown,
  ) {
    super(reason)
    this.name = 'TrainingVersionConflictError'
  }
}

export interface TrainingRepository {
  resolveWorkspace(identity: AuthenticatedIdentity): Promise<string>
  bootstrapCatalog(workspaceId: string): Promise<void>
  listDefinitions(
    workspaceId: string,
    filters: {
      q?: string
      equipment?: string
      bodyParts?: string[]
      movementType?: string
      view?: string
    },
  ): Promise<ExerciseLibrary>
  createDefinition(
    workspaceId: string,
    input: DefinitionFields & { operationId: string },
  ): Promise<ExerciseDefinition>
  updateDefinition(
    workspaceId: string,
    id: string,
    input: DefinitionFields & { version: number; operationId: string },
  ): Promise<ExerciseDefinition | null>
  favoriteDefinition(
    workspaceId: string,
    id: string,
    input: { favorite: boolean; version: number; operationId: string },
  ): Promise<ExerciseDefinition | null>
  deleteDefinition(
    workspaceId: string,
    id: string,
    input: { version: number; operationId: string },
  ): Promise<boolean | null>
  getPreference(workspaceId: string): Promise<{ defaultWeightUnit: WeightUnit; version: number }>
  setPreference(
    workspaceId: string,
    input: { defaultWeightUnit: WeightUnit; version: number; operationId: string },
  ): Promise<{ defaultWeightUnit: WeightUnit; version: number }>
  getSessionTraining(workspaceId: string, sessionId: string): Promise<SessionTraining | null>
  todayTrainingPlans(
    workspaceId: string,
    sessionIds: string[],
  ): Promise<Record<string, TodayTrainingPlan>>
  saveSessionTraining(
    workspaceId: string,
    sessionId: string,
    input: SaveTrainingInput,
    complete: boolean,
  ): Promise<SessionTraining | null>
  getDefaults(
    workspaceId: string,
    sessionId: string,
    definitionId: string,
    metric: PerformanceMetric,
  ): Promise<Array<{
    plannedWeight: number | null
    plannedReps: number | null
    unit: WeightUnit
  }> | null>
  getStudentPerformance(workspaceId: string, studentId: string): Promise<unknown[] | null>
  getStudentTrend(
    workspaceId: string,
    studentId: string,
    definitionId: string,
    metric: PerformanceMetric,
  ): Promise<unknown | null>
}
