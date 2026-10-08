import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { buildPoolerUrl } from './cache-supabase-pooler.mjs'

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
