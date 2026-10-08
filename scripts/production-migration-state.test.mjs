import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { classifyMigrationList } from './production-migration-state.mjs'

test('holds deployment when an older migration is still pending despite an app-only commit', () => {
  const state = classifyMigrationList({
    migrations: [
      { local: '20261005071050', remote: '20261005071050' },
      { local: '20261006145359', remote: '' },
    ],
  })

  assert.deepEqual(state.pendingVersions, ['20261006145359'])
  assert.equal(state.pending, true)
})

test('allows the state gate only when local and Production migration histories match', () => {
  const state = classifyMigrationList({
    migrations: [{ local: '20261005071050', remote: '20261005071050' }],
  })

  assert.deepEqual(state.pendingVersions, [])
  assert.equal(state.pending, false)
})

test('fails closed on remote-only migrations or malformed CLI output', () => {
  assert.throws(() =>
    classifyMigrationList({ migrations: [{ local: '', remote: '20261005071050' }] }),
  )
  assert.throws(() =>
    classifyMigrationList({ migrations: [{ local: '20261005071050', remote: '20261006145359' }] }),
  )
  assert.throws(() => classifyMigrationList({ migrations: [] }))
  assert.throws(() => classifyMigrationList({ message: 'Migrations listed' }))
})
