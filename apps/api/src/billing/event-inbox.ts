import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import { verifyLemonSignature } from './provider-boundary.js'
import { BillingError } from './checkout.js'
import type { BillingEnvironment } from './billing-sql.js'
import { ReconciliationError, type BillingResource, type ResourceKind } from './resources.js'

const events: Record<string, ResourceKind> = {
  subscription_created: 'subscriptions',
  subscription_updated: 'subscriptions',
  subscription_cancelled: 'subscriptions',
  subscription_resumed: 'subscriptions',
  subscription_expired: 'subscriptions',
  subscription_paused: 'subscriptions',
  subscription_unpaused: 'subscriptions',
  subscription_payment_success: 'subscription-invoices',
  subscription_payment_failed: 'subscription-invoices',
  subscription_payment_recovered: 'subscription-invoices',
  subscription_payment_refunded: 'subscription-invoices',
}
const envelope = z.object({
  meta: z.object({
    event_name: z.string(),
    // Lemon documents test_mode on data.attributes; meta may omit it.
    test_mode: z.boolean().optional(),
    custom_data: z.unknown().optional(),
  }),
  data: z.object({
    type: z.enum(['subscriptions', 'subscription-invoices']),
    id: z.string().regex(/^[1-9]\d*$/),
    attributes: z.object({
      store_id: z.number().int().positive().safe(),
      test_mode: z.boolean(),
    }),
  }),
})
export type BillingNotification = {
  digest: string
  storeId: string
  kind: ResourceKind
  resourceId: string
  intentId: string | null
}
export type BillingJob = BillingNotification & {
  id: string
  lease: string
  attempts: number
}
export interface BillingInboxRepository {
  receive(notification: BillingNotification): Promise<void>
  claim(now: Date): Promise<BillingJob | null>
  commit(job: BillingJob, resource: BillingResource, now: Date): Promise<void>
  fail(job: BillingJob, code: string, retryAt: Date | null): Promise<void>
}
export interface BillingResourceProvider {
  get(kind: ResourceKind, id: string): Promise<BillingResource>
}
export class BillingEventInbox {
  constructor(
    private readonly repository: BillingInboxRepository,
    private readonly storeId: string,
    private readonly secret: string,
    private readonly environment: BillingEnvironment = 'test',
  ) {}
  async receive(raw: Buffer, signature: string | undefined) {
    if (!this.secret) throw new BillingError(503, 'billing_unavailable')
    if (raw.byteLength > 262144) throw new BillingError(413, 'event_too_large')
    if (!verifyLemonSignature(raw, signature, this.secret))
      throw new BillingError(401, 'invalid_signature')
    let decoded: unknown
    try {
      decoded = JSON.parse(raw.toString('utf8'))
    } catch {
      throw new BillingError(400, 'invalid_event')
    }
    const result = envelope.safeParse(decoded)
    if (!result.success) throw new BillingError(400, 'invalid_event')
    const event = result.data
    if (
      String(event.data.attributes.store_id) !== this.storeId ||
      event.data.attributes.test_mode !== (this.environment === 'test') ||
      (event.meta.test_mode !== undefined &&
        event.meta.test_mode !== event.data.attributes.test_mode) ||
      events[event.meta.event_name] !== event.data.type
    ) {
      throw new BillingError(400, 'event_scope_mismatch')
    }
    const custom =
      event.meta.custom_data &&
      typeof event.meta.custom_data === 'object' &&
      !Array.isArray(event.meta.custom_data)
        ? (event.meta.custom_data as Record<string, unknown>)
        : {}
    const intentId = z.uuid().safeParse(custom.intent_id)
    await this.repository.receive({
      digest: createHash('sha256').update(raw).digest('hex'),
      storeId: this.storeId,
      kind: event.data.type,
      resourceId: event.data.id,
      intentId: intentId.success ? intentId.data : null,
    })
  }
}
export class BillingEventWorker {
  constructor(
    private readonly repository: BillingInboxRepository,
    private readonly provider: BillingResourceProvider,
    private readonly now = () => new Date(),
    private readonly environment: BillingEnvironment = 'test',
  ) {}
  async runOne(): Promise<boolean> {
    const job = await this.repository.claim(this.now())
    if (!job) return false
    try {
      const resource = await this.provider.get(job.kind, job.resourceId)
      if (
        resource.type !== job.kind ||
        resource.id !== job.resourceId ||
        resource.attributes.store_id !== job.storeId ||
        resource.attributes.test_mode !== (this.environment === 'test')
      ) {
        throw new ReconciliationError('provider_scope_mismatch')
      }
      await this.repository.commit(job, resource, this.now())
    } catch (error) {
      const retryable = !(error instanceof ReconciliationError) || error.retryable
      const retryAt =
        retryable && job.attempts < 8
          ? new Date(this.now().getTime() + Math.min(3600, 5 * 2 ** (job.attempts - 1)) * 1000)
          : null
      await this.repository.fail(
        job,
        error instanceof ReconciliationError ? error.code : 'provider_or_storage_unavailable',
        retryAt,
      )
    }
    return true
  }
}

export function billingWebhookRoutes(server: FastifyInstance, inbox: BillingEventInbox) {
  // Encapsulation keeps every other route's JSON parser and authenticated hooks unchanged.
  server.register(async (scope) => {
    scope.removeContentTypeParser('application/json')
    scope.addContentTypeParser(
      'application/json',
      { parseAs: 'buffer', bodyLimit: 262144 },
      (_req, body, done) => done(null, body),
    )
    scope.post('/hooks/lemonsqueezy', { bodyLimit: 262144 }, async (request, reply) => {
      reply.header('Cache-Control', 'no-store')
      const signature = request.headers['x-signature']
      await inbox.receive(
        request.body as Buffer,
        typeof signature === 'string' ? signature : undefined,
      )
      return { received: true }
    })
  })
}
