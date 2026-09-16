import { describe, expect, it } from 'vitest'
import { trainingCatalog } from './catalog.js'
import { TrainingModule } from './training-module.js'
import type { TrainingRepository } from './training-repository.js'
import {
  convertWeight,
  deriveResult,
  displayWeight,
  filterLibrary,
  qualifiedBest,
  todayTrainingPlan,
  trainingSetInputSchema,
} from './training.js'

const definition = (id: string, name: string, metric: 'weight' | 'reps' = 'weight') => ({
  id,
  catalogKey: null,
  name,
  equipment: '槓鈴',
  bodyParts: ['腿'],
  movementType: '系統動作' as const,
  performanceMetric: metric,
  isSystem: false,
  favorite: false,
  version: 1,
  createdAt: new Date(0),
  updatedAt: new Date(0),
})
const set = (values: Partial<any> = {}) => ({
  id: crypto.randomUUID(),
  plannedWeight: null,
  plannedReps: null,
  actualReps: null,
  rpe: null,
  result: null,
  unit: 'kg' as const,
  ...values,
})

describe('M5 training domain', () => {
  it('resolves the verified Coach workspace for Today plan summaries', async () => {
    const calls: Array<{ workspaceId: string; sessionIds: string[] }> = []
    const repository = {
      resolveWorkspace: async ({ userId }: { userId: string }) => `workspace-${userId}`,
      todayTrainingPlans: async (workspaceId: string, sessionIds: string[]) => {
        calls.push({ workspaceId, sessionIds })
        return { [sessionIds[0]!]: { exerciseCount: 0, status: 'unplanned' as const } }
      },
    } as unknown as TrainingRepository
    const module = new TrainingModule(repository)
    expect(await module.todayTrainingPlans({ userId: 'coach-a' }, [])).toEqual({})
    expect(await module.todayTrainingPlans({ userId: 'coach-a' }, ['session-a'])).toEqual({
      'session-a': { exerciseCount: 0, status: 'unplanned' },
    })
    expect(calls).toEqual([{ workspaceId: 'workspace-coach-a', sessionIds: ['session-a'] }])
  })
  it('marks Today plans ready only when every exercise has fully planned sets', () => {
    expect(
      todayTrainingPlan({
        exerciseCount: 0,
        exercisesWithSets: 0,
        setCount: 0,
        plannedSetCount: 0,
      }),
    ).toEqual({ exerciseCount: 0, status: 'unplanned' })
    expect(
      todayTrainingPlan({ exerciseCount: 2, exercisesWithSets: 1, setCount: 1, plannedSetCount: 1 })
        .status,
    ).toBe('in_progress')
    expect(
      todayTrainingPlan({ exerciseCount: 2, exercisesWithSets: 2, setCount: 3, plannedSetCount: 2 })
        .status,
    ).toBe('in_progress')
    expect(
      todayTrainingPlan({
        exerciseCount: 2,
        exercisesWithSets: 2,
        setCount: 3,
        plannedSetCount: 3,
      }),
    ).toEqual({ exerciseCount: 2, status: 'ready' })
  })
  it('freezes all 100 unique catalog definitions and stable keys', () => {
    expect(trainingCatalog).toHaveLength(100)
    expect(new Set(trainingCatalog.map((x) => x.catalogKey)).size).toBe(100)
    expect(trainingCatalog[0]?.catalogKey).toBe('builtin-001')
    expect(trainingCatalog.at(-1)?.catalogKey).toBe('builtin-100')
  })
  it('keeps same-name definitions isolated by identity and metric', () => {
    const items = [definition('a', '深蹲'), definition('b', '深蹲', 'reps')]
    expect(filterLibrary(items, { q: '深蹲' }).map((x) => x.id)).toEqual(['a', 'b'])
  })
  it('combines substring, exact equipment, AND body-part, movement and view filters', () => {
    const items = [
      { ...definition('a', '低背槓深蹲'), bodyParts: ['腿', '臀'], favorite: true },
      { ...definition('b', '深蹲'), equipment: '啞鈴', bodyParts: ['腿'] },
    ]
    expect(
      filterLibrary(items, {
        q: '槓',
        equipment: '槓鈴',
        bodyParts: ['腿', '臀'],
        movementType: '系統動作',
        view: 'favorite',
      }).map((x) => x.id),
    ).toEqual(['a'])
  })
  it('preserves zero and null while validating decimal/RPE boundaries', () => {
    expect(
      trainingSetInputSchema.parse(
        set({ plannedWeight: 0, plannedReps: 0, actualReps: 0, rpe: 1, result: 'completed' }),
      ),
    ).toMatchObject({ plannedWeight: 0, plannedReps: 0, actualReps: 0 })
    expect(() => trainingSetInputSchema.parse(set({ plannedWeight: 1.0009 }))).toThrow()
    expect(() => trainingSetInputSchema.parse(set({ rpe: 7.2 }))).toThrow()
  })
  it('derives result only from actual and planned reps', () => {
    expect(deriveResult(null, 10)).toBeNull()
    expect(deriveResult(0, 10)).toBe('incomplete')
    expect(deriveResult(10, 10)).toBe('completed')
  })
  it('compares mixed units before one-time presentation rounding', () => {
    expect(displayWeight(convertWeight(80, 'lb', 'kg'))).toBe(36.3)
    expect(
      qualifiedBest(
        'weight',
        [
          set({ plannedWeight: 80, unit: 'lb', result: 'completed' }),
          set({ plannedWeight: 32, result: 'completed' }),
        ],
        'kg',
      ),
    ).toBeCloseTo(36.2873896)
    expect(
      qualifiedBest('weight', [set({ plannedWeight: 100, result: 'incomplete' })], 'kg'),
    ).toBeNull()
  })
  it('separates weight and repetition achievements', () => {
    const sets = [set({ plannedWeight: 0, actualReps: 5, result: 'completed' })]
    expect(qualifiedBest('weight', sets, 'kg')).toBe(0)
    expect(qualifiedBest('reps', sets, 'kg')).toBe(5)
  })
})
