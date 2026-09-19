import type { Pool } from 'pg'
import { expect, it, vi } from 'vitest'
import { PostgresSchedulingRepository } from './postgres-scheduling-repository.js'

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
