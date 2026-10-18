import type { Pool } from 'pg'
import { expect, it, vi } from 'vitest'
import { PostgresVerifiedBillingAccess } from './postgres-access-source.js'

it('queries only unexpired owner-bound verified periods', async () => {
  const due = new Date('2026-11-01T00:00:00Z')
  const now = new Date('2026-10-31T00:00:00Z')
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('select id from app_private.workspace')) return { rows: [{ id: 'workspace' }] }
    if (sql.includes('select p.tier,p.origin'))
      return {
        rows: [
          {
            tier: 'advanced',
            origin: 'renewal',
            starts_at: new Date('2026-10-01T00:00:00Z'),
            ends_at: due,
            status: 'past_due',
            cancellation_ends_at: null,
          },
        ],
      }
    return { rows: [] }
  })
  const release = vi.fn()
  const pool = { connect: async () => ({ query, release }) } as unknown as Pool

  await expect(
    new PostgresVerifiedBillingAccess(pool, () => now).get({ userId: 'coach' }),
  ).resolves.toEqual({ tier: 'advanced', endsAt: due })
  expect(query).toHaveBeenCalledWith("select set_config('app.current_workspace_id',$1,true)", [
    'workspace',
  ])
  expect(query).toHaveBeenCalledWith(expect.stringContaining('and p.ends_at>$2'), [
    'workspace',
    now,
    'test',
  ])
  expect(query.mock.calls.some(([sql]) => sql.includes("interval '7 days'"))).toBe(false)
  expect(release).toHaveBeenCalledOnce()
})

it('does not grant an applied refund case current paid period', async () => {
  const now = new Date('2026-10-31T00:00:00Z')
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('select id from app_private.workspace')) return { rows: [{ id: 'workspace' }] }
    if (sql.includes('select p.tier,p.origin'))
      return {
        rows: [
          {
            tier: 'advanced',
            origin: 'payment',
            starts_at: new Date('2026-10-01T00:00:00Z'),
            ends_at: new Date('2026-11-01T00:00:00Z'),
            status: 'cancelled',
            cancellation_ends_at: '2026-11-01T00:00:00Z',
            access_revoked: true,
          },
        ],
      }
    return { rows: [] }
  })
  const pool = { connect: async () => ({ query, release: vi.fn() }) } as unknown as Pool
  await expect(
    new PostgresVerifiedBillingAccess(pool, () => now).get({ userId: 'coach' }),
  ).resolves.toBeNull()
  expect(query.mock.calls.some(([sql]) => sql.includes('billing_refund_case_application'))).toBe(
    true,
  )
})
