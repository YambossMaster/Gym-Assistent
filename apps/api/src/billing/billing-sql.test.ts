import type { Pool } from 'pg'
import { expect, it, vi } from 'vitest'
import {
  billingEnvironment,
  bindBillingSql,
  effectiveBillingEnvironment,
  scopedBillingPool,
} from './billing-sql.js'

it('binds repeated environment predicates as one parameter after existing values', () => {
  expect(
    bindBillingSql(
      'select 1 where environment=@billing_environment and id=$1 and other_environment=@billing_environment',
      ['invoice'],
      'live',
    ),
  ).toEqual({
    sql: 'select 1 where environment=$2 and id=$1 and other_environment=$2',
    values: ['invoice', 'live'],
  })
  expect(() => billingEnvironment('production')).toThrow('invalid_billing_environment')
  const previous = process.env.DEPLOYMENT_TARGET
  try {
    process.env.DEPLOYMENT_TARGET = 'production'
    expect(() => effectiveBillingEnvironment(undefined)).toThrow(
      'billing_environment_required_in_production',
    )
  } finally {
    if (previous === undefined) delete process.env.DEPLOYMENT_TARGET
    else process.env.DEPLOYMENT_TARGET = previous
  }
})

it('binds the same environment on pool and transaction client queries', async () => {
  const query = vi.fn(async () => ({ rows: [] }))
  const clientQuery = vi.fn(async () => ({ rows: [] }))
  const release = vi.fn()
  const raw = {
    query,
    connect: async () => ({ query: clientQuery, release }),
  } as unknown as Pool
  const pool = scopedBillingPool(raw, 'live')
  await pool.query('select 1 where environment=@billing_environment')
  const client = await pool.connect()
  await client.query('select 1 where id=$1 and environment=@billing_environment', ['id'])
  client.release()
  expect(query).toHaveBeenCalledWith('select 1 where environment=$1', ['live'])
  expect(clientQuery).toHaveBeenCalledWith('select 1 where id=$1 and environment=$2', [
    'id',
    'live',
  ])
  expect(release).toHaveBeenCalledOnce()
})
