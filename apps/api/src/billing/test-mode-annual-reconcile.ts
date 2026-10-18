import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import { localBillingConfiguration } from './lemon-checkout.js'
import { LemonTestResources } from './lemon-resources.js'

// Locally signed notification only; the worker fetches exact real Lemon Test Mode objects.
const ref = 'yvhijxhtelujfsaplzpi'
assert.equal(process.env.SUPABASE_URL?.replace(/\/$/, ''), `https://${ref}.supabase.co`)
assert.notEqual(process.env.DEPLOYMENT_TARGET, 'production')
const replay = process.argv[2] === '--replay-exact-annual-switch'
assert.deepEqual(process.argv.slice(2), [
  replay ? '--replay-exact-annual-switch' : '--queue-exact-annual-switch',
])
const database = new URL(process.env.BILLING_WORKER_DATABASE_URL!)
assert.ok(
  database.hostname === `db.${ref}.supabase.co` ||
    (database.hostname.endsWith('.pooler.supabase.com') &&
      decodeURIComponent(database.username).endsWith(`.${ref}`)),
)
assert.ok(database.username.startsWith('gym_billing_worker_login.'))
const config = localBillingConfiguration({
  ...process.env,
  BILLING_LOCAL_CHECKOUT: 'true',
  BILLING_PROVIDER_TESTS_APPROVED: 'true',
  BILLING_RETURN_URL:
    process.env.BILLING_RETURN_URL ?? 'http://127.0.0.1:5173/settings/payment-status',
})
assert.ok(config)
assert.ok(process.env.LEMON_SQUEEZY_WEBHOOK_SECRET)
const fixture = JSON.parse(
  readFileSync(
    resolve(process.cwd(), '../../output/billing-test-mode/fixture-returning-paid-upgrade.json'),
    'utf8',
  ),
) as { environment: string; scenario: string; intentId: string }
assert.equal(fixture.environment, 'Development/Test Mode')
assert.equal(fixture.scenario, 'synthetic-returning-no-trial')
const pool = new Pool({ connectionString: process.env.BILLING_WORKER_DATABASE_URL })
let subscriptionId: string
try {
  const owned = await pool.query<{ provider_id: string; variant_id: string }>(
    `select provider_id,resource#>>'{attributes,variant_id}' variant_id
     from app_private.billing_subscription_ledger
     where environment='test' and store_id=$1 and intent_id=$2`,
    [config.storeId, fixture.intentId],
  )
  assert.equal(owned.rowCount, 1)
  assert.equal(
    owned.rows[0]!.variant_id,
    replay ? config.variants.advanced_year : config.variants.advanced_month,
  )
  subscriptionId = owned.rows[0]!.provider_id
  const invoice = await pool.query(
    `select 1 from app_private.billing_invoice_ledger
     where environment='test' and store_id=$1 and provider_id='8746552'`,
    [config.storeId],
  )
  assert.equal(invoice.rowCount, replay ? 1 : 0)
} finally {
  await pool.end()
}
const provider = new LemonTestResources({
  key: config.key,
  storeId: config.storeId,
  variantIds: Object.values(config.variants),
})
const subscription = await provider.get('subscriptions', subscriptionId)
const invoice = await provider.get('subscription-invoices', '8746552')
assert.equal(subscription.type, 'subscriptions')
assert.equal(invoice.type, 'subscription-invoices')
assert.equal(subscription.attributes.variant_id, config.variants.advanced_year)
assert.equal(subscription.attributes.status, 'active')
assert.equal(invoice.attributes.subscription_id, subscriptionId)
assert.equal(invoice.attributes.customer_id, subscription.attributes.customer_id)
assert.equal(invoice.attributes.billing_reason, 'updated')
assert.equal(invoice.attributes.status, 'paid')
assert.equal(invoice.attributes.total, 130528)

async function post(eventName: string, type: string, id: string) {
  const body = Buffer.from(
    JSON.stringify({
      meta: {
        event_name: eventName,
        test_mode: true,
        custom_data: { intent_id: fixture.intentId },
        ...(replay ? { replay_probe: true } : {}),
      },
      data: {
        type,
        id,
        attributes: { store_id: Number(config!.storeId), test_mode: true },
      },
    }),
  )
  const signature = createHmac('sha256', process.env.LEMON_SQUEEZY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')
  const response = await fetch('http://127.0.0.1:3008/hooks/lemonsqueezy', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-signature': signature },
    body,
    signal: AbortSignal.timeout(15000),
  })
  assert.equal(response.status, 200)
}
await post('subscription_payment_success', 'subscription-invoices', invoice.id)
await post('subscription_updated', 'subscriptions', subscriptionId)
console.log(
  replay
    ? 'PASS: exact annual paid invoice and subscription replay queued locally'
    : 'PASS: exact annual paid invoice and subscription notifications queued locally',
)
