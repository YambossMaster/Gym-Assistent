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
})

describe('PostgresTrainingRepository autosave concurrency', () => {
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
      if (sql.startsWith('select * from app_private.course_session'))
        return {
          rows: [
            {
              id: 'session-1',
              student_id: 'student-1',
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
})
