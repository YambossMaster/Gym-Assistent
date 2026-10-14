import {
  parseBillingResource,
  ReconciliationError,
  type ResourceKind,
  type SubscriptionResource,
} from './resources.js'
import type { BillingResourceProvider } from './event-inbox.js'

/** Server-only adapter. Instantiation does not perform I/O; offline tests inject fetch. */
export class LemonTestResources implements BillingResourceProvider {
  constructor(
    private readonly config: { key: string; storeId: string; variantIds: string[] },
    private readonly request: typeof fetch = fetch,
  ) {}
  private async read(kind: ResourceKind, id: string, method: 'GET' | 'DELETE') {
    if (!/^[1-9]\d*$/.test(id)) throw new ReconciliationError('invalid_provider_id')
    const response = await this.request(`https://api.lemonsqueezy.com/v1/${kind}/${id}`, {
      method,
      headers: { Authorization: `Bearer ${this.config.key}`, Accept: 'application/vnd.api+json' },
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    })
    if (!response.ok)
      throw new ReconciliationError(
        'provider_unavailable',
        response.status === 429 || response.status >= 500 || response.status === 404,
      )
    return parseBillingResource(await response.json(), { kind, id, ...this.config })
  }
  get(kind: ResourceKind, id: string) {
    return this.read(kind, id, 'GET')
  }
  async cancel(id: string): Promise<SubscriptionResource> {
    // Validate Test Mode before any mutation, even if an operator configured a live key by mistake.
    const current = (await this.get('subscriptions', id)) as SubscriptionResource
    if (current.attributes.cancelled || current.attributes.status === 'expired') return current
    return (await this.read('subscriptions', id, 'DELETE')) as SubscriptionResource
  }
}
