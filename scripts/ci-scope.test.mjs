import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import {
  hasProductionMigration,
  hasReleaseGateChange,
  isDocsOnly,
  isReleaseCandidate,
  needsBrowser,
} from './ci-scope.mjs'

test('pure Markdown commits can use the documentation gate', () => {
  assert.equal(isDocsOnly(['docs/PROJECT_STATUS.md', 'README.md']), true)
})

test('mixed, code, or empty changes use the full gate', () => {
  assert.equal(isDocsOnly(['docs/PROJECT_STATUS.md', 'apps/web/src/app.tsx']), false)
  assert.equal(isDocsOnly(['.github/workflows/ci.yml']), false)
  assert.equal(isDocsOnly([]), false)
})

test('a migration release cannot target a docs-only or empty commit with no full CI gate', () => {
  assert.equal(isReleaseCandidate(['docs/PROJECT_STATUS.md']), false)
  assert.equal(isReleaseCandidate([]), false)
  assert.equal(isReleaseCandidate(['apps/api/src/start.ts', 'docs/PROJECT_STATUS.md']), true)
})

test('browser job is selected only by Web or shared browser inputs', () => {
  assert.equal(needsBrowser(['apps/api/src/plan/plan.test.ts']), false)
  assert.equal(needsBrowser(['apps/web/src/pages/settings/PlansPage.tsx']), true)
  assert.equal(needsBrowser(['apps/web/e2e/plan-choice.spec.ts']), true)
  assert.equal(needsBrowser(['package-lock.json']), true)
  assert.equal(needsBrowser(['docs/PROJECT_STATUS.md']), false)
  assert.equal(needsBrowser([]), true)
})

test('production migrations are distinct from release-gate changes', () => {
  assert.equal(hasProductionMigration(['supabase/migrations/20261007000000_example.sql']), true)
  assert.equal(hasProductionMigration(['.github/workflows/ci.yml']), false)
  assert.equal(hasProductionMigration(['deploy/fly.production.toml']), false)
  assert.equal(hasProductionMigration(['supabase/config.toml', 'apps/api/src/start.ts']), false)
  assert.equal(hasProductionMigration([]), false)

  assert.equal(hasReleaseGateChange(['.github/workflows/ci.yml']), true)
  assert.equal(hasReleaseGateChange(['.github/workflows/production-migration-release.yml']), true)
  assert.equal(hasReleaseGateChange(['deploy/fly.production.toml']), true)
  assert.equal(hasReleaseGateChange(['deploy/production-runtime-secrets.json']), true)
  assert.equal(hasReleaseGateChange(['scripts/cache-supabase-pooler.mjs']), true)
  assert.equal(hasReleaseGateChange(['scripts/ci-scope.mjs']), true)
  assert.equal(hasReleaseGateChange(['scripts/production-migration-state.mjs']), true)
  assert.equal(hasReleaseGateChange(['scripts/production-runtime-secrets.mjs']), true)
  assert.equal(hasReleaseGateChange(['scripts/require-release-candidate.mjs']), true)
  assert.equal(hasReleaseGateChange(['scripts/require-current-release.mjs']), true)
  assert.equal(hasReleaseGateChange(['apps/api/src/start.ts']), false)
})

test('automatic deployment requires a fresh Production migration state with no pending versions', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')
  const deploy = workflow.slice(workflow.indexOf('  deploy-production:'))

  assert.match(deploy, /production-migration-preview/)
  assert.match(deploy, /needs\.production-migration-preview\.result == 'success'/)
  assert.match(deploy, /needs\.production-migration-preview\.outputs\.pending == 'false'/)
  assert.match(deploy, /needs\.verify\.outputs\.release_candidate == 'true'/)
  assert.match(deploy, /node scripts\/require-current-release\.mjs/)
})

test('automatic deployment validates Fly runtime secret names before deploying', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')
  const deploy = workflow.slice(workflow.indexOf('  deploy-production:'))

  assert.match(deploy, /flyctl secrets list --app formcoachdesk --json/)
  assert.match(deploy, /node scripts\/production-runtime-secrets\.mjs/)
  assert.ok(
    deploy.indexOf('node scripts/production-runtime-secrets.mjs') <
      deploy.indexOf('Deploy exact commit to Fly'),
  )
})

test('readiness failures collect redacted Fly machine state and bounded logs', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')
  const deploy = workflow.slice(workflow.indexOf('  deploy-production:'))

  assert.match(deploy, /bash scripts\/report-fly-readiness-failure\.sh/)
  const diagnostic = readFileSync(
    new URL('./report-fly-readiness-failure.sh', import.meta.url),
    'utf8',
  )
  assert.match(diagnostic, /flyctl status/)
  assert.match(diagnostic, /flyctl checks list/)
  assert.match(diagnostic, /flyctl machine list/)
  assert.match(diagnostic, /flyctl machine status/)
  assert.match(diagnostic, /flyctl logs/)
  assert.match(diagnostic, /--no-tail/)
  assert.match(diagnostic, /redact-fly-diagnostics\.mjs --last 50/)
})

test('tracked Fly service configurations can start a stopped machine on demand', () => {
  for (const path of ['../deploy/fly.production.toml', '../deploy/fly.toml.example']) {
    const config = readFileSync(new URL(path, import.meta.url), 'utf8')
    assert.match(config, /auto_start_machines\s*=\s*true/)
  }
})

test('Production preflight is independent and checks permissions before installing dependencies', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')
  const preview = workflow
    .split('  production-migration-preview:')[1]
    .split('  deploy-production:')[0]

  assert.doesNotMatch(preview, /^    needs:/m)
  assert.match(preview, /Verify Production pooler access before installing dependencies/)
  assert.match(preview, /Install dependencies/)
  assert.ok(
    preview.indexOf('Verify Production pooler access before installing dependencies') <
      preview.indexOf('Install dependencies'),
  )
  assert.match(preview, /npx supabase migration list --linked --output-format json/)
  assert.match(preview, /steps\.scope\.outputs\.release_gate == 'true'/)
})

test('manual migration release rejects a no-op target before accepting its green checks', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/production-migration-release.yml', import.meta.url),
    'utf8',
  )

  assert.match(workflow, /node scripts\/require-release-candidate\.mjs/)
  assert.ok(
    workflow.indexOf('node scripts/require-release-candidate.mjs') <
      workflow.indexOf('Require green CI jobs for exact commit'),
  )
})

test('manual migration release checks Fly runtime secrets before applying migrations', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/production-migration-release.yml', import.meta.url),
    'utf8',
  )

  assert.match(workflow, /flyctl secrets list --app formcoachdesk --json/)
  assert.match(workflow, /node scripts\/production-runtime-secrets\.mjs/)
  assert.ok(
    workflow.indexOf('node scripts/production-runtime-secrets.mjs') <
      workflow.indexOf('Apply production migrations'),
  )
  assert.match(workflow, /bash scripts\/report-fly-readiness-failure\.sh/)
})
