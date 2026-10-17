import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import {
  developmentProject,
  developmentHistory,
  fetchedDevelopmentHistory,
  validateDevelopmentHistory,
  withDevelopmentHistory,
} from './development-migration-dry-run.mjs'
const history = {
  migrations: [
    { local: '20261014034039', remote: '20261014034039' },
    { local: '', remote: '20261014100438' },
    ...fetchedDevelopmentHistory.map((name) => ({ local: '', remote: name.slice(0, 14) })),
  ],
}
test('accepts only the already-applied known Development history, never Production or unknown drift', () => {
  assert.deepEqual(validateDevelopmentHistory(developmentProject, history), [
    ...developmentHistory,
    ...fetchedDevelopmentHistory,
  ])
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
  const fetchedRoot = mkdtempSync(join(tmpdir(), 'billing-migration-fetched-test-'))
  try {
    mkdirSync(join(root, 'supabase/development-only'), { recursive: true })
    mkdirSync(join(root, 'supabase/migrations'), { recursive: true })
    mkdirSync(join(fetchedRoot, 'supabase/migrations'), { recursive: true })
    writeFileSync(join(root, 'supabase/development-only', developmentHistory[0]), '-- preserved')
    for (const file of fetchedDevelopmentHistory)
      writeFileSync(join(fetchedRoot, 'supabase/migrations', file), '-- remote history')
    const files = [...developmentHistory, ...fetchedDevelopmentHistory]
    const target = join(root, 'supabase/migrations', developmentHistory[0])
    assert.throws(() =>
      withDevelopmentHistory(root, files, fetchedRoot, () => {
        for (const file of files) assert.ok(existsSync(join(root, 'supabase/migrations', file)))
        throw new Error('dry-run failed')
      }),
    )
    for (const file of files)
      assert.equal(existsSync(join(root, 'supabase/migrations', file)), false)
    writeFileSync(target, '-- canonical')
    assert.throws(() =>
      withDevelopmentHistory(root, files, fetchedRoot, () => assert.fail('must not execute')),
    )
    assert.ok(existsSync(target))
  } finally {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()))
    assert.ok(basename(root).startsWith('billing-migration-test-'))
    assert.equal(dirname(resolve(fetchedRoot)), resolve(tmpdir()))
    assert.ok(basename(fetchedRoot).startsWith('billing-migration-fetched-test-'))
    rmSync(root, { recursive: true, force: true })
    rmSync(fetchedRoot, { recursive: true, force: true })
  }
})
