import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { isDocsOnly } from './ci-scope.mjs'

test('pure Markdown commits can use the documentation gate', () => {
  assert.equal(isDocsOnly(['docs/PROJECT_STATUS.md', 'README.md']), true)
})

test('mixed, code, or empty changes use the full gate', () => {
  assert.equal(isDocsOnly(['docs/PROJECT_STATUS.md', 'apps/web/src/app.tsx']), false)
  assert.equal(isDocsOnly(['.github/workflows/ci.yml']), false)
  assert.equal(isDocsOnly([]), false)
})
