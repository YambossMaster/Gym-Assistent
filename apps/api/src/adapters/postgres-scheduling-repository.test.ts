import type { Pool } from 'pg'
import { expect, it, vi } from 'vitest'
import { PostgresSchedulingRepository } from './postgres-scheduling-repository.js'
import { SchedulingVersionConflictError } from '../scheduling/scheduling-repository.js'

it('checks Series version before deletion and leaves existing Sessions to the FK', async () => {
  const calls: string[] = []
  const query = vi.fn(async (sql: string) => {
    calls.push(sql)
    if (sql.includes('from app_private.schedule_series where'))
      return {
        rows: [
          {
            id: 'series-1',
            student_id: 'student-1',
            anchor_starts_at: new Date(),
            local_weekday: 1,
            local_start_time: '10:00',
            duration_minutes: 60,
            interval_weeks: 1,
            auto_schedule_horizon: 'NONE',
            location: 'FORM A',
            active: true,
            version: 4,
          },
        ],
        rowCount: 1,
      }
    return { rows: [], rowCount: 1 }
  })
  const release = vi.fn()
  const repository = new PostgresSchedulingRepository({
    connect: async () => ({ query, release }),
  } as unknown as Pool)

  await expect(repository.deleteSeries('workspace-1', 'series-1', 3)).rejects.toBeInstanceOf(
    SchedulingVersionConflictError,
  )
  expect(calls.some((sql) => sql.startsWith('delete from app_private.schedule_series'))).toBe(false)
  calls.length = 0
  await expect(repository.deleteSeries('workspace-1', 'series-1', 4)).resolves.toEqual({
    studentId: 'student-1',
  })
  expect(calls.some((sql) => sql.startsWith('delete from app_private.schedule_series'))).toBe(true)
  expect(calls.some((sql) => sql.includes('course_session'))).toBe(false)
  expect(release).toHaveBeenCalledTimes(2)
})

it('permits explicit deletion of a completed temporal Session', async () => {
  const calls: string[] = []
  const query = vi.fn(async (sql: string) => {
    calls.push(sql)
    if (sql.startsWith('select student_id from app_private.course_session'))
      return { rows: [{ student_id: 'student-1' }], rowCount: 1 }
    if (sql.startsWith('select student_id,status,version,is_legacy,series_id'))
      return {
        rows: [
          {
            student_id: 'student-1',
            status: 'completed',
            version: 4,
            is_legacy: false,
            series_id: null,
          },
        ],
        rowCount: 1,
      }
    if (sql.includes('from app_private.session_lesson_source'))
      return { rows: [{ kind: 'generated_single', purchase_id: 'purchase-1' }], rowCount: 1 }
    return { rows: [], rowCount: 1 }
  })
  const repository = new PostgresSchedulingRepository({
    connect: async () => ({ query, release: vi.fn() }),
  } as unknown as Pool)

  await expect(repository.deleteSession('workspace-1', 'session-1', 4)).resolves.toBe(true)

  expect(
    calls.findIndex((sql) => sql.startsWith('delete from app_private.session_lesson_source')),
  ).toBeLessThan(
    calls.findIndex((sql) => sql.startsWith('delete from app_private.lesson_purchase')),
  )
  expect(
    calls.findIndex((sql) => sql.startsWith('delete from app_private.lesson_purchase')),
  ).toBeLessThan(calls.findIndex((sql) => sql.startsWith('delete from app_private.course_session')))
  expect(calls.at(-1)).toBe('commit')
})

it('locks the Student and fixes an eligible manual source within completion', async () => {
  const calls: string[] = []
  const query = vi.fn(async (sql: string) => {
    calls.push(sql)
    if (sql.startsWith('select student_id from app_private.course_session'))
      return { rows: [{ student_id: 'student-1' }], rowCount: 1 }
    if (sql.startsWith('select student_id,version,status,venue_id,ends_at,is_legacy'))
      return {
        rows: [
          {
            student_id: 'student-1',
            version: 2,
            status: 'scheduled',
            venue_id: 'venue-1',
            ends_at: new Date('2026-09-01T03:00:00Z'),
            is_legacy: false,
          },
        ],
        rowCount: 1,
      }
    if (sql.startsWith('select ($2::timestamptz'))
      return { rows: [{ day: '2026-09-01' }], rowCount: 1 }
    if (sql.startsWith('select p.id from app_private.lesson_purchase'))
      return { rows: [{ id: 'manual-1' }], rowCount: 1 }
    if (sql.startsWith('update app_private.course_session set status='))
      return {
        rows: [
          {
            id: 'session-1',
            student_id: 'student-1',
            student_name: '學生',
            series_id: null,
            starts_at: new Date('2026-09-01T02:00:00Z'),
            ends_at: new Date('2026-09-01T03:00:00Z'),
            venue_id: 'venue-1',
            customer_source: null,
            fee_rule_id: null,
            location: '場地',
            status: 'completed',
            completed_at: new Date(),
            version: 3,
            is_legacy: false,
          },
        ],
        rowCount: 1,
      }
    return { rows: [], rowCount: 1 }
  })
  const repository = new PostgresSchedulingRepository({
    connect: async () => ({ query, release: vi.fn() }),
  } as unknown as Pool)
  await expect(
    repository.transitionSession('workspace-1', 'session-1', 'complete', 2, new Date()),
  ).resolves.toMatchObject({ status: 'completed', version: 3 })
  expect(
    calls.findIndex((sql) => sql.startsWith('select id from app_private.student')),
  ).toBeLessThan(
    calls.findIndex((sql) => sql.startsWith('select p.id from app_private.lesson_purchase')),
  )
  expect(
    calls.some((sql) => sql.includes("kind,purchase_id,decided_at) values($1,$2,$3,'manual'")),
  ).toBe(true)
  expect(calls.some((sql) => sql.startsWith('insert into app_private.lesson_purchase'))).toBe(false)
  expect(calls.at(-1)).toBe('commit')
})

it('allows a scheduled Series occurrence to change Student without changing its Series', async () => {
  const query = vi.fn(async (_sql: string, _params?: unknown[]) => ({ rows: [], rowCount: 1 }))
  const repository = new PostgresSchedulingRepository({ query } as unknown as Pool)

  await repository.updateSession('workspace-1', 'session-1', {
    studentId: '00000000-0000-4000-8000-000000000011',
    startsAt: new Date('2026-09-19T02:00:00.000Z'),
    endsAt: new Date('2026-09-19T03:00:00.000Z'),
    location: 'FORM A',
    expectedVersion: 3,
    now: new Date('2026-09-19T00:00:00.000Z'),
  })

  expect(query.mock.calls[0]?.[0]).not.toContain('series_id is null')
  expect(query.mock.calls[0]?.[1]?.[7]).toBe('00000000-0000-4000-8000-000000000011')
})
