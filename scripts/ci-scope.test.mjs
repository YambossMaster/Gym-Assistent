import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { hasProductionMigration, isDocsOnly, needsBrowser } from './ci-scope.mjs'

test('pure Markdown commits can use the documentation gate', () => {
  assert.equal(isDocsOnly(['docs/PROJECT_STATUS.md', 'README.md']), true)
})

test('mixed, code, or empty changes use the full gate', () => {
  assert.equal(isDocsOnly(['docs/PROJECT_STATUS.md', 'apps/web/src/app.tsx']), false)
  assert.equal(isDocsOnly(['.github/workflows/ci.yml']), false)
  assert.equal(isDocsOnly([]), false)
})

test('browser job is selected only by Web or shared browser inputs', () => {
  assert.equal(needsBrowser(['apps/api/src/plan/plan.test.ts']), false)
  assert.equal(needsBrowser(['apps/web/src/pages/settings/PlansPage.tsx']), true)
  assert.equal(needsBrowser(['apps/web/e2e/plan-choice.spec.ts']), true)
  assert.equal(needsBrowser(['package-lock.json']), true)
  assert.equal(needsBrowser(['docs/PROJECT_STATUS.md']), false)
  assert.equal(needsBrowser([]), true)
})

test('production migration changes are detected without treating other Supabase files as migrations', () => {
  assert.equal(hasProductionMigration(['supabase/migrations/20261007000000_example.sql']), true)
  assert.equal(hasProductionMigration(['supabase/config.toml', 'apps/api/src/start.ts']), false)
  assert.equal(hasProductionMigration([]), false)
})
