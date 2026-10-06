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
    ALPHA_ALLOWED_COACH_IDS: '00000000-0000-4000-8000-000000000001',
    SUPABASE_URL: supabaseUrl,
    DATABASE_URL: databaseUrl,
  })
}

describe('production project boundary', () => {
  it('accepts one matching direct database, API and built Web project', () => {
    const config = production(`postgresql://app:password@db.${ref}.supabase.co:5432/postgres`)
    expect(() => assertProductionBoundary(config, supabaseUrl, true)).not.toThrow()
  })

  it('rejects a Web build or database from another project without exposing credentials', () => {
    const config = production(`postgresql://app:password@db.${ref}.supabase.co:5432/postgres`)
    expect(() =>
      assertProductionBoundary(config, 'https://otherproject.supabase.co', true),
    ).toThrow('Production Web project mismatch')
    const wrongDatabase = production('postgresql://app:secret@db.otherproject.supabase.co/postgres')
    expect(() => assertProductionBoundary(wrongDatabase, supabaseUrl, true)).toThrow(
      'Production database project mismatch',
    )
  })

  it('allows local production-mode smoke without a production project', () => {
    const local = loadConfig({
      NODE_ENV: 'production',
      SUPABASE_URL: 'https://development.supabase.co',
      DATABASE_URL: 'postgresql://localhost/gym',
    })
    expect(() => assertProductionBoundary(local, '', false)).not.toThrow()
  })

  it('fails closed when the production Alpha allowlist is absent or malformed', () => {
    const databaseUrl = `postgresql://app:password@db.${ref}.supabase.co:5432/postgres`
    const config = production(databaseUrl)
    expect(() =>
      assertProductionBoundary(
        { ...config, ALPHA_ALLOWED_COACH_IDS: undefined },
        supabaseUrl,
        true,
      ),
    ).toThrow('Production Alpha Coach allowlist is missing or invalid')
    expect(() =>
      assertProductionBoundary(
        { ...config, ALPHA_ALLOWED_COACH_IDS: 'not-a-user-id' },
        supabaseUrl,
        true,
      ),
    ).toThrow('Production Alpha Coach allowlist is missing or invalid')
  })

  it('rejects a production Web build that still exposes self-registration', () => {
    const config = production(`postgresql://app:password@db.${ref}.supabase.co:5432/postgres`)
    expect(() => assertProductionBoundary(config, supabaseUrl, false)).toThrow(
      'Production Web Alpha mode is missing',
    )
  })
})
