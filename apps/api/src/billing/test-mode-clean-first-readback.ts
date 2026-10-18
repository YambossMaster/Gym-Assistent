import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import { PostgresPlanAccessRepository } from '../plan-access/postgres-plan-access-repository.js'
import { PlanAccessModule } from '../plan-access/plan-access.js'
import { PostgresVerifiedBillingAccess } from './postgres-access-source.js'
import { PostgresBillingManagement } from './postgres-management.js'
import { localBillingConfiguration } from './lemon-checkout.js'
import { LemonTestResources } from './lemon-resources.js'

const ref = 'yvhijxhtelujfsaplzpi'
assert.equal(process.env.SUPABASE_URL?.replace(/\/$/, ''), `https://${ref}.supabase.co`)
assert.notEqual(process.env.DEPLOYMENT_TARGET, 'production')
const fixture = JSON.parse(
  readFileSync(
    resolve(process.cwd(), '../../output/billing-test-mode/fixture-clean-first-webhook.json'),
    'utf8',
  ),
) as { environment: string; scenario: string; intentId: string; userId: string; email: string }
assert.equal(fixture.environment, 'Development/Test Mode')
assert.equal(fixture.scenario, 'first-trial')
const config = localBillingConfiguration({
  ...process.env,
  BILLING_LOCAL_CHECKOUT: 'true',
  BILLING_PROVIDER_TESTS_APPROVED: 'true',
  BILLING_RETURN_URL:
    process.env.BILLING_RETURN_URL ?? 'http://127.0.0.1:4178/settings/payment-status',
})
assert.ok(config)
const worker = new Pool({ connectionString: process.env.BILLING_WORKER_DATABASE_URL })
const owner = new Pool({ connectionString: process.env.DATABASE_URL })
try {
  const intent = await worker.query(
    "select id,status from app_private.billing_checkout_intent where id=$1 and environment='test'",
    [fixture.intentId],
  )
  const subscriptions = await worker.query<{
    provider_id: string
    variant_id: string
    status: string
  }>(
    `select provider_id,resource#>>'{attributes,variant_id}' variant_id,
            resource#>>'{attributes,status}' status
       from app_private.billing_subscription_ledger
      where environment='test' and store_id=$1 and intent_id=$2`,
    [config.storeId, fixture.intentId],
  )
  const subscription = subscriptions.rows[0]
  const provider = subscription
    ? new LemonTestResources({
        key: config.key,
        storeId: config.storeId,
        variantIds: Object.values(config.variants),
      })
    : null
  const providerSubscription = subscription
    ? await provider!.get('subscriptions', subscription.provider_id)
    : null
  if (providerSubscription && providerSubscription.type !== 'subscriptions') {
    throw new Error('Unexpected provider resource type')
  }
  const providerRawResponse = subscription
    ? await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${subscription.provider_id}`, {
        headers: { Authorization: `Bearer ${config.key}`, Accept: 'application/vnd.api+json' },
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
      })
    : null
  if (providerRawResponse) assert.equal(providerRawResponse.status, 200)
  const providerRaw = providerRawResponse
    ? ((await providerRawResponse.json()) as { data?: { attributes?: { user_email?: unknown } } })
    : null
  const providerInvoices = subscription
    ? await provider!.subscriptionInvoices(subscription.provider_id)
    : []
  const events = await worker.query(
    `select notification->>'kind' kind,status,error_code,attempts,created_at
       from app_private.billing_event_inbox
      where environment='test' and notification->>'intentId'=$1
      order by created_at`,
    [fixture.intentId],
  )
  const periods = subscription
    ? await worker.query(
        `select period_key,tier,billing_interval,starts_at,ends_at,origin,invoice_id
           from app_private.billing_verified_period
          where environment='test' and store_id=$1 and subscription_id=$2
          order by starts_at`,
        [config.storeId, subscription.provider_id],
      )
    : { rows: [] }
  const access = await new PlanAccessModule(
    new PostgresPlanAccessRepository(owner),
    undefined,
    new PostgresVerifiedBillingAccess(owner),
  ).get({ userId: fixture.userId })
  const owned = await new PostgresBillingManagement(owner).read({ userId: fixture.userId })
  console.log(
    JSON.stringify({
      intent: intent.rows,
      subscriptions: subscriptions.rows.map(({ provider_id, variant_id, status }) => ({
        providerId: provider_id,
        variant:
          Object.entries(config.variants).find(([, id]) => id === variant_id)?.[0] ?? 'unknown',
        status,
      })),
      provider: providerSubscription && {
        subscriptionId: providerSubscription.id,
        status: providerSubscription.attributes.status,
        variant:
          Object.entries(config.variants).find(
            ([, id]) => id === String(providerSubscription.attributes.variant_id),
          )?.[0] ?? 'unknown',
        trialEndsAt: providerSubscription.attributes.trial_ends_at,
        buyerEmailMatchesFixture: providerRaw?.data?.attributes?.user_email === fixture.email,
        buyerEmailPresent: typeof providerRaw?.data?.attributes?.user_email === 'string',
        invoices: providerInvoices.map(({ id, attributes }) => ({
          id,
          status: attributes.status,
          total: attributes.total,
          currency: attributes.currency,
        })),
      },
      events: events.rows,
      periods: periods.rows,
      access: { source: access.source, tier: access.tier },
      ownerBillingPeriod: owned.verifiedPeriod ?? null,
    }),
  )
} finally {
  await worker.end()
  await owner.end()
}
