import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  developmentProject,
  developmentHistory,
  validateDevelopmentHistory,
  withDevelopmentHistory,
} from './development-migration-dry-run.mjs'
const history = {
  migrations: [
    { local: '20261014034039', remote: '20261014034039' },
    { local: '', remote: '20261014100438' },
  ],
}
test('accepts only the already-applied known Development history, never Production or unknown drift', () => {
  assert.deepEqual(validateDevelopmentHistory(developmentProject, history), developmentHistory)
  assert.throws(() => validateDevelopmentHistory('febunjhpruqlywjfvuaq', history))
  assert.throws(() => validateDevelopmentHistory(developmentProject, { migrations: [] }))
  assert.throws(() =>
    validateDevelopmentHistory(developmentProject, {
      migrations: [...history.migrations, { local: '', remote: '20261014103416' }],
    }),
  )
  assert.throws(() =>
    validateDevelopmentHistory(developmentProject, {
      migrations: [...history.migrations, history.migrations[1]],
    }),
  )
})
test('stages an exact copy only during dry-run and cleans it on failure without touching other migrations', () => {
  const root = mkdtempSync(join(tmpdir(), 'billing-migration-test-'))
  try {
    mkdirSync(join(root, 'supabase/development-only'), { recursive: true })
    mkdirSync(join(root, 'supabase/migrations'), { recursive: true })
    writeFileSync(join(root, 'supabase/development-only', developmentHistory[0]), '-- preserved')
    const target = join(root, 'supabase/migrations', developmentHistory[0])
    assert.throws(() =>
      withDevelopmentHistory(root, developmentHistory, () => {
        assert.ok(existsSync(target))
        throw new Error('dry-run failed')
      }),
    )
    assert.equal(existsSync(target), false)
    writeFileSync(target, '-- canonical')
    assert.throws(() =>
      withDevelopmentHistory(root, developmentHistory, () => assert.fail('must not execute')),
    )
    assert.ok(existsSync(target))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
