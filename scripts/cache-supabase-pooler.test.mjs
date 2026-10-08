import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { buildPoolerUrl, cachePooler, selectPrimaryPoolerHost } from './cache-supabase-pooler.mjs'

test('builds the password-free IPv4 session-pooler URL expected by the Supabase CLI', () => {
  assert.equal(
    buildPoolerUrl('abcdefghijklmnopqrst', 'aws-0-ap-northeast-1.pooler.supabase.com'),
    'postgresql://postgres.abcdefghijklmnopqrst@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
  )
})

test('rejects unexpected project refs and hosts', () => {
  assert.throws(() => buildPoolerUrl('not-a-project-ref', 'aws-0.example.com'))
  assert.throws(() => buildPoolerUrl('abcdefghijklmnopqrst', 'db.example.com'))
})

test('selects the primary pooler from the Management API response', () => {
  assert.equal(
    selectPrimaryPoolerHost([
      { database_type: 'READ_REPLICA', db_host: 'replica.pooler.supabase.com' },
      { database_type: 'PRIMARY', db_host: 'primary.pooler.supabase.com' },
    ]),
    'primary.pooler.supabase.com',
  )
  assert.throws(() => selectPrimaryPoolerHost([]))
})

test('preflight calls the pooler endpoint and reports missing PAT permission before installation', async () => {
  const ref = 'abcdefghijklmnopqrst'
  await assert.rejects(
    cachePooler({
      accessToken: 'test-token',
      projectRef: ref,
      fetchImpl: async (url) => {
        assert.equal(url, `https://api.supabase.com/v1/projects/${ref}/config/database/pooler`)
        return { ok: false, status: 403 }
      },
    }),
    /database config \(403\)/,
  )
})
