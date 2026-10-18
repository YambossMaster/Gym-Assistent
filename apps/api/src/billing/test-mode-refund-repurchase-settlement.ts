import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import { PostgresVerifiedBillingAccess } from './postgres-access-source.js'
import { PostgresBillingManagement } from './postgres-management.js'

// Read-only Development/Test Mode settlement snapshot. No customer details or provider payloads.
const ref = 'yvhijxhtelujfsaplzpi'
assert.equal(process.env.SUPABASE_URL?.replace(/\/$/, ''), `https://${ref}.supabase.co`)
assert.notEqual(process.env.DEPLOYMENT_TARGET, 'production')
for (const value of [process.env.DATABASE_URL, process.env.BILLING_WORKER_DATABASE_URL]) {
  const url = new URL(value!)
  assert.ok(
    url.hostname === `db.${ref}.supabase.co` ||
      (url.hostname.endsWith('.pooler.supabase.com') &&
        decodeURIComponent(url.username).endsWith(`.${ref}`)),
  )
}
const fixture = JSON.parse(
  readFileSync(
    resolve(process.cwd(), '../../output/billing-test-mode/fixture-returning-paid-upgrade.json'),
    'utf8',
  ),
) as { environment: string; userId: string }
assert.equal(fixture.environment, 'Development/Test Mode')
const api = new Pool({ connectionString: process.env.DATABASE_URL })
const worker = new Pool({ connectionString: process.env.BILLING_WORKER_DATABASE_URL })
try {
  const owner = { userId: fixture.userId }
  const workspace = await api.query<{ id: string }>(
    'select id from app_private.workspace where owner_user_id=$1',
    [owner.userId],
  )
  assert.equal(workspace.rowCount, 1)
  const id = workspace.rows[0]!.id
  const intents = await worker.query<{ id: string; status: string; activation: string | null }>(
    `select id,status,intent->>'activation' activation
     from app_private.billing_checkout_intent
     where environment='test' and workspace_id=$1 order by created_at desc limit 2`,
    [id],
  )
  const current = intents.rows[0]
  assert.ok(current)
  const subs = await worker.query<{
    provider_id: string
    intent_id: string
    status: string
    cancelled: boolean
  }>(
    `select provider_id,intent_id,resource#>>'{attributes,status}' status,
       (resource#>>'{attributes,cancelled}')::boolean cancelled
     from app_private.billing_subscription_ledger
     where environment='test' and workspace_id=$1 order by provider_id`,
    [id],
  )
  const invoices = await worker.query<{
    provider_id: string
    subscription_id: string
    status: string
    total: number
    refunded: number
  }>(
    `select provider_id,subscription_id,resource#>>'{attributes,status}' status,
       (resource#>>'{attributes,total}')::integer total,
       (resource#>>'{attributes,refunded_amount}')::integer refunded
     from app_private.billing_invoice_ledger
     where environment='test' and workspace_id=$1 order by provider_id desc limit 5`,
    [id],
  )
  const periods = await worker.query<{
    subscription_id: string
    tier: string
    origin: string
    superseded: boolean
    ends_at: Date
  }>(
    `select subscription_id,tier,origin,(superseded_at is not null) superseded,ends_at
     from app_private.billing_verified_period
     where environment='test' and workspace_id=$1 order by starts_at desc limit 5`,
    [id],
  )
  const events = await worker.query<{
    kind: string
    status: string
    attempts: number
    error_code: string | null
  }>(
    `select notification->>'kind' kind,status,attempts,error_code
     from app_private.billing_event_inbox
     where environment='test' and notification->>'intentId'=$1
     order by created_at desc limit 6`,
    [current.id],
  )
  const access = await new PostgresVerifiedBillingAccess(api).get(owner)
  const management = await new PostgresBillingManagement(api).read(owner)
  console.log(
    JSON.stringify({
      currentIntent: current,
      subscriptions: subs.rows,
      invoices: invoices.rows,
      periods: periods.rows,
      events: events.rows,
      access,
      managementPeriod: management.verifiedPeriod,
    }),
  )
} finally {
  await Promise.all([api.end(), worker.end()])
}
