import type { Pool, PoolClient } from 'pg'

export type BillingEnvironment = 'test' | 'live'

export function billingEnvironment(value: string): BillingEnvironment {
  if (value !== 'test' && value !== 'live') throw new Error('invalid_billing_environment')
  return value
}

export function effectiveBillingEnvironment(
  value: BillingEnvironment | undefined,
): BillingEnvironment {
  if (value === undefined) {
    if (process.env.DEPLOYMENT_TARGET === 'production')
      throw new Error('billing_environment_required_in_production')
    return 'test'
  }
  return billingEnvironment(value)
}

const marker = '@billing_environment'

/** Bind every billing environment predicate as a query parameter, including repeated predicates. */
export function bindBillingSql(
  sql: string,
  values: readonly unknown[] | undefined,
  environment: BillingEnvironment,
): { sql: string; values: unknown[] } {
  const params = [...(values ?? [])]
  if (!sql.includes(marker)) return { sql, values: params }
  const positions = [...sql.matchAll(/\$(\d+)/g)].map((match) => Number(match[1]))
  const next = Math.max(0, ...positions, params.length) + 1
  return { sql: sql.replaceAll(marker, `$${next}`), values: [...params, environment] }
}

function scopedClient(client: PoolClient, environment: BillingEnvironment): PoolClient {
  return new Proxy(client, {
    get(target, property) {
      if (property === 'query')
        return (sql: string, values?: unknown[]) => {
          const bound = bindBillingSql(sql, values, environment)
          return target.query(bound.sql, bound.values)
        }
      const value: unknown = Reflect.get(target, property, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

/** Repository boundary: no connection can silently fall back to another billing environment. */
export function scopedBillingPool(pool: Pool, environment: BillingEnvironment): Pool {
  billingEnvironment(environment)
  return new Proxy(pool, {
    get(target, property) {
      if (property === 'query')
        return (sql: string, values?: unknown[]) => {
          const bound = bindBillingSql(sql, values, environment)
          return target.query(bound.sql, bound.values)
        }
      if (property === 'connect')
        return async () => scopedClient(await target.connect(), environment)
      const value: unknown = Reflect.get(target, property, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}
