import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import type { AuthenticatedIdentity, IdentityVerifier } from '../identity/identity.js'
import type { BillingSelection } from './policy.js'
import type { InvoiceResource, SubscriptionResource } from './resources.js'

const selection = z
  .object({
    tier: z.enum(['basic', 'advanced']),
    interval: z.enum(['month', 'year']),
  })
  .strict()
const confirmation = z.object({ previewId: z.uuid() }).strict()

export type PaidChangePreview = {
  id: string
  tier: BillingSelection['tier']
  interval: BillingSelection['interval']
  estimate: { amount: number; currency: 'TWD' }
  expiresAt: string
}
export type PaidChangeClaim = {
  id: string
  subscriptionId: string
  storeId: string
  customerId: string
  fromVariantId: string
  targetVariantId: string
  dispatch: boolean
}
export interface PaidChangeRepository {
  preview(identity: AuthenticatedIdentity, requested: BillingSelection): Promise<PaidChangePreview>
  claim(identity: AuthenticatedIdentity, previewId: string): Promise<PaidChangeClaim>
}
export interface PaidChangeProvider {
  get(kind: 'subscriptions', id: string): Promise<SubscriptionResource | InvoiceResource>
  updatePaidVariant(input: { id: string; targetVariantId: string }): Promise<SubscriptionResource>
}

export class PaidChangeModule {
  constructor(
    private readonly repository: PaidChangeRepository,
    private readonly provider: PaidChangeProvider,
  ) {}

  preview(identity: AuthenticatedIdentity, raw: unknown) {
    return this.repository.preview(identity, selection.parse(raw))
  }

  async confirm(identity: AuthenticatedIdentity, raw: unknown) {
    const { previewId } = confirmation.parse(raw)
    // The transaction commits `dispatching` before any charge-capable request. A repeat request,
    // browser retry or process restart returns pending and never sends a second PATCH.
    const claim = await this.repository.claim(identity, previewId)
    if (!claim.dispatch) return { status: 'pending' as const }
    try {
      const current = await this.provider.get('subscriptions', claim.subscriptionId)
      if (
        current.type !== 'subscriptions' ||
        current.id !== claim.subscriptionId ||
        current.attributes.store_id !== claim.storeId ||
        current.attributes.customer_id !== claim.customerId ||
        current.attributes.status !== 'active' ||
        current.attributes.payment_processor !== 'stripe' ||
        current.attributes.cancelled ||
        current.attributes.variant_id !== claim.fromVariantId
      )
        return { status: 'pending' as const }
      await this.provider.updatePaidVariant({
        id: claim.subscriptionId,
        targetVariantId: claim.targetVariantId,
      })
    } catch {
      // A timeout can mean Lemon charged. The command must stay dispatching for read-back/recovery.
    }
    return { status: 'pending' as const }
  }
}

export function paidChangeRoutes(
  server: FastifyInstance,
  verifier: IdentityVerifier,
  module: PaidChangeModule,
) {
  server.post('/v1/billing/paid-change/preview', { bodyLimit: 1024 }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store, private')
    return module.preview(await verifier.verify(request.headers.authorization), request.body)
  })
  server.post('/v1/billing/paid-change', { bodyLimit: 1024 }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store, private')
    return module.confirm(await verifier.verify(request.headers.authorization), request.body)
  })
}
