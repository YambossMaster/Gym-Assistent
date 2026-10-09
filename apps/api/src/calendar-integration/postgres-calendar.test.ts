import { expect, it, vi } from 'vitest'
import type { Pool } from 'pg'
import { PostgresCalendarIntegration } from './postgres-calendar.js'
import { PlanAccessModule } from '../plan-access/plan-access.js'
import { defaultSharing, tokenHash } from './calendar.js'

function fixture(prime = true) {
  const calls: { sql: string; values: unknown[] }[] = []
  let row: Record<string, unknown> | undefined
  const client = {
    release: vi.fn(),
    query: vi.fn(async (sql: string, values: unknown[] = []) => {
      calls.push({ sql, values })
      if (sql.startsWith('select deletion_requested_at'))
        return { rows: [{ deletion_requested_at: null }] }
      if (sql.startsWith('select owner_user_id'))
        return {
          rows: [{ owner_user_id: 'owner', time_zone: 'Asia/Taipei', deletion_requested_at: null }],
        }
      if (sql.startsWith('select workspace_id from app_private.calendar_subscription'))
        return { rows: row?.token_hash === values[0] ? [{ workspace_id: 'resolved-owner' }] : [] }
      if (sql.startsWith('select version')) return { rows: row ? [{ ...row }] : [] }
      if (sql.startsWith('insert into app_private.calendar_subscription'))
        row = {
          token_hash: values[1],
          version: values[2],
          include_blocks: values[3],
          show_names: values[4],
          show_location: values[5],
          revoked_at: null,
        }
      if (sql.startsWith('update app_private.calendar_subscription set token_hash=null') && row)
        row = { ...row, token_hash: null, revoked_at: new Date(), version: Number(row.version) + 1 }
      return { rows: [] }
    }),
  }
  const plans = new PlanAccessModule({
    get: async () => ({
      grant: prime ? { kind: 'permanent', endsAt: null } : null,
      activeStudents: 0,
      activeVenues: 0,
    }),
  })
  const resolve = vi.fn(async () => 'resolved-owner')
  const module = new PostgresCalendarIntegration(
    { connect: async () => client } as unknown as Pool,
    resolve,
    plans,
    () => new Date('2026-10-10T00:00:00Z'),
  )
  return {
    module,
    calls,
    resolve,
    client,
    downgrade: () => {
      prime = false
    },
  }
}
it('stores only the token hash, returns it only once, scopes by verified owner and checks versions', async () => {
  const f = fixture(),
    identity = { userId: 'owner' }
  const result = await f.module.change(identity, {
    action: 'create',
    version: 0,
    sharing: defaultSharing,
  })
  expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
  expect(f.resolve).toHaveBeenCalledWith(identity)
  const insert = f.calls.find((c) =>
    c.sql.startsWith('insert into app_private.calendar_subscription'),
  )!
  expect(insert.values[0]).toBe('resolved-owner')
  expect(insert.values[1]).toBe(tokenHash(result.token!))
  expect(JSON.stringify(f.calls)).not.toContain(result.token)
  expect(await f.module.get(identity)).toEqual({ ...defaultSharing, version: 1, active: true })
  await expect(
    f.module.change(identity, { action: 'reset', version: 0, sharing: defaultSharing }),
  ).rejects.toMatchObject({ code: 'version_conflict' })
  expect(f.calls.at(-1)?.sql).toBe('rollback')
})
it('rejects downgraded creates, still allows disable, and never leaks a revoked token', async () => {
  const f = fixture(),
    identity = { userId: 'owner' }
  const result = await f.module.change(identity, {
    action: 'create',
    version: 0,
    sharing: defaultSharing,
  })
  f.downgrade()
  await expect(
    f.module.change(identity, { action: 'reset', version: 1, sharing: defaultSharing }),
  ).rejects.toMatchObject({ reason: 'plan_required' })
  expect(await f.module.change(identity, { action: 'disable', version: 1 })).toMatchObject({
    active: false,
    version: 2,
  })
  await expect(f.module.feed(result.token!)).rejects.toMatchObject({ code: 'not_found' })
})
it('revokes an expired subscription before selecting any schedule data and commits the revocation', async () => {
  const f = fixture()
  const { token } = await f.module.change(
    { userId: 'owner' },
    { action: 'create', version: 0, sharing: defaultSharing },
  )
  f.downgrade()
  await expect(f.module.feed(token!)).rejects.toMatchObject({ code: 'not_found' })
  expect(f.calls.some((c) => c.sql.includes('from app_private.course_session'))).toBe(false)
  expect(f.calls.at(-1)?.sql).toBe('commit')
  expect(await f.module.get({ userId: 'owner' })).toMatchObject({ active: false })
})
