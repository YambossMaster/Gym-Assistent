import { describe, expect, it, vi } from 'vitest'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import { PaidChangeModule, type PaidChangeClaim } from './paid-change.js'
import type { SubscriptionResource } from './resources.js'

const identity = { userId: 'owner' } as AuthenticatedIdentity
const claim: PaidChangeClaim = {
  id: 'change',
  subscriptionId: '123',
  storeId: '456',
  customerId: '789',
  fromVariantId: '10',
  targetVariantId: '11',
  dispatch: true,
}
const current: SubscriptionResource = {
  type: 'subscriptions',
  id: '123',
  attributes: {
    store_id: '456',
    customer_id: '789',
    test_mode: true,
    variant_id: '10',
    payment_processor: 'stripe',
    status: 'active',
    cancelled: false,
    trial_ends_at: null,
    ends_at: null,
    renews_at: '2026-11-17T00:00:00Z',
    created_at: '2026-10-17T00:00:00Z',
    updated_at: '2026-10-17T00:00:00Z',
  },
}

describe('paid change dispatch boundary', () => {
  it('sends only the first claimed request and never replays a possible charge', async () => {
    let claimed = false
    const patch = vi.fn(async () => current)
    const module = new PaidChangeModule(
      {
        preview: vi.fn(),
        claim: vi.fn(async () => {
          if (claimed) return { ...claim, dispatch: false }
          claimed = true
          return claim
        }),
      },
      { get: vi.fn(async () => current), updatePaidVariant: patch },
    )
    await Promise.all([
      module.confirm(identity, { previewId: '00000000-0000-4000-8000-000000000001' }),
      module.confirm(identity, { previewId: '00000000-0000-4000-8000-000000000001' }),
    ])
    expect(patch).toHaveBeenCalledTimes(1)
    expect(patch).toHaveBeenCalledWith({ id: '123', targetVariantId: '11' })
  })

  it('leaves an unknown provider outcome pending without a second PATCH', async () => {
    const patch = vi.fn(async () => {
      throw new Error('timeout after payment')
    })
    const module = new PaidChangeModule(
      {
        preview: vi.fn(),
        claim: vi.fn(async () => claim),
      },
      { get: vi.fn(async () => current), updatePaidVariant: patch },
    )
    expect(
      await module.confirm(identity, { previewId: '00000000-0000-4000-8000-000000000001' }),
    ).toEqual({ status: 'pending' })
    expect(patch).toHaveBeenCalledTimes(1)
  })
})
