import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import { MemoryStudentRepository } from '../adapters/memory-student-repository.js'
import { AccountLifecycleModule } from '../account-lifecycle/account-lifecycle-module.js'
import { buildServer } from '../http/server.js'
import { DevelopmentIdentityVerifier } from '../identity/development-identity.js'
import { PlanAccessModule } from '../plan-access/plan-access.js'
import { PostgresPlanAccessRepository } from '../plan-access/postgres-plan-access-repository.js'
import { StudentModule } from '../students/student-module.js'
import { TodayModule } from '../today/today-module.js'
import { WorkspaceModule } from '../workspace/workspace-module.js'
import { CheckoutModule } from './checkout.js'
import { BillingEventWorker } from './event-inbox.js'
import { LemonTestResources } from './lemon-resources.js'
import { localBillingConfiguration } from './lemon-checkout.js'
import { PostgresVerifiedBillingAccess } from './postgres-access-source.js'
import { PostgresCheckoutRepository } from './postgres-checkout.js'
import { PostgresBillingInbox } from './postgres-inbox.js'

const ref = 'yvhijxhtelujfsaplzpi'
assert.equal(process.env.SUPABASE_URL?.replace(/\/$/, ''), `https://${ref}.supabase.co`)
assert.notEqual(process.env.DEPLOYMENT_TARGET, 'production')
const workerUrl = new URL(process.env.BILLING_WORKER_DATABASE_URL!)
assert.ok(workerUrl.username.startsWith('gym_billing_worker_login.'))
assert.ok(
  workerUrl.hostname === `db.${ref}.supabase.co` ||
    (workerUrl.hostname.endsWith('.pooler.supabase.com') &&
      decodeURIComponent(workerUrl.username).endsWith(`.${ref}`)),
)
const config = localBillingConfiguration({
  ...process.env,
  BILLING_LOCAL_CHECKOUT: 'true',
  BILLING_PROVIDER_TESTS_APPROVED: 'true',
  BILLING_RETURN_URL:
    process.env.BILLING_RETURN_URL ?? 'http://127.0.0.1:5173/settings/payment-status',
})
assert.ok(config)
const returning = process.argv.includes('--returning')
const fixture = JSON.parse(
  readFileSync(
    resolve(
      process.cwd(),
      `../../output/billing-test-mode/fixture${returning ? '-returning' : ''}.json`,
    ),
    'utf8',
  ),
) as {
  environment: string
  intentId: string
  userId: string
}
assert.equal(fixture.environment, 'Development/Test Mode')
const subscriptionId = returning ? '2608914' : '2608871'
const origin = returning ? 'payment' : 'trial'
const workerPool = new Pool({
  connectionString: process.env.BILLING_WORKER_DATABASE_URL,
  connectionTimeoutMillis: 10000,
})
const ownerPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
})
const repository = new PostgresBillingInbox(workerPool, config.variants)
const provider = new LemonTestResources({
  key: config.key,
  storeId: config.storeId,
  variantIds: Object.values(config.variants),
})
const digest = randomBytes(32).toString('hex')
const digests = [digest]
try {
  const grants = await workerPool.query<{
    period_insert: boolean
    period_update: boolean
    account_marker_update: boolean
    account_version_update: boolean
    account_environment_update: boolean
  }>(`select
    has_table_privilege(current_user,'app_private.billing_verified_period','insert') period_insert,
    has_table_privilege(current_user,'app_private.billing_verified_period','update') period_update,
    has_column_privilege(current_user,'app_private.billing_checkout_account','first_subscribed_at','update') account_marker_update,
    has_column_privilege(current_user,'app_private.billing_checkout_account','version','update') account_version_update,
    has_column_privilege(current_user,'app_private.billing_checkout_account','environment','update') account_environment_update`)
  assert.deepEqual(grants.rows, [
    {
      period_insert: true,
      period_update: false,
      account_marker_update: true,
      account_version_update: true,
      account_environment_update: false,
    },
  ])
  const prior = await workerPool.query<{ intent_id: string }>(
    "select intent_id from app_private.billing_subscription_ledger where environment='test' and store_id=$1 and provider_id=$2",
    [config.storeId, subscriptionId],
  )
  assert.deepEqual(prior.rows, [{ intent_id: fixture.intentId }])
  await repository.receive({
    digest,
    storeId: config.storeId,
    kind: 'subscriptions',
    resourceId: subscriptionId,
    intentId: fixture.intentId,
  })
  let databaseNow = (await workerPool.query<{ now: Date }>('select now() as now')).rows[0]!.now
  const worker = new BillingEventWorker(repository, provider, () => databaseNow)
  assert.equal(await worker.runOne(), true)
  const result = await workerPool.query<{
    status: string
    error_code: string | null
    origin: string | null
    first_subscribed_at: Date | null
    intent_status: string
    activation: string | null
    version: number
    workspace_id: string
  }>(
    `select e.status,e.error_code,p.origin,a.first_subscribed_at,a.version,a.workspace_id,
       i.status intent_status,i.intent->>'activation' activation
     from app_private.billing_event_inbox e
     join app_private.billing_subscription_ledger s on s.provider_id=$2 and s.store_id=$3
     join app_private.billing_checkout_intent i on i.id=s.intent_id
     join app_private.billing_checkout_account a on a.workspace_id=s.workspace_id and a.environment='test'
     left join app_private.billing_verified_period p on p.subscription_id=s.provider_id
       and p.store_id=s.store_id and p.environment='test' and p.period_key='initial'
     where e.digest=$1`,
    [digest, subscriptionId, config.storeId],
  )
  const row = result.rows[0]
  assert.deepEqual(
    {
      status: row?.status,
      error: row?.error_code,
      origin: row?.origin,
      intent: row?.intent_status,
      activation: row?.activation,
    },
    {
      status: 'done',
      error: null,
      origin,
      intent: 'confirmed',
      activation: returning ? 'paid' : 'trial',
    },
  )
  assert.ok(row?.first_subscribed_at)
  const replay = randomBytes(32).toString('hex')
  digests.push(replay)
  await repository.receive({
    digest: replay,
    storeId: config.storeId,
    kind: 'subscriptions',
    resourceId: subscriptionId,
    intentId: fixture.intentId,
  })
  databaseNow = (await workerPool.query<{ now: Date }>('select now() as now')).rows[0]!.now
  assert.equal(await worker.runOne(), true)
  const unchanged = await workerPool.query<{ version: number; periods: number }>(
    `select a.version,
      (select count(*)::int from app_private.billing_verified_period p
       where p.environment='test' and p.workspace_id=a.workspace_id and p.subscription_id=$2) periods
     from app_private.billing_checkout_account a where a.workspace_id=$1 and a.environment='test'`,
    [row!.workspace_id, subscriptionId],
  )
  assert.deepEqual(unchanged.rows, [{ version: row!.version, periods: 1 }])
  const scoped = await ownerPool.connect()
  try {
    await scoped.query('begin')
    await scoped.query("select set_config('app.current_workspace_id',$1,true)", [row!.workspace_id])
    const foreignId = returning ? '2608871' : '2608914'
    const rls = await scoped.query<{ own: number; foreign: number }>(
      `select
       (select count(*)::int from app_private.billing_verified_period where subscription_id=$1) own,
       (select count(*)::int from app_private.billing_verified_period where subscription_id=$2) foreign`,
      [subscriptionId, foreignId],
    )
    assert.deepEqual(rls.rows, [{ own: 1, foreign: 0 }])
    await scoped.query('commit')
  } catch (error) {
    await scoped.query('rollback')
    throw error
  } finally {
    scoped.release()
  }
  const planAccess = new PlanAccessModule(
    new PostgresPlanAccessRepository(ownerPool),
    undefined,
    new PostgresVerifiedBillingAccess(ownerPool),
  )
  const plan = await planAccess.get({ userId: fixture.userId })
  assert.equal(plan.source, 'subscription')
  assert.equal(plan.tier, 'basic')
  assert.ok(plan.billingEndsAt)
  const expired = await new PlanAccessModule(
    new PostgresPlanAccessRepository(ownerPool),
    () => new Date(plan.billingEndsAt!),
    new PostgresVerifiedBillingAccess(ownerPool, () => new Date(plan.billingEndsAt!)),
  ).get({ userId: fixture.userId })
  assert.equal(expired.source, 'free', 'exact verified end reverts to Free')
  const memory = new MemoryStudentRepository()
  const server = buildServer({
    identityVerifier: new DevelopmentIdentityVerifier(),
    students: new StudentModule({ repository: memory }),
    today: new TodayModule(memory),
    workspace: new WorkspaceModule({ repository: memory }),
    accountLifecycle: new AccountLifecycleModule({
      repository: memory,
      deletionExecutor: { deleteCoach: async () => undefined },
    }),
    registrationEmails: { isRegistered: async () => false },
    planAccess,
    checkout: new CheckoutModule(new PostgresCheckoutRepository(ownerPool), {
      ready: () => false,
      create: async () => {
        throw new Error('read-only route smoke')
      },
      hasSubscriptionSince: async () => false,
    }),
  })
  try {
    const headers = { authorization: `Bearer dev:${fixture.userId}` }
    const checkout = await server.inject({
      url: `/v1/billing/checkouts/${fixture.intentId}`,
      headers,
    })
    assert.equal(checkout.statusCode, 200)
    assert.deepEqual(checkout.json(), {
      id: fixture.intentId,
      status: 'confirmed',
      activation: returning ? 'paid' : 'trial',
    })
    const access = await server.inject({ url: '/v1/plan', headers })
    assert.equal(access.statusCode, 200)
    assert.equal(access.json().plan.source, 'subscription')
  } finally {
    await server.close()
  }
  console.log(
    `PASS: Development Test Mode ${origin} authority, replay, RLS, HTTP, expiry and owner PlanAccess`,
  )
} finally {
  await workerPool.query(
    'delete from app_private.billing_event_inbox where digest=any($1::text[])',
    [digests],
  )
  await workerPool.end()
  await ownerPool.end()
}
