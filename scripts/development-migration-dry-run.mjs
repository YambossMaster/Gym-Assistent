import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, readFileSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const developmentProject = 'yvhijxhtelujfsaplzpi'
export const developmentHistory = ['20261014100438_billing_checkout_intents.sql']

export function validateDevelopmentHistory(project, payload) {
  if (project !== developmentProject)
    throw new Error('Development-only migration overlay refuses this project')
  if (!Array.isArray(payload?.migrations)) throw new Error('Invalid migration list')
  const allowed = new Set(developmentHistory.map((name) => name.slice(0, 14)))
  const applied = new Set()
  for (const row of payload.migrations) {
    if (typeof row?.local !== 'string' || typeof row?.remote !== 'string')
      throw new Error('Invalid migration row')
    if (row.remote && !/^\d{14}$/.test(row.remote)) throw new Error('Invalid remote version')
    if (row.local && !/^\d{14}$/.test(row.local)) throw new Error('Invalid local version')
    if (row.local && row.remote && row.local !== row.remote)
      throw new Error('Migration history mismatch')
    if (row.remote && applied.has(row.remote)) throw new Error('Duplicate remote migration')
    if (row.remote) applied.add(row.remote)
    if (row.remote && !row.local && !allowed.has(row.remote))
      throw new Error('Unknown remote-only migration')
  }
  for (const version of allowed)
    if (!applied.has(version)) throw new Error('Development overlay must already be applied')
  return developmentHistory
}

export function withDevelopmentHistory(root, files, run) {
  const staged = []
  try {
    for (const file of files) {
      if (!developmentHistory.includes(file)) throw new Error('Unapproved overlay')
      const source = resolve(root, 'supabase/development-only', file)
      const target = resolve(root, 'supabase/migrations', file)
      if (existsSync(target)) throw new Error('Overlay would overwrite a migration')
      copyFileSync(source, target)
      staged.push(target)
    }
    return run()
  } finally {
    for (const target of staged) unlinkSync(target)
  }
}

function main() {
  const root = process.cwd()
  const project = readFileSync(resolve(root, 'supabase/.temp/project-ref'), 'utf8').trim()
  if (project !== developmentProject)
    throw new Error('Link the Development project before this command')
  const cli = resolve(root, 'node_modules/supabase/dist/supabase.js')
  const list = execFileSync(
    process.execPath,
    [cli, 'migration', 'list', '--linked', '--output-format', 'json'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  )
  const files = validateDevelopmentHistory(project, JSON.parse(list))
  withDevelopmentHistory(root, files, () =>
    execFileSync(process.execPath, [cli, 'db', 'push', '--linked', '--dry-run'], {
      stdio: 'inherit',
    }),
  )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
