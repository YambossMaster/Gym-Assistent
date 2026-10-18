import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import { PlanAccessModule } from '../plan-access/plan-access.js'
import { PostgresPlanAccessRepository } from '../plan-access/postgres-plan-access-repository.js'
import { PostgresVerifiedBillingAccess } from './postgres-access-source.js'
import { LemonTestResources } from './lemon-resources.js'
import { localBillingConfiguration } from './lemon-checkout.js'

const ref = 'yvhijxhtelujfsaplzpi'
assert.equal(process.env.SUPABASE_URL?.replace(/\/$/, ''), `https://${ref}.supabase.co`)
assert.notEqual(process.env.DEPLOYMENT_TARGET, 'production')
const database = new URL(process.env.DATABASE_URL!)
assert.ok(
  database.hostname === `db.${ref}.supabase.co` ||
    (database.hostname.endsWith('.pooler.supabase.com') &&
      decodeURIComponent(database.username).endsWith(`.${ref}`)),
)
const config = localBillingConfiguration({
  ...process.env,
  BILLING_LOCAL_CHECKOUT: 'true',
  BILLING_PROVIDER_TESTS_APPROVED: 'true',
  BILLING_RETURN_URL:
    process.env.BILLING_RETURN_URL ?? 'http://127.0.0.1:4178/settings/checkout/status',
})
assert.ok(config)
const tag = process.argv[2]
assert.match(tag ?? '', /^[a-z0-9-]{1,32}$/)
const returning = process.argv[3] === '--returning'
assert.ok(process.argv.length === (returning ? 4 : 3))
const fixture = JSON.parse(
  readFileSync(
    resolve(
      process.cwd(),
      `../../output/billing-test-mode/fixture-account${returning ? '-returning' : ''}-${tag}.json`,
    ),
    'utf8',
  ),
) as { environment: string; scenario: string; userId: string }
assert.equal(fixture.environment, 'Development/Test Mode')
const ownerPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10_000,
})
const workerPool = new Pool({
  connectionString: process.env.BILLING_WORKER_DATABASE_URL,
  connectionTimeoutMillis: 10_000,
})
try {
  const workspace = await ownerPool.query<{ id: string }>(
    'select id from app_private.workspace where owner_user_id=$1',
    [fixture.userId],
  )
  assert.equal(workspace.rowCount, 1)
  const workspaceId = workspace.rows[0]!.id
  const client = await ownerPool.connect()
  let intentId = ''
  let subscriptionId = ''
  try {
    await client.query('begin')
    await client.query("select set_config('app.current_workspace_id',$1,true)", [workspaceId])
    const intent = await client.query<{
      id: string
      status: string
      intent: { activation?: string; providerId?: string }
      quote: { tier: string; interval: string; today: { amount: number } }
    }>(
      `select i.id,i.status,i.intent,q.quote from app_private.billing_checkout_intent i
       join app_private.billing_checkout_quote q on q.id=i.quote_id
       where i.workspace_id=$1 and i.environment='test' order by i.created_at desc limit 1`,
      [workspaceId],
    )
    assert.equal(intent.rowCount, 1, 'Coach UI must create one owned checkout intent')
    const row = intent.rows[0]!
    assert.equal(row.status, 'confirmed')
    assert.equal(row.intent.activation, returning ? 'paid' : 'trial')
    assert.deepEqual(
      { tier: row.quote.tier, interval: row.quote.interval, dueNow: row.quote.today.amount },
      { tier: 'basic', interval: returning ? 'month' : 'year', dueNow: returning ? 11500 : 0 },
    )
    intentId = row.id
    const ledger = await client.query<{ provider_id: string }>(
      `select provider_id from app_private.billing_subscription_ledger
       where workspace_id=$1 and environment='test' and intent_id=$2`,
      [workspaceId, intentId],
    )
    assert.equal(ledger.rowCount, 1, 'one subscription bound to original Coach intent')
    subscriptionId = ledger.rows[0]!.provider_id
    const period = await client.query<{
      tier: string
      interval: string
      origin: string
      ends_at: Date
    }>(
      `select tier,billing_interval as interval,origin,ends_at from app_private.billing_verified_period
       where workspace_id=$1 and environment='test' and subscription_id=$2
       and period_key='initial' and superseded_at is null`,
      [workspaceId, subscriptionId],
    )
    assert.equal(period.rowCount, 1, 'one owner verified initial period')
    assert.deepEqual(
      {
        tier: period.rows[0]!.tier,
        interval: period.rows[0]!.interval,
        origin: period.rows[0]!.origin,
      },
      {
        tier: 'basic',
        interval: returning ? 'month' : 'year',
        origin: returning ? 'payment' : 'trial',
      },
    )
  } finally {
    await client.query('rollback')
    client.release()
  }
  const provider = new LemonTestResources({
    key: config.key,
    storeId: config.storeId,
    variantIds: Object.values(config.variants),
  })
  const subscription = await provider.get('subscriptions', subscriptionId)
  assert.equal(subscription.type, 'subscriptions')
  assert.equal(
    subscription.attributes.variant_id,
    returning ? config.variants.basic_month : config.variants.basic_year,
  )
  assert.equal(subscription.attributes.status, returning ? 'active' : 'on_trial')
  if (!returning)
    assert.equal(subscription.attributes.renews_at, subscription.attributes.trial_ends_at)
  const invoices = await provider.subscriptionInvoices(subscriptionId)
  const initial = invoices.filter(
    (invoice) =>
      invoice.attributes.billing_reason === 'initial' && invoice.attributes.status === 'paid',
  )
  assert.equal(initial.length, 1, 'one provider-paid initial invoice')
  assert.ok(returning ? initial[0]!.attributes.total > 0 : initial[0]!.attributes.total === 0)
  const inbox = await workerPool.query<{ status: string; attempts: number }>(
    `select status,attempts from app_private.billing_event_inbox
     where environment='test' and notification->>'resourceId'=$1
     order by created_at`,
    [subscriptionId],
  )
  assert.ok(
    inbox.rowCount && inbox.rows.every((row) => row.status === 'done' && row.attempts === 1),
  )
  const plan = await new PlanAccessModule(
    new PostgresPlanAccessRepository(ownerPool),
    undefined,
    new PostgresVerifiedBillingAccess(ownerPool),
  ).get({ userId: fixture.userId })
  assert.equal(plan.source, 'subscription')
  assert.equal(plan.tier, 'basic')
  assert.ok(plan.billingEndsAt)
  console.log(
    JSON.stringify({
      result: 'PASS',
      intentId,
      subscriptionId,
      invoiceId: initial[0]!.id,
      webhookEvents: inbox.rowCount,
      ownerPlan: plan.tier,
      interval: returning ? 'month' : 'year',
      paidMinor: initial[0]!.attributes.total,
    }),
  )
} finally {
  await ownerPool.end()
  await workerPool.end()
}
