import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
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
  '20261017164829_billing_refund_case_decision.sql',
]
const expectedHistory = [...developmentHistory, ...fetchedDevelopmentHistory]
const productionFoundation = '20261017181022_billing_live_test_foundation.sql'
const abandonedCheckout = '20261019111117_billing_abandoned_checkout.sql'

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

export function developmentDryRunExclusions(payload) {
  const foundation = payload.migrations.find(
    (row) => row.local === productionFoundation.slice(0, 14),
  )
  const checkout = payload.migrations.find((row) => row.remote === abandonedCheckout.slice(0, 14))
  if (!foundation || foundation.remote || !checkout || checkout.local !== checkout.remote)
    throw new Error('Unexpected Development billing migration state')
  return [productionFoundation]
}

export function withDevelopmentHistory(root, files, fetchedRoot, run, excluded = []) {
  const staged = []
  const hidden = []
  try {
    for (const file of excluded) {
      if (file !== productionFoundation) throw new Error('Unapproved Development exclusion')
      const source = resolve(root, 'supabase/migrations', file)
      const target = `${source}.development-dry-run-hidden`
      if (!existsSync(source) || existsSync(target)) throw new Error('Cannot hide migration safely')
      renameSync(source, target)
      hidden.push({ source, target })
    }
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
    for (const { source, target } of hidden) renameSync(target, source)
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
  const history = JSON.parse(list)
  const files = validateDevelopmentHistory(project, history)
  const excluded = developmentDryRunExclusions(history)
  const scratch = mkdtempSync(join(tmpdir(), 'm8d-dev-history-'))
  try {
    mkdirSync(resolve(scratch, 'supabase/migrations'), { recursive: true })
    copyFileSync(resolve(root, 'supabase/config.toml'), resolve(scratch, 'supabase/config.toml'))
    execFileSync(
      process.execPath,
      [cli, 'migration', 'fetch', '--project-ref', project, '--workdir', scratch, '--yes'],
      { stdio: ['ignore', 'pipe', 'inherit'] },
    )
    withDevelopmentHistory(
      root,
      files,
      scratch,
      () =>
        execFileSync(process.execPath, [cli, 'db', 'push', '--linked', '--dry-run'], {
          stdio: 'inherit',
        }),
      excluded,
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
