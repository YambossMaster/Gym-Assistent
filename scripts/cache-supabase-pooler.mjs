import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function buildPoolerUrl(projectRef, poolerHost) {
  if (!/^[a-z]{20}$/.test(projectRef)) throw new Error('Invalid Supabase project ref')
  if (!/^[a-z0-9.-]+\.pooler\.supabase\.com$/.test(poolerHost))
    throw new Error('Supabase did not return a shared pooler host')

  return `postgresql://postgres.${projectRef}@${poolerHost}:5432/postgres`
}

export function selectPrimaryPoolerHost(configs) {
  if (!Array.isArray(configs)) throw new Error('Supabase returned an invalid pooler response')
  const primary = configs.find((config) => config?.database_type === 'PRIMARY')
  if (!primary) throw new Error('Supabase did not return a primary pooler')
  return primary.db_host
}

export async function cachePooler({
  accessToken,
  projectRef,
  root = process.cwd(),
  fetchImpl = fetch,
}) {
  if (!accessToken) throw new Error('SUPABASE_ACCESS_TOKEN is required')
  if (!projectRef) throw new Error('SUPABASE_PROJECT_ID is required')

  const response = await fetchImpl(
    `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/config/database/pooler`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!response.ok) throw new Error(`Unable to read Supabase database config (${response.status})`)

  const configs = await response.json()
  const poolerUrl = buildPoolerUrl(projectRef, selectPrimaryPoolerHost(configs))
  const tempDirectory = resolve(root, 'supabase', '.temp')
  mkdirSync(tempDirectory, { recursive: true })
  writeFileSync(resolve(tempDirectory, 'pooler-url'), `${poolerUrl}\n`, 'utf8')
  console.log('Cached Supabase IPv4 session-pooler endpoint.')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await cachePooler({
    accessToken: process.env.SUPABASE_ACCESS_TOKEN,
    projectRef: process.env.SUPABASE_PROJECT_ID,
  })
}
