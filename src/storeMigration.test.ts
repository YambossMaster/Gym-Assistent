import { describe, expect, it } from 'vitest'
import { seedData } from './seed'
import {
  migrateCalendarFields,
  migrateCapabilityLinks,
  migrateCoachSettings,
  migrateExerciseDefinitions,
  migrateTrainingRecords,
  mergeExerciseDefinitions
} from './storeMigration'

describe('calendar persistence migration', () => {
  it('loads saved data from before day-specific availability overrides existed', () => {
    const fallback = seedData()
    const migrated = migrateCalendarFields({ availability: fallback.availability }, fallback)
    expect(migrated.availability).toEqual(fallback.availability)
    expect(migrated.availabilityOverrides).toEqual([])
  })

  it('preserves current day-specific availability overrides', () => {
    const fallback = seedData()
    const availabilityOverrides = [
      {
        id: 'override',
        date: '2026-08-26',
        windows: [{ startTime: '08:00', endTime: '12:00' }]
      }
    ]
    expect(
      migrateCalendarFields({ availabilityOverrides }, fallback).availabilityOverrides
    ).toEqual(availabilityOverrides)
  })
})

describe('coach settings persistence migration', () => {
  it('adds the default calendar range to older saved settings', () => {
    const fallback = seedData()
    const oldSettings = {
      displayName: 'Coach',
      timezone: 'Asia/Taipei',
      defaultDurationMinutes: 60,
      defaultWeightUnit: 'kg' as const,
      reminderHoursBefore: 24,
      conflictScanEnabled: true
    }

    expect(migrateCoachSettings({ settings: oldSettings }, fallback)).toMatchObject({
      calendarStartHour: 7,
      calendarEndHour: 22
    })
  })

  it('preserves a saved calendar range that extends to midnight', () => {
    const fallback = seedData()
    expect(
      migrateCoachSettings(
        {
          settings: {
            ...fallback.settings,
            calendarStartHour: 5,
            calendarEndHour: 24
          }
        },
        fallback
      )
    ).toMatchObject({ calendarStartHour: 5, calendarEndHour: 24 })
  })
})

describe('capability-link persistence migration', () => {
  it('keeps old training links private by default', () => {
    expect(
      migrateCapabilityLinks([
        {
          token: 'old-link',
          sessionId: 'session',
          capability: 'read_training_session',
          expiresAt: '2099-01-01T00:00:00.000Z'
        }
      ])[0].includeNote
    ).toBe(false)
  })

  it('preserves an explicit note-sharing choice', () => {
    expect(
      migrateCapabilityLinks([
        {
          token: 'new-link',
          sessionId: 'session',
          capability: 'read_training_session',
          expiresAt: '2099-01-01T00:00:00.000Z',
          includeNote: true
        }
      ])[0].includeNote
    ).toBe(true)
  })
})

describe('training-record persistence migration', () => {
  it('moves an older actual weight into the single working weight and infers set results', () => {
    const records = [
      {
        sessionId: 'session',
        privateNote: '',
        updatedAt: '2026-08-24T00:00:00.000Z',
        exercises: [
          {
            id: 'exercise',
            name: '深蹲',
            region: '腿部',
            sets: [
              {
                id: 'set',
                plannedWeight: 50,
                plannedReps: 8,
                actualWeight: 45,
                actualReps: 6,
                unit: 'kg' as const
              }
            ]
          }
        ]
      }
    ]

    const migrated = migrateTrainingRecords(records)
    expect(migrated[0].exercises[0].sets[0]).toEqual({
      id: 'set',
      plannedWeight: 45,
      plannedReps: 8,
      actualReps: 6,
      unit: 'kg',
      result: 'incomplete'
    })
    expect(migrated[0].exercises[0].performanceMetric).toBe('weight')
    expect(JSON.stringify(migrated)).not.toContain('actualWeight')
  })

  it('preserves a current explicit result', () => {
    const current = seedData().records
    expect(migrateTrainingRecords(current)).toEqual(current)
  })

  it('inherits a uniquely matched library metric for an older exercise snapshot', () => {
    const oldRecord = {
      sessionId: 'session',
      privateNote: '',
      updatedAt: '2026-08-24T00:00:00.000Z',
      exercises: [
        {
          id: 'exercise',
          name: '死蟲式',
          region: '核心',
          sets: [{ id: 'set', actualReps: 12, unit: 'kg' as const }]
        }
      ]
    }
    const definitions = [
      {
        id: 'dead-bug',
        name: 'Dead Bug 死蟲式',
        equipment: '徒手',
        bodyParts: ['核心'],
        movementType: '系統動作' as const,
        performanceMetric: 'reps' as const,
        isSystem: true,
        favorite: false
      }
    ]

    expect(migrateTrainingRecords([oldRecord], definitions)[0].exercises[0]).toMatchObject({
      definitionId: 'dead-bug',
      performanceMetric: 'reps'
    })
  })
})

describe('exercise-definition persistence migration', () => {
  it('defaults old movements to weight while preserving a current repetition metric', () => {
    const migrated = migrateExerciseDefinitions([
      {
        id: 'old',
        name: '舊動作',
        equipment: '槓鈴',
        bodyParts: ['腿'],
        movementType: '系統動作',
        isSystem: false,
        favorite: false
      },
      {
        id: 'current',
        name: '伏地挺身',
        equipment: '徒手',
        bodyParts: ['胸'],
        movementType: '系統動作',
        performanceMetric: 'reps',
        isSystem: true,
        favorite: true
      }
    ])

    expect(migrated.map((exercise) => exercise.performanceMetric)).toEqual(['weight', 'reps'])
  })

  it('keeps new built-in defaults unless the persisted movement has an explicit metric', () => {
    const fallback = seedData().exercises
    const pushUp = fallback.find((exercise) => exercise.name === '伏地挺身')!
    const mergedLegacy = mergeExerciseDefinitions(fallback, [
      {
        id: pushUp.id,
        name: pushUp.name,
        equipment: pushUp.equipment,
        bodyParts: pushUp.bodyParts,
        movementType: pushUp.movementType,
        isSystem: true,
        favorite: true
      }
    ])
    expect(mergedLegacy.find((exercise) => exercise.id === pushUp.id)).toMatchObject({
      performanceMetric: 'reps',
      favorite: true
    })

    const mergedExplicit = mergeExerciseDefinitions(fallback, [
      { ...pushUp, performanceMetric: 'weight' }
    ])
    expect(mergedExplicit.find((exercise) => exercise.id === pushUp.id)?.performanceMetric).toBe(
      'weight'
    )
  })
})
