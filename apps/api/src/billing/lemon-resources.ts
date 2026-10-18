import {
  parseBillingResource,
  ReconciliationError,
  type ResourceKind,
  type InvoiceResource,
  type SubscriptionResource,
} from './resources.js'
import type { BillingResourceProvider } from './event-inbox.js'
import type { BillingEnvironment } from './billing-sql.js'

/** Server-only adapter. Instantiation does not perform I/O; offline tests inject fetch. */
export class LemonTestResources implements BillingResourceProvider {
  constructor(
    private readonly config: {
      key: string
      storeId: string
      variantIds: string[]
      environment?: BillingEnvironment
    },
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
  async listSubscriptionsByVariant(variantId: string): Promise<SubscriptionResource[]> {
    if (!this.config.variantIds.includes(variantId))
      throw new ReconciliationError('unknown_variant')
    const found: SubscriptionResource[] = []
    const seen = new Set<string>()
    for (let pageNumber = 1; pageNumber <= 100; pageNumber++) {
      const url = new URL('https://api.lemonsqueezy.com/v1/subscriptions')
      url.searchParams.set('filter[store_id]', this.config.storeId)
      url.searchParams.set('filter[variant_id]', variantId)
      url.searchParams.set('page[size]', '100')
      url.searchParams.set('page[number]', String(pageNumber))
      const response = await this.request(url, {
        headers: { Authorization: `Bearer ${this.config.key}`, Accept: 'application/vnd.api+json' },
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
      })
      if (!response.ok) throw new ReconciliationError('provider_unavailable', true)
      const result = (await response.json()) as {
        data?: unknown[]
        meta?: { page?: { lastPage?: number; total?: number } }
      }
      const lastPage = result.meta?.page?.lastPage
      const total = result.meta?.page?.total
      if (
        !Array.isArray(result.data) ||
        !Number.isSafeInteger(lastPage) ||
        !Number.isSafeInteger(total) ||
        lastPage! < pageNumber ||
        lastPage! > 100 ||
        total! < 0
      )
        throw new ReconciliationError('subscription_list_incomplete')
      for (const data of result.data) {
        const resource = parseBillingResource(
          { data },
          {
            kind: 'subscriptions',
            id: String((data as { id?: unknown })?.id ?? ''),
            ...this.config,
          },
        )
        if (
          resource.type !== 'subscriptions' ||
          resource.attributes.variant_id !== variantId ||
          seen.has(resource.id)
        )
          throw new ReconciliationError('subscription_list_incomplete')
        seen.add(resource.id)
        found.push(resource)
      }
      if (pageNumber === lastPage) {
        if (found.length !== total) throw new ReconciliationError('subscription_list_incomplete')
        return found
      }
    }
    throw new ReconciliationError('subscription_list_incomplete')
  }
  async subscriptionInvoices(id: string): Promise<InvoiceResource[]> {
    if (!/^[1-9]\d*$/.test(id)) throw new ReconciliationError('invalid_provider_id')
    const url = new URL('https://api.lemonsqueezy.com/v1/subscription-invoices')
    url.searchParams.set('filter[subscription_id]', id)
    url.searchParams.set('page[size]', '100')
    const response = await this.request(url, {
      headers: { Authorization: `Bearer ${this.config.key}`, Accept: 'application/vnd.api+json' },
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    })
    if (!response.ok) throw new ReconciliationError('provider_unavailable', true)
    const raw: unknown = await response.json()
    const page = raw as { data?: unknown[]; meta?: { page?: { total?: number } } }
    if (
      !Array.isArray(page.data) ||
      !Number.isSafeInteger(page.meta?.page?.total) ||
      page.meta!.page!.total! > 100 ||
      page.data.length !== page.meta!.page!.total!
    )
      throw new ReconciliationError('invoice_list_incomplete')
    return page.data.map((data) => {
      const resource = parseBillingResource(
        { data },
        {
          kind: 'subscription-invoices',
          id: String((data as { id?: string | number }).id ?? ''),
          ...this.config,
        },
      )
      if (resource.type !== 'subscription-invoices' || resource.attributes.subscription_id !== id)
        throw new ReconciliationError('provider_scope_mismatch')
      return resource
    })
  }
  async updateTrialVariant(input: {
    id: string
    targetVariantId: string
    trialEndsAt: string
  }): Promise<SubscriptionResource> {
    if (!/^[1-9]\d*$/.test(input.id) || !this.config.variantIds.includes(input.targetVariantId))
      throw new ReconciliationError('invalid_provider_id')
    const before = await this.get('subscriptions', input.id)
    if (
      before.type !== 'subscriptions' ||
      before.attributes.status !== 'on_trial' ||
      Date.parse(before.attributes.trial_ends_at ?? '') !== Date.parse(input.trialEndsAt)
    )
      throw new ReconciliationError('trial_changed')
    const response = await this.request(
      `https://api.lemonsqueezy.com/v1/subscriptions/${input.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.config.key}`,
          Accept: 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
        },
        body: JSON.stringify({
          data: {
            type: 'subscriptions',
            id: input.id,
            attributes: {
              variant_id: Number(input.targetVariantId),
              trial_ends_at: input.trialEndsAt,
              invoice_immediately: false,
              disable_prorations: true,
            },
          },
        }),
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
      },
    )
    if (!response.ok) throw new ReconciliationError('provider_unavailable', true)
    const result = parseBillingResource(await response.json(), {
      kind: 'subscriptions',
      id: input.id,
      ...this.config,
    })
    if (result.type !== 'subscriptions') throw new ReconciliationError('provider_scope_mismatch')
    return result
  }
  async updatePaidVariant(input: {
    id: string
    targetVariantId: string
  }): Promise<SubscriptionResource> {
    if (!/^[1-9]\d*$/.test(input.id) || !this.config.variantIds.includes(input.targetVariantId))
      throw new ReconciliationError('invalid_provider_id')
    const response = await this.request(
      `https://api.lemonsqueezy.com/v1/subscriptions/${input.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.config.key}`,
          Accept: 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
        },
        body: JSON.stringify({
          data: {
            type: 'subscriptions',
            id: input.id,
            attributes: {
              variant_id: Number(input.targetVariantId),
              invoice_immediately: true,
            },
          },
        }),
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
      },
    )
    if (!response.ok) throw new ReconciliationError('provider_unavailable', true)
    const result = parseBillingResource(await response.json(), {
      kind: 'subscriptions',
      id: input.id,
      ...this.config,
    })
    if (result.type !== 'subscriptions') throw new ReconciliationError('provider_scope_mismatch')
    return result
  }
  async invoiceReceipt(id: string): Promise<{ resource: InvoiceResource; url: string }> {
    if (!/^[1-9]\d*$/.test(id)) throw new ReconciliationError('invalid_provider_id')
    const response = await this.request(
      `https://api.lemonsqueezy.com/v1/subscription-invoices/${id}`,
      {
        headers: { Authorization: `Bearer ${this.config.key}`, Accept: 'application/vnd.api+json' },
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
      },
    )
    if (!response.ok)
      throw new ReconciliationError(
        'provider_unavailable',
        response.status >= 500 || response.status === 429,
      )
    const raw: unknown = await response.json()
    const resource = parseBillingResource(raw, {
      kind: 'subscription-invoices',
      id,
      ...this.config,
    })
    if (resource.type !== 'subscription-invoices')
      throw new ReconciliationError('invalid_provider_resource')
    const candidate = (raw as { data?: { attributes?: { urls?: { invoice_url?: unknown } } } }).data
      ?.attributes?.urls?.invoice_url
    if (typeof candidate !== 'string') throw new ReconciliationError('receipt_unavailable')
    const url = new URL(candidate)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      !(url.hostname === 'lemonsqueezy.com' || url.hostname.endsWith('.lemonsqueezy.com'))
    )
      throw new ReconciliationError('unsafe_receipt_url')
    return { resource, url: url.href }
  }
  async cancel(id: string, expectedVariantId?: string): Promise<SubscriptionResource> {
    // Validate Test Mode before any mutation, even if an operator configured a live key by mistake.
    const current = (await this.get('subscriptions', id)) as SubscriptionResource
    if (expectedVariantId && current.attributes.variant_id !== expectedVariantId)
      throw new ReconciliationError('subscription_variant_changed')
    if (current.attributes.cancelled || current.attributes.status === 'expired') return current
    return (await this.read('subscriptions', id, 'DELETE')) as SubscriptionResource
  }
}
