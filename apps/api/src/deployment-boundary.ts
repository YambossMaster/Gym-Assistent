import type { AppConfig } from './config.js'

export function assertProductionBoundary(config: AppConfig, builtSupabaseUrl: string) {
  if (config.DEPLOYMENT_TARGET !== 'production') return
  if (config.NODE_ENV !== 'production') throw new Error('Production requires NODE_ENV=production')
  const ref = config.EXPECTED_SUPABASE_PROJECT_REF
  if (!ref) throw new Error('Production project reference is missing')
  const expectedUrl = `https://${ref}.supabase.co`
  if (config.SUPABASE_URL.replace(/\/$/, '') !== expectedUrl) {
    throw new Error('Production API project mismatch')
  }
  if (builtSupabaseUrl.replace(/\/$/, '') !== expectedUrl) {
    throw new Error('Production Web project mismatch')
  }
  let database: URL
  try {
    database = new URL(config.DATABASE_URL)
  } catch {
    throw new Error('Production database URL is invalid')
  }
  const directHost = database.hostname === `db.${ref}.supabase.co`
  const sessionPoolerUser =
    database.hostname.endsWith('.pooler.supabase.com') &&
    decodeURIComponent(database.username).endsWith(`.${ref}`)
  if (!directHost && !sessionPoolerUser) {
    throw new Error('Production database project mismatch')
  }
}
