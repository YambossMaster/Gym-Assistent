import assert from 'node:assert/strict'
import { Pool, type PoolClient } from 'pg'
import { PlanAccessModule } from '../plan-access/plan-access.js'
import { PostgresPlanAccessRepository } from '../plan-access/postgres-plan-access-repository.js'
import { LemonTestResources } from './lemon-resources.js'
import { localBillingConfiguration } from './lemon-checkout.js'
import { PostgresVerifiedBillingAccess } from './postgres-access-source.js'
import { billingTransaction } from './postgres-inbox.js'
import { PostgresTrialChange } from './postgres-trial-change.js'
import { TrialChangeModule } from './trial-change.js'
import { billingDevelopmentEnabled } from './release-gate.js'

const developmentRef = 'yvhijxhtelujfsaplzpi'
const subscriptionId = '2609277'
assert.equal(process.env.SUPABASE_URL?.replace(/\/$/, ''), `https://${developmentRef}.supabase.co`)
assert.notEqual(process.env.DEPLOYMENT_TARGET, 'production')
assert.ok(process.env.BILLING_ACCEPTANCE_EMAIL && process.env.BILLING_ACCEPTANCE_PASSWORD)
assert.ok(
  billingDevelopmentEnabled({
    ...process.env,
    DEPLOYMENT_TARGET: 'local',
    BILLING_LOCAL_CHECKOUT: 'true',
    BILLING_LOCAL_LIFECYCLE: 'true',
    BILLING_PROVIDER_TESTS_APPROVED: 'true',
  }),
  'Development/Test Mode database scope',
)
const publishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY
assert.ok(publishableKey, 'Development publishable key')
const config = localBillingConfiguration({
  ...process.env,
  BILLING_LOCAL_CHECKOUT: 'true',
  BILLING_PROVIDER_TESTS_APPROVED: 'true',
  BILLING_RETURN_URL:
    process.env.BILLING_RETURN_URL ?? 'http://127.0.0.1:5173/settings/payment-status',
})
assert.ok(config)

const auth = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: {
    apikey: publishableKey,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    email: process.env.BILLING_ACCEPTANCE_EMAIL,
    password: process.env.BILLING_ACCEPTANCE_PASSWORD,
  }),
})
assert.equal(auth.status, 200, 'Development acceptance sign-in')
const session = (await auth.json()) as { user?: { id?: string } }
assert.match(session.user?.id ?? '', /^[0-9a-f-]{36}$/)
const identity = { userId: session.user!.id! }

const ownerPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10_000,
})
async function withOwner<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  return billingTransaction(ownerPool, async (client) => {
    const workspace = await client.query<{ id: string }>(
      'select id from app_private.workspace where owner_user_id=$1',
      [identity.userId],
    )
    assert.equal(workspace.rowCount, 1, 'isolated Coach workspace')
    await client.query("select set_config('app.current_workspace_id',$1,true)", [
      workspace.rows[0]!.id,
    ])
    return work(client)
  })
}
const provider = new LemonTestResources({
  key: config.key,
  storeId: config.storeId,
  variantIds: Object.values(config.variants),
})
const trialChanges = new TrialChangeModule(
  new PostgresTrialChange(ownerPool, config.variants),
  provider,
)
try {
  const owned = await withOwner((client) =>
    client.query<{ subscription_id: string }>(
      `select p.subscription_id from app_private.workspace w
     join app_private.billing_verified_period p on p.workspace_id=w.id and p.environment='test'
     where w.owner_user_id=$1 and p.subscription_id=$2`,
      [identity.userId, subscriptionId],
    ),
  )
  assert.deepEqual(owned.rows, [{ subscription_id: subscriptionId }], 'isolated subscription owner')

  const before = await provider.get('subscriptions', subscriptionId)
  assert.equal(before.type, 'subscriptions')
  assert.equal(before.attributes.status, 'on_trial')
  const trialEnd = before.attributes.trial_ends_at!
  const beforeInvoices = await provider.subscriptionInvoices(subscriptionId)
  if (before.attributes.variant_id !== config.variants.advanced_month) {
    assert.equal(before.attributes.variant_id, config.variants.advanced_year)
    assert.deepEqual(await trialChanges.change(identity, { tier: 'advanced', interval: 'month' }), {
      status: 'confirmed',
    })
  }
  const reset = await provider.get('subscriptions', subscriptionId)
  assert.equal(reset.type, 'subscriptions')
  assert.equal(reset.attributes.variant_id, config.variants.advanced_month)
  assert.equal(reset.attributes.trial_ends_at, trialEnd)
  assert.equal(reset.attributes.renews_at, trialEnd)
  const resetInvoices = await provider.subscriptionInvoices(subscriptionId)
  assert.ok(
    resetInvoices
      .filter((invoice) => !beforeInvoices.some((prior) => prior.id === invoice.id))
      .every((invoice) => invoice.attributes.total === 0),
    'reset created no positive invoice',
  )

  const result = await trialChanges.change(identity, { tier: 'advanced', interval: 'year' })
  assert.deepEqual(result, { status: 'confirmed' })
  const afterChangeInvoices = await provider.subscriptionInvoices(subscriptionId)
  const changeInvoices = afterChangeInvoices.filter(
    (invoice) => !resetInvoices.some((prior) => prior.id === invoice.id),
  )
  assert.equal(changeInvoices.length, 1, 'one provider invoice for the trial change')
  assert.deepEqual(
    {
      reason: changeInvoices[0]?.attributes.billing_reason,
      status: changeInvoices[0]?.attributes.status,
      total: changeInvoices[0]?.attributes.total,
    },
    { reason: 'updated', status: 'paid', total: 0 },
  )
  const replay = await trialChanges.change(identity, { tier: 'advanced', interval: 'year' })
  assert.deepEqual(replay, { status: 'unchanged' })
  const replayInvoices = await provider.subscriptionInvoices(subscriptionId)
  assert.deepEqual(
    replayInvoices.map((invoice) => invoice.id).sort(),
    afterChangeInvoices.map((invoice) => invoice.id).sort(),
    'replay must not create another provider invoice',
  )

  const verified = await withOwner((client) =>
    client.query<{
      status: string
      target_tier: string
      target_interval: string
      baseline_invoice_ids: unknown
      tier: string
      billing_interval: string
    }>(
      `select c.status,c.target_tier,c.target_interval,c.baseline_invoice_ids,
            p.tier,p.billing_interval
     from app_private.workspace w
     join app_private.billing_trial_change c on c.workspace_id=w.id and c.environment='test'
     join app_private.billing_verified_period p on p.workspace_id=w.id and p.environment='test'
       and p.subscription_id=c.subscription_id and p.period_key='initial'
     where w.owner_user_id=$1 and c.subscription_id=$2
     order by c.confirmed_at desc limit 1`,
      [identity.userId, subscriptionId],
    ),
  )
  assert.deepEqual(
    {
      status: verified.rows[0]?.status,
      target: [verified.rows[0]?.target_tier, verified.rows[0]?.target_interval],
      rights: [verified.rows[0]?.tier, verified.rows[0]?.billing_interval],
      baselineStored: Array.isArray(verified.rows[0]?.baseline_invoice_ids),
    },
    {
      status: 'confirmed',
      target: ['advanced', 'year'],
      rights: ['advanced', 'year'],
      baselineStored: true,
    },
  )
  const plan = await new PlanAccessModule(
    new PostgresPlanAccessRepository(ownerPool),
    undefined,
    new PostgresVerifiedBillingAccess(ownerPool),
  ).get(identity)
  assert.deepEqual(
    { source: plan.source, tier: plan.tier, billingEndsAt: plan.billingEndsAt },
    { source: 'subscription', tier: 'advanced', billingEndsAt: new Date(trialEnd).toISOString() },
  )
  const finalSubscription = await provider.get('subscriptions', subscriptionId)
  assert.equal(finalSubscription.type, 'subscriptions')
  assert.equal(finalSubscription.attributes.variant_id, config.variants.advanced_year)
  assert.equal(finalSubscription.attributes.trial_ends_at, trialEnd)
  assert.equal(finalSubscription.attributes.renews_at, trialEnd)
  const finalInvoices = await provider.subscriptionInvoices(subscriptionId)
  assert.ok(
    finalInvoices
      .filter((invoice) => !resetInvoices.some((prior) => prior.id === invoice.id))
      .every((invoice) => invoice.attributes.total === 0),
    'integrated change created no positive invoice',
  )
  console.log(
    'PASS: owner-scoped Development/Test Mode trial change kept one subscription, the original trial end and zero immediate charge',
  )
} finally {
  await ownerPool.end()
}
