import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import type { BillingNotification } from './event-inbox.js'
import type { BillingResource, InvoiceResource } from './resources.js'
import { ReconciliationError } from './resources.js'
import type { BillingEnvironment } from './billing-sql.js'

export interface MissingEventRecoveryRepository {
  boundSubscriptionsAfter(
    storeId: string,
    cursor: string | null,
    limit: number,
  ): Promise<
    Array<{
      id: string
      intentId: string
    }>
  >
  receive(notification: BillingNotification): Promise<void>
}

export interface MissingEventRecoveryProvider {
  get(kind: 'subscriptions', id: string): Promise<BillingResource>
  subscriptionInvoices(id: string): Promise<InvoiceResource[]>
}

/** Rechecks only already owner-bound subscriptions; the normal inbox worker remains the authority. */
export class MissingBillingEventRecovery {
  private cursor: string | null = null

  constructor(
    private readonly repository: MissingEventRecoveryRepository,
    private readonly provider: MissingEventRecoveryProvider,
    private readonly storeId: string,
    private readonly environment: BillingEnvironment = 'test',
  ) {}

  async scanBatch(limit = 20): Promise<{ scanned: number; resources: number }> {
    assert.ok(Number.isSafeInteger(limit) && limit > 0 && limit <= 100)
    let ids = await this.repository.boundSubscriptionsAfter(this.storeId, this.cursor, limit)
    if (ids.length === 0 && this.cursor !== null) {
      this.cursor = null
      ids = await this.repository.boundSubscriptionsAfter(this.storeId, null, limit)
    }
    let resources = 0
    for (const { id, intentId } of ids) {
      assert.match(
        intentId,
        /^[a-f0-9-]{36}$/,
        'only an existing intent-bound subscription can be scanned',
      )
      const subscription = await this.provider.get('subscriptions', id)
      if (
        subscription.type !== 'subscriptions' ||
        subscription.id !== id ||
        subscription.attributes.store_id !== this.storeId ||
        subscription.attributes.test_mode !== (this.environment === 'test')
      )
        throw new ReconciliationError('provider_scope_mismatch')
      const invoices = await this.provider.subscriptionInvoices(id)
      for (const invoice of invoices) {
        if (
          invoice.attributes.subscription_id !== id ||
          invoice.attributes.store_id !== this.storeId ||
          invoice.attributes.customer_id !== subscription.attributes.customer_id ||
          invoice.attributes.test_mode !== (this.environment === 'test')
        )
          throw new ReconciliationError('provider_scope_mismatch')
      }
      const put = async (
        kind: BillingNotification['kind'],
        resourceId: string,
        version: string,
      ) => {
        const digest = createHash('sha256')
          .update(`reconcile:${this.environment}:${this.storeId}:${kind}:${resourceId}:${version}`)
          .digest('hex')
        await this.repository.receive({ digest, storeId: this.storeId, kind, resourceId, intentId })
        resources++
      }
      await put('subscriptions', id, subscription.attributes.updated_at)
      for (const invoice of invoices)
        await put('subscription-invoices', invoice.id, invoice.attributes.updated_at)
      this.cursor = id
    }
    return { scanned: ids.length, resources }
  }
}
