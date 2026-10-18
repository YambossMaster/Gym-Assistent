import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import { localBillingConfiguration } from './lemon-checkout.js'
import { LemonTestResources } from './lemon-resources.js'

// Single-use, exact-fixture Test Mode probe. No production or store-wide mutation.
const ref = 'yvhijxhtelujfsaplzpi'
assert.equal(process.env.SUPABASE_URL?.replace(/\/$/, ''), `https://${ref}.supabase.co`)
assert.notEqual(process.env.DEPLOYMENT_TARGET, 'production')
assert.deepEqual(process.argv.slice(2), ['--execute-pro-month-to-prime-month'])
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
const fixture = JSON.parse(
  readFileSync(
    resolve(process.cwd(), '../../output/billing-test-mode/fixture-returning-paid-upgrade.json'),
    'utf8',
  ),
) as { environment: string; scenario: string; intentId: string }
assert.equal(fixture.environment, 'Development/Test Mode')
assert.equal(fixture.scenario, 'synthetic-returning-no-trial')
const pool = new Pool({ connectionString: process.env.BILLING_WORKER_DATABASE_URL })
let id: string
try {
  const rows = await pool.query<{ provider_id: string }>(
    `select provider_id from app_private.billing_subscription_ledger
     where environment='test' and store_id=$1 and intent_id=$2`,
    [config.storeId, fixture.intentId],
  )
  assert.equal(rows.rowCount, 1)
  id = rows.rows[0]!.provider_id
  const verified = await pool.query<{ tier: string; origin: string }>(
    `select tier,origin from app_private.billing_verified_period
     where environment='test' and store_id=$1 and subscription_id=$2 and period_key='initial'`,
    [config.storeId, id],
  )
  assert.deepEqual(verified.rows, [{ tier: 'basic', origin: 'payment' }])
} finally {
  await pool.end()
}
const provider = new LemonTestResources({
  key: config.key,
  storeId: config.storeId,
  variantIds: Object.values(config.variants),
})
const before = await provider.get('subscriptions', id)
assert.equal(before.type, 'subscriptions')
assert.equal(before.attributes.status, 'active')
assert.equal(before.attributes.cancelled, false)
assert.equal(before.attributes.trial_ends_at, null)
assert.equal(before.attributes.variant_id, config.variants.basic_month)
const beforeInvoices = await provider.subscriptionInvoices(id)
assert.equal(beforeInvoices.length, 1)
assert.equal(beforeInvoices[0]!.attributes.billing_reason, 'initial')
assert.equal(beforeInvoices[0]!.attributes.status, 'paid')

const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${id}`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${config.key}`,
    Accept: 'application/vnd.api+json',
    'Content-Type': 'application/vnd.api+json',
  },
  body: JSON.stringify({
    data: {
      type: 'subscriptions',
      id,
      attributes: {
        variant_id: Number(config.variants.advanced_month),
        invoice_immediately: true,
        disable_prorations: false,
      },
    },
  }),
  signal: AbortSignal.timeout(15000),
  redirect: 'error',
})
assert.equal(response.status, 200, 'Lemon Test Mode accepted immediate upgrade')
const after = await provider.get('subscriptions', id)
assert.equal(after.type, 'subscriptions')
assert.equal(after.attributes.variant_id, config.variants.advanced_month)
const invoices = await provider.subscriptionInvoices(id)
console.log(
  JSON.stringify({
    subscriptionId: id,
    oldVariant: 'basic_month',
    newVariant: 'advanced_month',
    oldRenewsAt: before.attributes.renews_at,
    newRenewsAt: after.attributes.renews_at,
    subscriptionStatus: after.attributes.status,
    newInvoices: invoices
      .filter((invoice) => !beforeInvoices.some((prior) => prior.id === invoice.id))
      .map((invoice) => ({
        id: invoice.id,
        reason: invoice.attributes.billing_reason,
        status: invoice.attributes.status,
        total: invoice.attributes.total,
        createdAt: invoice.attributes.created_at,
      })),
  }),
)
