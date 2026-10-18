import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { Pool, type PoolClient } from 'pg'
import { localBillingConfiguration } from './lemon-checkout.js'
import { LemonTestResources } from './lemon-resources.js'
import { parseBillingResource, type InvoiceResource } from './resources.js'

// Internal Development/Test Mode operation. Possession of the server-only billing
// worker credential authorizes this CLI; no Coach HTTP route exposes the action.
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
    process.env.BILLING_RETURN_URL ?? 'http://127.0.0.1:4178/settings/checkout/status',
})!
assert.ok(config)

type Decision = 'revoke_current' | 'retain'
type Approval = {
  caseRef: string
  invoiceId: string
  decision: Decision
  approvedRefundUsd: number
  reviewer: string
  reason: string
  requestedAt: string
  customerNotifiedAt: string
  effectiveAt?: string
  exceptionBasis?: string
}
type Case = {
  id: string
  case_ref: string
  store_id: string
  subscription_id: string
  invoice_id: string
  workspace_id: string
  period_key: string | null
  decision: Decision
  effective_at: Date | null
  approved_refund_usd: number
  baseline_refunded_usd: number
}
type RawInvoice = {
  resource: InvoiceResource
  totalUsd: number
  refundedUsd: number
}

const provider = new LemonTestResources({
  key: config.key,
  storeId: config.storeId,
  variantIds: Object.values(config.variants),
})
const pool = new Pool({
  connectionString: process.env.BILLING_WORKER_DATABASE_URL,
  connectionTimeoutMillis: 10_000,
  max: 1,
})

async function invoiceFromProvider(id: string): Promise<RawInvoice> {
  assert.match(id, /^[1-9]\d*$/)
  const response = await fetch(`https://api.lemonsqueezy.com/v1/subscription-invoices/${id}`, {
    headers: { Authorization: `Bearer ${config.key}`, Accept: 'application/vnd.api+json' },
    signal: AbortSignal.timeout(15_000),
    redirect: 'error',
  })
  assert.equal(response.status, 200, 'provider invoice must be available')
  const raw: unknown = await response.json()
  const resource = parseBillingResource(raw, {
    kind: 'subscription-invoices',
    id,
    storeId: config.storeId,
    variantIds: Object.values(config.variants),
  })
  assert.equal(resource.type, 'subscription-invoices')
  const attributes = (raw as { data?: { attributes?: Record<string, unknown> } }).data?.attributes
  const totalUsd = attributes?.total_usd
  const refundedUsd = attributes?.refunded_amount_usd
  assert.ok(Number.isSafeInteger(totalUsd) && (totalUsd as number) > 0)
  assert.ok(Number.isSafeInteger(refundedUsd) && (refundedUsd as number) >= 0)
  assert.ok((refundedUsd as number) <= (totalUsd as number))
  return { resource, totalUsd: totalUsd as number, refundedUsd: refundedUsd as number }
}

function approvalFromFile(path: string): Approval {
  const directory = resolve(process.cwd(), '../../output/billing-test-mode/refund-cases')
  const input = resolve(path)
  assert.ok(input.startsWith(`${directory}${sep}`) && input.endsWith('.json'))
  const value = JSON.parse(readFileSync(input, 'utf8')) as Approval
  assert.match(value.caseRef, /^[A-Z0-9-]{6,80}$/)
  assert.match(value.invoiceId, /^[1-9]\d*$/)
  assert.ok(value.decision === 'revoke_current' || value.decision === 'retain')
  assert.ok(Number.isSafeInteger(value.approvedRefundUsd) && value.approvedRefundUsd > 0)
  assert.ok(value.reviewer.length >= 3 && value.reviewer.length <= 120)
  assert.ok(value.reason.length >= 8 && value.reason.length <= 1000)
  for (const instant of [value.requestedAt, value.customerNotifiedAt])
    assert.ok(Number.isFinite(Date.parse(instant)))
  assert.ok(Date.parse(value.customerNotifiedAt) <= Date.now())
  if (value.decision === 'revoke_current')
    assert.ok(value.effectiveAt && Number.isFinite(Date.parse(value.effectiveAt)))
  else assert.equal(value.effectiveAt, undefined)
  if (value.exceptionBasis)
    assert.ok(value.exceptionBasis.length >= 8 && value.exceptionBasis.length <= 1000)
  return value
}

async function ownedInvoice(client: PoolClient, invoiceId: string) {
  const result = await client.query<{
    workspace_id: string
    subscription_id: string
    resource: InvoiceResource
  }>(
    `select i.workspace_id,i.subscription_id,i.resource
     from app_private.billing_invoice_ledger i
     join app_private.billing_subscription_ledger s
       on s.environment=i.environment and s.store_id=i.store_id
      and s.provider_id=i.subscription_id and s.workspace_id=i.workspace_id
     where i.environment='test' and i.store_id=$1 and i.provider_id=$2`,
    [config.storeId, invoiceId],
  )
  assert.equal(result.rowCount, 1, 'invoice must already belong to one verified owner')
  return result.rows[0]!
}

async function currentPeriod(
  client: PoolClient,
  owner: string,
  subscriptionId: string,
  invoiceId: string,
) {
  const result = await client.query<{ period_key: string }>(
    `select p.period_key from app_private.billing_verified_period p
     where p.environment='test' and p.store_id=$1 and p.workspace_id=$2
       and p.subscription_id=$3 and p.origin in ('payment','renewal')
       and p.superseded_at is null and p.starts_at<=now() and p.ends_at>now()
       and (p.invoice_id=$4 or exists (
         select 1 from app_private.billing_paid_upgrade_evidence e
         where e.environment=p.environment and e.store_id=p.store_id
           and e.subscription_id=p.subscription_id and e.workspace_id=p.workspace_id
           and e.period_key=p.period_key and e.invoice_id=$4
       ))`,
    [config.storeId, owner, subscriptionId, invoiceId],
  )
  assert.ok((result.rowCount ?? 0) <= 1, 'conflicting current periods')
  return result.rows[0]?.period_key ?? null
}

async function solePaidPeriodInvoice(
  client: PoolClient,
  owner: string,
  subscriptionId: string,
  periodKey: string,
  invoiceId: string,
) {
  const result = await client.query(
    `select 1 from app_private.billing_verified_period p
     where p.environment='test' and p.store_id=$1 and p.workspace_id=$2
       and p.subscription_id=$3 and p.period_key=$4 and p.invoice_id=$5
       and not exists (
         select 1 from app_private.billing_paid_upgrade_evidence e
         where e.environment=p.environment and e.store_id=p.store_id
           and e.subscription_id=p.subscription_id and e.workspace_id=p.workspace_id
           and e.period_key=p.period_key and e.invoice_id<>$5
       )`,
    [config.storeId, owner, subscriptionId, periodKey, invoiceId],
  )
  return result.rowCount === 1
}

async function prepare(path: string) {
  const approval = approvalFromFile(path)
  const invoice = await invoiceFromProvider(approval.invoiceId)
  assert.ok(
    invoice.resource.attributes.status !== 'pending' &&
      invoice.resource.attributes.status !== 'void',
  )
  assert.ok(
    invoice.totalUsd - invoice.refundedUsd >= approval.approvedRefundUsd,
    'approved amount exceeds the remaining provider USD amount',
  )
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [
      `billing:refund:test:${config.storeId}:${approval.invoiceId}`,
    ])
    const owned = await ownedInvoice(client, approval.invoiceId)
    const unresolved = await client.query(
      `select 1 from app_private.billing_refund_case c
       where c.environment='test' and c.store_id=$1 and c.invoice_id=$2
         and not exists (select 1 from app_private.billing_refund_case_application a
                         where a.case_id=c.id) limit 1`,
      [config.storeId, approval.invoiceId],
    )
    assert.equal(unresolved.rowCount, 0, 'another refund case for this invoice is unresolved')
    assert.equal(owned.subscription_id, invoice.resource.attributes.subscription_id)
    assert.equal(owned.resource.attributes.customer_id, invoice.resource.attributes.customer_id)
    assert.equal(owned.resource.attributes.currency, invoice.resource.attributes.currency)
    assert.equal(owned.resource.attributes.total, invoice.resource.attributes.total)
    const periodKey = await currentPeriod(
      client,
      owned.workspace_id,
      owned.subscription_id,
      approval.invoiceId,
    )
    if (approval.decision === 'revoke_current') {
      assert.ok(periodKey, 'only a current invoice-backed period can be revoked')
      assert.ok(
        await solePaidPeriodInvoice(
          client,
          owned.workspace_id,
          owned.subscription_id,
          periodKey,
          approval.invoiceId,
        ),
        'another paid invoice shares this period; manual entitlement review required',
      )
    }
    const result = await client.query<{ id: string }>(
      `insert into app_private.billing_refund_case
       (id,case_ref,store_id,subscription_id,invoice_id,workspace_id,period_key,
        requested_at,customer_notified_at,reviewer,reason,exception_basis,decision,
        effective_at,approved_refund_usd,baseline_refunded_usd)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       returning id`,
      [
        randomUUID(),
        approval.caseRef,
        config.storeId,
        owned.subscription_id,
        approval.invoiceId,
        owned.workspace_id,
        periodKey,
        approval.requestedAt,
        approval.customerNotifiedAt,
        approval.reviewer,
        approval.reason,
        approval.exceptionBasis ?? null,
        approval.decision,
        approval.effectiveAt ?? null,
        approval.approvedRefundUsd,
        invoice.refundedUsd,
      ],
    )
    assert.equal(result.rowCount, 1)
    await client.query('commit')
    console.log(
      JSON.stringify({
        result: 'approved',
        caseRef: approval.caseRef,
        invoiceId: approval.invoiceId,
        decision: approval.decision,
        periodKey,
      }),
    )
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

async function apply(caseRef: string) {
  assert.match(caseRef, /^[A-Z0-9-]{6,80}$/)
  const client = await pool.connect()
  try {
    await client.query('begin')
    const selected = await client.query<Case>(
      `select id,case_ref,store_id,subscription_id,invoice_id,workspace_id,period_key,
              decision,effective_at,approved_refund_usd,baseline_refunded_usd
       from app_private.billing_refund_case where environment='test' and case_ref=$1`,
      [caseRef],
    )
    assert.equal(selected.rowCount, 1, 'approved case required')
    const item = selected.rows[0]!
    await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [
      `billing:refund:test:${item.store_id}:${item.invoice_id}`,
    ])
    const existing = await client.query(
      'select 1 from app_private.billing_refund_case_application where case_id=$1',
      [item.id],
    )
    if (existing.rowCount) {
      await client.query('commit')
      console.log(JSON.stringify({ result: 'already_applied', caseRef }))
      return
    }
    const invoice = await invoiceFromProvider(item.invoice_id)
    assert.equal(invoice.resource.attributes.subscription_id, item.subscription_id)
    assert.equal(invoice.resource.attributes.store_id, item.store_id)
    assert.ok(
      invoice.resource.attributes.status === 'refunded' ||
        invoice.resource.attributes.status === 'partial_refund',
    )
    assert.equal(
      invoice.refundedUsd - item.baseline_refunded_usd,
      item.approved_refund_usd,
      'provider refund differs from the approved amount; manual review required',
    )
    const owned = await ownedInvoice(client, item.invoice_id)
    assert.equal(owned.workspace_id, item.workspace_id)
    assert.equal(owned.resource.attributes.customer_id, invoice.resource.attributes.customer_id)
    if (item.decision === 'revoke_current') {
      assert.equal(
        await currentPeriod(client, item.workspace_id, item.subscription_id, item.invoice_id),
        item.period_key,
        'current paid period changed; manual review required',
      )
      assert.ok(
        await solePaidPeriodInvoice(
          client,
          item.workspace_id,
          item.subscription_id,
          item.period_key!,
          item.invoice_id,
        ),
        'another paid invoice shares this period; manual entitlement review required',
      )
      const subscription = await provider.get('subscriptions', item.subscription_id)
      assert.equal(subscription.type, 'subscriptions')
      assert.equal(subscription.attributes.cancelled, true, 'stop future renewal before revocation')
      assert.ok(subscription.attributes.ends_at, 'confirmed cancellation end required')
    }
    const inserted = await client.query(
      `insert into app_private.billing_refund_case_application
       (case_id,workspace_id,provider_invoice_version,provider_refunded_usd,
        provider_refunded_amount,access_revoked_at)
       values($1,$2,$3,$4,$5,
         case when $6::timestamptz is null then null else greatest($6::timestamptz,now()) end)`,
      [
        item.id,
        item.workspace_id,
        invoice.resource.attributes.updated_at,
        invoice.refundedUsd,
        invoice.resource.attributes.refunded_amount,
        item.effective_at,
      ],
    )
    assert.equal(inserted.rowCount, 1)
    await client.query('commit')
    console.log(JSON.stringify({ result: 'applied', caseRef, decision: item.decision }))
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

try {
  const [command, argument] = process.argv.slice(2)
  assert.ok(argument && process.argv.length === 4)
  if (command === 'prepare') await prepare(argument)
  else if (command === 'apply') await apply(argument)
  else throw new Error('expected prepare <approval-json> or apply <case-ref>')
} finally {
  await pool.end()
}
