import { describe, expect, it, vi } from 'vitest'
import { MissingBillingEventRecovery } from './missing-event-recovery.js'
import type { BillingNotification } from './event-inbox.js'
import type { InvoiceResource, SubscriptionResource } from './resources.js'

const subscription = (id: string) =>
  ({
    type: 'subscriptions',
    id,
    attributes: {
      store_id: '491074',
      customer_id: '7',
      test_mode: true,
      updated_at: '2026-10-18T00:00:00Z',
    },
  }) as SubscriptionResource
const invoice = (id: string, subscriptionId: string) =>
  ({
    type: 'subscription-invoices',
    id,
    attributes: {
      store_id: '491074',
      customer_id: '7',
      subscription_id: subscriptionId,
      test_mode: true,
      updated_at: '2026-10-18T00:01:00Z',
    },
  }) as InvoiceResource
const intentId = '00000000-0000-4000-8000-000000000001'

describe('missing billing event recovery', () => {
  it('queues versioned provider reads for bound subscriptions and walks the cursor', async () => {
    const received: BillingNotification[] = []
    const repository = {
      boundSubscriptionsAfter: vi.fn(async (_store: string, cursor: string | null) =>
        cursor === null
          ? [{ id: '10', intentId }]
          : cursor === '10'
            ? [{ id: '11', intentId }]
            : [],
      ),
      receive: vi.fn(async (notification: BillingNotification) => {
        received.push(notification)
      }),
    }
    const provider = {
      get: vi.fn(async (_kind: 'subscriptions', id: string) => subscription(id)),
      subscriptionInvoices: vi.fn(async (id: string) => [invoice(`${id}1`, id)]),
    }
    const recovery = new MissingBillingEventRecovery(repository, provider, '491074')
    expect(await recovery.scanBatch(1)).toEqual({ scanned: 1, resources: 2 })
    expect(await recovery.scanBatch(1)).toEqual({ scanned: 1, resources: 2 })
    expect(received.map((row) => [row.kind, row.resourceId, row.intentId])).toEqual([
      ['subscriptions', '10', intentId],
      ['subscription-invoices', '101', intentId],
      ['subscriptions', '11', intentId],
      ['subscription-invoices', '111', intentId],
    ])
    expect(received.every((row) => /^[a-f0-9]{64}$/.test(row.digest))).toBe(true)
    expect(repository.boundSubscriptionsAfter).toHaveBeenNthCalledWith(1, '491074', null, 1)
    expect(repository.boundSubscriptionsAfter).toHaveBeenNthCalledWith(2, '491074', '10', 1)
  })

  it('refuses a foreign customer invoice before enqueuing any resource for that subscription', async () => {
    const receive = vi.fn()
    const wrong = invoice('21', '2')
    wrong.attributes.customer_id = 'other'
    const recovery = new MissingBillingEventRecovery(
      { boundSubscriptionsAfter: async () => [{ id: '2', intentId }], receive },
      { get: async () => subscription('2'), subscriptionInvoices: async () => [wrong] },
      '491074',
    )
    await expect(recovery.scanBatch()).rejects.toThrow('provider_scope_mismatch')
    expect(receive).not.toHaveBeenCalled()
  })
})
