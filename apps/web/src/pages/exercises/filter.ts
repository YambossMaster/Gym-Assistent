import type { ExerciseDefinition } from '../../api'

export type ExerciseFilters = {
  q?: string
  equipment?: string
  bodyParts?: string[]
  movementType?: string
  view?: 'all' | 'favorite' | 'custom'
}

export function filterExerciseDefinitions(
  definitions: ExerciseDefinition[],
  filters: ExerciseFilters
) {
  const query = filters.q?.trim().toLocaleLowerCase('zh-TW') ?? ''
  return definitions.filter((definition) => {
    const searchable = [
      definition.name,
      definition.equipment,
      definition.movementType,
      ...definition.bodyParts
    ]
      .join(' ')
      .toLocaleLowerCase('zh-TW')
    return (
      (!query || searchable.includes(query)) &&
      (!filters.equipment || definition.equipment === filters.equipment) &&
      (!filters.movementType || definition.movementType === filters.movementType) &&
      (!filters.bodyParts?.length ||
        filters.bodyParts.every((part) => definition.bodyParts.includes(part))) &&
      (filters.view !== 'favorite' || definition.favorite) &&
      (filters.view !== 'custom' || !definition.isSystem)
    )
  })
}
