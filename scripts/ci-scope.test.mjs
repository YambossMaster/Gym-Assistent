import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import {
  hasProductionMigration,
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

test('production migration and release-gate changes require a production preview', () => {
  assert.equal(hasProductionMigration(['supabase/migrations/20261007000000_example.sql']), true)
  assert.equal(hasProductionMigration(['.github/workflows/ci.yml']), true)
  assert.equal(hasProductionMigration(['.github/workflows/production-migration-release.yml']), true)
  assert.equal(hasProductionMigration(['scripts/cache-supabase-pooler.mjs']), true)
  assert.equal(hasProductionMigration(['scripts/ci-scope.mjs']), true)
  assert.equal(hasProductionMigration(['scripts/production-migration-state.mjs']), true)
  assert.equal(hasProductionMigration(['scripts/require-release-candidate.mjs']), true)
  assert.equal(hasProductionMigration(['scripts/require-current-release.mjs']), true)
  assert.equal(hasProductionMigration(['supabase/config.toml', 'apps/api/src/start.ts']), false)
  assert.equal(hasProductionMigration([]), false)
})

test('automatic deployment requires a fresh Production migration state with no pending versions', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')
  const deploy = workflow.slice(workflow.indexOf('  deploy-production:'))

  assert.match(deploy, /production-migration-preview/)
  assert.match(deploy, /needs\.production-migration-preview\.result == 'success'/)
  assert.match(deploy, /needs\.production-migration-preview\.outputs\.pending == 'false'/)
  assert.match(deploy, /node scripts\/require-current-release\.mjs/)
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
