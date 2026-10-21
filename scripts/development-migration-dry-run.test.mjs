import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import {
  developmentProject,
  developmentHistory,
  fetchedDevelopmentHistory,
  developmentDryRunExclusions,
  validateDevelopmentHistory,
  validateScopedApply,
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
test('excludes only the unapplied Production foundation after Development checkout migration', () => {
  const current = {
    migrations: [
      ...history.migrations,
      { local: '20261017181022', remote: '' },
      { local: '20261019111117', remote: '20261019111117' },
    ],
  }
  assert.deepEqual(developmentDryRunExclusions(current), [
    '20261017181022_billing_live_test_foundation.sql',
  ])
  assert.throws(() =>
    developmentDryRunExclusions({
      migrations: current.migrations.filter((row) => row.remote !== '20261019111117'),
    }),
  )
  assert.throws(() =>
    developmentDryRunExclusions({
      migrations: current.migrations.map((row) =>
        row.local === '20261017181022' ? { ...row, remote: row.local } : row,
      ),
    }),
  )
})
test('scoped Development apply refuses any second pending migration', () => {
  const current = {
    migrations: [
      ...history.migrations,
      { local: '20261017181022', remote: '' },
      { local: '20261021025133', remote: '' },
    ],
  }
  assert.doesNotThrow(() => validateScopedApply(current, '20261021025133'))
  assert.throws(() => validateScopedApply(current, '20261021025134'))
  assert.throws(() =>
    validateScopedApply(
      { migrations: [...current.migrations, { local: '20261021030000', remote: '' }] },
      '20261021025133',
    ),
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
    const foundation = join(
      root,
      'supabase/migrations/20261017181022_billing_live_test_foundation.sql',
    )
    writeFileSync(foundation, '-- formal foundation')
    for (const file of fetchedDevelopmentHistory)
      writeFileSync(join(fetchedRoot, 'supabase/migrations', file), '-- remote history')
    const files = [...developmentHistory, ...fetchedDevelopmentHistory]
    const target = join(root, 'supabase/migrations', developmentHistory[0])
    assert.throws(() =>
      withDevelopmentHistory(
        root,
        files,
        fetchedRoot,
        () => {
          for (const file of files) assert.ok(existsSync(join(root, 'supabase/migrations', file)))
          assert.equal(existsSync(foundation), false)
          throw new Error('dry-run failed')
        },
        ['20261017181022_billing_live_test_foundation.sql'],
      ),
    )
    assert.equal(readFileSync(foundation, 'utf8'), '-- formal foundation')
    for (const file of files)
      assert.equal(existsSync(join(root, 'supabase/migrations', file)), false)
    writeFileSync(target, '-- canonical')
    assert.throws(() =>
      withDevelopmentHistory(root, files, fetchedRoot, () => assert.fail('must not execute')),
    )
    assert.ok(existsSync(target))
    assert.throws(() =>
      withDevelopmentHistory(root, files, fetchedRoot, () => assert.fail('must not execute'), [
        '20261019111117_billing_abandoned_checkout.sql',
      ]),
    )
  } finally {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()))
    assert.ok(basename(root).startsWith('billing-migration-test-'))
    assert.equal(dirname(resolve(fetchedRoot)), resolve(tmpdir()))
    assert.ok(basename(fetchedRoot).startsWith('billing-migration-fetched-test-'))
    rmSync(root, { recursive: true, force: true })
    rmSync(fetchedRoot, { recursive: true, force: true })
  }
})
