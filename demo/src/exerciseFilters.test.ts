import { describe, expect, it } from 'vitest'
import { filterExercises } from './exerciseFilters'
import type { ExerciseDefinition } from './types'

const exercises: ExerciseDefinition[] = [
  {
    id: '1',
    name: '槓鈴臥推',
    equipment: '槓鈴',
    bodyParts: ['胸', '手臂'],
    movementType: '系統動作',
    performanceMetric: 'weight',
    isSystem: true,
    favorite: false
  },
  {
    id: '2',
    name: '啞鈴側平舉',
    equipment: '啞鈴',
    bodyParts: ['肩'],
    movementType: '局部動作',
    performanceMetric: 'weight',
    isSystem: true,
    favorite: false
  },
  {
    id: '3',
    name: '徒手深蹲',
    equipment: '徒手',
    bodyParts: ['腿', '臀'],
    movementType: '系統動作',
    performanceMetric: 'reps',
    isSystem: true,
    favorite: false
  }
]

describe('filterExercises', () => {
  it('combines equipment and movement type filters', () => {
    expect(
      filterExercises(exercises, {
        query: '',
        equipment: '槓鈴',
        bodyParts: [],
        movementType: '系統動作'
      }).map((item) => item.id)
    ).toEqual(['1'])
  })

  it('requires every selected body part when multiple parts are selected', () => {
    expect(
      filterExercises(exercises, {
        query: '',
        equipment: '全部',
        bodyParts: ['胸', '手臂'],
        movementType: '全部'
      }).map((item) => item.id)
    ).toEqual(['1'])
  })

  it('returns no result when no exercise contains the full body-part intersection', () => {
    expect(
      filterExercises(exercises, {
        query: '',
        equipment: '全部',
        bodyParts: ['肩', '臀'],
        movementType: '全部'
      })
    ).toEqual([])
  })

  it('treats empty body parts and 全部 as no tag restrictions', () => {
    expect(
      filterExercises(exercises, {
        query: '',
        equipment: '全部',
        bodyParts: [],
        movementType: '全部'
      })
    ).toHaveLength(3)
  })

  it('searches names, equipment, parts and movement type', () => {
    expect(
      filterExercises(exercises, {
        query: '手臂',
        equipment: '全部',
        bodyParts: [],
        movementType: '全部'
      }).map((item) => item.name)
    ).toEqual(['槓鈴臥推'])
  })
})
