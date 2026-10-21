import type { Pool } from 'pg'
import { describe, expect, it, vi } from 'vitest'
import { PostgresTrainingRepository } from './postgres-training-repository.js'

describe('PostgresTrainingRepository session workspace read', () => {
  it('loads the route projection in three data queries inside one scoped transaction', async () => {
    const query = vi.fn(async (sql: string) => {
      if (
        sql === 'begin' ||
        sql === 'commit' ||
        sql.includes("set_config('app.current_workspace_id'")
      )
        return { rows: [], rowCount: 0 }
      if (sql.includes('left join app_private.training_record'))
        return {
          rows: [
            {
              id: 'session-1',
              student_id: 'student-1',
              student_name: 'Student',
              starts_at: new Date('2026-09-14T02:00:00Z'),
              ends_at: new Date('2026-09-14T03:00:00Z'),
              location: 'FORM',
              status: 'completed',
              version: 1,
              purchased: 10,
              completed: 4,
              training_record_id: 'record-1',
              training_record_version: 2,
              training_private_note: '',
              training_updated_at: new Date('2026-09-14T03:00:00Z'),
              default_weight_unit: 'kg',
            },
          ],
          rowCount: 1,
        }
      if (sql.includes('left join app_private.training_set'))
        return {
          rows: [
            {
              id: 'exercise-1',
              definition_id: 'definition-1',
              definition_name: 'Squat',
              equipment: 'Barbell',
              body_parts: ['Legs'],
              movement_type: 'compound',
              performance_metric: 'weight',
              set_id: 'set-1',
              planned_weight: 100,
              planned_reps: 5,
              actual_reps: 5,
              rpe: 8,
              result: 'completed',
              unit: 'kg',
            },
          ],
          rowCount: 1,
        }
      if (sql.includes("ts.result='completed'")) return { rows: [], rowCount: 0 }
      if (sql.includes('from app_private.training_record'))
        return {
          rows: [{ id: 'record-1', version: 2, private_note: '', updated_at: new Date() }],
          rowCount: 1,
        }
      if (sql.includes('from app_private.training_exercise'))
        return {
          rows: [
            {
              id: 'exercise-1',
              definition_id: 'definition-1',
              definition_name: 'Squat',
              equipment: 'Barbell',
              body_parts: ['Legs'],
              movement_type: 'compound',
              performance_metric: 'weight',
            },
          ],
          rowCount: 1,
        }
      if (sql.includes('from app_private.training_set'))
        return {
          rows: [
            {
              id: 'set-1',
              exercise_id: 'exercise-1',
              planned_weight: 100,
              planned_reps: 5,
              actual_reps: 5,
              rpe: 8,
              result: 'completed',
              unit: 'kg',
            },
          ],
          rowCount: 1,
        }
      if (sql.includes('from app_private.training_preference'))
        return { rows: [{ default_weight_unit: 'kg' }], rowCount: 1 }
      if (sql.includes('from app_private.course_session cs join app_private.student'))
        return {
          rows: [
            {
              id: 'session-1',
              student_id: 'student-1',
              student_name: 'Student',
              starts_at: new Date('2026-09-14T02:00:00Z'),
              ends_at: new Date('2026-09-14T03:00:00Z'),
              location: 'FORM',
              status: 'completed',
              version: 1,
              purchased: 10,
              completed: 4,
            },
          ],
          rowCount: 1,
        }
      throw new Error(`Unexpected query: ${sql}`)
    })
    const client = { query, release: vi.fn() }
    const pool = { connect: vi.fn(async () => client) } as unknown as Pool
    const repository = new PostgresTrainingRepository(pool)

    const result = await repository.getSessionTraining('workspace-1', 'session-1')

    expect(result?.record.exercises).toHaveLength(1)
    expect(query).toHaveBeenCalledTimes(6)
  })

  it('keeps each group participant previous best in the shared session projection', async () => {
    const recording = { type: 'weight_reps', metrics: ['weight', 'reps'] }
    const query = vi.fn(async (sql: string, params?: unknown[]) => {
      if (
        sql === 'begin' ||
        sql === 'commit' ||
        sql.includes("set_config('app.current_workspace_id'")
      )
        return { rows: [], rowCount: 0 }
      if (sql.includes('left join app_private.training_record'))
        return {
          rows: [
            {
              id: 'session-now',
              student_id: 'group-1',
              student_name: 'Group',
              student_kind: 'group',
              starts_at: new Date('2026-10-22T02:00:00Z'),
              ends_at: new Date('2026-10-22T03:00:00Z'),
              location: '',
              status: 'scheduled',
              version: 1,
              purchased: 0,
              completed: 0,
              package_debits: 0,
              training_record_id: 'record-now',
              training_record_version: 1,
              training_private_note: '',
              training_updated_at: new Date('2026-10-22T02:00:00Z'),
              default_weight_unit: 'kg',
              default_distance_unit: 'km',
            },
          ],
          rowCount: 1,
        }
      if (sql.includes('left join app_private.training_set ts'))
        return {
          rows: [
            {
              id: 'exercise-now',
              definition_id: 'squat',
              definition_name: 'Squat',
              equipment: 'Barbell',
              body_parts: ['Legs'],
              movement_type: 'compound',
              performance_metric: 'weight',
              recording_config: recording,
              current_recording: recording,
              set_id: null,
            },
          ],
          rowCount: 1,
        }
      if (sql.startsWith('select p.student_id,person.name,p.attendance'))
        return {
          rows: [
            { student_id: 'person-a', name: 'A', attendance: 'present' },
            { student_id: 'person-b', name: 'B', attendance: 'present' },
          ],
          rowCount: 2,
        }
      if (sql.includes('te.recording_config is null')) return { rows: [], rowCount: 0 }
      if (sql.includes('d.recording_config current_recording,ts.measurements')) {
        const studentId = params?.[1]
        const weight = studentId === 'person-a' ? 90 : studentId === 'person-b' ? 60 : null
        return {
          rows:
            weight === null
              ? []
              : [
                  {
                    session_id: `prior-${studentId}`,
                    session_status: 'completed',
                    starts_at: new Date('2026-10-15T02:00:00Z'),
                    definition_id: 'squat',
                    recording_config: recording,
                    measurements: {
                      weight,
                      reps: 5,
                      duration: null,
                      distance: null,
                      rounds: null,
                      weightUnit: 'kg',
                      durationUnit: 'sec',
                      distanceUnit: 'm',
                    },
                    result: 'completed',
                  },
                ],
          rowCount: weight === null ? 0 : 1,
        }
      }
      throw new Error(`Unexpected query: ${sql}`)
    })
    const repository = new PostgresTrainingRepository({
      connect: vi.fn(async () => ({ query, release: vi.fn() })),
    } as unknown as Pool)

    const result = await repository.getSessionTraining('workspace-1', 'session-now')

    expect(result?.exerciseSummaries).toEqual([])
    expect(
      result?.groupExerciseSummaries?.map((entry) => ({
        studentId: entry.studentId,
        previous: entry.series?.[0]?.previous,
        ownSession: entry.series?.[0]?.points[0]?.sessionId,
      })),
    ).toEqual([
      { studentId: 'person-a', previous: 90, ownSession: 'prior-person-a' },
      { studentId: 'person-b', previous: 60, ownSession: 'prior-person-b' },
    ])
  })
})

describe('PostgresTrainingRepository autosave concurrency', () => {
  it('locks the group entitlement owner before the Session on completion', async () => {
    const calls: string[] = []
    const query = vi.fn(async (sql: string) => {
      calls.push(sql)
      if (sql.startsWith('select student_id from app_private.course_session'))
        return { rows: [{ student_id: 'group-1' }], rowCount: 1 }
      if (sql.startsWith('select cs.*,owner.kind student_kind'))
        return {
          rows: [{ id: 'session-1', student_id: 'group-1', student_kind: 'group' }],
          rowCount: 1,
        }
      return { rows: [], rowCount: 0 }
    })
    const repository = new PostgresTrainingRepository({
      connect: vi.fn(async () => ({ query, release: vi.fn() })),
    } as unknown as Pool)

    await expect(
      repository.saveSessionTraining(
        'workspace-1',
        'session-1',
        {
          privateNote: '',
          exercises: [],
          recordVersion: 0,
          sessionVersion: 1,
          operationId: '00000000-0000-4000-8000-000000000098',
        },
        true,
      ),
    ).rejects.toMatchObject({ reason: 'version_conflict' })
    const ownerLock = calls.findIndex((sql) => sql.startsWith('select id from app_private.student'))
    const sessionLock = calls.findIndex((sql) =>
      sql.startsWith('select cs.*,owner.kind student_kind'),
    )
    expect(ownerLock).toBeGreaterThan(-1)
    expect(sessionLock).toBeGreaterThan(ownerLock)
    expect(calls.at(-1)).toBe('rollback')
  })

  it('accepts a normal Training save after unrelated Session metadata changed', async () => {
    const query = vi.fn(async (sql: string) => {
      if (
        sql === 'begin' ||
        sql === 'commit' ||
        sql === 'rollback' ||
        sql.includes("set_config('app.current_workspace_id'") ||
        sql.startsWith('insert into app_private.training_mutation_receipt') ||
        sql.startsWith('delete from app_private.training_mutation_receipt') ||
        sql.startsWith('insert into app_private.training_record') ||
        sql.startsWith('delete from app_private.training_exercise')
      )
        return { rows: [], rowCount: 1 }
      if (sql.includes('from app_private.training_mutation_receipt'))
        return { rows: [], rowCount: 0 }
      if (sql.startsWith('select cs.*,owner.kind student_kind'))
        return {
          rows: [
            {
              id: 'session-1',
              student_id: 'student-1',
              student_kind: 'person',
              starts_at: new Date('2026-09-19T02:00:00.000Z'),
              ends_at: new Date('2026-09-19T03:00:00.000Z'),
              location: 'FORM B',
              status: 'scheduled',
              version: 2,
              is_legacy: false,
            },
          ],
          rowCount: 1,
        }
      if (sql.startsWith('select * from app_private.training_record'))
        return { rows: [], rowCount: 0 }
      if (sql.includes('left join app_private.training_record'))
        return {
          rows: [
            {
              id: 'session-1',
              student_id: 'student-1',
              student_name: 'Student',
              starts_at: new Date('2026-09-19T02:00:00.000Z'),
              ends_at: new Date('2026-09-19T03:00:00.000Z'),
              location: 'FORM B',
              status: 'scheduled',
              version: 2,
              purchased: 10,
              completed: 0,
              training_record_id: 'record-1',
              training_record_version: 1,
              training_private_note: '更新內容',
              training_updated_at: new Date('2026-09-19T01:00:00.000Z'),
              default_weight_unit: 'kg',
            },
          ],
          rowCount: 1,
        }
      if (
        sql.includes('left join app_private.training_set') ||
        sql.includes("ts.result='completed'")
      )
        return { rows: [], rowCount: 0 }
      throw new Error(`Unexpected query: ${sql}`)
    })
    const client = { query, release: vi.fn() }
    const repository = new PostgresTrainingRepository({
      connect: vi.fn(async () => client),
    } as unknown as Pool)

    await expect(
      repository.saveSessionTraining(
        'workspace-1',
        'session-1',
        {
          privateNote: '更新內容',
          exercises: [],
          recordVersion: 0,
          sessionVersion: 1,
          operationId: '00000000-0000-4000-8000-000000000099',
        },
        false,
      ),
    ).resolves.toMatchObject({
      session: { id: 'session-1', version: 2 },
      record: { version: 1, privateNote: '更新內容' },
    })
  })

  it('saves a note alongside existing legacy sets after a recording snapshot was added', async () => {
    const sessionId = '00000000-0000-4000-8000-000000000001'
    const exerciseId = '00000000-0000-4000-8000-000000000002'
    const setId = '00000000-0000-4000-8000-000000000003'
    const definitionId = '00000000-0000-4000-8000-000000000004'
    const recordId = '00000000-0000-4000-8000-000000000005'
    const query = vi.fn(async (sql: string) => {
      if (
        sql === 'begin' ||
        sql === 'commit' ||
        sql === 'rollback' ||
        sql.includes("set_config('app.current_workspace_id'") ||
        sql.startsWith('insert into app_private.training_mutation_receipt') ||
        sql.startsWith('delete from app_private.training_mutation_receipt') ||
        sql.startsWith('update app_private.training_record') ||
        sql.startsWith('delete from app_private.training_exercise') ||
        sql.startsWith('insert into app_private.training_exercise') ||
        sql.startsWith('insert into app_private.training_set')
      )
        return { rows: [], rowCount: 1 }
      if (sql.includes('from app_private.training_mutation_receipt'))
        return { rows: [], rowCount: 0 }
      if (sql.startsWith('select cs.*,owner.kind student_kind'))
        return {
          rows: [
            {
              id: sessionId,
              student_id: 'student-1',
              student_kind: 'person',
              version: 1,
              status: 'scheduled',
            },
          ],
          rowCount: 1,
        }
      if (sql.startsWith('select * from app_private.training_record'))
        return { rows: [{ id: recordId, version: 1, private_note: '' }], rowCount: 1 }
      if (sql.startsWith('select * from app_private.training_exercise'))
        return {
          rows: [
            {
              id: exerciseId,
              definition_id: definitionId,
              position: 0,
              definition_name: 'Squat',
              equipment: 'Barbell',
              body_parts: ['Legs'],
              movement_type: '局部動作',
              performance_metric: 'weight',
              recording_config: { type: 'weight_reps', metrics: ['weight'] },
            },
          ],
          rowCount: 1,
        }
      if (sql.startsWith('select ts.* from app_private.training_set'))
        return {
          rows: [
            {
              id: setId,
              student_id: 'student-1',
              exercise_id: exerciseId,
              position: 0,
              planned_weight: 80,
              planned_reps: 5,
              actual_reps: 5,
              rpe: 7,
              result: 'completed',
              unit: 'kg',
              measurements: null,
            },
          ],
          rowCount: 1,
        }
      throw new Error(`Unexpected query: ${sql}`)
    })
    const repository = new PostgresTrainingRepository({
      connect: vi.fn(async () => ({ query, release: vi.fn() })),
    } as unknown as Pool)
    vi.spyOn(repository as any, 'readSessionTraining').mockResolvedValue({
      session: { id: sessionId, version: 1 },
      record: { version: 2, privateNote: '新筆記' },
    })

    await expect(
      repository.saveSessionTraining(
        'workspace-1',
        sessionId,
        {
          privateNote: '新筆記',
          exercises: [
            {
              id: exerciseId,
              definitionId,
              formatVersion: 2,
              sets: [
                {
                  id: setId,
                  plannedWeight: 80,
                  plannedReps: 5,
                  actualReps: 5,
                  rpe: 7,
                  result: 'completed',
                  unit: 'kg',
                },
              ],
            },
          ],
          recordVersion: 1,
          sessionVersion: 1,
          operationId: '00000000-0000-4000-8000-000000000006',
        },
        false,
      ),
    ).resolves.toMatchObject({ record: { privateNote: '新筆記' } })
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('insert into app_private.training_set'),
      expect.arrayContaining([setId, null]),
    )
  })
})
