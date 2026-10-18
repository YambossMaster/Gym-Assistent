import assert from 'node:assert/strict'
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto'
import Fastify from 'fastify'
import { Pool } from 'pg'
import { PostgresStudentRepository } from '../adapters/postgres-student-repository.js'
import { PlanAccessModule } from '../plan-access/plan-access.js'
import { PostgresPlanAccessRepository } from '../plan-access/postgres-plan-access-repository.js'
import { supabaseAdminHeaders } from '../supabase-admin-headers.js'
import { CheckoutModule } from './checkout.js'
import { BillingEventInbox, BillingEventWorker, billingWebhookRoutes } from './event-inbox.js'
import { PostgresCheckoutRepository } from './postgres-checkout.js'
import { PostgresBillingInbox } from './postgres-inbox.js'
import { PostgresBillingManagement } from './postgres-management.js'
import type { InvoiceResource, SubscriptionResource } from './resources.js'

// Isolated Development SQL check. Fake resources only; no Lemon Squeezy request.
const ref = 'yvhijxhtelujfsaplzpi'
const supabaseUrl = `https://${ref}.supabase.co`
assert.equal(process.env.SUPABASE_URL?.replace(/\/$/, ''), supabaseUrl)
assert.notEqual(process.env.DEPLOYMENT_TARGET, 'production')
const apiUrl = new URL(process.env.DATABASE_URL!)
const workerUrl = new URL(process.env.BILLING_WORKER_DATABASE_URL!)
for (const url of [apiUrl, workerUrl]) {
  assert.ok(
    url.hostname === `db.${ref}.supabase.co` ||
      (url.hostname.endsWith('.pooler.supabase.com') &&
        decodeURIComponent(url.username).endsWith(`.${ref}`)),
    'Development database only',
  )
}
assert.ok(workerUrl.username.startsWith('gym_billing_worker_login.'))
const secret = process.env.SUPABASE_SECRET_KEY!
assert.ok(secret)

const ownerPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
})
const workerPool = new Pool({
  connectionString: process.env.BILLING_WORKER_DATABASE_URL,
  connectionTimeoutMillis: 10000,
  max: 3,
})
const users: string[] = []
const reservedEmails: string[] = []
const digests: string[] = []
const storeId = '999999'
const subscriptionId = String(Date.now())
const invoiceId = String(Date.now() + 1)
const customerId = String(Date.now() + 2)

async function actor() {
  const email = `billing-ledger-${randomUUID()}@example.com`
  const password = randomBytes(24).toString('base64url')
  await ownerPool.query(
    `insert into app_private.account_reporting_test_intent(email,test_kind,actor,reason,expires_at)
     values($1,'automation','billing-ledger-smoke','Isolated Development ledger check',now()+interval '15 minutes')`,
    [email],
  )
  reservedEmails.push(email)
  const created = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
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
  await new PostgresStudentRepository(ownerPool).resolveWorkspace({ userId: user.id })
  const classification = await ownerPool.query<{ account_class: string; test_kind: string }>(
    'select account_class,test_kind from app_private.account_reporting_classification where user_id=$1',
    [user.id],
  )
  assert.deepEqual(classification.rows, [{ account_class: 'test', test_kind: 'automation' }])
  return { userId: user.id, email }
}

async function receive(
  repository: PostgresBillingInbox,
  notification: {
    kind: 'subscriptions' | 'subscription-invoices'
    resourceId: string
    intentId: string | null
  },
) {
  const digest = randomBytes(32).toString('hex')
  digests.push(digest)
  await repository.receive({ digest, storeId, ...notification })
  return digest
}

try {
  const owner = await actor()
  const foreign = await actor()
  const permissions = await workerPool.query<{
    current_user: string
    inbox_crud: boolean
    intent_read: boolean
    workspace_read: boolean
  }>(
    `select current_user,
      has_table_privilege(current_user,'app_private.billing_event_inbox','select,insert,update,delete') as inbox_crud,
      has_table_privilege(current_user,'app_private.billing_checkout_intent','select') as intent_read,
      has_table_privilege(current_user,'app_private.workspace','select') as workspace_read`,
  )
  assert.equal(permissions.rows[0]?.current_user, 'gym_billing_worker_login')
  assert.equal(permissions.rows[0]?.inbox_crud, true)
  assert.equal(permissions.rows[0]?.intent_read, true)
  assert.equal(permissions.rows[0]?.workspace_read, false)

  const checkout = new CheckoutModule(new PostgresCheckoutRepository(ownerPool), {
    ready: () => true,
    create: async () => ({
      id: randomUUID(),
      url: 'https://isolated.lemonsqueezy.com/checkout/fixture',
    }),
  })
  const quote = await checkout.quote(owner, { tier: 'basic', interval: 'month' })
  const intent = await checkout.begin(owner, {
    quoteId: quote.id,
    termsVersion: quote.termsVersion,
  })
  assert.equal(intent.status, 'open')
  const variants = { basic_month: process.env.LEMON_PRO_MONTH_VARIANT! }
  assert.ok(variants.basic_month)
  const repository = new PostgresBillingInbox(workerPool, variants)
  const createdAt = new Date().toISOString()
  const subscription: SubscriptionResource = {
    type: 'subscriptions',
    id: subscriptionId,
    attributes: {
      store_id: storeId,
      customer_id: customerId,
      test_mode: true,
      created_at: createdAt,
      updated_at: createdAt,
      variant_id: variants.basic_month,
      status: 'active',
      cancelled: false,
      trial_ends_at: null,
      renews_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      ends_at: null,
    },
  }
  const webhookSecret = randomBytes(24).toString('base64url')
  const webhook = Fastify()
  billingWebhookRoutes(webhook, new BillingEventInbox(repository, storeId, webhookSecret))
  const raw = Buffer.from(
    JSON.stringify({
      meta: {
        event_name: 'subscription_created',
        test_mode: true,
        custom_data: { intent_id: intent.id },
      },
      data: {
        ...subscription,
        attributes: { ...subscription.attributes, store_id: Number(storeId) },
      },
    }),
  )
  const digest = createHash('sha256').update(raw).digest('hex')
  digests.push(digest)
  const sign = (body: Buffer) => createHmac('sha256', webhookSecret).update(body).digest('hex')
  const send = (body: Buffer, signature: string) =>
    webhook.inject({
      method: 'POST',
      url: '/hooks/lemonsqueezy',
      headers: { 'content-type': 'application/json', 'x-signature': signature },
      payload: body,
    })
  try {
    assert.equal((await send(raw, sign(Buffer.from('tampered')))).statusCode, 401)
    assert.equal((await send(raw, sign(raw))).statusCode, 200)
    assert.equal((await send(raw, sign(raw))).statusCode, 200, 'duplicate webhook acknowledged')
  } finally {
    await webhook.close()
  }
  const inboxRow = await workerPool.query<{ status: string; ready: boolean }>(
    'select status,next_attempt_at<=now() as ready from app_private.billing_event_inbox where digest=$1',
    [digest],
  )
  assert.deepEqual(inboxRow.rows, [{ status: 'queued', ready: true }], 'worker sees queued event')
  // The Development database clock can be ahead of the local host clock.
  const databaseNow = (await workerPool.query<{ now: Date }>('select now() as now')).rows[0]!.now
  const claimAt = new Date(databaseNow.getTime() + 5000)
  const claimed = await Promise.all([repository.claim(claimAt), repository.claim(claimAt)])
  const first = claimed.find((job) => job !== null)
  assert.ok(first, 'one worker claimed the event')
  assert.equal(claimed.filter(Boolean).length, 1, 'duplicate worker cannot claim the same lease')
  const takeoverAt = new Date(claimAt.getTime() + 61000)
  const takeover = await repository.claim(takeoverAt)
  assert.equal(takeover?.id, first.id, 'expired lease is recoverable')
  await assert.rejects(repository.commit(first, subscription, takeoverAt), /lease_lost/)
  await repository.commit(takeover!, subscription, takeoverAt)

  const management = new PostgresBillingManagement(ownerPool)
  assert.equal((await management.read(owner)).subscriptions.length, 1)
  assert.equal((await management.read(foreign)).subscriptions.length, 0, 'foreign read isolated')
  const checkoutFacts = await new PostgresCheckoutRepository(ownerPool).transaction(owner, (tx) =>
    tx.facts(),
  )
  assert.equal(
    checkoutFacts.hasEverSubscribed,
    true,
    'verified subscription suppresses first trial',
  )
  assert.equal(checkoutFacts.hasCurrentSubscription, true, 'current subscription blocks checkout')
  const foreignFacts = await new PostgresCheckoutRepository(ownerPool).transaction(foreign, (tx) =>
    tx.facts(),
  )
  assert.equal(foreignFacts.hasEverSubscribed, false, 'foreign subscription does not consume trial')
  assert.equal(foreignFacts.hasCurrentSubscription, false, 'foreign subscription does not block')
  await assert.rejects(
    checkout.quote(owner, { tier: 'advanced', interval: 'month' }),
    /already_subscribed/,
  )
  const invoice: InvoiceResource = {
    type: 'subscription-invoices',
    id: invoiceId,
    attributes: {
      store_id: storeId,
      customer_id: customerId,
      test_mode: true,
      created_at: createdAt,
      updated_at: createdAt,
      subscription_id: subscriptionId,
      billing_reason: 'initial',
      currency: 'TWD',
      status: 'paid',
      subtotal: 11500,
      subtotal_usd: 11500,
      currency_rate: '1',
      total: 11500,
      refunded_amount: 0,
    },
  }
  await receive(repository, {
    kind: 'subscription-invoices',
    resourceId: invoiceId,
    intentId: null,
  })
  let invoiceFetches = 0
  let workerNow = takeoverAt.getTime() + 1000
  const invoiceWorker = new BillingEventWorker(
    repository,
    {
      get: async (kind, id) => {
        assert.equal(kind, 'subscription-invoices')
        assert.equal(id, invoiceId)
        if (invoiceFetches++ === 0) throw new Error('synthetic temporary provider failure')
        return invoice
      },
    },
    () => new Date(workerNow),
  )
  assert.equal(await invoiceWorker.runOne(), true, 'first provider fetch attempted')
  assert.equal(
    (await management.read(owner)).invoices.length,
    0,
    'failed fetch cannot create invoice',
  )
  workerNow += 6000
  assert.equal(await invoiceWorker.runOne(), true, 'retry fetches current provider resource')
  assert.equal(invoiceFetches, 2)
  assert.equal((await management.read(owner)).invoices.length, 1)
  assert.equal((await management.read(foreign)).invoices.length, 0, 'foreign invoice isolated')
  const plan = await new PlanAccessModule(new PostgresPlanAccessRepository(ownerPool)).get(owner)
  assert.equal(plan.source, 'free', 'ledger without a verified period cannot grant paid access')

  const refunded: InvoiceResource = {
    ...invoice,
    attributes: {
      ...invoice.attributes,
      updated_at: new Date(Date.parse(createdAt) + 1000).toISOString(),
      status: 'partial_refund',
      refunded_amount: 100,
    },
  }
  await receive(repository, {
    kind: 'subscription-invoices',
    resourceId: invoiceId,
    intentId: null,
  })
  const refundAt = new Date(workerNow + 1000)
  const refundJob = await repository.claim(refundAt)
  assert.ok(refundJob)
  await repository.commit(refundJob, refunded, refundAt)
  assert.equal((await management.read(owner)).invoices[0]?.attributes.refunded_amount, 100)
  await assert.rejects(management.claimCancellation(foreign), /no_subscription/)
  const cancellation = await management.claimCancellation(owner)
  assert.equal(cancellation.dispatch, true)
  assert.equal((await management.claimCancellation(owner)).dispatch, false, 'same pending command')
  const cancelled: SubscriptionResource = {
    ...subscription,
    attributes: {
      ...subscription.attributes,
      updated_at: new Date(Date.parse(createdAt) + 2000).toISOString(),
      status: 'cancelled',
      cancelled: true,
      ends_at: subscription.attributes.renews_at,
    },
  }
  await management.confirmCancellation(owner, cancellation, cancelled)
  assert.equal((await management.read(owner)).subscriptions[0]?.attributes.cancelled, true)
  await receive(repository, { kind: 'subscriptions', resourceId: subscriptionId, intentId: null })
  const cancellationAt = new Date(refundAt.getTime() + 1000)
  const cancellationJob = await repository.claim(cancellationAt)
  assert.ok(cancellationJob)
  await repository.commit(cancellationJob, cancelled, cancellationAt)
  const cancelledFacts = await new PostgresCheckoutRepository(ownerPool).transaction(owner, (tx) =>
    tx.facts(),
  )
  assert.equal(
    cancelledFacts.hasCurrentSubscription,
    true,
    'cancelled current period blocks checkout',
  )
  const expired: SubscriptionResource = {
    ...subscription,
    attributes: {
      ...subscription.attributes,
      updated_at: new Date(Date.parse(createdAt) + 3000).toISOString(),
      status: 'expired',
      cancelled: true,
      ends_at: new Date(Date.now() - 1000).toISOString(),
    },
  }
  await receive(repository, { kind: 'subscriptions', resourceId: subscriptionId, intentId: null })
  const expiryAt = new Date(cancellationAt.getTime() + 1000)
  const expiryJob = await repository.claim(expiryAt)
  assert.ok(expiryJob)
  await repository.commit(expiryJob, expired, expiryAt)
  const expiredFacts = await new PostgresCheckoutRepository(ownerPool).transaction(owner, (tx) =>
    tx.facts(),
  )
  assert.equal(
    expiredFacts.hasEverSubscribed,
    true,
    'expired subscription never restores first trial',
  )
  assert.equal(expiredFacts.hasCurrentSubscription, false, 'expired subscription no longer active')
  console.log(
    'PASS: Development worker SQL, duplicate/lease recovery, owner RLS, invoice refund, cancellation and no paid grant',
  )
} finally {
  if (digests.length)
    await workerPool.query(
      'delete from app_private.billing_event_inbox where digest=any($1::text[])',
      [digests],
    )
  let cleanupFailed = false
  for (const id of users) {
    const removed = await fetch(`${supabaseUrl}/auth/v1/admin/users/${id}`, {
      method: 'DELETE',
      headers: supabaseAdminHeaders(secret),
    })
    if (!removed.ok) cleanupFailed = true
  }
  if (reservedEmails.length)
    await ownerPool.query(
      'delete from app_private.account_reporting_test_intent where email=any($1::text[])',
      [reservedEmails],
    )
  const remaining = await ownerPool.query<{ count: string }>(
    'select count(*) from app_private.workspace where owner_user_id=any($1::uuid[])',
    [users],
  )
  await workerPool.end()
  await ownerPool.end()
  assert.equal(cleanupFailed, false, 'isolated Auth cleanup')
  assert.equal(remaining.rows[0]!.count, '0', 'isolated Workspace cleanup')
  console.log('PASS: isolated Development fixtures cleaned up')
}
