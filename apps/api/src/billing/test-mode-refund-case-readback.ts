import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import { PlanAccessModule } from '../plan-access/plan-access.js'
import { PostgresPlanAccessRepository } from '../plan-access/postgres-plan-access-repository.js'
import { PostgresVerifiedBillingAccess } from './postgres-access-source.js'

// Exact Development/Test Mode case readback, without printing the Coach identity.
const ref = 'yvhijxhtelujfsaplzpi'
assert.equal(process.env.SUPABASE_URL?.replace(/\/$/, ''), `https://${ref}.supabase.co`)
assert.notEqual(process.env.DEPLOYMENT_TARGET, 'production')
const workerUrl = new URL(process.env.BILLING_WORKER_DATABASE_URL!)
const apiUrl = new URL(process.env.DATABASE_URL!)
for (const url of [workerUrl, apiUrl]) {
  assert.ok(
    url.hostname === `db.${ref}.supabase.co` ||
      (url.hostname.endsWith('.pooler.supabase.com') &&
        decodeURIComponent(url.username).endsWith(`.${ref}`)),
  )
}
const worker = new Pool({ connectionString: process.env.BILLING_WORKER_DATABASE_URL })
const api = new Pool({ connectionString: process.env.DATABASE_URL })
try {
  const fixture = JSON.parse(
    readFileSync(
      resolve(process.cwd(), '../../output/billing-test-mode/fixture-returning-paid-upgrade.json'),
      'utf8',
    ),
  ) as { environment: string; intentId: string; userId: string }
  assert.equal(fixture.environment, 'Development/Test Mode')
  const target = await worker.query<{ case_ref: string }>(
    `select c.case_ref
     from app_private.billing_refund_case c
     join app_private.billing_refund_case_application a on a.case_id=c.id
     join app_private.billing_subscription_ledger s
       on s.environment=c.environment and s.store_id=c.store_id
       and s.provider_id=c.subscription_id and s.workspace_id=c.workspace_id
     where c.environment='test' and c.case_ref='R11-ANNUAL-FULL-8746552'
       and c.invoice_id='8746552' and c.subscription_id='2614493'
       and s.intent_id=$1`,
    [fixture.intentId],
  )
  assert.equal(target.rowCount, 1)
  const identity = { userId: fixture.userId }
  const subscription = await new PostgresVerifiedBillingAccess(api).get(identity)
  const plan = await new PlanAccessModule(
    new PostgresPlanAccessRepository(api),
    undefined,
    new PostgresVerifiedBillingAccess(api),
  ).get(identity)
  assert.equal(subscription, null, 'refunded period must not grant subscription access')
  assert.equal(plan.source, 'free', 'this isolated owner has no independent paid grant')
  assert.equal(plan.tier, 'free')
  console.log(
    JSON.stringify({
      caseRef: target.rows[0]!.case_ref,
      subscriptionAccess: null,
      plan: {
        source: plan.source,
        tier: plan.tier,
        studentLimit: plan.studentLimit,
        venueLimit: plan.venueLimit,
      },
    }),
  )
} finally {
  await Promise.all([worker.end(), api.end()])
}
