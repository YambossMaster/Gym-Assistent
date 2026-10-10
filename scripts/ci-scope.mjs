import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const isDocsOnly = (paths) => paths.length > 0 && paths.every((file) => file.endsWith('.md'))

export const isReleaseCandidate = (paths) => paths.length > 0 && !isDocsOnly(paths)

export const needsBrowser = (paths) =>
  paths.length === 0 ||
  paths.some(
    (file) =>
      file.startsWith('apps/web/') ||
      file === 'package.json' ||
      file === 'package-lock.json' ||
      file === 'playwright.config.ts' ||
      file === '.github/workflows/ci.yml' ||
      file === 'scripts/ci-scope.mjs',
  )

export const hasProductionMigration = (paths) =>
  paths.some((file) => file.startsWith('supabase/migrations/'))

export const hasReleaseGateChange = (paths) =>
  paths.some(
    (file) =>
      file === '.github/workflows/ci.yml' ||
      file === '.github/workflows/production-migration-release.yml' ||
      file === 'deploy/fly.production.toml' ||
      file === 'deploy/production-runtime-secrets.json' ||
      file === 'scripts/cache-supabase-pooler.mjs' ||
      file === 'scripts/ci-scope.mjs' ||
      file === 'scripts/production-migration-state.mjs' ||
      file === 'scripts/production-runtime-secrets.mjs' ||
      file === 'scripts/redact-fly-diagnostics.mjs' ||
      file === 'scripts/report-fly-readiness-failure.sh' ||
      file === 'scripts/require-release-candidate.mjs' ||
      file === 'scripts/require-current-release.mjs',
  )

export function changedPaths(base, head) {
  const output = execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', base, head])
  return output.toString('utf8').split('\0').filter(Boolean)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { BASE_SHA, HEAD_SHA, EVENT_NAME, GITHUB_OUTPUT } = process.env
  let docsOnly = false
  let browserNeeded = true
  let productionMigration = false
  let releaseGate = true
  let releaseCandidate = false
  if (EVENT_NAME !== 'workflow_dispatch' && BASE_SHA && HEAD_SHA && !/^0+$/.test(BASE_SHA)) {
    try {
      const paths = changedPaths(BASE_SHA, HEAD_SHA)
      docsOnly = isDocsOnly(paths)
      browserNeeded = needsBrowser(paths)
      productionMigration = hasProductionMigration(paths)
      releaseGate = hasReleaseGateChange(paths)
      releaseCandidate = isReleaseCandidate(paths)
    } catch {
      // Unknown history must run the full gate.
      productionMigration = true
    }
  }
  if (GITHUB_OUTPUT)
    appendFileSync(
      GITHUB_OUTPUT,
      `docs_only=${docsOnly}\nbrowser_needed=${browserNeeded}\nproduction_migration=${productionMigration}\nrelease_gate=${releaseGate}\nrelease_candidate=${releaseCandidate}\n`,
    )
  console.log(
    `Verification scope: ${docsOnly ? 'docs format only' : 'full'}; browser ${browserNeeded ? 'needed' : 'not needed'}; production migration ${productionMigration ? 'changed' : 'unchanged'}; release gate ${releaseGate ? 'changed' : 'unchanged'}; release candidate ${releaseCandidate ? 'yes' : 'no'}`,
  )
}
