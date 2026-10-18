import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import { supabaseAdminHeaders } from '../supabase-admin-headers.js'

// One exact isolated Development/Test Mode refund owner. Never print the credential.
const ref = 'yvhijxhtelujfsaplzpi'
const base = `https://${ref}.supabase.co`
assert.equal(process.env.SUPABASE_URL?.replace(/\/$/, ''), base)
assert.notEqual(process.env.DEPLOYMENT_TARGET, 'production')
const database = new URL(process.env.DATABASE_URL!)
assert.ok(
  database.hostname === `db.${ref}.supabase.co` ||
    (database.hostname.endsWith('.pooler.supabase.com') &&
      decodeURIComponent(database.username).endsWith(`.${ref}`)),
)
const fixture = JSON.parse(
  readFileSync(
    resolve(process.cwd(), '../../output/billing-test-mode/fixture-returning-paid-upgrade.json'),
    'utf8',
  ),
) as { environment: string; userId: string; email: string; intentId: string }
assert.equal(fixture.environment, 'Development/Test Mode')
const output = resolve(process.cwd(), '.env.billing-acceptance-r14-refund')
assert.equal(existsSync(output), false, 'credential file already exists')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
try {
  const client = await pool.connect()
  try {
    await client.query('begin read only')
    const workspace = await client.query<{ id: string }>(
      'select id from app_private.workspace where owner_user_id=$1',
      [fixture.userId],
    )
    assert.equal(workspace.rowCount, 1)
    await client.query("select set_config('app.current_workspace_id',$1,true)", [
      workspace.rows[0]!.id,
    ])
    const binding = await client.query(
      `select 1 from app_private.billing_subscription_ledger s
       join app_private.billing_refund_case decision
         on decision.environment=s.environment and decision.store_id=s.store_id
         and decision.subscription_id=s.provider_id and decision.workspace_id=s.workspace_id
       join app_private.billing_refund_case_application applied
         on applied.case_id=decision.id and applied.workspace_id=decision.workspace_id
       where s.environment='test' and s.workspace_id=$1 and s.provider_id='2614493'
         and s.intent_id=$2 and decision.decision='revoke_current'
         and applied.access_revoked_at<=now()`,
      [workspace.rows[0]!.id, fixture.intentId],
    )
    assert.equal(binding.rowCount, 1, 'exact refunded owner binding required')
    await client.query('rollback')
  } finally {
    client.release()
  }
  const headers = supabaseAdminHeaders(process.env.SUPABASE_SECRET_KEY!)
  const url = `${base}/auth/v1/admin/users/${fixture.userId}`
  const existing = await fetch(url, { headers, signal: AbortSignal.timeout(15000) })
  assert.equal(existing.status, 200)
  const user = (await existing.json()) as {
    id: string
    email: string
    app_metadata: { gym_test_kind?: string }
  }
  assert.equal(user.id, fixture.userId)
  assert.equal(user.email, fixture.email)
  assert.equal(user.app_metadata.gym_test_kind, 'automation')
  const password = randomBytes(24).toString('base64url')
  const updated = await fetch(url, {
    method: 'PUT',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
    signal: AbortSignal.timeout(15000),
  })
  assert.equal(updated.status, 200, 'update exact Development test account password')
  writeFileSync(
    output,
    `BILLING_ACCEPTANCE_EMAIL=${fixture.email}\nBILLING_ACCEPTANCE_PASSWORD=${password}\n`,
    {
      flag: 'wx',
      mode: 0o600,
    },
  )
  console.log('Isolated refunded Development Coach login ready in ignored credential file')
} finally {
  await pool.end()
}
