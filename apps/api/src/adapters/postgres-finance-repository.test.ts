import { expect, it, vi } from 'vitest'
import type { Pool } from 'pg'
import { PostgresFinanceRepository } from './postgres-finance-repository.js'
import { FinanceError } from '../finances/finance.js'

it('rolls back a serialization failure and rechecks versions on a fresh transaction', async () => {
  const clients = [0, 1].map(() => ({
    query: vi.fn().mockResolvedValue({ rows: [] }),
    release: vi.fn(),
  }))
  const connect = vi.fn().mockResolvedValueOnce(clients[0]).mockResolvedValueOnce(clients[1])
  const repository = new PostgresFinanceRepository({ connect } as unknown as Pool)
  const current = { id: 'own-venue', version: 2 }
  const work = vi
    .fn()
    .mockRejectedValueOnce(Object.assign(new Error('serialization'), { code: '40001' }))
    .mockRejectedValueOnce(new FinanceError(409, 'updated', current))
  await expect(repository.scoped('own-workspace', work)).rejects.toMatchObject({
    statusCode: 409,
    current,
  })
  expect(connect).toHaveBeenCalledTimes(2)
  for (const c of clients) {
    expect(c.query).toHaveBeenCalledWith('rollback')
    expect(c.release).toHaveBeenCalledTimes(1)
  }
})

it('never retries an ordinary command failure', async () => {
  const c = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() }
  const connect = vi.fn().mockResolvedValue(c)
  const repository = new PostgresFinanceRepository({ connect } as unknown as Pool)
  await expect(
    repository.scoped('own-workspace', async () => {
      throw new FinanceError(404, 'missing')
    }),
  ).rejects.toMatchObject({ statusCode: 404 })
  expect(connect).toHaveBeenCalledTimes(1)
  expect(c.release).toHaveBeenCalledTimes(1)
})

it('rejects a same-name Venue in the Workspace before insertion', async () => {
  const existing = { id: 'existing-id', name: 'FORM Studio', active: true, version: 1 }
  const query = vi.fn(async (sql: string, _values?: unknown[]) => ({
    rows: sql.includes('lower(btrim(name))') ? [existing] : [],
  }))
  const c = { query, release: vi.fn() }
  const repository = new PostgresFinanceRepository({
    connect: vi.fn().mockResolvedValue(c),
  } as unknown as Pool)
  await expect(
    repository.command('workspace-id', 'create', undefined, undefined, { name: ' form studio ' }),
  ).rejects.toMatchObject({ statusCode: 409, message: '該場地已存在。', current: existing })
  expect(query.mock.calls.some(([sql]) => sql.includes('insert into app_private.venue('))).toBe(
    false,
  )
})

const venueId = '11111111-1111-4111-8111-111111111111'
const creditId = '22222222-2222-4222-8222-222222222222'

it('deletes only a matching Workspace Venue credit at its current version', async () => {
  const query = vi.fn(async (sql: string, _values?: unknown[]) => {
    if (sql.includes('select id,name,active,version,address'))
      return { rows: [{ id: venueId, name: '預購場地', active: true, version: 4 }], rowCount: 1 }
    if (sql.includes('from app_private.venue_credit_purchase') && sql.includes('for update'))
      return { rows: [{ id: creditId, purchasedOn: '2026-08-31', version: 2 }], rowCount: 1 }
    if (sql.startsWith('delete from app_private.venue_credit_purchase'))
      return { rows: [], rowCount: 1 }
    return { rows: [], rowCount: 0 }
  })
  const repository = new PostgresFinanceRepository({
    connect: vi.fn().mockResolvedValue({ query, release: vi.fn() }),
  } as unknown as Pool)
  await expect(
    repository.command('own-workspace', 'credit-delete', venueId, creditId, { version: 1 }),
  ).rejects.toMatchObject({ statusCode: 409 })
  expect(
    query.mock.calls.some(([sql]) =>
      sql.startsWith('delete from app_private.venue_credit_purchase'),
    ),
  ).toBe(false)
  await expect(
    repository.command('own-workspace', 'credit-delete', venueId, creditId, { version: 2 }),
  ).resolves.toMatchObject({ entity: { id: creditId }, months: ['2026-08'] })
  expect(query).toHaveBeenCalledWith(
    expect.stringContaining(
      'delete from app_private.venue_credit_purchase where workspace_id=$1 and venue_id=$2 and id=$3 and version=$4',
    ),
    ['own-workspace', venueId, creditId, 2],
  )
})

it('rejects a Venue credit outside the current Workspace before deletion', async () => {
  const query = vi.fn(async (sql: string, _values?: unknown[]) => ({
    rows: sql.includes('select id,name,active,version,address')
      ? [{ id: venueId, name: '預購場地', active: true, version: 4 }]
      : [],
    rowCount: 0,
  }))
  const repository = new PostgresFinanceRepository({
    connect: vi.fn().mockResolvedValue({ query, release: vi.fn() }),
  } as unknown as Pool)
  await expect(
    repository.command('own-workspace', 'credit-delete', venueId, creditId, { version: 2 }),
  ).rejects.toMatchObject({ statusCode: 404 })
  expect(
    query.mock.calls.some(([sql]) =>
      sql.startsWith('delete from app_private.venue_credit_purchase'),
    ),
  ).toBe(false)
})

it('stores an optional Venue address and preserves it during archive', async () => {
  const query = vi.fn(async (sql: string, _values?: unknown[]) => ({
    rows: sql.includes('select id,name,active,version,address')
      ? [{ id: venueId, name: '測試場地', address: '台北市測試路', active: true, version: 2 }]
      : sql.startsWith('update app_private.venue')
        ? [{ id: venueId, name: '測試場地', address: '台北市測試路', active: false, version: 3 }]
        : [],
  }))
  const repository = new PostgresFinanceRepository({
    connect: vi.fn().mockResolvedValue({ query, release: vi.fn() }),
  } as unknown as Pool)
  await repository.command('own-workspace', 'create', undefined, undefined, {
    name: '另一場地',
    address: '新北市測試街',
  })
  expect(
    query.mock.calls.find(([sql]) => sql.includes('insert into app_private.venue('))?.[1],
  ).toContain('新北市測試街')
  await repository.command('own-workspace', 'edit', venueId, undefined, {
    version: 2,
    name: '測試場地',
    active: false,
  })
  expect(
    query.mock.calls.find(([sql]) => sql.startsWith('update app_private.venue'))?.[1],
  ).toContain('台北市測試路')
})

it('creates a Venue with its selected expense and salary settings in one transaction', async () => {
  const query = vi.fn(async (_sql: string, _values?: unknown[]) => ({ rows: [] }))
  const repository = new PostgresFinanceRepository({
    connect: vi.fn().mockResolvedValue({ query, release: vi.fn() }),
  } as unknown as Pool)
  await repository.command('own-workspace', 'create', undefined, undefined, {
    name: '新場地',
    rule: {
      effectiveFrom: '2026-09-25',
      kind: 'rent',
      amountMinor: 50000,
      currency: 'TWD',
      rate: null,
      coachRate: null,
      venueRate: null,
    },
    salary: {
      effectiveFrom: '2026-09-25',
      enabled: true,
      amountMinor: 3000000,
      currency: 'TWD',
      payDay: 5,
    },
  })
  expect(
    query.mock.calls.some(
      ([sql, values]) =>
        sql.includes('insert into app_private.venue_fee_rule') &&
        values?.includes('rent') &&
        values.includes(50000),
    ),
  ).toBe(true)
  expect(
    query.mock.calls.some(
      ([sql, values]) =>
        sql.includes('insert into app_private.venue_salary_rule') && values?.includes(3000000),
    ),
  ).toBe(true)
  expect(query).toHaveBeenCalledWith('commit')
})

it('creates a prepaid Venue with its first credit purchase', async () => {
  const query = vi.fn(async (_sql: string, _values?: unknown[]) => ({ rows: [] }))
  const repository = new PostgresFinanceRepository({
    connect: vi.fn().mockResolvedValue({ query, release: vi.fn() }),
  } as unknown as Pool)
  await repository.command('own-workspace', 'create', undefined, undefined, {
    name: '預購場地',
    rule: { effectiveFrom: '2026-09-25', kind: 'prepaid' },
    credit: {
      purchasedOn: '2026-09-25',
      lessonCount: 10,
      amountMinor: 100000,
      currency: 'TWD',
      privateNote: '首次預購',
    },
  })
  expect(
    query.mock.calls.some(
      ([sql, values]) =>
        sql.includes('insert into app_private.venue_credit_purchase') &&
        values?.includes(10) &&
        values.includes(100000) &&
        values.includes('首次預購'),
    ),
  ).toBe(true)
})

it.each([false, true])(
  'deletes an unreferenced Venue with active=%s at the expected version',
  async (active) => {
    const query = vi.fn(async (sql: string) => ({
      rows: sql.includes('select id,name,active,version')
        ? [{ id: venueId, name: '舊場地', active, version: 3 }]
        : sql.includes('as used')
          ? [{ used: false }]
          : [],
    }))
    const repository = new PostgresFinanceRepository({
      connect: vi.fn().mockResolvedValue({ query, release: vi.fn() }),
    } as unknown as Pool)
    await expect(
      repository.command('own-workspace', 'delete', venueId, undefined, { version: 3 }),
    ).resolves.toMatchObject({ entity: { id: venueId } })
    expect(query).toHaveBeenCalledWith(
      'delete from app_private.venue where workspace_id=$1 and id=$2',
      ['own-workspace', venueId],
    )
  },
)

it.each([
  {
    active: false,
    used: true,
    message: '此場地已有課程、購課或收支紀錄，無法刪除；可以維持封存。',
  },
])('keeps a referenced Venue', async ({ active, used, message }) => {
  const query = vi.fn(async (sql: string) => ({
    rows: sql.includes('select id,name,active,version')
      ? [{ id: venueId, name: '有紀錄場地', active, version: 2 }]
      : sql.includes('as used')
        ? [{ used }]
        : [],
  }))
  const repository = new PostgresFinanceRepository({
    connect: vi.fn().mockResolvedValue({ query, release: vi.fn() }),
  } as unknown as Pool)
  await expect(
    repository.command('own-workspace', 'delete', venueId, undefined, { version: 2 }),
  ).rejects.toMatchObject({ message })
  expect(query.mock.calls.some(([sql]) => sql.startsWith('delete from app_private.venue'))).toBe(
    false,
  )
})

it('archives a Venue without running duplicate-name validation when its name is unchanged', async () => {
  const query = vi.fn(async (sql: string) => ({
    rows: sql.includes('select id,name,active,version')
      ? [{ id: venueId, name: '比利時', active: true, version: 2 }]
      : sql.startsWith('update app_private.venue')
        ? [{ id: venueId, name: '比利時', active: false, version: 3 }]
        : [],
  }))
  const repository = new PostgresFinanceRepository({
    connect: vi.fn().mockResolvedValue({ query, release: vi.fn() }),
  } as unknown as Pool)
  await expect(
    repository.command('own-workspace', 'edit', venueId, undefined, {
      version: 2,
      name: '比利時',
      active: false,
    }),
  ).resolves.toMatchObject({ entity: { active: false, version: 3 } })
  expect(query.mock.calls.some(([sql]) => sql.includes('id<>$2'))).toBe(false)
})
