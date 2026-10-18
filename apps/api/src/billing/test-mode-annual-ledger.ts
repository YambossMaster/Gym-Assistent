import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import { PostgresPlanAccessRepository } from '../plan-access/postgres-plan-access-repository.js'
import { PlanAccessModule } from '../plan-access/plan-access.js'
import { localBillingConfiguration } from './lemon-checkout.js'
import { PostgresVerifiedBillingAccess } from './postgres-access-source.js'
import { PostgresBillingManagement } from './postgres-management.js'

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
) as { environment: string; intentId: string; userId: string }
assert.equal(fixture.environment, 'Development/Test Mode')
const worker = new Pool({ connectionString: process.env.BILLING_WORKER_DATABASE_URL })
const owner = new Pool({ connectionString: process.env.DATABASE_URL })
try {
  const bound = await worker.query<{ provider_id: string; variant_id: string }>(
    `select provider_id,resource#>>'{attributes,variant_id}' variant_id
     from app_private.billing_subscription_ledger
     where environment='test' and store_id=$1 and intent_id=$2`,
    [config.storeId, fixture.intentId],
  )
  assert.equal(bound.rowCount, 1)
  const id = bound.rows[0]!.provider_id
  const events = await worker.query<{
    resource_id: string
    kind: string
    status: string
    error_code: string | null
  }>(
    `select notification->>'resourceId' resource_id,notification->>'kind' kind,status,error_code
     from app_private.billing_event_inbox
     where notification->>'storeId'=$1
       and notification->>'resourceId'=any($2::text[])
     order by created_at desc limit 12`,
    [config.storeId, [id, '8746552']],
  )
  const periods = await worker.query<{
    period_key: string
    tier: string
    billing_interval: string
    starts_at: Date
    ends_at: Date
    superseded_at: Date | null
    invoice_id: string
  }>(
    `select period_key,tier,billing_interval,starts_at,ends_at,superseded_at,invoice_id
     from app_private.billing_verified_period
     where environment='test' and store_id=$1 and subscription_id=$2
     order by starts_at`,
    [config.storeId, id],
  )
  const invoice = await worker.query<{ status: string; total: string }>(
    `select resource#>>'{attributes,status}' status,resource#>>'{attributes,total}' total
     from app_private.billing_invoice_ledger
     where environment='test' and store_id=$1 and provider_id='8746552'`,
    [config.storeId],
  )
  const access = await new PlanAccessModule(
    new PostgresPlanAccessRepository(owner),
    undefined,
    new PostgresVerifiedBillingAccess(owner),
  ).get({ userId: fixture.userId })
  const owned = await new PostgresBillingManagement(owner).read({ userId: fixture.userId })
  console.log(
    JSON.stringify({
      subscriptionId: id,
      ledgerVariant:
        Object.entries(config.variants).find(
          ([, variant]) => variant === bound.rows[0]!.variant_id,
        )?.[0] ?? 'unknown',
      events: events.rows,
      annualInvoiceLedger: invoice.rows[0] ?? null,
      periods: periods.rows,
      access: { source: access.source, tier: access.tier },
      ownerBillingPeriod: owned.verifiedPeriod ?? null,
    }),
  )
} finally {
  await worker.end()
  await owner.end()
}
