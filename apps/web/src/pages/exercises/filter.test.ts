import { describe, expect, it } from 'vitest'
import type { ExerciseDefinition } from '../../api'
import { filterExerciseDefinitions } from './filter'

const definitions: ExerciseDefinition[] = [
  {
    id: 'squat',
    catalogKey: 'squat',
    name: '槓鈴深蹲',
    equipment: '槓鈴',
    bodyParts: ['腿部', '臀部'],
    movementType: '系統動作',
    performanceMetric: 'weight',
    isSystem: true,
    favorite: true,
    version: 1
  },
  {
    id: 'curl',
    catalogKey: null,
    name: '啞鈴彎舉',
    equipment: '啞鈴',
    bodyParts: ['手臂'],
    movementType: '局部動作',
    performanceMetric: 'reps',
    isSystem: false,
    favorite: false,
    version: 1
  }
]

describe('client-side exercise library filters', () => {
  it('searches names and metadata without changing the source library', () => {
    expect(filterExerciseDefinitions(definitions, { q: '槓鈴' }).map((item) => item.id)).toEqual([
      'squat'
    ])
    expect(definitions).toHaveLength(2)
  })

  it('combines view, equipment, body-part, and movement filters', () => {
    expect(
      filterExerciseDefinitions(definitions, {
        view: 'favorite',
        equipment: '槓鈴',
        bodyParts: ['腿部', '臀部'],
        movementType: '系統動作'
      }).map((item) => item.id)
    ).toEqual(['squat'])
    expect(
      filterExerciseDefinitions(definitions, { view: 'custom' }).map((item) => item.id)
    ).toEqual(['curl'])
  })
})
