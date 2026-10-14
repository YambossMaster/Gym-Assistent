import type { AuthenticatedIdentity, IdentityVerifier } from '../identity/identity.js'
import type { FastifyInstance } from 'fastify'
import { BillingError } from './checkout.js'
import type { InvoiceResource, SubscriptionResource } from './resources.js'

export type OwnedBilling = {
  subscriptions: SubscriptionResource[]
  invoices: InvoiceResource[]
  pendingCancellation: boolean
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
  // Separate raw-facts path until the accepted BillingSnapshot projection has activation evidence.
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
