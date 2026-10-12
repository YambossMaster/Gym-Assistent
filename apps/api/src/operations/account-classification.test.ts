import { describe, expect, it, vi } from 'vitest'
import type { Pool } from 'pg'
import { setAccountClassification, validateClassification } from './account-classification.js'

const userId = '00000000-0000-4000-8000-000000000001'
const input = {
  userId,
  accountClass: 'test' as const,
  testKind: 'owner' as const,
  actor: 'product-owner',
  reason: 'Owner account is for internal product checks',
}

describe('reporting classification', () => {
  it('requires a coherent class and kind before touching the database', () => {
    expect(() => validateClassification({ ...input, accountClass: 'real' })).toThrow(/Test kind/)
    expect(() => validateClassification({ ...input, testKind: null })).toThrow(/Test kind/)
    expect(() => validateClassification({ ...input, userId: 'not-a-uuid' })).toThrow(/UUID/)
  })

  it('writes the label and audit event in one transaction', async () => {
    const queries: string[] = []
    const query = vi.fn(async (sql: string) => {
      queries.push(sql)
      return { rows: [] }
    })
    const release = vi.fn()
    const pool = { connect: async () => ({ query, release }) } as unknown as Pool

    expect(await setAccountClassification(pool, input)).toBe(true)
    expect(queries.some((sql) => sql.includes('account_reporting_classification_event'))).toBe(true)
    expect(queries.at(-1)).toBe('commit')
    expect(release).toHaveBeenCalledOnce()
  })

  it('leaves no new audit event for an unchanged label', async () => {
    const queries: string[] = []
    const query = vi.fn(async (sql: string) => {
      queries.push(sql)
      return sql.includes('for update')
        ? { rows: [{ account_class: 'test', test_kind: 'owner' }] }
        : { rows: [] }
    })
    const pool = { connect: async () => ({ query, release: vi.fn() }) } as unknown as Pool

    expect(await setAccountClassification(pool, input)).toBe(false)
    expect(queries.some((sql) => sql.includes('account_reporting_classification_event'))).toBe(
      false,
    )
  })

  it('rolls back the label when the audit insert fails', async () => {
    const queries: string[] = []
    const query = vi.fn(async (sql: string) => {
      queries.push(sql)
      if (sql.includes('account_reporting_classification_event'))
        throw new Error('audit unavailable')
      return { rows: [] }
    })
    const pool = { connect: async () => ({ query, release: vi.fn() }) } as unknown as Pool

    await expect(setAccountClassification(pool, input)).rejects.toThrow('audit unavailable')
    expect(queries.at(-1)).toBe('rollback')
  })
})
