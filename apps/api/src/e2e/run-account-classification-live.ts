import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { Pool } from 'pg'
import {
  clearTestAccountIntent,
  createTestAccountIntent,
} from '../operations/account-classification-intent.js'

const env = process.env
const publishableKey = env.SUPABASE_PUBLISHABLE_KEY ?? ''
const secretKey = env.SUPABASE_SECRET_KEY ?? ''
const baseEmail = env.COACH_A_EMAIL ?? ''
const authUrl = new URL(env.SUPABASE_URL!)
const databaseUrl = new URL(env.DATABASE_URL!)
assert.equal(authUrl.hostname, 'yvhijxhtelujfsaplzpi.supabase.co', 'development Auth only')
assert.equal(
  decodeURIComponent(databaseUrl.username),
  'gym_assistant_runtime.yvhijxhtelujfsaplzpi',
  'development runtime DB role only',
)
assert.ok(publishableKey && secretKey && baseEmail)

const [local, domain] = baseEmail.split('@')
assert.ok(local && domain, 'development fixture Email required')
const marker = `classification-${Date.now()}-${randomBytes(4).toString('hex')}`
const emails = {
  public: `${local}+${marker}-public@${domain}`,
  test: `${local}+${marker}-test@${domain}`,
  rejected: `${local}+${marker}-rejected@${domain}`,
}
const pool = new Pool({ connectionString: databaseUrl.toString(), max: 1 })
const created = new Map<string, string>()

async function auth(path: string, key: string, init: RequestInit) {
  return fetch(new URL(`/auth/v1${path}`, authUrl), {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  })
}

async function classification(userId: string) {
  const result = await pool.query<{ account_class: string; test_kind: string | null }>(
    `select account_class,test_kind
     from app_private.account_reporting_classification
     where user_id=$1`,
    [userId],
  )
  return result.rows
}

async function remember(response: Response, expectedEmail: string) {
  assert.equal(response.status, 200)
  const user = (await response.json()) as { id?: string; email?: string }
  assert.ok(user.id)
  assert.equal(user.email, expectedEmail)
  created.set(user.id, expectedEmail)
  return user.id
}

async function fixtureUsers() {
  const response = await auth('/admin/users?page=1&per_page=1000', secretKey, {
    method: 'GET',
  })
  assert.equal(response.status, 200)
  const body = (await response.json()) as { users?: { id?: string; email?: string }[] }
  return (body.users ?? []).filter((user) => Object.values(emails).includes(user.email ?? ''))
}

try {
  const publicId = await remember(
    await auth('/signup', publishableKey, {
      method: 'POST',
      body: JSON.stringify({
        email: emails.public,
        password: randomBytes(24).toString('base64url'),
        data: { gym_registration_channel: 'public-web-v1' },
      }),
    }),
    emails.public,
  )
  assert.deepEqual(await classification(publicId), [{ account_class: 'real', test_kind: null }])

  await createTestAccountIntent(pool, {
    email: emails.test,
    testKind: 'automation',
    actor: 'classification-live-fixture',
    reason: 'Verify trusted internal account classification',
  })
  const testId = await remember(
    await auth('/admin/users', secretKey, {
      method: 'POST',
      body: JSON.stringify({
        email: emails.test,
        password: randomBytes(24).toString('base64url'),
        email_confirm: true,
      }),
    }),
    emails.test,
  )
  assert.deepEqual(await classification(testId), [
    { account_class: 'test', test_kind: 'automation' },
  ])

  const rejected = await auth('/admin/users', secretKey, {
    method: 'POST',
    body: JSON.stringify({
      email: emails.rejected,
      password: randomBytes(24).toString('base64url'),
      email_confirm: true,
    }),
  })
  assert.equal(rejected.ok, false, 'unmarked Auth-admin creation must fail closed')
  assert.equal(
    (await fixtureUsers()).some((user) => user.email === emails.rejected),
    false,
    'rejected Auth creation left a user',
  )

  console.log('Account classification live E2E passed: real, test/automation, fail closed.')
} finally {
  for (const [userId, expectedEmail] of created) {
    const check = await auth(`/admin/users/${userId}`, secretKey, { method: 'GET' })
    assert.equal(check.status, 200)
    assert.equal(((await check.json()) as { email?: string }).email, expectedEmail)
    assert.ok((await auth(`/admin/users/${userId}`, secretKey, { method: 'DELETE' })).ok)
    assert.equal((await auth(`/admin/users/${userId}`, secretKey, { method: 'GET' })).status, 404)
  }
  await clearTestAccountIntent(pool, emails.test)
  assert.deepEqual(await fixtureUsers(), [], 'classification fixtures were not fully removed')
  await pool.end()
}
