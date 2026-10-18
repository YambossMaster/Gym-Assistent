import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import { PostgresStudentRepository } from '../adapters/postgres-student-repository.js'
import { supabaseAdminHeaders } from '../supabase-admin-headers.js'
import { CheckoutModule } from './checkout.js'
import { LemonTestCheckoutProvider, localBillingConfiguration } from './lemon-checkout.js'
import { PostgresCheckoutRepository } from './postgres-checkout.js'

// Resumable, ignored Development/Test Mode fixture. Never prints a checkout URL or credential.
const ref = 'yvhijxhtelujfsaplzpi'
const supabaseUrl = `https://${ref}.supabase.co`
assert.equal(process.env.SUPABASE_URL?.replace(/\/$/, ''), supabaseUrl)
assert.notEqual(process.env.DEPLOYMENT_TARGET, 'production')
const database = new URL(process.env.DATABASE_URL!)
assert.ok(
  database.hostname === `db.${ref}.supabase.co` ||
    (database.hostname.endsWith('.pooler.supabase.com') &&
      decodeURIComponent(database.username).endsWith(`.${ref}`)),
  'Development database only',
)
const config = localBillingConfiguration({
  ...process.env,
  BILLING_LOCAL_CHECKOUT: 'true',
  BILLING_PROVIDER_TESTS_APPROVED: 'true',
  BILLING_RETURN_URL:
    process.env.BILLING_RETURN_URL ?? 'http://127.0.0.1:5173/settings/payment-status',
})
assert.ok(config, 'Test Mode configuration required')
const returning = process.argv.includes('--returning')
const accountOnly = process.argv.includes('--account-only')
const tagArgs = process.argv.slice(2).filter((arg) => arg.startsWith('--tag='))
assert.ok(tagArgs.length <= 1)
assert.ok(
  process.argv
    .slice(2)
    .every((arg) => arg === '--returning' || arg === '--account-only' || arg.startsWith('--tag=')),
)
const tag = tagArgs[0]?.slice('--tag='.length)
assert.ok(!tag || /^[a-z0-9-]{1,32}$/.test(tag))
const suffix = tag ? `-${tag}` : ''
const manifestPath = resolve(
  process.cwd(),
  accountOnly
    ? `../../output/billing-test-mode/fixture-account${returning ? '-returning' : ''}${suffix}.json`
    : returning
      ? `../../output/billing-test-mode/fixture-returning${suffix}.json`
      : `../../output/billing-test-mode/fixture${suffix}.json`,
)
assert.equal(existsSync(manifestPath), false, 'existing fixture must be resolved first')
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
})
const email = `billing-test-mode-${randomUUID()}@example.com`
const password = randomBytes(24).toString('base64url')
let userId: string | null = null
let committed = false

try {
  await pool.query(
    `insert into app_private.account_reporting_test_intent(email,test_kind,actor,reason,expires_at)
     values($1,'automation','billing-test-mode-fixture','Isolated Test Mode subscription checkout',now()+interval '1 day')`,
    [email],
  )
  const created = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      ...supabaseAdminHeaders(process.env.SUPABASE_SECRET_KEY!),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      app_metadata: { gym_test_kind: 'automation' },
    }),
  })
  assert.equal(created.status, 200, 'create isolated Development account')
  userId = ((await created.json()) as { id: string }).id
  await new PostgresStudentRepository(pool).resolveWorkspace({ userId })
  const classification = await pool.query<{ account_class: string; test_kind: string }>(
    'select account_class,test_kind from app_private.account_reporting_classification where user_id=$1',
    [userId],
  )
  assert.deepEqual(classification.rows, [{ account_class: 'test', test_kind: 'automation' }])

  const checkout = new CheckoutModule(
    new PostgresCheckoutRepository(pool),
    new LemonTestCheckoutProvider(config),
  )
  const identity = { userId, email }
  if (returning) {
    // Isolated test setup for the charged/no-trial path; not evidence that the
    // production first-subscription marker is implemented.
    await new PostgresCheckoutRepository(pool).transaction(identity, (tx) => tx.facts())
    const client = await pool.connect()
    try {
      await client.query('begin')
      const workspace = await client.query<{ id: string }>(
        'select id from app_private.workspace where owner_user_id=$1',
        [userId],
      )
      const workspaceId = workspace.rows[0]!.id
      await client.query("select set_config('app.current_workspace_id',$1,true)", [workspaceId])
      const updated = await client.query(
        `update app_private.billing_checkout_account
         set first_subscribed_at=now()-interval '2 months',version=version+1
         where workspace_id=$1 and environment='test'`,
        [workspaceId],
      )
      assert.equal(updated.rowCount, 1)
      await client.query('commit')
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }
  const intent = accountOnly
    ? null
    : await (async () => {
        const quote = await checkout.quote(identity, { tier: 'basic', interval: 'month' })
        assert.equal(quote.today.amount, returning ? 11500 : 0)
        assert.equal(quote.trial, returning ? null : 'month')
        const opened = await checkout.begin(identity, {
          quoteId: quote.id,
          termsVersion: quote.termsVersion,
        })
        assert.equal(opened.status, 'open', 'provider checkout returned')
        return opened
      })()
  mkdirSync(resolve(process.cwd(), '../../output/billing-test-mode'), { recursive: true })
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        environment: 'Development/Test Mode',
        scenario: accountOnly
          ? returning
            ? 'coach-ui-synthetic-returning'
            : 'coach-ui-first-subscription'
          : returning
            ? 'synthetic-returning-no-trial'
            : 'first-trial',
        userId,
        email,
        ...(accountOnly ? { password } : { intentId: intent!.id, checkoutUrl: intent!.url }),
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    { flag: 'wx', mode: 0o600 },
  )
  committed = true
  console.log(
    accountOnly
      ? 'PASS: isolated Development Coach UI account prepared without checkout'
      : 'PASS: isolated Development Test Mode checkout prepared',
  )
  console.log(`Fixture: ${manifestPath}`)
  if (intent) console.log(`Intent: ${intent.id}`)
} finally {
  if (!committed) {
    if (userId) {
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: supabaseAdminHeaders(process.env.SUPABASE_SECRET_KEY!),
      })
    }
    await pool.query('delete from app_private.account_reporting_test_intent where email=$1', [
      email,
    ])
  }
  await pool.end()
}
