import assert from 'node:assert/strict'
import { Pool } from 'pg'

// Read-only Development/Test Mode evidence for one isolated provider subscription.
const ref = 'yvhijxhtelujfsaplzpi'
assert.equal(process.env.SUPABASE_URL?.replace(/\/$/, ''), `https://${ref}.supabase.co`)
assert.notEqual(process.env.DEPLOYMENT_TARGET, 'production')
const [subscriptionId] = process.argv.slice(2)
assert.match(subscriptionId ?? '', /^[1-9]\d*$/)
assert.equal(process.argv.length, 3)
const database = new URL(process.env.BILLING_WORKER_DATABASE_URL!)
assert.ok(
  database.hostname === `db.${ref}.supabase.co` ||
    (database.hostname.endsWith('.pooler.supabase.com') &&
      decodeURIComponent(database.username).endsWith(`.${ref}`)),
)
assert.ok(database.username.startsWith('gym_billing_worker_login.'))
const pool = new Pool({ connectionString: process.env.BILLING_WORKER_DATABASE_URL, max: 1 })
try {
  const [inbox, subscriptions, periods, invoices] = await Promise.all([
    pool.query<{ status: string; error_code: string | null; attempts: number }>(
      `select status,error_code,attempts from app_private.billing_event_inbox
       where environment='test' and notification->>'resourceId'=$1 order by created_at`,
      [subscriptionId],
    ),
    pool.query<{ count: string }>(
      `select count(*) from app_private.billing_subscription_ledger
       where environment='test' and provider_id=$1`,
      [subscriptionId],
    ),
    pool.query<{ count: string }>(
      `select count(*) from app_private.billing_verified_period
       where environment='test' and subscription_id=$1`,
      [subscriptionId],
    ),
    pool.query<{ count: string }>(
      `select count(*) from app_private.billing_invoice_ledger
       where environment='test' and subscription_id=$1`,
      [subscriptionId],
    ),
  ])
  console.log(
    JSON.stringify({
      subscriptionId,
      inbox: inbox.rows,
      ledger: Number(subscriptions.rows[0]?.count),
      verifiedPeriods: Number(periods.rows[0]?.count),
      invoices: Number(invoices.rows[0]?.count),
    }),
  )
} finally {
  await pool.end()
}
