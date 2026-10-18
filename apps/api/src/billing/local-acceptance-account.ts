import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { Pool } from 'pg'
import { PostgresStudentRepository } from '../adapters/postgres-student-repository.js'
import { supabaseAdminHeaders } from '../supabase-admin-headers.js'

// One disposable Development Coach for a human Test Mode checkout. Never print credentials.
const ref = 'yvhijxhtelujfsaplzpi'
const url = process.env.SUPABASE_URL!.replace(/\/$/, '')
assert.equal(url, `https://${ref}.supabase.co`)
assert.notEqual(process.env.DEPLOYMENT_TARGET, 'production')
const database = new URL(process.env.DATABASE_URL!)
assert.ok(
  database.hostname === `db.${ref}.supabase.co` ||
    (database.hostname.endsWith('.pooler.supabase.com') &&
      decodeURIComponent(database.username).endsWith(`.${ref}`)),
)
const email = `billing-acceptance-${randomUUID()}@example.com`
const password = randomBytes(24).toString('base64url')
const output = process.env.BILLING_ACCEPTANCE_OUTPUT ?? '.env.billing-acceptance'
assert.match(output, /^\.env\.billing-acceptance(?:-[a-z0-9-]+)?$/)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
})
try {
  const table = await pool.query<{ present: string | null }>(
    "select to_regclass('app_private.account_reporting_test_intent')::text present",
  )
  if (table.rows[0]?.present) {
    await pool.query(
      `insert into app_private.account_reporting_test_intent(email,test_kind,actor,reason,expires_at)
       values($1,'automation','billing-local-acceptance','Human Development Test Mode checkout',now()+interval '7 days')`,
      [email],
    )
  }
  const created = await fetch(`${url}/auth/v1/admin/users`, {
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
  assert.equal(created.status, 200, 'create isolated Development Coach')
  const user = (await created.json()) as { id: string }
  await new PostgresStudentRepository(pool).resolveWorkspace({ userId: user.id })
  const classification = await pool.query<{ account_class: string; test_kind: string }>(
    'select account_class,test_kind from app_private.account_reporting_classification where user_id=$1',
    [user.id],
  )
  assert.deepEqual(classification.rows, [{ account_class: 'test', test_kind: 'automation' }])
  await writeFile(
    output,
    `BILLING_ACCEPTANCE_EMAIL=${email}\nBILLING_ACCEPTANCE_PASSWORD=${password}\n`,
    { flag: 'wx' },
  )
  console.log(`Development acceptance Coach prepared; credentials saved in ignored ${output}`)
} finally {
  await pool.end()
}
