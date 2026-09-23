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
  const query = vi.fn(async (sql: string) => {
    if (sql.startsWith('delete from app_private.course_session')) return { rows: [], rowCount: 1 }
    throw new Error(`Unexpected query: ${sql}`)
  })
  const repository = new PostgresSchedulingRepository({ query } as unknown as Pool)

  await expect(repository.deleteSession('workspace-1', 'session-1', 4)).resolves.toBe(true)

  expect(query.mock.calls[0]?.[0]).toContain("status in ('scheduled','completed')")
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
