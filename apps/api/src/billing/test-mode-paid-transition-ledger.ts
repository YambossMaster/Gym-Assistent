import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import { PostgresPlanAccessRepository } from '../plan-access/postgres-plan-access-repository.js'
import { PlanAccessModule } from '../plan-access/plan-access.js'
import { localBillingConfiguration } from './lemon-checkout.js'
import { PostgresVerifiedBillingAccess } from './postgres-access-source.js'

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
  const bound = await worker.query<{ provider_id: string }>(
    `select provider_id from app_private.billing_subscription_ledger
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
    received_at: Date
  }>(
    `select notification->>'resourceId' resource_id,notification->>'kind' kind,status,error_code,
       created_at received_at
     from app_private.billing_event_inbox
     where notification->>'storeId'=$1
       and notification->>'resourceId'=any($2::text[])
     order by created_at desc limit 20`,
    [config.storeId, [id, '8746384']],
  )
  const ledger = await worker.query<{ variant_id: string; period_tier: string }>(
    `select s.resource#>>'{attributes,variant_id}' variant_id,p.tier period_tier
     from app_private.billing_subscription_ledger s
     join app_private.billing_verified_period p
       on p.environment=s.environment and p.store_id=s.store_id
       and p.subscription_id=s.provider_id and p.period_key='initial'
     where s.environment='test' and s.store_id=$1 and s.provider_id=$2`,
    [config.storeId, id],
  )
  const invoice = await worker.query<{ status: string; total: string }>(
    `select resource#>>'{attributes,status}' status,resource#>>'{attributes,total}' total
     from app_private.billing_invoice_ledger
     where environment='test' and store_id=$1 and provider_id='8746384'`,
    [config.storeId],
  )
  const evidence = await worker.query<{
    invoice_id: string
    period_key: string
    period_ends_at: Date
  }>(
    `select invoice_id,period_key,period_ends_at
     from app_private.billing_paid_upgrade_evidence
     where environment='test' and store_id=$1 and subscription_id=$2`,
    [config.storeId, id],
  )
  const access = await new PlanAccessModule(
    new PostgresPlanAccessRepository(owner),
    undefined,
    new PostgresVerifiedBillingAccess(owner),
  ).get({ userId: fixture.userId })
  console.log(
    JSON.stringify({
      subscriptionId: id,
      events: events.rows,
      ledgerVariant:
        Object.entries(config.variants).find(
          ([, variant]) => variant === ledger.rows[0]?.variant_id,
        )?.[0] ?? 'unknown',
      verifiedPeriodTier: ledger.rows[0]?.period_tier,
      upgradeInvoiceLedger: invoice.rows[0] ?? null,
      paidUpgradeEvidence: evidence.rows,
      access: { source: access.source, tier: access.tier },
    }),
  )
} finally {
  await worker.end()
  await owner.end()
}
