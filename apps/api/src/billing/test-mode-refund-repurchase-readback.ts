import assert from 'node:assert/strict'
import { Pool } from 'pg'
import { PostgresCheckoutRepository } from './postgres-checkout.js'
import { PostgresVerifiedBillingAccess } from './postgres-access-source.js'
import { PostgresBillingManagement } from './postgres-management.js'
import { BillingManagementModule } from './management.js'
import { checkoutPolicy } from './policy.js'

// Existing isolated Development/Test Mode accounts only. No provider calls or new checkout.
const ref = 'yvhijxhtelujfsaplzpi'
assert.equal(process.env.SUPABASE_URL?.replace(/\/$/, ''), `https://${ref}.supabase.co`)
assert.notEqual(process.env.DEPLOYMENT_TARGET, 'production')
const apiUrl = new URL(process.env.DATABASE_URL!)
const workerUrl = new URL(process.env.BILLING_WORKER_DATABASE_URL!)
for (const url of [apiUrl, workerUrl]) {
  assert.ok(
    url.hostname === `db.${ref}.supabase.co` ||
      (url.hostname.endsWith('.pooler.supabase.com') &&
        decodeURIComponent(url.username).endsWith(`.${ref}`)),
  )
}
const api = new Pool({ connectionString: process.env.DATABASE_URL })
const worker = new Pool({ connectionString: process.env.BILLING_WORKER_DATABASE_URL })
try {
  const bindings = await worker.query<{ subscription_id: string; workspace_id: string }>(
    `select provider_id subscription_id,workspace_id
     from app_private.billing_subscription_ledger
     where environment='test' and provider_id=any($1::text[])`,
    [['2614493', '2615581']],
  )
  assert.equal(bindings.rowCount, 2)
  const owners = await api.query<{ id: string; owner_user_id: string }>(
    'select id,owner_user_id from app_private.workspace where id=any($1::uuid[])',
    [bindings.rows.map((row) => row.workspace_id)],
  )
  assert.equal(owners.rowCount, 2)
  const owner = (subscriptionId: string) => ({
    userId: owners.rows.find(
      (row) =>
        row.id ===
        bindings.rows.find((binding) => binding.subscription_id === subscriptionId)!.workspace_id,
    )!.owner_user_id,
  })
  const repository = new PostgresCheckoutRepository(api)
  const refunded = await repository.transaction(owner('2614493'), (tx) => tx.facts())
  assert.equal(refunded.hasEverSubscribed, true)
  assert.equal(refunded.hasCurrentSubscription, false)
  assert.equal(refunded.hasUnresolvedCheckout, false)
  const price = checkoutPolicy({ tier: 'basic', interval: 'year' }, refunded)
  assert.equal(price.dueNowMinor, 115000)
  assert.equal(price.trial, null)
  const ordinaryCancelled = await repository.transaction(owner('2615581'), (tx) => tx.facts())
  assert.equal(ordinaryCancelled.hasCurrentSubscription, true)
  const access = await new PostgresVerifiedBillingAccess(api).get(owner('2614493'))
  assert.equal(access, null)
  const management = new BillingManagementModule(new PostgresBillingManagement(api), {
    get: async () => {
      throw Error('not used')
    },
    cancel: async () => {
      throw Error('not used')
    },
    invoiceReceipt: async () => {
      throw Error('not used')
    },
  })
  const snapshot = await management.snapshot(owner('2614493'))
  assert.equal(snapshot.subscription, null)
  assert.ok(
    snapshot.invoices.some((invoice) => invoice.id === '8746552' && invoice.status === 'refunded'),
  )
  console.log(
    JSON.stringify({
      refunded: 'repurchase_eligible_without_trial',
      ordinaryCancelled: 'blocked',
      refundedAccess: 'free',
      refundedCurrentSubscription: null,
      refundedInvoiceVisible: true,
    }),
  )
} finally {
  await Promise.all([api.end(), worker.end()])
}
