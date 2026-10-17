import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const developmentProject = 'yvhijxhtelujfsaplzpi'
export const developmentHistory = ['20261014100438_billing_checkout_intents.sql']
export const fetchedDevelopmentHistory = [
  '20261015045150_billing_event_ledger.sql',
  '20261015045333_billing_ledger_role_grants.sql',
  '20261015063738_billing_initial_period_authority.sql',
  '20261015093501_billing_trial_change.sql',
  '20261016163000_billing_renewal_periods.sql',
  '20261017074143_billing_paid_upgrade_evidence.sql',
  '20261017082340_billing_paid_annual_switch.sql',
  '20261017085708_billing_paid_change_command.sql',
]
const expectedHistory = [...developmentHistory, ...fetchedDevelopmentHistory]

export function validateDevelopmentHistory(project, payload) {
  if (project !== developmentProject)
    throw new Error('Development-only migration overlay refuses this project')
  if (!Array.isArray(payload?.migrations)) throw new Error('Invalid migration list')
  const allowed = new Set(expectedHistory.map((name) => name.slice(0, 14)))
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
  return expectedHistory
}

export function withDevelopmentHistory(root, files, fetchedRoot, run) {
  const staged = []
  try {
    for (const file of files) {
      if (!expectedHistory.includes(file)) throw new Error('Unapproved overlay')
      const source = developmentHistory.includes(file)
        ? resolve(root, 'supabase/development-only', file)
        : resolve(fetchedRoot, 'supabase/migrations', file)
      const target = resolve(root, 'supabase/migrations', file)
      if (existsSync(target)) throw new Error('Overlay would overwrite a migration')
      if (!existsSync(source))
        throw new Error('Approved Development migration missing from history')
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
  const scratch = mkdtempSync(join(tmpdir(), 'm8d-dev-history-'))
  try {
    mkdirSync(resolve(scratch, 'supabase/migrations'), { recursive: true })
    copyFileSync(resolve(root, 'supabase/config.toml'), resolve(scratch, 'supabase/config.toml'))
    execFileSync(
      process.execPath,
      [cli, 'migration', 'fetch', '--project-ref', project, '--workdir', scratch, '--yes'],
      { stdio: ['ignore', 'pipe', 'inherit'] },
    )
    withDevelopmentHistory(root, files, scratch, () =>
      execFileSync(process.execPath, [cli, 'db', 'push', '--linked', '--dry-run'], {
        stdio: 'inherit',
      }),
    )
  } finally {
    if (
      dirname(resolve(scratch)) !== resolve(tmpdir()) ||
      !basename(scratch).startsWith('m8d-dev-history-')
    )
      throw new Error('Unsafe migration scratch path')
    rmSync(scratch, { recursive: true, force: true })
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
