import type { ExerciseDefinition } from './types'

export interface ExerciseFilters {
  query: string
  equipment: string
  bodyParts: string[]
  movementType: string
}

export function filterExercises(exercises: ExerciseDefinition[], filters: ExerciseFilters) {
  const normalizedQuery = filters.query.trim().toLocaleLowerCase('zh-TW')

  return exercises.filter((exercise) => {
    const matchesQuery =
      !normalizedQuery ||
      [exercise.name, exercise.equipment, exercise.movementType, ...exercise.bodyParts].some(
        (value) => value.toLocaleLowerCase('zh-TW').includes(normalizedQuery)
      )
    const matchesEquipment =
      filters.equipment === '全部' || exercise.equipment === filters.equipment
    const matchesBodyParts =
      filters.bodyParts.length === 0 ||
      filters.bodyParts.every((part) => exercise.bodyParts.includes(part))
    const matchesMovementType =
      filters.movementType === '全部' || exercise.movementType === filters.movementType

    return matchesQuery && matchesEquipment && matchesBodyParts && matchesMovementType
  })
}
