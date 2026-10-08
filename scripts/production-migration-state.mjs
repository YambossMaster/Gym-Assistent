import { appendFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const migrationVersion = /^\d{14}$/

export function classifyMigrationList(payload) {
  if (!Array.isArray(payload?.migrations) || payload.migrations.length === 0)
    throw new Error('Supabase returned no migration history to compare')

  const pendingVersions = []
  const seen = new Set()
  for (const row of payload.migrations) {
    const local = row?.local
    const remote = row?.remote
    if (typeof local !== 'string' || typeof remote !== 'string')
      throw new Error('Supabase returned an invalid migration row')
    if ((local && !migrationVersion.test(local)) || (remote && !migrationVersion.test(remote)))
      throw new Error('Supabase returned an invalid migration version')
    if (!local || (remote && local !== remote))
      throw new Error('Production migration history differs from the repository')
    if (seen.has(local)) throw new Error('Supabase returned a duplicate migration version')
    seen.add(local)
    if (!remote) pendingVersions.push(local)
  }

  return { pending: pendingVersions.length > 0, pendingVersions }
}

async function main() {
  let input = ''
  for await (const chunk of process.stdin) input += chunk
  const state = classifyMigrationList(JSON.parse(input))
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, `pending=${state.pending}\n`, 'utf8')
  console.log(
    state.pending
      ? `Linked database has pending migrations: ${state.pendingVersions.join(', ')}`
      : 'Linked database migration history matches this commit.',
  )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
