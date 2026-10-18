import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import { localBillingConfiguration } from './lemon-checkout.js'
import { LemonTestResources } from './lemon-resources.js'

// Exact, read-only Development fixture inspection. Never enumerate store customers.
const ref = 'yvhijxhtelujfsaplzpi'
assert.equal(process.env.SUPABASE_URL?.replace(/\/$/, ''), `https://${ref}.supabase.co`)
assert.notEqual(process.env.DEPLOYMENT_TARGET, 'production')
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
  const result = await pool.query<{ provider_id: string }>(
    `select provider_id from app_private.billing_subscription_ledger
     where environment='test' and store_id=$1 and intent_id=$2`,
    [config.storeId, fixture.intentId],
  )
  assert.equal(result.rows.length, 1, 'one subscription bound to the exact test intent')
  id = result.rows[0]!.provider_id
} finally {
  await pool.end()
}
const provider = new LemonTestResources({
  key: config.key,
  storeId: config.storeId,
  variantIds: Object.values(config.variants),
})
const subscription = await provider.get('subscriptions', id)
assert.equal(subscription.type, 'subscriptions')
const invoices = await provider.subscriptionInvoices(id)
console.log(
  JSON.stringify({
    subscriptionId: id,
    status: subscription.attributes.status,
    updatedAt: subscription.attributes.updated_at,
    variant:
      Object.entries(config.variants).find(
        ([, variant]) => variant === subscription.attributes.variant_id,
      )?.[0] ?? 'unknown',
    renewsAt: subscription.attributes.renews_at,
    trialEndsAt: subscription.attributes.trial_ends_at,
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      reason: invoice.attributes.billing_reason,
      status: invoice.attributes.status,
      total: invoice.attributes.total,
      subtotal: invoice.attributes.subtotal,
      subtotalUsd: invoice.attributes.subtotal_usd,
      currencyRate: invoice.attributes.currency_rate,
      createdAt: invoice.attributes.created_at,
    })),
  }),
)

const webhooksUrl = new URL('https://api.lemonsqueezy.com/v1/webhooks')
webhooksUrl.searchParams.set('filter[store_id]', config.storeId)
webhooksUrl.searchParams.set('page[size]', '100')
const response = await fetch(webhooksUrl, {
  headers: { Authorization: `Bearer ${config.key}`, Accept: 'application/vnd.api+json' },
  signal: AbortSignal.timeout(15000),
  redirect: 'error',
})
assert.equal(response.status, 200, 'read Test Mode webhook configuration')
const body = (await response.json()) as {
  data?: Array<{
    id: string
    attributes: { store_id: number; test_mode: boolean; url: string; events: string[] }
  }>
  meta?: { page?: { total?: number } }
}
assert.ok(body.meta?.page?.total !== undefined && body.meta.page.total <= 100)
const hooks = (body.data ?? [])
  .filter(
    (hook) => String(hook.attributes.store_id) === config.storeId && hook.attributes.test_mode,
  )
  .map((hook) => ({
    id: hook.id,
    endpoint: (() => {
      const url = new URL(hook.attributes.url)
      return `${url.origin}${url.pathname}`
    })(),
    events: hook.attributes.events,
  }))
console.log(JSON.stringify({ testModeWebhooks: hooks }))
