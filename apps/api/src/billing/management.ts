import type { AuthenticatedIdentity, IdentityVerifier } from '../identity/identity.js'
import type { FastifyInstance } from 'fastify'
import { BillingError } from './checkout.js'
import type { InvoiceResource, SubscriptionResource } from './resources.js'

export type OwnedBilling = {
  subscriptions: SubscriptionResource[]
  invoices: InvoiceResource[]
  pendingCancellation: boolean
  pendingCheckout?: boolean
  pendingPaidChange?: boolean
  scheduledChange?: {
    tier: 'basic' | 'advanced'
    interval: 'month' | 'year'
    effectiveAt: Date
  } | null
  verifiedPeriod?: {
    subscription_id: string
    tier: 'basic' | 'advanced'
    billing_interval: 'month' | 'year'
    ends_at: Date
  } | null
}
export type CancellationClaim = {
  id: string
  subscriptionId: string
  storeId: string
  customerId: string
  dispatch: boolean
  confirmed: boolean
}
export interface BillingManagementRepository {
  read(identity: AuthenticatedIdentity): Promise<OwnedBilling>
  invoice(identity: AuthenticatedIdentity, id: string): Promise<InvoiceResource | null>
  claimCancellation(identity: AuthenticatedIdentity): Promise<CancellationClaim>
  confirmCancellation(
    identity: AuthenticatedIdentity,
    claim: CancellationClaim,
    resource: SubscriptionResource,
  ): Promise<void>
}
export interface CancellationProvider {
  get(kind: 'subscriptions', id: string): Promise<SubscriptionResource | InvoiceResource>
  cancel(id: string): Promise<SubscriptionResource>
  invoiceReceipt(id: string): Promise<{ resource: InvoiceResource; url: string }>
}
export class BillingManagementModule {
  constructor(
    private readonly repository: BillingManagementRepository,
    private readonly provider: CancellationProvider,
  ) {}
  async read(identity: AuthenticatedIdentity) {
    const data = await this.repository.read(identity)
    // Deliberate projection: no checkout IDs, customer IDs, card information, URLs or raw payloads.
    return {
      pendingCancellation: data.pendingCancellation,
      subscriptions: data.subscriptions.map(({ attributes: s }) => ({
        status: s.status,
        cancelled: s.cancelled,
        trialEndsAt: s.trial_ends_at,
        renewsAt: s.renews_at,
        endsAt: s.ends_at,
      })),
      invoices: data.invoices.map(({ id, attributes: i }) => ({
        id,
        number: id,
        createdAt: i.created_at,
        status: i.status,
        total: { amount: i.total, currency: i.currency },
        refunded: { amount: i.refunded_amount, currency: i.currency },
        receiptAvailable: false,
      })),
    }
  }
  async snapshot(identity: AuthenticatedIdentity) {
    const data = await this.repository.read(identity)
    const period = data.verifiedPeriod
    const current = period && data.subscriptions.find((s) => s.id === period.subscription_id)
    const status = current?.attributes.status
    const valid = current && period && status && !['expired', 'unpaid', 'paused'].includes(status)
    const renewalTier = data.scheduledChange?.tier ?? period?.tier
    const renewalInterval = data.scheduledChange?.interval ?? period?.billing_interval
    const renewalAmount = renewalTier === 'advanced' ? 14500 : 11500
    return {
      pendingCheckout: Boolean(data.pendingCheckout),
      pendingPaidChange: Boolean(data.pendingPaidChange),
      subscription: valid
        ? {
            tier: period.tier,
            interval: period.billing_interval,
            status:
              current.attributes.cancelled || status === 'cancelled'
                ? 'cancelled'
                : status === 'on_trial'
                  ? 'trial'
                  : status === 'past_due'
                    ? 'past_due'
                    : 'active',
            endsAt: period.ends_at.toISOString(),
            renewal: {
              amount: renewalAmount * (renewalInterval === 'year' ? 10 : 1),
              currency: 'TWD',
            },
            ...(data.scheduledChange
              ? {
                  scheduledChange: {
                    tier: data.scheduledChange.tier,
                    interval: data.scheduledChange.interval,
                    effectiveAt: data.scheduledChange.effectiveAt.toISOString(),
                  },
                }
              : {}),
          }
        : null,
      invoices: data.invoices.map(({ id, attributes: i }) => {
        return {
          id,
          number: id,
          createdAt: i.created_at,
          // A subscription's current tier cannot describe an earlier invoice after a plan change.
          description: i.billing_reason === 'updated' ? '方案變更帳單' : '訂閱帳單',
          period: null,
          status: i.status,
          total: { amount: i.total, currency: i.currency },
          refunded: { amount: i.refunded_amount, currency: i.currency },
          receiptAvailable: i.status !== 'pending' && i.status !== 'void',
        }
      }),
    }
  }
  async receipt(identity: AuthenticatedIdentity, id: string) {
    if (!/^[1-9]\d*$/.test(id)) throw new BillingError(400, 'invalid_invoice_id')
    const owned = await this.repository.invoice(identity, id)
    if (!owned) throw new BillingError(404, 'invoice_not_found')
    if (owned.attributes.status === 'pending' || owned.attributes.status === 'void')
      throw new BillingError(409, 'receipt_unavailable')
    const { resource, url } = await this.provider.invoiceReceipt(id)
    if (
      resource.id !== owned.id ||
      resource.attributes.store_id !== owned.attributes.store_id ||
      resource.attributes.customer_id !== owned.attributes.customer_id ||
      resource.attributes.subscription_id !== owned.attributes.subscription_id ||
      resource.attributes.total !== owned.attributes.total ||
      resource.attributes.currency !== owned.attributes.currency ||
      resource.attributes.status === 'pending' ||
      resource.attributes.status === 'void'
    )
      throw new BillingError(409, 'invoice_changed')
    return { url }
  }
  async cancel(identity: AuthenticatedIdentity) {
    const claim = await this.repository.claimCancellation(identity)
    if (claim.confirmed) return { status: 'confirmed' as const }
    try {
      // Uncertain previous dispatch: recover by read only, including after process restart.
      const result = claim.dispatch
        ? await this.provider.cancel(claim.subscriptionId)
        : await this.provider.get('subscriptions', claim.subscriptionId)
      if (
        result.type !== 'subscriptions' ||
        result.id !== claim.subscriptionId ||
        result.attributes.store_id !== claim.storeId ||
        result.attributes.customer_id !== claim.customerId ||
        !result.attributes.test_mode ||
        (!result.attributes.cancelled && result.attributes.status !== 'expired') ||
        !result.attributes.ends_at
      ) {
        return { status: 'pending' as const }
      }
      await this.repository.confirmCancellation(identity, claim, result)
      return { status: 'confirmed' as const }
    } catch {
      // Do not erase a durable pending command or leak provider URLs/errors on an unknown outcome.
      return { status: 'pending' as const }
    }
  }
}
export function billingManagementRoutes(
  server: FastifyInstance,
  verifier: IdentityVerifier,
  module: BillingManagementModule,
) {
  server.get('/v1/billing', async (req, reply) => {
    reply.header('Cache-Control', 'no-store, private')
    return module.snapshot(await verifier.verify(req.headers.authorization))
  })
  server.post<{ Params: { id: string } }>(
    '/v1/billing/invoices/:id/receipt',
    { bodyLimit: 1024 },
    async (req, reply) => {
      reply.header('Cache-Control', 'no-store, private')
      const identity = await verifier.verify(req.headers.authorization)
      if (
        req.body === null ||
        typeof req.body !== 'object' ||
        Array.isArray(req.body) ||
        Object.keys(req.body).length
      )
        throw new BillingError(400, 'invalid_request')
      return module.receipt(identity, req.params.id)
    },
  )
  server.get('/v1/billing/records', async (req, reply) => {
    reply.header('Cache-Control', 'no-store, private')
    return module.read(await verifier.verify(req.headers.authorization))
  })
  server.post('/v1/billing/cancel', { bodyLimit: 1024 }, async (req, reply) => {
    reply.header('Cache-Control', 'no-store, private')
    const identity = await verifier.verify(req.headers.authorization)
    if (
      req.body === null ||
      typeof req.body !== 'object' ||
      Array.isArray(req.body) ||
      Object.keys(req.body).length
    ) {
      throw new BillingError(400, 'invalid_request')
    }
    const result = await module.cancel(identity)
    if (result.status === 'pending') return reply.code(409).send({ error: 'cancellation_pending' })
    return result
  })
}
