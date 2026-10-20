import { expect, it, vi } from 'vitest'
import type { PoolClient } from 'pg'
import { allocateLessonSource } from './allocate-lesson-source.js'

const workspaceId = 'workspace-1'
const groupId = 'group-1'
const sessionId = 'session-1'
const endsAt = new Date('2026-10-20T03:00:00Z')
const now = new Date('2026-10-20T04:00:00Z')

it('uses one group package source for one shared Session', async () => {
  const query = vi.fn(async (sql: string, args?: unknown[]) => {
    if (sql.startsWith('select ($2::timestamptz')) return { rows: [{ local_day: '2026-10-20' }] }
    if (sql.startsWith('select p.id from app_private.lesson_purchase')) {
      expect(args?.[1]).toBe(groupId)
      return { rows: [{ id: 'group-purchase' }] }
    }
    return { rows: [] }
  })
  await allocateLessonSource(
    { query } as unknown as PoolClient,
    workspaceId,
    sessionId,
    groupId,
    null,
    endsAt,
    now,
  )
  expect(
    query.mock.calls.filter(([sql]) =>
      sql.startsWith('insert into app_private.session_lesson_source'),
    ),
  ).toHaveLength(1)
  expect(
    query.mock.calls.some(([sql]) => sql.startsWith('insert into app_private.lesson_purchase')),
  ).toBe(false)
})

it('keeps a zero group price distinct from missing price', async () => {
  for (const amount of ['0', null]) {
    const query = vi.fn(async (sql: string) => {
      if (sql.startsWith('select ($2::timestamptz')) return { rows: [{ local_day: '2026-10-20' }] }
      if (sql.startsWith('select p.id from app_private.lesson_purchase')) return { rows: [] }
      if (sql.startsWith('select single_lesson_amount_minor'))
        return {
          rows: [
            {
              single_lesson_amount_minor: amount,
              single_lesson_currency: 'TWD',
            },
          ],
        }
      return { rows: [] }
    })
    await allocateLessonSource(
      { query } as unknown as PoolClient,
      workspaceId,
      sessionId,
      groupId,
      null,
      endsAt,
      now,
    )
    const source = query.mock.calls.find(([sql]) =>
      sql.startsWith('insert into app_private.session_lesson_source'),
    )!
    expect(source[0]).toContain(amount === null ? "'pending'" : "'generated_single'")
    expect(
      query.mock.calls.filter(([sql]) => sql.startsWith('insert into app_private.lesson_purchase')),
    ).toHaveLength(amount === null ? 0 : 1)
  }
})
