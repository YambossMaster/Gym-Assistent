import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { CheckoutModule } from './checkout.js'
import { PostgresCheckoutRepository } from './postgres-checkout.js'
import { buildServer } from '../http/server.js'
import { OidcIdentityVerifier } from '../identity/oidc-identity.js'
import { PostgresStudentRepository } from '../adapters/postgres-student-repository.js'
import { StudentModule } from '../students/student-module.js'
import { TodayModule } from '../today/today-module.js'
import { WorkspaceModule } from '../workspace/workspace-module.js'
import { AccountLifecycleModule } from '../account-lifecycle/account-lifecycle-module.js'
import { supabaseAdminHeaders } from '../supabase-admin-headers.js'
import { LemonTestCheckoutProvider, localBillingConfiguration } from './lemon-checkout.js'

// Bounded Development-only integration check. No merchant request, email or Production mutation.
const developmentRef = 'yvhijxhtelujfsaplzpi'
const url = process.env.SUPABASE_URL!.replace(/\/$/, '')
assert.equal(url, `https://${developmentRef}.supabase.co`)
assert.notEqual(process.env.DEPLOYMENT_TARGET, 'production')
const database = new URL(process.env.DATABASE_URL!)
assert.ok(
  database.hostname === `db.${developmentRef}.supabase.co` ||
    (database.hostname.endsWith('.pooler.supabase.com') &&
      decodeURIComponent(database.username).endsWith(`.${developmentRef}`)),
)
const secret = process.env.SUPABASE_SECRET_KEY!
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY!
assert.ok(secret && publishable)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 10000,
})
const workerUrl = new URL(process.env.BILLING_WORKER_DATABASE_URL!)
assert.ok(decodeURIComponent(workerUrl.username).endsWith(`.${developmentRef}`))
const workerPool = new Pool({
  connectionString: process.env.BILLING_WORKER_DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 10000,
})
const users: string[] = []
const reservedEmails: string[] = []
const studentRepository = new PostgresStudentRepository(pool)
let dispatched = 0
const realProvider =
  process.env.BILLING_REAL_PROVIDER_SMOKE === 'true'
    ? new LemonTestCheckoutProvider(
        localBillingConfiguration({
          ...process.env,
          BILLING_LOCAL_CHECKOUT: 'true',
          BILLING_PROVIDER_TESTS_APPROVED: 'true',
        }),
      )
    : null
const provider = {
  ready: (quote: Parameters<LemonTestCheckoutProvider['ready']>[0]) =>
    realProvider?.ready(quote) ?? true,
  create: async (input: Parameters<LemonTestCheckoutProvider['create']>[0]) => {
    dispatched++
    if (realProvider) return realProvider.create(input)
    return { id: randomUUID(), url: 'https://isolated.lemonsqueezy.com/checkout/fixture' }
  },
  hasSubscriptionSince: async (
    input: Parameters<LemonTestCheckoutProvider['hasSubscriptionSince']>[0],
  ) => (realProvider ? realProvider.hasSubscriptionSince(input) : false),
}
const checkout = new CheckoutModule(new PostgresCheckoutRepository(pool), provider)
const server = buildServer({
  identityVerifier: new OidcIdentityVerifier({
    issuer: `${url}/auth/v1`,
    audience: 'authenticated',
    jwksUrl: `${url}/auth/v1/.well-known/jwks.json`,
  }),
  students: new StudentModule({ repository: studentRepository }),
  today: new TodayModule(studentRepository),
  workspace: new WorkspaceModule({ repository: studentRepository }),
  accountLifecycle: new AccountLifecycleModule({
    repository: studentRepository,
    deletionExecutor: { deleteCoach: async () => {} },
  }),
  registrationEmails: { isRegistered: async () => false },
  checkout,
})
async function actor() {
  const email = `billing-local-${randomUUID()}@example.com`
  const password = randomBytes(24).toString('base64url')
  const reservations = await pool.query<{ available: string | null }>(
    "select to_regclass('app_private.account_reporting_test_intent')::text as available",
  )
  if (reservations.rows[0]?.available) {
    await pool.query(
      `insert into app_private.account_reporting_test_intent(email,test_kind,actor,reason,expires_at)
      values($1,'automation','billing-local-smoke','Isolated Development checkout integration check',now()+interval '15 minutes')`,
      [email],
    )
    reservedEmails.push(email)
  }
  const created = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { ...supabaseAdminHeaders(secret), 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      app_metadata: { gym_test_kind: 'automation' },
    }),
  })
  assert.equal(created.status, 200, 'create isolated Development user')
  const user = (await created.json()) as { id: string }
  users.push(user.id)
  const classification = await pool.query<{ account_class: string; test_kind: string }>(
    'select account_class,test_kind from app_private.account_reporting_classification where user_id=$1',
    [user.id],
  )
  assert.deepEqual(classification.rows, [{ account_class: 'test', test_kind: 'automation' }])
  await studentRepository.resolveWorkspace({ userId: user.id })
  const signedIn = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: publishable, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  assert.equal(signedIn.status, 200, 'sign in isolated Coach')
  const session = (await signedIn.json()) as { access_token: string }
  return { id: user.id, token: session.access_token }
}
try {
  const a = await actor(),
    b = await actor()
  const request = (token: string, path: string, body?: unknown) =>
    server.inject({
      method: body === undefined ? 'GET' : 'POST',
      url: `/v1/billing${path}`,
      headers: { authorization: `Bearer ${token}` },
      ...(body === undefined ? {} : { payload: body as object }),
    })
  assert.equal((await server.inject({ url: '/v1/billing/checkouts/current' })).statusCode, 401)
  const quoted = await request(a.token, '/quote', { tier: 'basic', interval: 'month' })
  assert.equal(quoted.statusCode, 200, 'quote persisted')
  const quote = quoted.json() as { id: string; termsVersion: string; today: { amount: number } }
  assert.equal(quote.today.amount, 0)
  const input = { quoteId: quote.id, termsVersion: quote.termsVersion }
  assert.equal(
    (await request(b.token, '/checkouts', input)).statusCode,
    404,
    'foreign quote denied',
  )
  const concurrent = await Promise.all(
    Array.from({ length: 8 }, () => request(a.token, '/checkouts', input)),
  )
  for (const response of concurrent) assert.equal(response.statusCode, 200)
  const ids = new Set(concurrent.map((r) => r.json().id))
  assert.equal(ids.size, 1, 'one durable intent across concurrent HTTP requests')
  assert.equal(dispatched, 1, 'one provider call')
  if (realProvider) {
    const view = concurrent[0]!.json() as { status: string; url?: string }
    assert.equal(view.status, 'open', 'real Test Mode checkout created')
    assert.ok(view.url?.startsWith('https://'), 'hosted checkout URL')
  }
  const intentId = String([...ids][0])
  assert.equal(
    (await request(b.token, `/checkouts/${intentId}`)).statusCode,
    404,
    'foreign intent denied',
  )
  assert.equal((await request(b.token, '/checkouts/current')).json().current, null)
  const restarted = new CheckoutModule(new PostgresCheckoutRepository(pool), provider)
  assert.equal(
    (await restarted.pending({ userId: a.id }))?.intent.id,
    intentId,
    'new module recovers durable state',
  )
  const rls = await pool.connect()
  try {
    await rls.query('begin')
    const w = await rls.query<{ id: string }>(
      'select id from app_private.workspace where owner_user_id=$1',
      [b.id],
    )
    await rls.query('set local role gym_assistant_api')
    await rls.query("select set_config('app.current_workspace_id',$1,true)", [w.rows[0]!.id])
    assert.equal(
      (
        await rls.query('select id from app_private.billing_checkout_intent where id=$1', [
          intentId,
        ])
      ).rowCount,
      0,
      'database RLS denies foreign intent',
    )
  } finally {
    await rls.query('rollback')
    rls.release()
  }
  const testDigest = randomBytes(32).toString('hex')
  try {
    await workerPool.query(
      `insert into app_private.billing_event_inbox(environment,digest,notification)
       values ('test',$1,$2)`,
      [testDigest, JSON.stringify({ intentId })],
    )
    const inbox = await pool.connect()
    try {
      await inbox.query('begin')
      const owner = await inbox.query<{ id: string }>(
        'select id from app_private.workspace where owner_user_id=$1',
        [a.id],
      )
      const foreign = await inbox.query<{ id: string }>(
        'select id from app_private.workspace where owner_user_id=$1',
        [b.id],
      )
      await inbox.query('set local role gym_assistant_api')
      await inbox.query("select set_config('app.current_workspace_id',$1,true)", [
        owner.rows[0]!.id,
      ])
      const visible = await inbox.query<{ environment: string }>(
        "select environment from app_private.billing_event_inbox where notification->>'intentId'=$1",
        [intentId],
      )
      assert.deepEqual(
        visible.rows,
        [{ environment: 'test' }],
        'owner sees only own test intent event',
      )
      await inbox.query("select set_config('app.current_workspace_id',$1,true)", [
        foreign.rows[0]!.id,
      ])
      assert.equal(
        (
          await inbox.query(
            "select environment from app_private.billing_event_inbox where notification->>'intentId'=$1",
            [intentId],
          )
        ).rowCount,
        0,
        'foreign owner cannot see inbox event',
      )
      await inbox.query("select set_config('app.current_workspace_id','',true)")
      assert.equal(
        (
          await inbox.query(
            "select environment from app_private.billing_event_inbox where notification->>'intentId'=$1",
            [intentId],
          )
        ).rowCount,
        0,
        'unset workspace cannot see inbox event',
      )
      await assert.rejects(
        inbox.query('select digest from app_private.billing_event_inbox limit 1'),
        { code: '42501' },
        'API role cannot read digest',
      )
    } finally {
      await inbox.query('rollback')
      inbox.release()
    }
    assert.equal(
      (await request(a.token, `/checkouts/${intentId}/abandon`, {})).statusCode,
      409,
      'arrived owner event prevents abandonment',
    )
  } finally {
    await workerPool.query(
      'delete from app_private.billing_event_inbox where digest=any($1::text[])',
      [[testDigest]],
    )
  }
  assert.equal(
    (await request(b.token, `/checkouts/${intentId}/submitted`, {})).statusCode,
    404,
    'foreign owner cannot mark payment submitted',
  )
  const submitted = await request(a.token, `/checkouts/${intentId}/submitted`, {})
  assert.equal(submitted.statusCode, 200)
  assert.deepEqual(submitted.json(), { id: intentId, status: 'pending' })
  assert.equal(
    (await request(a.token, `/checkouts/${intentId}/abandon`, {})).json().status,
    'pending',
    'a success signal prevents a competing tab from abandoning this payment',
  )
  assert.equal(
    (await request(a.token, '/quote', { tier: 'advanced', interval: 'year' })).statusCode,
    409,
    'only this owner intent awaits provider reconciliation',
  )
  console.log(
    'PASS: Development User-JWT, concurrent deduplication, owner/inbox RLS, arrived-event guard and submitted-vs-abandon',
  )
} finally {
  await server.close()
  let cleanupFailed = false
  for (const id of users) {
    const removed = await fetch(`${url}/auth/v1/admin/users/${id}`, {
      method: 'DELETE',
      headers: supabaseAdminHeaders(secret),
    })
    if (!removed.ok) cleanupFailed = true
  }
  const remaining = await pool.query<{ count: string }>(
    'select count(*) from app_private.workspace where owner_user_id=any($1::uuid[])',
    [users],
  )
  if (reservedEmails.length)
    await pool.query(
      'delete from app_private.account_reporting_test_intent where email=any($1::text[])',
      [reservedEmails],
    )
  await pool.end()
  await workerPool.end()
  assert.equal(cleanupFailed, false, 'isolated Auth cleanup')
  assert.equal(remaining.rows[0]!.count, '0', 'isolated Workspace cleanup')
  console.log('PASS: isolated Development users/workspaces cleaned up')
}
