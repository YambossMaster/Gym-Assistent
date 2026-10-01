import { describe, expect, it } from 'vitest'
import { loadConfig } from './config.js'
import { assertProductionBoundary } from './deployment-boundary.js'

const ref = 'abcdefghijklmnopqrst'
const supabaseUrl = `https://${ref}.supabase.co`

function production(databaseUrl: string) {
  return loadConfig({
    NODE_ENV: 'production',
    DEPLOYMENT_TARGET: 'production',
    EXPECTED_SUPABASE_PROJECT_REF: ref,
    SUPABASE_URL: supabaseUrl,
    DATABASE_URL: databaseUrl,
  })
}

describe('production project boundary', () => {
  it('accepts one matching direct database, API and built Web project', () => {
    const config = production(`postgresql://app:password@db.${ref}.supabase.co:5432/postgres`)
    expect(() => assertProductionBoundary(config, supabaseUrl)).not.toThrow()
  })

  it('rejects a Web build or database from another project without exposing credentials', () => {
    const config = production(`postgresql://app:password@db.${ref}.supabase.co:5432/postgres`)
    expect(() => assertProductionBoundary(config, 'https://otherproject.supabase.co')).toThrow(
      'Production Web project mismatch',
    )
    const wrongDatabase = production('postgresql://app:secret@db.otherproject.supabase.co/postgres')
    expect(() => assertProductionBoundary(wrongDatabase, supabaseUrl)).toThrow(
      'Production database project mismatch',
    )
  })

  it('allows local production-mode smoke without a production project', () => {
    const local = loadConfig({
      NODE_ENV: 'production',
      SUPABASE_URL: 'https://development.supabase.co',
      DATABASE_URL: 'postgresql://localhost/gym',
    })
    expect(() => assertProductionBoundary(local, '')).not.toThrow()
  })
})
