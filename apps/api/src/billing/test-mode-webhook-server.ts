import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { Pool } from 'pg'
import { BillingEventInbox, billingWebhookRoutes } from './event-inbox.js'
import { localBillingConfiguration } from './lemon-checkout.js'
import { PostgresBillingInbox } from './postgres-inbox.js'

// Temporary Development-only receiver. Exposes only the signed webhook route.
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
// The existing Test Mode hook uses the runtime signing secret. A stale local
// webhook-creation record must never override it during a temporary repoint.
const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET
assert.ok(secret && secret.length >= 6)
const pool = new Pool({
  connectionString: process.env.BILLING_WORKER_DATABASE_URL,
  connectionTimeoutMillis: 10000,
})
const app = Fastify({ logger: false })
billingWebhookRoutes(
  app,
  new BillingEventInbox(new PostgresBillingInbox(pool, config.variants), config.storeId, secret),
)
try {
  await app.listen({ host: '127.0.0.1', port: 8787 })
  console.log('Development-only signed Test Mode webhook receiver ready on 127.0.0.1:8787')
  await new Promise<void>((done) => {
    process.once('SIGINT', done)
    process.once('SIGTERM', done)
  })
} finally {
  await app.close()
  await pool.end()
}
