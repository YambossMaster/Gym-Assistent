import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import { localBillingConfiguration } from './lemon-checkout.js'
import { LemonTestResources } from './lemon-resources.js'

// Read-only lookup of the isolated Development/Test Mode paid checkout.
const ref = 'yvhijxhtelujfsaplzpi'
assert.equal(process.env.SUPABASE_URL?.replace(/\/$/, ''), `https://${ref}.supabase.co`)
assert.notEqual(process.env.DEPLOYMENT_TARGET, 'production')
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
) as { environment: string; scenario: string; intentId: string; createdAt: string }
assert.equal(fixture.environment, 'Development/Test Mode')
assert.equal(fixture.scenario, 'synthetic-returning-no-trial')
const database = new URL(process.env.BILLING_WORKER_DATABASE_URL!)
assert.ok(
  database.hostname === `db.${ref}.supabase.co` ||
    (database.hostname.endsWith('.pooler.supabase.com') &&
      decodeURIComponent(database.username).endsWith(`.${ref}`)),
)
const pool = new Pool({ connectionString: process.env.BILLING_WORKER_DATABASE_URL })
let subscriptionId: string | null = null
try {
  const ledger = await pool.query<{ provider_id: string }>(
    "select provider_id from app_private.billing_subscription_ledger where environment='test' and store_id=$1 and intent_id=$2",
    [config.storeId, fixture.intentId],
  )
  assert.ok(ledger.rows.length <= 1)
  subscriptionId = ledger.rows[0]?.provider_id ?? null
  const inbox = await pool.query<{ resource_id: string; status: string }>(
    `select notification->>'resourceId' as resource_id,status
       from app_private.billing_event_inbox
      where environment='test' and notification->>'intentId'=$1`,
    [fixture.intentId],
  )
  console.log(JSON.stringify({ subscriptionId, intentEvents: inbox.rows }))
  subscriptionId ??=
    inbox.rows.find((row) => /^[1-9]\d*$/.test(row.resource_id))?.resource_id ?? null
} finally {
  await pool.end()
}
if (!subscriptionId) {
  // The tester may have changed the prefilled email. This lookup is restricted to
  // the exact buyer email they supplied for this isolated Test Mode purchase.
  const buyerEmail = process.env.BILLING_CHECKOUT_EMAIL
  assert.match(buyerEmail ?? '', /^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  const url = new URL('https://api.lemonsqueezy.com/v1/subscriptions')
  url.searchParams.set('filter[user_email]', buyerEmail!)
  url.searchParams.set('filter[store_id]', config.storeId)
  url.searchParams.set('page[size]', '100')
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${config.key}`, Accept: 'application/vnd.api+json' },
    signal: AbortSignal.timeout(15000),
    redirect: 'error',
  })
  assert.equal(response.status, 200)
  const page = (await response.json()) as {
    data?: Array<{ id: string; attributes: { created_at: string } }>
    meta?: { page?: { total?: number } }
  }
  assert.ok(page.meta?.page?.total !== undefined && page.meta.page.total <= 100)
  const recent = (page.data ?? []).filter(
    ({ attributes }) => Date.parse(attributes.created_at) >= Date.parse(fixture.createdAt) - 300000,
  )
  console.log(JSON.stringify({ exactBuyerEmailRecentSubscriptionCount: recent.length }))
  assert.equal(recent.length, 1, 'expect one recent subscription for the supplied buyer email')
  subscriptionId = recent[0]!.id
}
const provider = new LemonTestResources({
  key: config.key,
  storeId: config.storeId,
  variantIds: Object.values(config.variants),
})
const subscription = await provider.get('subscriptions', subscriptionId)
assert.equal(subscription.type, 'subscriptions')
assert.equal(subscription.attributes.variant_id, config.variants.basic_month)
const invoices = await provider.subscriptionInvoices(subscription.id)
assert.equal(invoices.length, 1, 'expect one initial paid invoice')
const invoice = invoices[0]!
assert.equal(invoice.attributes.subscription_id, subscription.id)
assert.equal(invoice.attributes.status, 'paid')
const detailResponse = await fetch(
  `https://api.lemonsqueezy.com/v1/subscription-invoices/${invoice.id}`,
  {
    headers: { Authorization: `Bearer ${config.key}`, Accept: 'application/vnd.api+json' },
    signal: AbortSignal.timeout(15000),
    redirect: 'error',
  },
)
assert.equal(detailResponse.status, 200)
const detail = (await detailResponse.json()) as {
  data: { attributes: Record<string, unknown> }
}
const amounts = detail.data.attributes
console.log(
  JSON.stringify({
    subscriptionId: subscription.id,
    invoiceId: invoice.id,
    subtotal: amounts.subtotal,
    tax: amounts.tax,
    discountTotal: amounts.discount_total,
    total: amounts.total,
    totalUsd: amounts.total_usd,
    currencyRate: amounts.currency_rate,
    currency: amounts.currency,
    billingReason: amounts.billing_reason,
    status: amounts.status,
  }),
)
assert.ok(invoice.attributes.total > 0)
console.log(
  JSON.stringify({
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.attributes.status,
    invoiceId: invoice.id,
    invoiceStatus: invoice.attributes.status,
    invoiceAmount: invoice.attributes.total,
    currency: invoice.attributes.currency,
    trialEndsAt: subscription.attributes.trial_ends_at,
  }),
)
