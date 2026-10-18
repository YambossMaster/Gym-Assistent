import assert from 'node:assert/strict'
import { createHmac, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Fastify from 'fastify'
import { Pool } from 'pg'
import { PostgresPlanAccessRepository } from '../plan-access/postgres-plan-access-repository.js'
import { PlanAccessModule } from '../plan-access/plan-access.js'
import { BillingEventInbox, BillingEventWorker, billingWebhookRoutes } from './event-inbox.js'
import { PostgresVerifiedBillingAccess } from './postgres-access-source.js'
import { localBillingConfiguration } from './lemon-checkout.js'
import { LemonTestResources } from './lemon-resources.js'
import { BillingManagementModule } from './management.js'
import { PostgresCheckoutRepository } from './postgres-checkout.js'
import { PostgresBillingInbox } from './postgres-inbox.js'
import { PostgresBillingManagement } from './postgres-management.js'

// Recovery drill: locally generated signed notifications trigger reads of actual
// Lemon Test Mode resources. This does not prove provider webhook delivery.
const ref = 'yvhijxhtelujfsaplzpi'
assert.equal(process.env.SUPABASE_URL?.replace(/\/$/, ''), `https://${ref}.supabase.co`)
assert.notEqual(process.env.DEPLOYMENT_TARGET, 'production')
const url = new URL(process.env.BILLING_WORKER_DATABASE_URL!)
assert.ok(
  url.hostname === `db.${ref}.supabase.co` ||
    (url.hostname.endsWith('.pooler.supabase.com') &&
      decodeURIComponent(url.username).endsWith(`.${ref}`)),
  'Development worker database only',
)
assert.ok(url.username.startsWith('gym_billing_worker_login.'))
const config = localBillingConfiguration({
  ...process.env,
  BILLING_LOCAL_CHECKOUT: 'true',
  BILLING_PROVIDER_TESTS_APPROVED: 'true',
  BILLING_RETURN_URL:
    process.env.BILLING_RETURN_URL ?? 'http://127.0.0.1:5173/settings/payment-status',
})
assert.ok(config)
const tagArgs = process.argv.slice(2).filter((arg) => arg.startsWith('--tag='))
assert.ok(tagArgs.length <= 1)
const tag = tagArgs[0]?.slice('--tag='.length)
assert.ok(!tag || /^[a-z0-9-]{1,32}$/.test(tag))
const fixture = JSON.parse(
  readFileSync(
    resolve(
      process.cwd(),
      `../../output/billing-test-mode/fixture${process.argv.includes('--returning') ? '-returning' : ''}${tag ? `-${tag}` : ''}.json`,
    ),
    'utf8',
  ),
) as { environment: string; intentId: string; userId: string; email: string; scenario?: string }
assert.equal(fixture.environment, 'Development/Test Mode')
assert.match(fixture.intentId, /^[a-f0-9-]{36}$/)
const [subscriptionId = '', invoiceId = ''] = process.argv
  .slice(2)
  .filter((arg) => !arg.startsWith('--'))
assert.match(subscriptionId, /^[1-9]\d*$/)
assert.match(invoiceId, /^[1-9]\d*$/)

const provider = new LemonTestResources({
  key: config.key,
  storeId: config.storeId,
  variantIds: Object.values(config.variants),
})
if (process.argv.includes('--retry-fx-refund')) {
  assert.equal(fixture.scenario, 'synthetic-returning-no-trial')
  const providerInvoice = await provider.get('subscription-invoices', invoiceId)
  assert.equal(providerInvoice.type, 'subscription-invoices')
  assert.equal(providerInvoice.attributes.status, 'refunded')
  assert.equal(providerInvoice.attributes.refund_rounding?.reported_refunded_amount, 11499)
  const diagnosticPool = new Pool({
    connectionString: process.env.BILLING_WORKER_DATABASE_URL,
    connectionTimeoutMillis: 10000,
  })
  const ownerPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
  })
  try {
    const binding = await diagnosticPool.query(
      `select intent_id from app_private.billing_subscription_ledger
       where environment='test' and store_id=$1 and provider_id=$2`,
      [config.storeId, subscriptionId],
    )
    assert.deepEqual(binding.rows, [{ intent_id: fixture.intentId }])
    const retried = await diagnosticPool.query(
      `update app_private.billing_event_inbox set status='queued',attempts=0,
         error_code=null,next_attempt_at=now()
       where environment='test' and status='dead' and error_code='invalid_refund_amount'
         and notification->>'resourceId'=$1 returning id`,
      [invoiceId],
    )
    assert.ok(
      retried.rowCount === 0 || retried.rowCount === 1,
      'retry at most the isolated full-refund event',
    )
    const databaseNow = (await diagnosticPool.query<{ now: Date }>('select now() as now')).rows[0]!
      .now
    const worker = new BillingEventWorker(
      new PostgresBillingInbox(diagnosticPool, config.variants),
      provider,
      () => databaseNow,
    )
    for (let count = 0; count < 10; count++) if (!(await worker.runOne())) break
    const events = await diagnosticPool.query(
      `select status,error_code,count(*)::int as count from app_private.billing_event_inbox
       where notification->>'resourceId'=$1 group by status,error_code`,
      [invoiceId],
    )
    assert.equal(events.rows.length, 1, JSON.stringify(events.rows))
    assert.equal(events.rows[0]?.status, 'done')
    assert.equal(events.rows[0]?.error_code, null)
    assert.ok(events.rows[0]?.count >= 2)
    const invoiceLedger = await diagnosticPool.query(
      `select resource->'attributes'->>'status' as status,
              resource->'attributes'->>'refunded_amount' as refunded_amount,
              resource->'attributes'->'refund_rounding'->>'reported_refunded_amount' as reported_amount
         from app_private.billing_invoice_ledger where provider_id=$1`,
      [invoiceId],
    )
    assert.deepEqual(invoiceLedger.rows, [
      { status: 'refunded', refunded_amount: '11498', reported_amount: '11499' },
    ])
    const subscriptionLedger = await diagnosticPool.query(
      `select resource->'attributes'->>'status' as status
         from app_private.billing_subscription_ledger where provider_id=$1`,
      [subscriptionId],
    )
    assert.deepEqual(subscriptionLedger.rows, [{ status: 'cancelled' }])
    const identity = { userId: fixture.userId, email: fixture.email }
    const projection = await new BillingManagementModule(
      new PostgresBillingManagement(ownerPool),
      provider,
    ).read(identity)
    assert.deepEqual(projection.invoices[0]?.total, { amount: 11498, currency: 'TWD' })
    assert.deepEqual(projection.invoices[0]?.refunded, { amount: 11498, currency: 'TWD' })
    const access = await new PlanAccessModule(new PostgresPlanAccessRepository(ownerPool)).get(
      identity,
    )
    assert.equal(access.source, 'free')
    console.log('PASS: bounded FX refund reconciled with raw provider amount retained')
    console.log('PASS: cancellation remains reconciled after refund repair')
  } finally {
    await diagnosticPool.end()
    await ownerPool.end()
  }
  process.exit(0)
}
const subscription = await provider.get('subscriptions', subscriptionId)
const invoice = await provider.get('subscription-invoices', invoiceId)
assert.equal(subscription.type, 'subscriptions')
assert.equal(invoice.type, 'subscription-invoices')
assert.equal(subscription.attributes.variant_id, config.variants.basic_month)
assert.equal(invoice.attributes.subscription_id, subscription.id)
assert.equal(invoice.attributes.customer_id, subscription.attributes.customer_id)
if (fixture.scenario === 'synthetic-returning-no-trial') {
  assert.equal(subscription.attributes.status, 'active')
  assert.equal(subscription.attributes.trial_ends_at, null)
  assert.ok(invoice.attributes.total > 0)
  assert.ok(['paid', 'partial_refund', 'refunded'].includes(invoice.attributes.status))
} else {
  assert.equal(invoice.attributes.total, 0)
  assert.equal(invoice.attributes.status, 'paid')
}

const pool = new Pool({
  connectionString: process.env.BILLING_WORKER_DATABASE_URL,
  connectionTimeoutMillis: 10000,
})
const ownerPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
})
const repository = new PostgresBillingInbox(pool, config.variants)
const secret = randomBytes(32).toString('hex')
const app = Fastify()
billingWebhookRoutes(app, new BillingEventInbox(repository, config.storeId, secret))
try {
  const intent = await pool.query(
    "select id,status from app_private.billing_checkout_intent where id=$1 and environment='test'",
    [fixture.intentId],
  )
  assert.equal(intent.rows.length, 1)
  assert.ok(['open', 'confirmed'].includes(intent.rows[0].status))

  const trigger = async (
    event_name: string,
    type: 'subscriptions' | 'subscription-invoices',
    id: string,
    intentId?: string,
  ) => {
    const raw = Buffer.from(
      JSON.stringify({
        meta: {
          event_name,
          test_mode: true,
          ...(intentId ? { custom_data: { intent_id: intentId } } : {}),
        },
        data: {
          type,
          id,
          attributes: { store_id: Number(config.storeId), test_mode: true },
        },
      }),
    )
    const signature = createHmac('sha256', secret).update(raw).digest('hex')
    const response = await app.inject({
      method: 'POST',
      url: '/hooks/lemonsqueezy',
      headers: { 'content-type': 'application/json', 'x-signature': signature },
      payload: raw,
    })
    assert.equal(response.statusCode, 200)
  }
  if (
    fixture.scenario !== 'synthetic-returning-no-trial' ||
    process.argv.includes('--recover-local')
  ) {
    await trigger('subscription_created', 'subscriptions', subscriptionId, fixture.intentId)
    await trigger('subscription_payment_success', 'subscription-invoices', invoiceId)
  }
  if (process.argv.includes('--retry-dead-refund')) {
    assert.equal(fixture.scenario, 'synthetic-returning-no-trial')
    const retried = await pool.query(
      `update app_private.billing_event_inbox set status='queued',attempts=0,
         error_code=null,next_attempt_at=now()
       where environment='test' and status='dead' and error_code='same_version_conflict'
         and notification->>'resourceId'=$1 returning id`,
      [invoiceId],
    )
    assert.equal(retried.rowCount, 1, 'retry exactly the isolated refund event')
  }
  // The Development database clock can lead this Windows host by a few seconds.
  const databaseNow = (await pool.query<{ now: Date }>('select now() as now')).rows[0]!.now
  const worker = new BillingEventWorker(repository, provider, () => databaseNow)
  for (let count = 0; count < 10; count++) if (!(await worker.runOne())) break
  const delivered = await pool.query<{ status: string; count: number }>(
    `select status,count(*)::int as count from app_private.billing_event_inbox
     where notification->>'resourceId' in ($1,$2) group by status`,
    [subscriptionId, invoiceId],
  )
  if (delivered.rows.some((row) => row.status !== 'done')) {
    const failures = await pool.query(
      `select notification->>'eventName' as event_name,notification->>'resourceId' as resource_id,
              status,error_code,attempts from app_private.billing_event_inbox
       where notification->>'resourceId' in ($1,$2) and status<>'done'`,
      [subscriptionId, invoiceId],
    )
    console.error('Unprocessed events:', failures.rows)
    const ledger = await pool.query(
      `select resource->'attributes'->>'status' as status,
              resource->'attributes'->>'updated_at' as updated_at,
              resource->'attributes'->>'refunded_amount' as refunded_amount
         from app_private.billing_invoice_ledger where provider_id=$1`,
      [invoiceId],
    )
    console.error('Invoice comparison:', {
      ledger: ledger.rows,
      provider: {
        status: invoice.attributes.status,
        updated_at: invoice.attributes.updated_at,
        refunded_amount: invoice.attributes.refunded_amount,
      },
    })
  }
  assert.equal(delivered.rows.length, 1, JSON.stringify(delivered.rows))
  assert.equal(delivered.rows[0]!.status, 'done')
  assert.ok(delivered.rows[0]!.count >= 2, 'subscription and invoice events must both arrive')
  const bindings = await pool.query(
    "select provider_id,intent_id,resource->'attributes'->>'status' as status from app_private.billing_subscription_ledger where environment='test' and store_id=$1 and provider_id=$2",
    [config.storeId, subscriptionId],
  )
  assert.deepEqual(bindings.rows, [
    {
      provider_id: subscriptionId,
      intent_id: fixture.intentId,
      status: subscription.attributes.status,
    },
  ])
  const invoices = await pool.query(
    "select provider_id,subscription_id,resource->'attributes'->>'status' as status from app_private.billing_invoice_ledger where environment='test' and store_id=$1 and provider_id=$2",
    [config.storeId, invoiceId],
  )
  assert.deepEqual(invoices.rows, [
    { provider_id: invoiceId, subscription_id: subscriptionId, status: invoice.attributes.status },
  ])
  const identity = { userId: fixture.userId, email: fixture.email }
  const facts = await new PostgresCheckoutRepository(ownerPool).transaction(identity, (tx) =>
    tx.facts(),
  )
  assert.equal(facts.hasEverSubscribed, true)
  assert.equal(facts.hasCurrentSubscription, true)
  assert.equal(facts.hasUnresolvedCheckout, false)
  const access = await new PlanAccessModule(new PostgresPlanAccessRepository(ownerPool)).get(
    identity,
  )
  assert.equal(access.source, 'free', 'ledger alone cannot grant paid access')
  const verifiedAccess = await new PlanAccessModule(
    new PostgresPlanAccessRepository(ownerPool),
    () => databaseNow,
    new PostgresVerifiedBillingAccess(ownerPool, () => databaseNow),
  ).get(identity)
  assert.equal(verifiedAccess.source, 'subscription')
  assert.equal(verifiedAccess.tier, 'basic')
  console.log('PASS: verified paid invoice grants owner-scoped Pro access')
  console.log('PASS: actual Test Mode resources reconciled in Development ledger')
  console.log(
    'Trigger: locally signed recovery events; provider delivery remains separately unverified',
  )
  console.log(`Subscription: ${subscriptionId}; invoice: ${invoiceId}; intent: ${fixture.intentId}`)
} finally {
  await app.close()
  await pool.end()
  await ownerPool.end()
}
