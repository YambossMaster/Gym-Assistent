import { createHmac } from 'node:crypto'
import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import {
  BillingEventInbox,
  BillingEventWorker,
  billingWebhookRoutes,
  type BillingInboxRepository,
  type BillingJob,
  type BillingNotification,
} from './event-inbox.js'
import {
  parseBillingResource,
  ReconciliationError,
  resourceUpdate,
  type BillingResource,
  type InvoiceResource,
  type SubscriptionResource,
} from './resources.js'
import { LemonTestResources } from './lemon-resources.js'
import {
  BillingManagementModule,
  billingManagementRoutes,
  type BillingManagementRepository,
  type CancellationClaim,
} from './management.js'
import { DevelopmentIdentityVerifier } from '../identity/development-identity.js'
import { BillingError } from './checkout.js'
import { IdentityVerificationError } from '../identity/identity.js'
import { localLifecycleConfiguration } from './local-lifecycle.js'
import { billingDevelopmentEnabled } from './release-gate.js'

const instant = '2026-10-14T04:00:00Z'
const nextInstant = '2026-10-14T04:00:01Z'
const boundary = '2026-11-14T04:00:00Z'
const intentId = '00000000-0000-4000-8000-000000000001'
const subscription = () => ({
  type: 'subscriptions' as const,
  id: '1',
  attributes: {
    store_id: 10,
    customer_id: 20,
    test_mode: true,
    created_at: instant,
    updated_at: instant,
    variant_id: 30,
    status: 'active',
    cancelled: false,
    trial_ends_at: null,
    renews_at: boundary,
    ends_at: null,
    user_email: 'do-not-persist@example.invalid',
    card_last_four: '4242',
    urls: { customer_portal: 'secret' },
  },
})
const invoice = () => ({
  type: 'subscription-invoices' as const,
  id: '2',
  attributes: {
    store_id: 10,
    customer_id: 20,
    subscription_id: 1,
    test_mode: true,
    created_at: instant,
    updated_at: instant,
    billing_reason: 'renewal',
    currency: 'USD',
    status: 'paid',
    subtotal: 500,
    subtotal_usd: 500,
    currency_rate: '1',
    total: 500,
    refunded_amount: 0,
  },
})
const expected = { kind: 'subscriptions' as const, id: '1', storeId: '10', variantIds: ['30'] }
function normalized(raw = subscription()) {
  return parseBillingResource({ data: raw }, expected) as SubscriptionResource
}
function normalizedInvoice(raw = invoice()) {
  return parseBillingResource(
    { data: raw },
    { ...expected, kind: 'subscription-invoices', id: '2' },
  )
}
function event() {
  return Buffer.from(
    JSON.stringify({
      meta: {
        event_name: 'subscription_created',
        test_mode: true,
        custom_data: { intent_id: intentId },
      },
      data: subscription(),
    }),
  )
}
const sign = (raw: Buffer) => createHmac('sha256', 'test-secret').update(raw).digest('hex')

class MemoryInbox implements BillingInboxRepository {
  rows = new Map<
    string,
    { job: BillingJob; status: string; availableAt: number; until: number; error?: string }
  >()
  resources = new Map<string, BillingResource>()
  async receive(n: BillingNotification) {
    if (!this.rows.has(n.digest))
      this.rows.set(n.digest, {
        job: { ...n, id: n.digest, lease: '', attempts: 0 },
        status: 'queued',
        availableAt: 0,
        until: 0,
      })
  }
  async claim(now: Date) {
    for (const row of this.rows.values()) {
      if (
        (row.status === 'queued' && row.availableAt <= +now) ||
        (row.status === 'processing' && row.until <= +now)
      ) {
        row.job.attempts++
        row.job.lease = `lease-${row.job.attempts}`
        row.status = 'processing'
        row.until = +now + 60000
        return structuredClone(row.job)
      }
    }
    return null
  }
  async commit(job: BillingJob, resource: BillingResource, now: Date) {
    const row = this.rows.get(job.digest)!
    if (row.job.lease !== job.lease || row.status !== 'processing' || row.until <= +now)
      throw new ReconciliationError('lease_lost')
    const key = resource.type + resource.id
    if (resourceUpdate(this.resources.get(key) ?? null, resource) === 'apply')
      this.resources.set(key, structuredClone(resource))
    row.status = 'done'
  }
  async fail(job: BillingJob, code: string, retryAt: Date | null) {
    const row = this.rows.get(job.digest)!
    if (row.job.lease !== job.lease || row.status !== 'processing') return
    row.status = retryAt ? 'queued' : 'dead'
    row.availableAt = retryAt ? +retryAt : 0
    row.error = code
  }
}

describe('minimal verified resources', () => {
  it('removes PII and signed URLs before persistence', () => {
    const data = JSON.stringify(normalized())
    expect(data).not.toMatch(/user_email|card_last_four|customer_portal|do-not-persist/)
    expect(normalized().attributes.customer_id).toBe('20')
  })
  it('rejects live mode, foreign store, unexpected resource and unconfigured variant', () => {
    for (const mutate of [
      (raw: ReturnType<typeof subscription>) => {
        raw.attributes.test_mode = false
      },
      (raw: ReturnType<typeof subscription>) => {
        raw.attributes.store_id = 11
      },
      (raw: ReturnType<typeof subscription>) => {
        raw.id = '3'
      },
      (raw: ReturnType<typeof subscription>) => {
        raw.attributes.variant_id = 31
      },
    ]) {
      const raw = subscription()
      mutate(raw)
      expect(() => normalized(raw)).toThrow()
    }
  })
  it('ignores older state, rejects equal-version conflicts and tenant reassignment', () => {
    const old = normalized(),
      changed = normalized()
    changed.attributes.updated_at = nextInstant
    changed.attributes.status = 'past_due'
    expect(resourceUpdate(changed, old)).toBe('ignore')
    expect(resourceUpdate(old, old)).toBe('ignore')
    // jsonb reorders object keys; storage round-trips must not look like conflicting versions.
    const reordered = { attributes: old.attributes, id: old.id, type: old.type }
    expect(resourceUpdate(reordered, old)).toBe('ignore')
    expect(resourceUpdate(old, changed)).toBe('apply')
    changed.attributes.updated_at = instant
    expect(() => resourceUpdate(old, changed)).toThrow('same_version_conflict')
    changed.attributes.customer_id = '999'
    expect(() => resourceUpdate(old, changed)).toThrow('immutable_resource_changed')
  })
  it('preserves original invoice totals and cumulative refunds without summing repeat notices', () => {
    const paid = normalizedInvoice(),
      raw = invoice()
    raw.attributes.status = 'partial_refund'
    raw.attributes.refunded_amount = 100
    raw.attributes.updated_at = nextInstant
    const partial = normalizedInvoice(raw)
    expect(resourceUpdate(paid, partial)).toBe('apply')
    expect(resourceUpdate(partial, partial)).toBe('ignore')
    expect(resourceUpdate(partial, paid)).toBe('ignore')
    raw.attributes.updated_at = '2026-10-14T04:00:02Z'
    raw.attributes.refunded_amount = 50
    expect(() => resourceUpdate(partial, normalizedInvoice(raw))).toThrow(
      'invoice_history_conflict',
    )
    raw.attributes.refunded_amount = 100
    raw.attributes.total = 600
    expect(() => resourceUpdate(partial, normalizedInvoice(raw))).toThrow(
      'invoice_history_conflict',
    )
    raw.attributes.total = 500
    raw.attributes.subtotal = 499
    expect(() => resourceUpdate(partial, normalizedInvoice(raw))).toThrow(
      'invoice_history_conflict',
    )
    raw.attributes.subtotal = 500
    raw.attributes.currency_rate = '0.9'
    expect(() => resourceUpdate(partial, normalizedInvoice(raw))).toThrow(
      'invoice_history_conflict',
    )
    raw.attributes.refunded_amount = 601
    expect(() => normalizedInvoice(raw)).toThrow('invalid_refund_amount')
  })
  it('accepts a provider-verified cumulative refund when Lemon leaves updated_at unchanged', () => {
    const paid = normalizedInvoice()
    const raw = invoice()
    raw.attributes.status = 'partial_refund'
    raw.attributes.refunded_amount = 100
    const partial = normalizedInvoice(raw)
    expect(resourceUpdate(paid, partial)).toBe('apply')
    expect(resourceUpdate(partial, partial)).toBe('ignore')
    expect(() => resourceUpdate(partial, paid)).toThrow('invoice_history_conflict')
    raw.attributes.status = 'refunded'
    raw.attributes.refunded_amount = 500
    const refunded = normalizedInvoice(raw)
    expect(resourceUpdate(partial, refunded)).toBe('apply')
    raw.attributes.refunded_amount = 400
    expect(() => normalizedInvoice(raw)).toThrow('invalid_refund_amount')
  })
  it('enriches a legacy invoice snapshot with provider rate evidence once', () => {
    const enriched = normalizedInvoice() as InvoiceResource
    const legacy = structuredClone(enriched)
    delete (legacy.attributes as Partial<typeof legacy.attributes>).subtotal
    delete (legacy.attributes as Partial<typeof legacy.attributes>).subtotal_usd
    delete (legacy.attributes as Partial<typeof legacy.attributes>).currency_rate
    expect(resourceUpdate(legacy, enriched)).toBe('apply')
    expect(resourceUpdate(enriched, enriched)).toBe('ignore')
  })
  it('enriches a legacy subscription with verified processor without accepting other same-version changes', () => {
    const old = normalized()
    const raw = subscription()
    const enriched = normalized({
      ...raw,
      attributes: { ...raw.attributes, payment_processor: 'stripe' },
    } as ReturnType<typeof subscription>)
    expect(resourceUpdate(old, enriched)).toBe('apply')
    expect(resourceUpdate(enriched, enriched)).toBe('ignore')
    const changed = structuredClone(enriched)
    changed.attributes.status = 'past_due'
    expect(() => resourceUpdate(old, changed)).toThrow('same_version_conflict')
  })
  it('bounds a one-cent TWD full-refund rounding difference only with matching USD settlement', () => {
    const raw = invoice() as ReturnType<typeof invoice> & {
      attributes: ReturnType<typeof invoice>['attributes'] & {
        refunded: boolean
        total_usd: number
        refunded_amount_usd: number
      }
    }
    raw.attributes.currency = 'TWD'
    raw.attributes.total = 11498
    raw.attributes.status = 'refunded'
    raw.attributes.refunded_amount = 11499
    raw.attributes.refunded = true
    raw.attributes.total_usd = 355
    raw.attributes.refunded_amount_usd = 355
    const accepted = normalizedInvoice(raw)
    if (accepted.type !== 'subscription-invoices') throw new Error('unexpected resource')
    expect(accepted.attributes.refunded_amount).toBe(11498)
    expect(accepted.attributes.refund_rounding).toEqual({
      reported_refunded_amount: 11499,
      total_usd: 355,
      refunded_amount_usd: 355,
    })
    expect(JSON.stringify(accepted)).not.toMatch(/user_email|card_last_four/)
    raw.attributes.refunded_amount = 11500
    expect(() => normalizedInvoice(raw)).toThrow('invalid_refund_amount')
    raw.attributes.refunded_amount = 11499
    raw.attributes.refunded_amount_usd = 354
    expect(() => normalizedInvoice(raw)).toThrow('invalid_refund_amount')
    raw.attributes.refunded_amount_usd = 355
    raw.attributes.refunded = false
    expect(() => normalizedInvoice(raw)).toThrow('invalid_refund_amount')
    raw.attributes.refunded = true
    raw.attributes.currency = 'USD'
    expect(() => normalizedInvoice(raw)).toThrow('invalid_refund_amount')
  })
})

describe('signed event intake and recoverable work', () => {
  it('accepts the documented webhook envelope without meta.test_mode', async () => {
    const repo = new MemoryInbox()
    const value = JSON.parse(event().toString())
    delete value.meta.test_mode
    const raw = Buffer.from(JSON.stringify(value))
    await new BillingEventInbox(repo, '10', 'test-secret').receive(raw, sign(raw))
    expect(repo.rows.size).toBe(1)
  })
  it('keeps signed webhook intake and provider reconciliation in the configured mode', async () => {
    const repo = new MemoryInbox()
    const testRaw = event()
    const liveInbox = new BillingEventInbox(repo, '10', 'test-secret', 'live')
    await expect(liveInbox.receive(testRaw, sign(testRaw))).rejects.toThrow('event_scope_mismatch')
    const liveEvent = JSON.parse(testRaw.toString())
    liveEvent.meta.test_mode = false
    liveEvent.data.attributes.test_mode = false
    const liveRaw = Buffer.from(JSON.stringify(liveEvent))
    await liveInbox.receive(liveRaw, sign(liveRaw))
    expect(repo.rows.size).toBe(1)
    const provider = { get: vi.fn(async () => normalized()) }
    const worker = new BillingEventWorker(repo, provider, () => new Date(instant), 'live')
    await worker.runOne()
    expect(repo.resources.size).toBe(0)
    expect([...repo.rows.values()][0]?.error).toBe('provider_scope_mismatch')
  })
  it('deduplicates concurrent deliveries and persists only notification facts', async () => {
    const repo = new MemoryInbox(),
      inbox = new BillingEventInbox(repo, '10', 'test-secret'),
      raw = event()
    await Promise.all(Array.from({ length: 20 }, () => inbox.receive(raw, sign(raw))))
    expect(repo.rows.size).toBe(1)
    expect(JSON.stringify([...repo.rows.values()])).not.toMatch(
      /card_last_four|user_email|customer_portal/,
    )
  })
  it('authenticates exact bytes before parsing and never persists invalid scope', async () => {
    const repo = new MemoryInbox(),
      inbox = new BillingEventInbox(repo, '10', 'test-secret'),
      raw = event()
    await expect(inbox.receive(Buffer.concat([raw, Buffer.from(' ')]), sign(raw))).rejects.toThrow(
      'invalid_signature',
    )
    await expect(inbox.receive(Buffer.from('{'), sign(Buffer.from('{')))).rejects.toThrow(
      'invalid_event',
    )
    for (const mutate of [
      (e: any) => {
        e.meta.test_mode = false
      },
      (e: any) => {
        e.data.attributes.test_mode = false
      },
      (e: any) => {
        e.data.attributes.store_id = 999
      },
      (e: any) => {
        e.meta.event_name = 'subscription_payment_success'
      },
    ]) {
      const value = JSON.parse(raw.toString())
      mutate(value)
      const wrong = Buffer.from(JSON.stringify(value))
      await expect(inbox.receive(wrong, sign(wrong))).rejects.toThrow()
    }
    expect(repo.rows.size).toBe(0)
  })
  it('only acknowledges after durable storage, and scopes the raw parser to the webhook', async () => {
    const repo = new MemoryInbox(),
      server = Fastify(),
      raw = event()
    billingWebhookRoutes(server, new BillingEventInbox(repo, '10', 'test-secret'))
    server.post('/ordinary', async (req) => ({ body: req.body }))
    try {
      const send = () =>
        server.inject({
          method: 'POST',
          url: '/hooks/lemonsqueezy',
          headers: { 'content-type': 'application/json', 'x-signature': sign(raw) },
          payload: raw,
        })
      vi.spyOn(repo, 'receive').mockRejectedValueOnce(new Error('storage unavailable'))
      expect((await send()).statusCode).toBe(500)
      expect((await send()).statusCode).toBe(200)
      expect(
        (await server.inject({ method: 'POST', url: '/ordinary', payload: { value: 3 } })).json(),
      ).toEqual({ body: { value: 3 } })
      expect(
        (
          await server.inject({
            method: 'POST',
            url: '/hooks/lemonsqueezy',
            headers: { 'content-type': 'application/json' },
            payload: Buffer.alloc(262145),
          })
        ).statusCode,
      ).toBe(413)
    } finally {
      await server.close()
    }
  })
  it('leases one worker and obtains current provider state instead of trusting event attributes', async () => {
    const repo = new MemoryInbox(),
      inbox = new BillingEventInbox(repo, '10', 'test-secret'),
      raw = event()
    await inbox.receive(raw, sign(raw))
    const current = normalized()
    current.attributes.updated_at = nextInstant
    current.attributes.status = 'past_due'
    const provider = { get: vi.fn(async () => current) },
      worker = new BillingEventWorker(repo, provider, () => new Date(instant))
    await Promise.all(Array.from({ length: 10 }, () => worker.runOne()))
    expect(provider.get).toHaveBeenCalledTimes(1)
    expect(repo.resources.get('subscriptions1')?.attributes.status).toBe('past_due')
  })
  it('does not allow a stale lease holder to commit or reset a new worker', async () => {
    const repo = new MemoryInbox(),
      raw = event()
    await new BillingEventInbox(repo, '10', 'test-secret').receive(raw, sign(raw))
    const old = (await repo.claim(new Date(instant)))!
    const later = new Date(Date.parse(instant) + 60001),
      fresh = (await repo.claim(later))!
    await expect(repo.commit(old, normalized(), later)).rejects.toThrow('lease_lost')
    await repo.fail(old, 'old_error', null)
    await repo.commit(fresh, normalized(), later)
    expect([...repo.rows.values()][0]?.status).toBe('done')
  })
  it('backs off transient errors, bounds attempts and never stores raw exception text', async () => {
    const repo = new MemoryInbox(),
      raw = event()
    await new BillingEventInbox(repo, '10', 'test-secret').receive(raw, sign(raw))
    let now = new Date(instant)
    const provider = {
      get: vi.fn(async (): Promise<BillingResource> => {
        throw new Error('private signed-url and token')
      }),
    }
    const worker = new BillingEventWorker(repo, provider, () => now)
    for (let count = 0; count < 8; count++) {
      await worker.runOne()
      now = new Date(+now + 3600000)
    }
    expect(provider.get).toHaveBeenCalledTimes(8)
    expect([...repo.rows.values()][0]?.status).toBe('dead')
    expect(JSON.stringify([...repo.rows.values()])).not.toContain('private signed-url')
  })
})

describe('test-only provider adapter', () => {
  it('keeps merchant testing disabled by default and refuses Production configuration', () => {
    expect(localLifecycleConfiguration({})).toBeNull()
    expect(() => localLifecycleConfiguration({ BILLING_LOCAL_LIFECYCLE: 'true' })).toThrow(
      'Provider testing remains disabled',
    )
    expect(() =>
      localLifecycleConfiguration({
        BILLING_LOCAL_LIFECYCLE: 'true',
        NODE_ENV: 'production',
        BILLING_PROVIDER_TESTS_APPROVED: 'true',
      }),
    ).toThrow('Local lifecycle cannot run in Production')
  })
  it('validates Test Mode before DELETE and does not follow redirects', async () => {
    const live = subscription()
    live.attributes.test_mode = false
    const request = vi.fn(async () => new Response(JSON.stringify({ data: live }), { status: 200 }))
    const provider = new LemonTestResources(
      { key: 'fake', storeId: '10', variantIds: ['30'] },
      request,
    )
    await expect(provider.cancel('1')).rejects.toThrow('provider_scope_mismatch')
    expect(request).toHaveBeenCalledTimes(1)
    expect(request.mock.calls[0]).toBeDefined()
    const options = (request.mock.calls as unknown as [string, RequestInit][])[0]![1]
    expect(options.method).toBe('GET')
    expect(options.redirect).toBe('error')
  })
})

function managementSetup() {
  const owner = { userId: intentId },
    other = { userId: '00000000-0000-4000-8000-000000000002' }
  let command: CancellationClaim | null = null
  const repo: BillingManagementRepository = {
    invoice: async (identity, id) =>
      identity.userId === owner.userId && id === '2' ? (normalizedInvoice() as any) : null,
    read: async (identity) =>
      identity.userId === owner.userId
        ? {
            subscriptions: [normalized()],
            invoices: [normalizedInvoice() as any],
            pendingCancellation: !!command && !command.confirmed,
          }
        : { subscriptions: [], invoices: [], pendingCancellation: false },
    claimCancellation: async (identity) => {
      if (identity.userId !== owner.userId) throw new BillingError(409, 'no_subscription')
      if (command) return { ...command, dispatch: false }
      command = {
        id: intentId,
        subscriptionId: '1',
        storeId: '10',
        customerId: '20',
        confirmed: false,
        dispatch: true,
      }
      return { ...command }
    },
    confirmCancellation: async (identity, claim) => {
      if (identity.userId !== owner.userId || command?.id !== claim.id) throw new Error('foreign')
      command.confirmed = true
    },
  }
  const cancelled = normalized()
  cancelled.attributes.updated_at = nextInstant
  cancelled.attributes.status = 'cancelled'
  cancelled.attributes.cancelled = true
  cancelled.attributes.ends_at = boundary
  const provider = {
    cancel: vi.fn(async () => cancelled),
    get: vi.fn(async () => cancelled),
    invoiceReceipt: vi.fn(async () => ({
      resource: normalizedInvoice() as any,
      url: 'https://lemonsqueezy.com/receipt',
    })),
  }
  return { owner, other, repo, provider, module: new BillingManagementModule(repo, provider) }
}
describe('owner-scoped cancellation and billing', () => {
  it('opens only with explicit local Development Test Mode switches', () => {
    const allowed = {
      NODE_ENV: 'development',
      DEPLOYMENT_TARGET: 'local',
      SUPABASE_URL: 'https://yvhijxhtelujfsaplzpi.supabase.co',
      DATABASE_URL:
        'postgres://api.yvhijxhtelujfsaplzpi:secret@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres',
      BILLING_WORKER_DATABASE_URL:
        'postgres://worker.yvhijxhtelujfsaplzpi:secret@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres',
      BILLING_PROVIDER_TESTS_APPROVED: 'true',
      BILLING_LOCAL_CHECKOUT: 'true',
      BILLING_LOCAL_LIFECYCLE: 'true',
    }
    expect(billingDevelopmentEnabled(allowed)).toBe(true)
    expect(billingDevelopmentEnabled({ ...allowed, NODE_ENV: 'production' })).toBe(false)
    expect(billingDevelopmentEnabled({ ...allowed, DEPLOYMENT_TARGET: 'production' })).toBe(false)
    expect(
      billingDevelopmentEnabled({ ...allowed, SUPABASE_URL: 'https://other.supabase.co' }),
    ).toBe(false)
    expect(billingDevelopmentEnabled({ ...allowed, BILLING_LOCAL_LIFECYCLE: 'false' })).toBe(false)
  })
  it('shows only a verified period and protects owned receipts', async () => {
    const s = managementSetup()
    expect((await s.module.snapshot(s.owner)).subscription).toBeNull()
    const original = s.repo.read
    s.repo.read = async (identity) => ({
      ...(await original(identity)),
      verifiedPeriod:
        identity.userId === s.owner.userId
          ? ({
              subscription_id: '1',
              tier: 'basic',
              billing_interval: 'month',
              ends_at: new Date(boundary),
            } as const)
          : null,
    })
    const snapshot = await s.module.snapshot(s.owner)
    expect(snapshot.subscription?.tier).toBe('basic')
    expect(snapshot.invoices[0]?.receiptAvailable).toBe(true)
    expect(snapshot.invoices[0]?.description).toBe('訂閱帳單')
    await expect(s.module.receipt(s.other, '2')).rejects.toThrow('invoice_not_found')
    expect(s.provider.invoiceReceipt).not.toHaveBeenCalled()
    await expect(s.module.receipt(s.owner, '2')).resolves.toEqual({
      url: 'https://lemonsqueezy.com/receipt',
    })
    const foreign = normalizedInvoice()
    foreign.attributes.customer_id = '999'
    s.provider.invoiceReceipt.mockResolvedValueOnce({
      resource: foreign,
      url: 'https://lemonsqueezy.com/receipt',
    })
    await expect(s.module.receipt(s.owner, '2')).rejects.toThrow('invoice_changed')
  })
  it('does not relabel an earlier invoice with the current upgraded tier', async () => {
    const s = managementSetup()
    const original = s.repo.read
    s.repo.read = async (identity) => ({
      ...(await original(identity)),
      verifiedPeriod: {
        subscription_id: '1',
        tier: 'advanced' as const,
        billing_interval: 'month' as const,
        ends_at: new Date(boundary),
      },
    })
    const snapshot = await s.module.snapshot(s.owner)
    expect(snapshot.subscription?.tier).toBe('advanced')
    expect(snapshot.invoices[0]?.description).toBe('訂閱帳單')
  })
  it('projects a cancelled trial as paid access ending at the original boundary', async () => {
    const s = managementSetup()
    const trial = normalized()
    trial.attributes.status = 'on_trial'
    trial.attributes.cancelled = true
    trial.attributes.trial_ends_at = boundary
    trial.attributes.ends_at = boundary
    s.repo.read = async () => ({
      subscriptions: [trial],
      invoices: [],
      pendingCancellation: false,
      verifiedPeriod: {
        subscription_id: trial.id,
        tier: 'advanced',
        billing_interval: 'month',
        ends_at: new Date(boundary),
      },
    })
    expect((await s.module.snapshot(s.owner)).subscription).toEqual({
      tier: 'advanced',
      interval: 'month',
      status: 'cancelled',
      endsAt: '2026-11-14T04:00:00.000Z',
      renewal: { amount: 14500, currency: 'TWD' },
    })
  })
  it('returns only a scoped HTTPS Lemon receipt URL from the provider', async () => {
    const raw = invoice() as ReturnType<typeof invoice> & {
      attributes: ReturnType<typeof invoice>['attributes'] & { urls: { invoice_url: string } }
    }
    raw.attributes.urls = { invoice_url: 'https://app.lemonsqueezy.com/receipt/2' }
    const request = vi.fn(async () => new Response(JSON.stringify({ data: raw }), { status: 200 }))
    const provider = new LemonTestResources(
      { key: 'fake', storeId: '10', variantIds: ['30'] },
      request,
    )
    expect((await provider.invoiceReceipt('2')).url).toBe(raw.attributes.urls.invoice_url)
    raw.attributes.urls.invoice_url = 'https://example.com/receipt/2'
    await expect(provider.invoiceReceipt('2')).rejects.toThrow('unsafe_receipt_url')
  })
  it('serializes concurrent cancellation and confirms only a verified result', async () => {
    const s = managementSetup()
    const results = await Promise.all(Array.from({ length: 20 }, () => s.module.cancel(s.owner)))
    expect(s.provider.cancel).toHaveBeenCalledTimes(1)
    expect(results.every((r) => r.status === 'confirmed')).toBe(true)
    await expect(s.module.cancel(s.other)).rejects.toThrow('no_subscription')
    expect((await s.module.read(s.other)).invoices).toEqual([])
  })
  it('recovers timeout by GET after a new module instance, never a second DELETE', async () => {
    const s = managementSetup()
    s.provider.cancel.mockRejectedValueOnce(new Error('unknown outcome'))
    expect(await s.module.cancel(s.owner)).toEqual({ status: 'pending' })
    const fresh = new BillingManagementModule(s.repo, s.provider)
    expect(await fresh.cancel(s.owner)).toEqual({ status: 'confirmed' })
    expect(s.provider.cancel).toHaveBeenCalledTimes(1)
    expect(s.provider.get).toHaveBeenCalledTimes(1)
  })
  it('does not treat an active or wrong-owner response as a cancellation', async () => {
    const s = managementSetup()
    s.provider.cancel.mockResolvedValueOnce(normalized())
    expect(await s.module.cancel(s.owner)).toEqual({ status: 'pending' })
    const foreign = normalized()
    foreign.attributes.customer_id = '999'
    s.provider.get.mockResolvedValueOnce(foreign)
    expect(await s.module.cancel(s.owner)).toEqual({ status: 'pending' })
  })
  it('requires identity and forbids caller-selected provider IDs in HTTP operations', async () => {
    const s = managementSetup(),
      server = Fastify()
    server.setErrorHandler((error, _request, reply) => {
      if (error instanceof IdentityVerificationError)
        return reply.code(401).send({ error: 'unauthorized' })
      if (error instanceof BillingError)
        return reply.code(error.statusCode).send({ error: error.code })
      return reply.code(500).send({ error: 'internal_error' })
    })
    billingManagementRoutes(server, new DevelopmentIdentityVerifier(), s.module)
    try {
      expect((await server.inject({ url: '/v1/billing/records' })).statusCode).toBe(401)
      const headers = { authorization: `Bearer dev:${s.owner.userId}` }
      expect(
        (
          await server.inject({
            method: 'POST',
            url: '/v1/billing/cancel',
            headers,
            payload: { subscriptionId: '9' },
          })
        ).statusCode,
      ).toBe(400)
      const records = await server.inject({ url: '/v1/billing/records', headers })
      expect(records.headers['cache-control']).toBe('no-store, private')
      expect(records.body).not.toMatch(/customer_id|card_last_four|user_email|store_id/)
    } finally {
      await server.close()
    }
  })
})
