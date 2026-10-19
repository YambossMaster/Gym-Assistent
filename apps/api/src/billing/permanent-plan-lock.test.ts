import type { Pool } from 'pg'
import { describe, expect, it, vi } from 'vitest'
import { PostgresPaidChange } from './postgres-paid-change.js'
import { PostgresTrialChange } from './postgres-trial-change.js'

const identity = { userId: 'owner', email: 'owner@example.invalid' }
const selection = { tier: 'advanced' as const, interval: 'year' as const }

function poolFor(permanent: boolean, owner = true) {
  const query = vi.fn(async (sql: string, values?: unknown[]) => {
    if (sql.includes('from app_private.workspace'))
      return { rows: owner ? [{ id: 'workspace' }] : [], rowCount: owner ? 1 : 0 }
    if (sql.includes('from app_private.beta_grant')) {
      expect(values).toEqual(['workspace'])
      return { rows: permanent ? [{ '?column?': 1 }] : [], rowCount: permanent ? 1 : 0 }
    }
    return { rows: [], rowCount: 0 }
  })
  const client = { query, release: vi.fn() }
  return { pool: { connect: vi.fn(async () => client) } as unknown as Pool, query }
}

describe('permanent Prime plan lock', () => {
  it('rejects trial and paid changes before any provider command is prepared', async () => {
    const trial = poolFor(true)
    await expect(
      new PostgresTrialChange(trial.pool, {}).preview(identity, selection),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'permanent_access',
    })
    expect(trial.query).toHaveBeenCalledWith('rollback', [])

    const paid = poolFor(true)
    const repository = new PostgresPaidChange(paid.pool, {})
    await expect(repository.preview(identity, selection)).rejects.toMatchObject({
      statusCode: 409,
      code: 'permanent_access',
    })
    await expect(
      repository.claim(identity, '00000000-0000-4000-8000-000000000001'),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'permanent_access',
    })
    expect(paid.query.mock.calls.some(([sql]) => String(sql).includes('billing_paid_change'))).toBe(
      false,
    )
  })

  it('does not disclose another owner workspace or reach its grant', async () => {
    const other = poolFor(true, false)
    await expect(
      new PostgresPaidChange(other.pool, {}).preview(identity, selection),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'workspace_not_found',
    })
    expect(other.query.mock.calls.some(([sql]) => String(sql).includes('beta_grant'))).toBe(false)
  })
})
