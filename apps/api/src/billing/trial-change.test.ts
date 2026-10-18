import { describe, expect, it } from 'vitest'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import type { BillingSelection } from './policy.js'
import type { InvoiceResource, SubscriptionResource } from './resources.js'
import {
  TrialChangeModule,
  type TrialChangeCandidate,
  type TrialChangeClaim,
  type TrialChangeProvider,
  type TrialChangeRepository,
} from './trial-change.js'

const identity = { userId: 'coach-1' } as AuthenticatedIdentity
const requested: BillingSelection = { tier: 'advanced', interval: 'year' }
const candidate: TrialChangeCandidate = {
  subscriptionId: '2609277',
  storeId: '123',
  customerId: '456',
  oldVariantId: 'pro-month',
  targetVariantId: 'prime-year',
  trialEndsAt: '2026-11-15T09:09:08Z',
  requestVersion: '2026-10-16T08:00:00Z',
}
const subscription = (variantId = candidate.oldVariantId): SubscriptionResource => ({
  type: 'subscriptions',
  id: candidate.subscriptionId,
  attributes: {
    store_id: candidate.storeId,
    customer_id: candidate.customerId,
    test_mode: true,
    variant_id: variantId,
    status: 'on_trial',
    cancelled: false,
    created_at: '2026-10-15T09:09:08Z',
    updated_at: '2026-10-16T08:00:00Z',
    trial_ends_at: candidate.trialEndsAt,
    renews_at: candidate.trialEndsAt,
    ends_at: null,
  },
})
const invoice = (id: string, total: number): InvoiceResource => ({
  type: 'subscription-invoices',
  id,
  attributes: {
    store_id: candidate.storeId,
    customer_id: candidate.customerId,
    test_mode: true,
    subscription_id: candidate.subscriptionId,
    created_at: '2026-10-16T08:00:00Z',
    updated_at: '2026-10-16T08:00:00Z',
    billing_reason: 'updated',
    currency: 'TWD',
    status: 'paid',
    subtotal: total,
    subtotal_usd: total,
    currency_rate: '1',
    total,
    refunded_amount: 0,
  },
})

class Repository implements TrialChangeRepository {
  confirmed = false
  claimValue: TrialChangeClaim | null = null
  baselineSeen: string[] = []
  async preview(_identity: AuthenticatedIdentity, _requested: BillingSelection) {
    return candidate
  }
  async claim(
    _identity: AuthenticatedIdentity,
    _candidate: TrialChangeCandidate,
    baselineInvoiceIds: string[],
  ) {
    this.baselineSeen = baselineInvoiceIds
    return (
      this.claimValue ?? {
        ...candidate,
        id: 'change-1',
        baselineInvoiceIds,
        dispatch: true,
        confirmed: false,
      }
    )
  }
  async confirm(
    _identity: AuthenticatedIdentity,
    _claim: TrialChangeClaim,
    _resource: SubscriptionResource,
  ) {
    this.confirmed = true
  }
}

class Provider implements TrialChangeProvider {
  current = subscription()
  invoices: InvoiceResource[] = [invoice('initial-zero', 0)]
  patches = 0
  async get() {
    return this.current
  }
  async subscriptionInvoices() {
    return this.invoices
  }
  async updateTrialVariant() {
    this.patches += 1
    this.current = subscription(candidate.targetVariantId)
    this.invoices = [...this.invoices, invoice('updated-zero', 0)]
    return this.current
  }
}

describe('trial subscription change', () => {
  it('persists the pre-PATCH invoice baseline and confirms a same-subscription zero-charge change', async () => {
    const repository = new Repository()
    const provider = new Provider()
    const result = await new TrialChangeModule(repository, provider).change(identity, requested)

    expect(result).toEqual({ status: 'confirmed' })
    expect(repository.baselineSeen).toEqual(['initial-zero'])
    expect(provider.patches).toBe(1)
    expect(repository.confirmed).toBe(true)
  })

  it('recovers a timed-out PATCH by read-back without dispatching a second mutation', async () => {
    const repository = new Repository()
    repository.claimValue = {
      ...candidate,
      id: 'change-1',
      baselineInvoiceIds: ['initial-zero'],
      dispatch: false,
      confirmed: false,
    }
    const provider = new Provider()
    provider.current = subscription(candidate.targetVariantId)
    provider.invoices.push(invoice('updated-zero', 0))

    expect(await new TrialChangeModule(repository, provider).change(identity, requested)).toEqual({
      status: 'confirmed',
    })
    expect(provider.patches).toBe(0)
    expect(repository.confirmed).toBe(true)
  })

  it('fails closed when the change creates a positive invoice', async () => {
    const repository = new Repository()
    const provider = new Provider()
    provider.updateTrialVariant = async () => {
      provider.patches += 1
      provider.current = subscription(candidate.targetVariantId)
      provider.invoices.push(invoice('unexpected-charge', 14500))
      return provider.current
    }

    expect(await new TrialChangeModule(repository, provider).change(identity, requested)).toEqual({
      status: 'pending',
    })
    expect(repository.confirmed).toBe(false)
  })

  it('does not overwrite a third variant or changed trial boundary', async () => {
    const repository = new Repository()
    const provider = new Provider()
    provider.current = subscription('different-variant')
    expect(await new TrialChangeModule(repository, provider).change(identity, requested)).toEqual({
      status: 'pending',
    })
    expect(provider.patches).toBe(0)
  })
})
