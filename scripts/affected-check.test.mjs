import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import {
  broadenForMissing,
  eligibleForPrettier,
  eligibleUntracked,
  scopeFor,
  vitestArguments,
} from './affected-check.mjs'

test('isolates code changes to the owning workspace', () => {
  assert.deepEqual(scopeFor(['apps/web/src/pages/SettingsPage.tsx', 'docs/PROJECT_STATUS.md']), {
    api: [],
    web: ['apps/web/src/pages/SettingsPage.tsx'],
    apiTouched: false,
    webTouched: true,
    browserTouched: false,
    fullApi: false,
    fullWeb: false,
    docsOnly: false,
  })
})

test('shared inputs and migrations fail open to complete suites', () => {
  const scope = scopeFor(['package-lock.json', 'supabase/migrations/new.sql'])
  assert.equal(scope.fullApi, true)
  assert.equal(scope.fullWeb, true)
})

test('documentation-only changes do not select application tests', () => {
  assert.equal(scopeFor(['README.md', 'docs/PROJECT_STATUS.md']).docsOnly, true)
})

test('styles retain Web typecheck but do not invent related test coverage', () => {
  const scope = scopeFor(['apps/web/src/styles.css'])
  assert.equal(scope.webTouched, true)
  assert.deepEqual(scope.web, [])
  assert.equal(scope.fullWeb, false)
})

test('unknown runtime input falls back to full suites', () => {
  const scope = scopeFor(['public/some-config.json'])
  assert.equal(scope.fullApi, true)
  assert.equal(scope.fullWeb, true)
})

test('Playwright specs do not enter the Vitest related-test graph', () => {
  const scope = scopeFor(['apps/web/e2e/plan-choice.spec.ts', 'playwright.config.ts'])
  assert.equal(scope.browserTouched, true)
  assert.deepEqual(scope.web, [])
  assert.equal(scope.fullWeb, false)
})

test('untracked code is checked while untracked Markdown drafts wait for staging', () => {
  assert.deepEqual(
    eligibleUntracked(['docs/M8-C-CONTRACT.md', 'apps/web/e2e/plan-choice.spec.ts']),
    ['apps/web/e2e/plan-choice.spec.ts'],
  )
})

test('deletion expands its workspace and full runs do not retain related-file filters', () => {
  const scope = broadenForMissing(scopeFor(['apps/api/src/removed.ts']), [
    'apps/api/src/removed.ts',
  ])
  assert.equal(scope.fullApi, true)
  assert.equal(scope.fullWeb, false)
  assert.deepEqual(vitestArguments('api', scope.api, true), ['run', '--run', '--maxWorkers=1'])
  assert.deepEqual(vitestArguments('web', ['apps/web/src/page.tsx'], true), [
    'run',
    '--run',
    '--maxWorkers=1',
    'src',
  ])
})

test('format check selects supported text, not SQL or binary assets', () => {
  assert.deepEqual(
    eligibleForPrettier([
      '.gitignore',
      'supabase/migrations/new.sql',
      'apps/web/src/a.tsx',
      'README.md',
      'apps/web/public/logo.png',
    ]),
    ['apps/web/src/a.tsx', 'README.md'],
  )
})
