import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import { localBillingConfiguration } from './lemon-checkout.js'
import { LemonTestResources } from './lemon-resources.js'

// One exact dead-letter from the isolated Development upgrade; no broad retry.
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
) as { environment: string; intentId: string }
assert.equal(fixture.environment, 'Development/Test Mode')
const pool = new Pool({ connectionString: process.env.BILLING_WORKER_DATABASE_URL })
try {
  const owned = await pool.query<{ provider_id: string }>(
    `select provider_id from app_private.billing_subscription_ledger
     where environment='test' and store_id=$1 and intent_id=$2`,
    [config.storeId, fixture.intentId],
  )
  assert.equal(owned.rowCount, 1)
  const id = owned.rows[0]!.provider_id
  const provider = new LemonTestResources({
    key: config.key,
    storeId: config.storeId,
    variantIds: Object.values(config.variants),
  })
  const subscription = await provider.get('subscriptions', id)
  const invoice = await provider.get('subscription-invoices', '8746384')
  assert.equal(subscription.type, 'subscriptions')
  assert.equal(invoice.type, 'subscription-invoices')
  assert.equal(subscription.attributes.variant_id, config.variants.advanced_month)
  assert.equal(invoice.attributes.subscription_id, id)
  assert.equal(invoice.attributes.customer_id, subscription.attributes.customer_id)
  assert.equal(invoice.attributes.billing_reason, 'updated')
  assert.equal(invoice.attributes.status, 'paid')
  if (process.argv.includes('--replay')) {
    const evidence = await pool.query(
      `select invoice_id from app_private.billing_paid_upgrade_evidence
       where environment='test' and store_id=$1 and subscription_id=$2 and invoice_id=$3`,
      [config.storeId, id, invoice.id],
    )
    assert.equal(evidence.rowCount, 1)
    const digest = createHash('sha256')
      .update(`paid-upgrade-idempotence:${id}:${invoice.id}`)
      .digest('hex')
    const inserted = await pool.query(
      `insert into app_private.billing_event_inbox(digest,notification)
       values($1,$2) on conflict(environment,digest) do nothing returning id`,
      [
        digest,
        JSON.stringify({
          digest,
          storeId: config.storeId,
          kind: 'subscriptions',
          resourceId: id,
          intentId: fixture.intentId,
        }),
      ],
    )
    assert.ok(inserted.rowCount === 0 || inserted.rowCount === 1)
    console.log('PASS: exact subscription replay queued once')
  } else {
    const result = await pool.query(
      `update app_private.billing_event_inbox
       set status='queued',attempts=0,error_code=null,next_attempt_at=now()
       where id=(
         select id from app_private.billing_event_inbox
         where status='dead' and error_code='period_variant_mismatch'
           and notification->>'storeId'=$1 and notification->>'resourceId'=$2
           and notification->>'kind'='subscriptions'
         order by created_at desc limit 1
       ) returning id`,
      [config.storeId, id],
    )
    assert.equal(result.rowCount, 1)
    console.log('PASS: exact paid-upgrade dead-letter queued for Development worker')
  }
} finally {
  await pool.end()
}
