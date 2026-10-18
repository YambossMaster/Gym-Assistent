import { z } from 'zod'
import type { AuthenticatedIdentity, IdentityVerifier } from '../identity/identity.js'
import type { FastifyInstance } from 'fastify'
import { BillingError } from './checkout.js'
import type { BillingSelection } from './policy.js'
import type { InvoiceResource, SubscriptionResource } from './resources.js'

const selection = z
  .object({ tier: z.enum(['basic', 'advanced']), interval: z.enum(['month', 'year']) })
  .strict()
export type TrialChangeClaim = {
  id: string
  subscriptionId: string
  storeId: string
  customerId: string
  oldVariantId: string
  targetVariantId: string
  trialEndsAt: string
  baselineInvoiceIds: string[]
  dispatch: boolean
  confirmed: boolean
}
export type TrialChangeCandidate = Omit<
  TrialChangeClaim,
  'id' | 'baselineInvoiceIds' | 'dispatch' | 'confirmed'
> & { requestVersion: string }
export interface TrialChangeRepository {
  preview(
    identity: AuthenticatedIdentity,
    requested: BillingSelection,
  ): Promise<TrialChangeCandidate | null>
  claim(
    identity: AuthenticatedIdentity,
    candidate: TrialChangeCandidate,
    baselineInvoiceIds: string[],
  ): Promise<TrialChangeClaim | null>
  confirm(
    identity: AuthenticatedIdentity,
    claim: TrialChangeClaim,
    resource: SubscriptionResource,
  ): Promise<void>
}
export interface TrialChangeProvider {
  get(kind: 'subscriptions', id: string): Promise<SubscriptionResource | InvoiceResource>
  subscriptionInvoices(id: string): Promise<InvoiceResource[]>
  updateTrialVariant(input: {
    id: string
    targetVariantId: string
    trialEndsAt: string
  }): Promise<SubscriptionResource>
}

/** Only a provider-verified, no-charge update to the SAME Test Mode subscription can change access. */
export class TrialChangeModule {
  constructor(
    private readonly repository: TrialChangeRepository,
    private readonly provider: TrialChangeProvider,
  ) {}
  async change(identity: AuthenticatedIdentity, raw: unknown) {
    const requested = selection.parse(raw)
    try {
      // Read the invoice baseline before creating the durable command. `claim` must revalidate the
      // candidate version under the owner lock so a concurrent provider event cannot move the
      // mutation boundary between these two steps.
      const candidate = await this.repository.preview(identity, requested)
      if (!candidate) return { status: 'unchanged' as const }
      const beforeInvoices = await this.provider.subscriptionInvoices(candidate.subscriptionId)
      const beforeIds = beforeInvoices.map((invoice) => invoice.id).sort()
      const baseline = await this.repository.claim(identity, candidate, beforeIds)
      if (!baseline) return { status: 'pending' as const }
      if (baseline.confirmed) return { status: 'confirmed' as const }

      const current = await this.provider.get('subscriptions', baseline.subscriptionId)
      if (current.type !== 'subscriptions') return { status: 'pending' as const }
      if (
        current.attributes.variant_id === baseline.oldVariantId &&
        current.attributes.status === 'on_trial' &&
        !current.attributes.cancelled &&
        Date.parse(current.attributes.trial_ends_at ?? '') === Date.parse(baseline.trialEndsAt)
      ) {
        await this.provider.updateTrialVariant({
          id: baseline.subscriptionId,
          targetVariantId: baseline.targetVariantId,
          trialEndsAt: baseline.trialEndsAt,
        })
      } else if (current.attributes.variant_id !== baseline.targetVariantId) {
        return { status: 'pending' as const }
      }
      const result = await this.provider.get('subscriptions', baseline.subscriptionId)
      const invoices = await this.provider.subscriptionInvoices(baseline.subscriptionId)
      if (
        result.type !== 'subscriptions' ||
        result.id !== baseline.subscriptionId ||
        result.attributes.store_id !== baseline.storeId ||
        result.attributes.customer_id !== baseline.customerId ||
        result.attributes.variant_id !== baseline.targetVariantId ||
        result.attributes.status !== 'on_trial' ||
        result.attributes.cancelled ||
        Date.parse(result.attributes.trial_ends_at ?? '') !== Date.parse(baseline.trialEndsAt) ||
        Date.parse(result.attributes.renews_at ?? '') !== Date.parse(baseline.trialEndsAt) ||
        invoices.some(
          (invoice) =>
            !baseline.baselineInvoiceIds.includes(invoice.id) && invoice.attributes.total > 0,
        )
      )
        return { status: 'pending' as const }
      await this.repository.confirm(identity, baseline, result)
      return { status: 'confirmed' as const }
    } catch {
      // A timed-out PATCH might already have changed Lemon. Recover by read-back on retry.
      return { status: 'pending' as const }
    }
  }
}

export function trialChangeRoutes(
  server: FastifyInstance,
  verifier: IdentityVerifier,
  module: TrialChangeModule,
) {
  server.post('/v1/billing/trial-change', { bodyLimit: 1024 }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store, private')
    return module.change(await verifier.verify(request.headers.authorization), request.body)
  })
}
