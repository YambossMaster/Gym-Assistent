import { describe, expect, it } from 'vitest'
import {
  addDays,
  addHours,
  addWeeks,
  differenceInCalendarDays,
  isSameDay,
  parseISO,
  setHours,
  startOfDay
} from 'date-fns'
import {
  applyAvailabilityWindowChange,
  bestExercisePerformance,
  calendarSessionState,
  exercisePerformanceSummary,
  findAvailableSlots,
  availableWindowsForDay,
  isRescheduleSlotAvailable,
  lessonSummary,
  moveSession,
  previousExerciseSets,
  publicTrainingNote,
  publicTrainingProjection,
  reconcileSchedule,
  sessionIssues,
  setSessionStatus,
  studentCourseRecordSessions,
  studentExercisePerformanceEntries,
  toggleTrainingSetResult,
  updateTrainingSetActualReps
} from './domain'
import type { AppData } from './types'
import { exerciseCatalog } from './exerciseCatalog'

const base = (): AppData => ({
  students: [
    {
      id: 'student',
      name: '測試學生',
      phone: '',
      goal: '',
      privateNote: '不可公開',
      active: true,
      lineLinked: false,
      createdAt: new Date().toISOString()
    }
  ],
  purchases: [
    {
      id: 'purchase',
      studentId: 'student',
      purchasedAt: new Date().toISOString(),
      amount: 10000,
      lessonCount: 3,
      note: ''
    }
  ],
  series: [],
  sessions: [
    {
      id: 'one',
      studentId: 'student',
      startsAt: addHours(new Date(), 1).toISOString(),
      endsAt: addHours(new Date(), 2).toISOString(),
      status: 'scheduled',
      location: ''
    },
    {
      id: 'two',
      studentId: 'student',
      startsAt: addHours(new Date(), 3).toISOString(),
      endsAt: addHours(new Date(), 4).toISOString(),
      status: 'scheduled',
      location: ''
    }
  ],
  records: [
    {
      sessionId: 'one',
      privateNote: '學生不應看到',
      updatedAt: new Date().toISOString(),
      exercises: [
        {
          id: 'ex',
          name: '深蹲',
          region: '腿部',
          performanceMetric: 'weight',
          sets: [
            {
              id: 'set',
              plannedWeight: 30,
              plannedReps: 8,
              actualReps: 7,
              result: 'incomplete',
              unit: 'kg',
              rpe: 8
            }
          ]
        }
      ]
    }
  ],
  blocks: [],
  links: [],
  availability: [
    {
      id: 'availability',
      weekday: addHours(new Date(), 24).getDay(),
      startTime: '08:00',
      endTime: '20:00',
      active: true
    }
  ],
  availabilityOverrides: [],
  exercises: [],
  settings: {
    displayName: '測試教練',
    timezone: 'Asia/Taipei',
    defaultDurationMinutes: 60,
    defaultWeightUnit: 'kg',
    reminderHoursBefore: 24,
    conflictScanEnabled: true,
    calendarStartHour: 7,
    calendarEndHour: 22
  }
})

describe('LessonAccount', () => {
  it('derives remaining lessons only from purchases and completed sessions', () => {
    const data = setSessionStatus(base(), 'one', 'completed')
    expect(lessonSummary(data, 'student')).toEqual({ purchased: 3, completed: 1, remaining: 2 })
  })

  it('completing the same session twice does not deduct twice', () => {
    const once = setSessionStatus(base(), 'one', 'completed')
    const twice = setSessionStatus(once, 'one', 'completed')
    expect(lessonSummary(twice, 'student').remaining).toBe(2)
  })
})

describe('Session presentation', () => {
  it('distinguishes upcoming, overdue, and completed calendar lessons', () => {
    const now = new Date('2026-08-24T10:00:00.000Z')
    const session = base().sessions[0]

    expect(
      calendarSessionState(
        { ...session, startsAt: '2026-08-24T11:00:00.000Z', endsAt: '2026-08-24T12:00:00.000Z' },
        now
      )
    ).toBe('upcoming')
    expect(
      calendarSessionState(
        { ...session, startsAt: '2026-08-24T08:00:00.000Z', endsAt: '2026-08-24T09:00:00.000Z' },
        now
      )
    ).toBe('overdue')
    expect(calendarSessionState({ ...session, status: 'completed' }, now)).toBe('completed')
  })

  it('shows completed lessons plus only the nearest future scheduled lesson', () => {
    const now = new Date('2026-08-24T10:00:00.000Z')
    const data = base()
    data.sessions = [
      {
        ...data.sessions[0],
        id: 'completed',
        startsAt: '2026-08-22T08:00:00.000Z',
        endsAt: '2026-08-22T09:00:00.000Z',
        status: 'completed'
      },
      {
        ...data.sessions[0],
        id: 'overdue',
        startsAt: '2026-08-23T08:00:00.000Z',
        endsAt: '2026-08-23T09:00:00.000Z'
      },
      {
        ...data.sessions[0],
        id: 'next',
        startsAt: '2026-08-25T08:00:00.000Z',
        endsAt: '2026-08-25T09:00:00.000Z'
      },
      {
        ...data.sessions[0],
        id: 'later',
        startsAt: '2026-08-26T08:00:00.000Z',
        endsAt: '2026-08-26T09:00:00.000Z'
      }
    ]

    expect(studentCourseRecordSessions(data, 'student', now).map((session) => session.id)).toEqual([
      'next',
      'completed'
    ])
  })
})

describe('Schedule', () => {
  it('can subtract a middle range from availability and leave two usable windows', () => {
    expect(
      applyAvailabilityWindowChange(
        [{ startTime: '08:00', endTime: '18:00' }],
        { startTime: '12:00', endTime: '14:00' },
        'remove'
      )
    ).toEqual([
      { startTime: '08:00', endTime: '12:00' },
      { startTime: '14:00', endTime: '18:00' }
    ])
  })

  it('merges overlapping availability ranges but keeps separate ranges separate', () => {
    expect(
      applyAvailabilityWindowChange(
        [
          { startTime: '08:00', endTime: '10:00' },
          { startTime: '14:00', endTime: '18:00' }
        ],
        { startTime: '09:00', endTime: '12:00' },
        'add'
      )
    ).toEqual([
      { startTime: '08:00', endTime: '12:00' },
      { startTime: '14:00', endTime: '18:00' }
    ])
  })

  it('accepts a coach move while returning conflict information', () => {
    const data = base()
    const target = addHours(new Date(), 3.5).toISOString()
    const result = moveSession(data, 'one', target)
    expect(result.conflicts.map((s) => s.id)).toContain('two')
    expect(result.data.sessions.find((s) => s.id === 'one')?.startsAt).toBe(target)
  })

  it('reveals calendar blocks without deleting or rejecting the session', () => {
    const data = base()
    const target = data.sessions[0]
    data.blocks.push({
      id: 'block',
      startsAt: target.startsAt,
      endsAt: target.endsAt,
      note: '進修'
    })
    expect(sessionIssues(data, target).blockedBy).toHaveLength(1)
    expect(data.sessions).toContain(target)
  })

  it('only exposes guest slots that fit availability and avoid blocks', () => {
    const data = base()
    const tomorrow = addDays(startOfDay(new Date()), 1)
    data.availability = [
      {
        id: 'available',
        weekday: tomorrow.getDay(),
        startTime: '08:00',
        endTime: '16:00',
        active: true
      }
    ]
    data.sessions = [
      {
        ...data.sessions[0],
        startsAt: addHours(tomorrow, 18).toISOString(),
        endsAt: addHours(tomorrow, 19).toISOString()
      }
    ]
    data.blocks = [
      {
        id: 'block',
        startsAt: setHours(tomorrow, 9).toISOString(),
        endsAt: setHours(tomorrow, 12).toISOString(),
        note: '不可授課'
      }
    ]
    const slots = findAvailableSlots(data, data.sessions[0], 1)
    expect(slots.length).toBeGreaterThan(0)
    expect(
      slots.every(
        (slot) => slot.end <= setHours(tomorrow, 9) || slot.start >= setHours(tomorrow, 12)
      )
    ).toBe(true)
  })

  it('fills remaining lessons from a fixed series without creating past sessions', () => {
    const data = base()
    const previous = addDays(new Date(), -21)
    data.series = [
      {
        id: 'series',
        studentId: 'student',
        weekday: previous.getDay(),
        localStartTime: '10:00',
        durationMinutes: 60,
        intervalWeeks: 1,
        active: true
      }
    ]
    data.sessions = [
      {
        ...data.sessions[0],
        id: 'past',
        seriesId: 'series',
        startsAt: previous.toISOString(),
        endsAt: addHours(previous, 1).toISOString(),
        status: 'completed'
      }
    ]

    const reconciled = reconcileSchedule(data, 'student')
    const scheduled = reconciled.sessions.filter((session) => session.status === 'scheduled')
    expect(scheduled).toHaveLength(2)
    expect(scheduled.every((session) => new Date(session.startsAt) > new Date())).toBe(true)
    expect(scheduled[0].startsAt < scheduled[1].startsAt).toBe(true)
  })

  it('continues a new fixed series from the occurrence drawn by the coach', () => {
    const data = base()
    const selectedStart = addWeeks(addHours(startOfDay(new Date()), 10), 2)
    data.series = [
      {
        id: 'drawn-series',
        studentId: 'student',
        weekday: selectedStart.getDay(),
        localStartTime: '10:00',
        durationMinutes: 60,
        intervalWeeks: 1,
        active: true
      }
    ]
    data.sessions = [
      {
        id: 'drawn-first',
        seriesId: 'drawn-series',
        studentId: 'student',
        startsAt: selectedStart.toISOString(),
        endsAt: addHours(selectedStart, 1).toISOString(),
        status: 'scheduled',
        location: 'FORM Studio'
      }
    ]

    const scheduled = reconcileSchedule(data, 'student').sessions.sort((a, b) =>
      a.startsAt.localeCompare(b.startsAt)
    )
    expect(scheduled).toHaveLength(3)
    expect(scheduled[0].startsAt).toBe(selectedStart.toISOString())
    expect(scheduled[1].startsAt).toBe(addWeeks(selectedStart, 1).toISOString())
    expect(scheduled[2].startsAt).toBe(addWeeks(selectedStart, 2).toISOString())
  })

  it('subtracts lessons and private blocks from daily availability in time order', () => {
    const data = base()
    const day = addDays(startOfDay(new Date()), 1)
    data.availability = [
      { id: 'available', weekday: day.getDay(), startTime: '08:00', endTime: '14:00', active: true }
    ]
    data.sessions = [
      {
        ...data.sessions[0],
        startsAt: setHours(day, 9).toISOString(),
        endsAt: setHours(day, 10).toISOString()
      }
    ]
    data.blocks = [
      {
        id: 'private',
        startsAt: setHours(day, 12).toISOString(),
        endsAt: setHours(day, 13).toISOString(),
        note: '私人時間'
      }
    ]

    expect(
      availableWindowsForDay(data, day).map(({ start, end }) => [start.getHours(), end.getHours()])
    ).toEqual([
      [8, 9],
      [10, 12],
      [13, 14]
    ])
  })
})

describe('Training share projection', () => {
  it('includes actual results and excludes the private note', () => {
    const projection = publicTrainingProjection(base(), 'one')
    expect(projection[0].sets[0]).toEqual({
      weight: 30,
      reps: 7,
      unit: 'kg',
      rpe: 8,
      result: 'incomplete'
    })
    expect(JSON.stringify(projection)).not.toContain('學生不應看到')
  })

  it('shares the note only when the link explicitly opts in', () => {
    expect(publicTrainingNote(base(), 'one')).toBe('')
    expect(publicTrainingNote(base(), 'one', true)).toBe('學生不應看到')
  })
})

describe('Training history defaults', () => {
  it('uses the latest earlier results for the same student and exercise', () => {
    const data = base()
    const previous = data.sessions.find((session) => session.id === 'one')!
    const targetStart = addHours(parseISO(previous.startsAt), 24).toISOString()

    expect(previousExerciseSets(data, 'student', '深蹲', targetStart)).toEqual([
      { plannedWeight: 30, plannedReps: 7, unit: 'kg' }
    ])
  })

  it('returns no defaults when the student has not performed the exercise', () => {
    expect(
      previousExerciseSets(base(), 'student', '從未做過的動作', new Date(2100, 0, 1).toISOString())
    ).toEqual([])
  })
})

describe('Exercise performance history', () => {
  it('compares mixed weight units and derives current, previous, and personal bests', () => {
    const data = base()
    data.sessions[0].status = 'completed'
    data.records[0].exercises[0].sets[0].actualReps = 8
    data.records[0].exercises[0].sets[0].result = 'completed'
    const target = {
      id: 'current-exercise',
      definitionId: 'squat',
      name: '深蹲',
      region: '腿部',
      performanceMetric: 'weight' as const,
      sets: [
        { id: 'one', plannedWeight: 32, unit: 'kg' as const, result: 'completed' as const },
        { id: 'two', plannedWeight: 80, unit: 'lb' as const, result: 'completed' as const },
        { id: 'failed', plannedWeight: 1000, unit: 'kg' as const, result: 'incomplete' as const }
      ]
    }
    const currentRecord = {
      sessionId: 'two',
      privateNote: '',
      updatedAt: new Date().toISOString(),
      exercises: [target]
    }

    expect(bestExercisePerformance(target, 'weight', 'kg')).toBe(36.3)
    expect(exercisePerformanceSummary(data, 'student', 'two', target, currentRecord)).toMatchObject(
      {
        unit: 'kg',
        current: 36.3,
        previous: 30,
        personal: 36.3
      }
    )
  })

  it('uses the previous record of the same movement even when the intervening lesson differs', () => {
    const data = base()
    const first = data.sessions[0]
    const intervening = data.sessions[1]
    first.status = 'completed'
    intervening.status = 'completed'
    first.startsAt = '2026-08-01T08:00:00.000Z'
    intervening.startsAt = '2026-08-08T08:00:00.000Z'
    data.records[0].exercises[0].sets[0] = {
      ...data.records[0].exercises[0].sets[0],
      plannedWeight: 30,
      result: 'completed'
    }
    data.records.push({
      sessionId: intervening.id,
      privateNote: '',
      updatedAt: intervening.startsAt,
      exercises: [
        {
          id: 'other',
          name: '臥推',
          region: '胸',
          performanceMetric: 'weight',
          sets: [{ id: 'other-set', plannedWeight: 40, unit: 'kg', result: 'completed' }]
        }
      ]
    })
    const currentSession = {
      ...intervening,
      id: 'current',
      startsAt: '2026-08-15T08:00:00.000Z',
      endsAt: '2026-08-15T09:00:00.000Z',
      status: 'scheduled' as const
    }
    data.sessions.push(currentSession)
    const exercise = {
      id: 'current-squat',
      name: '深蹲',
      region: '腿部',
      performanceMetric: 'weight' as const,
      sets: [
        { id: 'current-set', plannedWeight: 35, unit: 'kg' as const, result: 'completed' as const }
      ]
    }

    expect(
      exercisePerformanceSummary(data, 'student', currentSession.id, exercise, {
        sessionId: currentSession.id,
        privateNote: '',
        updatedAt: currentSession.startsAt,
        exercises: [exercise]
      }).previous
    ).toBe(30)
  })

  it('uses only successful actual repetitions for repetition-based movements', () => {
    const exercise = {
      id: 'push-up',
      name: '伏地挺身',
      region: '胸',
      performanceMetric: 'reps' as const,
      sets: [
        {
          id: 'one',
          plannedReps: 12,
          actualReps: 12,
          unit: 'kg' as const,
          result: 'completed' as const
        },
        {
          id: 'two',
          plannedReps: 20,
          actualReps: 17,
          unit: 'kg' as const,
          result: 'incomplete' as const
        },
        { id: 'three', plannedReps: 30, unit: 'kg' as const }
      ]
    }

    expect(bestExercisePerformance(exercise)).toBe(12)
  })

  it('keeps similarly named exercises separate when both have stable definition ids', () => {
    const data = base()
    data.sessions[0].status = 'completed'
    data.records[0].exercises[0].definitionId = 'back-squat'
    const target = {
      id: 'front-squat-record',
      definitionId: 'front-squat',
      name: '深蹲',
      region: '腿部',
      performanceMetric: 'weight' as const,
      sets: [{ id: 'set', plannedWeight: 20, unit: 'kg' as const, result: 'completed' as const }]
    }

    const summary = exercisePerformanceSummary(data, 'student', 'two', target, {
      sessionId: 'two',
      privateNote: '',
      updatedAt: new Date().toISOString(),
      exercises: [target]
    })
    expect(summary.history).toHaveLength(1)
    expect(summary.previous).toBeUndefined()
  })

  it('sorts a student movement directory by successful record count', () => {
    const data = base()
    data.sessions.forEach((session) => {
      session.status = 'completed'
    })
    data.records[0].exercises[0].sets[0].actualReps = 8
    data.records[0].exercises[0].sets[0].result = 'completed'
    data.records.push({
      sessionId: 'two',
      privateNote: '',
      updatedAt: new Date().toISOString(),
      exercises: [
        {
          id: 'squat-two',
          name: '深蹲',
          region: '腿部',
          performanceMetric: 'weight',
          sets: [{ id: 'squat-set', plannedWeight: 35, unit: 'kg', result: 'completed' }]
        },
        {
          id: 'push-up-two',
          name: '伏地挺身',
          region: '胸',
          performanceMetric: 'reps',
          sets: [
            {
              id: 'push-up-set',
              plannedReps: 12,
              actualReps: 12,
              unit: 'kg',
              result: 'completed'
            }
          ]
        },
        {
          id: 'failed-only',
          name: '硬舉',
          region: '後鏈',
          performanceMetric: 'weight',
          sets: [{ id: 'failed-set', plannedWeight: 1000, unit: 'kg', result: 'incomplete' }]
        }
      ]
    })

    const entries = studentExercisePerformanceEntries(data, 'student')
    expect(entries.map((entry) => [entry.exercise.name, entry.sessionCount])).toEqual([
      ['深蹲', 2],
      ['伏地挺身', 1]
    ])
    expect(entries[0].summary).toMatchObject({ current: 35, previous: 30, personal: 35 })
  })
})

describe('Training set result rules', () => {
  const set = { id: 'set', plannedReps: 8, plannedWeight: 30, unit: 'kg' as const }

  it('fills planned repetitions when completed is selected and clears both when toggled off', () => {
    const completed = toggleTrainingSetResult(set, 'completed')
    expect(completed).toMatchObject({ actualReps: 8, result: 'completed' })
    expect(toggleTrainingSetResult(completed, 'completed')).toEqual(set)
  })

  it('allows incomplete to be selected and deselected without inventing repetitions', () => {
    const incomplete = toggleTrainingSetResult(set, 'incomplete')
    expect(incomplete).toMatchObject({ actualReps: undefined, result: 'incomplete' })
    expect(toggleTrainingSetResult(incomplete, 'incomplete')).toEqual(set)
  })

  it('derives incomplete for zero or below-plan repetitions and completed at or above plan', () => {
    expect(updateTrainingSetActualReps(set, 0).result).toBe('incomplete')
    expect(updateTrainingSetActualReps(set, 7).result).toBe('incomplete')
    expect(updateTrainingSetActualReps(set, 8).result).toBe('completed')
    expect(updateTrainingSetActualReps(set, 10).result).toBe('completed')
    expect(updateTrainingSetActualReps(set, undefined).result).toBeUndefined()
  })
})

describe('Reschedule slot boundary', () => {
  it('returns every conflict-free slot within three days of the original lesson', () => {
    const data = base()
    const originalDay = addDays(startOfDay(new Date()), 10)
    const startsAt = setHours(originalDay, 10)
    const session = {
      ...data.sessions[0],
      startsAt: startsAt.toISOString(),
      endsAt: addHours(startsAt, 1).toISOString()
    }
    data.sessions = [session]
    data.availability = Array.from({ length: 7 }, (_, weekday) => ({
      id: `available-${weekday}`,
      weekday,
      startTime: '09:00',
      endTime: '12:00',
      active: true
    }))

    const slots = findAvailableSlots(data, session)
    expect(slots).toHaveLength(34)
    expect(
      slots.every(({ start }) => Math.abs(differenceInCalendarDays(start, startsAt)) <= 3)
    ).toBe(true)
    expect(slots.some(({ start }) => isSameDay(start, startsAt) && start.getHours() === 11)).toBe(
      true
    )
    expect(isRescheduleSlotAvailable(data, session, slots[0].start.toISOString())).toBe(true)
    expect(isRescheduleSlotAvailable(data, session, addDays(startsAt, 4).toISOString())).toBe(false)
  })
})

describe('Exercise catalog', () => {
  it('contains the complete 100-movement baseline with three tag dimensions', () => {
    expect(exerciseCatalog).toHaveLength(100)
    expect(new Set(exerciseCatalog.map((exercise) => exercise.id)).size).toBe(100)
    expect(
      exerciseCatalog.every(
        (exercise) =>
          exercise.equipment &&
          exercise.bodyParts.length > 0 &&
          exercise.movementType &&
          exercise.performanceMetric
      )
    ).toBe(true)
  })

  it('supports multi-part classification', () => {
    const deadlift = exerciseCatalog.find((exercise) => exercise.name === '傳統硬舉')
    expect(deadlift?.equipment).toBe('槓鈴')
    expect(deadlift?.bodyParts).toEqual(['腿', '臀', '背'])
    expect(deadlift?.movementType).toBe('系統動作')
  })
})
