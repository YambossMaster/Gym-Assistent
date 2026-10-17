import type { Pool } from 'pg'
import { describe, expect, it, vi } from 'vitest'
import {
  SingleLessonBillingModule,
  SingleLessonConflict,
  settleSchema,
} from './single-lesson-billing.js'

const one = '00000000-0000-4000-8000-000000000001'
const two = '00000000-0000-4000-8000-000000000002'
const requestId = '00000000-0000-4000-8000-000000000003'
const identity = { userId: 'coach', email: 'coach@example.test' } as never

describe('single-lesson settlement boundary', () => {
  it('rejects duplicate IDs and an oversized batch before opening a transaction', () => {
    const item = { sessionId: one, expectedVersion: 2, amountMinor: 0, currency: 'TWD' }
    expect(() => settleSchema.parse({ requestId, items: [item, item] })).toThrow()
    expect(() =>
      settleSchema.parse({
        requestId,
        items: Array.from({ length: 51 }, (_, n) => ({
          ...item,
          sessionId: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
        })),
      }),
    ).toThrow()
  })
  it('replays the exact saved result without creating another purchase', async () => {
    const response = {
      items: [{ sessionId: one, purchaseId: two, sessionVersion: 3, purchaseVersion: 1 }],
    }
    const query = vi.fn(async (sql: string) => {
      if (sql.startsWith('select payload_hash,response'))
        return { rows: [{ payload_hash: 'irrelevant', response }] }
      return { rows: [], rowCount: 0 }
    })
    const pool = { connect: async () => ({ query, release: vi.fn() }) } as unknown as Pool
    const module = new SingleLessonBillingModule(pool, async () => one)
    const payload = {
      requestId,
      items: [{ sessionId: one, expectedVersion: 2, amountMinor: 0, currency: 'TWD' }],
    }
    // Supply the canonical hash saved with the original request.
    const { createHash } = await import('node:crypto')
    const hash = createHash('sha256')
      .update(JSON.stringify(settleSchema.parse(payload).items))
      .digest('hex')
    query.mockImplementation(async (sql: string) =>
      sql.startsWith('select payload_hash,response')
        ? { rows: [{ payload_hash: hash, response }] }
        : { rows: [], rowCount: 0 },
    )
    await expect(module.settle(identity, payload)).resolves.toEqual(response)
    expect(
      query.mock.calls.some(([sql]) => sql.startsWith('insert into app_private.lesson_purchase')),
    ).toBe(false)
    await expect(
      module.settle(identity, { ...payload, items: [{ ...payload.items[0], amountMinor: 1 }] }),
    ).rejects.toBeInstanceOf(SingleLessonConflict)
  })
  it('rolls back the entire batch when one pending version changed', async () => {
    const calls: string[] = []
    const query = vi.fn(async (sql: string) => {
      calls.push(sql)
      if (sql.startsWith('select payload_hash,response')) return { rows: [] }
      if (sql.startsWith('select distinct student_id')) return { rows: [{ student_id: one }] }
      if (sql.startsWith('select s.id session_id'))
        return {
          rows: [
            {
              session_id: one,
              student_id: one,
              session_version: 2,
              source_version: 1,
              kind: 'pending',
            },
            {
              session_id: two,
              student_id: one,
              session_version: 3,
              source_version: 1,
              kind: 'pending',
            },
          ],
        }
      return { rows: [], rowCount: 1 }
    })
    const pool = { connect: async () => ({ query, release: vi.fn() }) } as unknown as Pool
    const module = new SingleLessonBillingModule(pool, async () => one)
    await expect(
      module.settle(identity, {
        requestId,
        items: [one, two].map((sessionId) => ({
          sessionId,
          expectedVersion: 2,
          amountMinor: 100,
          currency: 'TWD',
        })),
      }),
    ).rejects.toMatchObject({ affectedIds: [two] })
    expect(calls.at(-1)).toBe('rollback')
    expect(calls.some((sql) => sql.startsWith('insert into app_private.lesson_purchase'))).toBe(
      false,
    )
  })
})
