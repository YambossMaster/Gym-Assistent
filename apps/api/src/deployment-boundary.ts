import type { AppConfig } from './config.js'

export function alphaAllowedCoachIds(value: string | undefined): ReadonlySet<string> {
  const ids = value?.split(',').map((id) => id.trim()) ?? []
  if (
    ids.length === 0 ||
    ids.some(
      (id) =>
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
    )
  ) {
    throw new Error('Production Alpha Coach allowlist is missing or invalid')
  }
  return new Set(ids.map((id) => id.toLowerCase()))
}

export function assertProductionBoundary(
  config: AppConfig,
  builtSupabaseUrl: string,
  builtInternalAlpha: boolean,
) {
  if (config.DEPLOYMENT_TARGET !== 'production') return
  if (config.NODE_ENV !== 'production') throw new Error('Production requires NODE_ENV=production')
  alphaAllowedCoachIds(config.ALPHA_ALLOWED_COACH_IDS)
  if (!builtInternalAlpha) throw new Error('Production Web Alpha mode is missing')
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
