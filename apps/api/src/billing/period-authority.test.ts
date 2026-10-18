import { describe, expect, it } from 'vitest'
import {
  initialPeriod,
  invoiceMatchesCatalogPrice,
  paidMonthlyTierUpgrade,
  paidMonthlyToAnnualSwitch,
  renewalPeriod,
} from './period-authority.js'
import type { InvoiceResource, SubscriptionResource } from './resources.js'

const subscription = (): SubscriptionResource => ({
  type: 'subscriptions',
  id: '1',
  attributes: {
    store_id: '10',
    customer_id: '20',
    test_mode: true,
    variant_id: '30',
    status: 'on_trial',
    cancelled: false,
    created_at: '2026-10-15T00:00:00Z',
    updated_at: '2026-10-15T00:00:01Z',
    trial_ends_at: '2026-11-15T00:00:00Z',
    renews_at: '2026-11-15T00:00:00Z',
    ends_at: null,
  },
})
const invoice = (): InvoiceResource => ({
  type: 'subscription-invoices',
  id: '2',
  attributes: {
    store_id: '10',
    customer_id: '20',
    test_mode: true,
    subscription_id: '1',
    created_at: '2026-10-15T00:00:30Z',
    updated_at: '2026-10-15T00:00:30Z',
    billing_reason: 'initial',
    currency: 'TWD',
    status: 'paid',
    subtotal: 11489,
    subtotal_usd: 354,
    currency_rate: '0.03081322',
    total: 11489,
    refunded_amount: 0,
  },
})
const initialExpected = { currency: 'TWD', total: 11500 }

describe('paid same-cycle monthly tier upgrade', () => {
  const facts = () => {
    const previous = subscription()
    previous.attributes.status = 'active'
    previous.attributes.trial_ends_at = null
    previous.attributes.updated_at = '2026-10-17T07:13:37Z'
    previous.attributes.renews_at = '2026-11-17T07:06:26.000000Z'
    const current = structuredClone(previous)
    current.attributes.variant_id = '40'
    current.attributes.updated_at = '2026-10-17T07:37:06Z'
    const paid = invoice()
    paid.attributes.billing_reason = 'updated'
    paid.attributes.created_at = '2026-10-17T07:37:06Z'
    paid.attributes.updated_at = '2026-10-17T07:37:06Z'
    paid.attributes.total = 3018
    paid.attributes.subtotal = 3018
    paid.attributes.subtotal_usd = 93
    return {
      previous,
      current,
      paid,
      period: {
        tier: 'basic',
        billingInterval: 'month',
        startsAt: '2026-10-17T07:06:26Z',
        endsAt: '2026-11-17T07:06:26Z',
      },
      variants: { basicMonth: '30', advancedMonth: '40' },
    }
  }
  it('accepts the observed paid update while preserving the original end', () => {
    const f = facts()
    expect(paidMonthlyTierUpgrade(f.previous, f.current, f.paid, f.period, f.variants)).toEqual({
      invoiceId: '2',
      subscriptionVersion: '2026-10-17T07:37:06Z',
      periodEndsAt: '2026-11-17T07:06:26Z',
    })
  })
  it.each(['pending', 'refunded', 'void'] as const)('rejects %s updated invoice', (status) => {
    const f = facts()
    f.paid.attributes.status = status
    expect(paidMonthlyTierUpgrade(f.previous, f.current, f.paid, f.period, f.variants)).toBeNull()
  })
  it('rejects wrong invoice identity, stale payment and moved renewal end', () => {
    const f = facts()
    f.paid.attributes.customer_id = '999'
    expect(paidMonthlyTierUpgrade(f.previous, f.current, f.paid, f.period, f.variants)).toBeNull()
    f.paid.attributes.customer_id = '20'
    f.paid.attributes.created_at = '2026-10-16T00:00:00Z'
    expect(paidMonthlyTierUpgrade(f.previous, f.current, f.paid, f.period, f.variants)).toBeNull()
    f.paid.attributes.created_at = '2026-10-17T07:37:06Z'
    f.current.attributes.renews_at = '2026-12-17T07:06:26Z'
    expect(paidMonthlyTierUpgrade(f.previous, f.current, f.paid, f.period, f.variants)).toBeNull()
  })
})

describe('paid monthly-to-annual switch', () => {
  const facts = () => {
    const previous = subscription()
    previous.attributes.status = 'active'
    previous.attributes.trial_ends_at = null
    previous.attributes.variant_id = '40'
    previous.attributes.updated_at = '2026-10-17T07:37:06Z'
    previous.attributes.renews_at = '2026-11-17T07:06:26Z'
    const current = structuredClone(previous)
    current.attributes.variant_id = '50'
    current.attributes.updated_at = '2026-10-17T08:21:43Z'
    current.attributes.renews_at = '2027-10-17T08:21:39Z'
    const paid = invoice()
    paid.attributes.billing_reason = 'updated'
    paid.attributes.created_at = '2026-10-17T08:21:42Z'
    paid.attributes.updated_at = '2026-10-17T08:21:42Z'
    paid.attributes.total = 130528
    paid.attributes.subtotal = 130528
    paid.attributes.subtotal_usd = 4022
    return {
      previous,
      current,
      paid,
      period: {
        tier: 'advanced',
        billingInterval: 'month',
        startsAt: '2026-10-17T07:06:58Z',
        endsAt: '2026-11-17T07:06:26Z',
      },
      variants: { currentMonth: '40', targetYear: '50' },
    }
  }
  it('accepts the observed paid annual invoice and new provider renewal end', () => {
    const f = facts()
    expect(paidMonthlyToAnnualSwitch(f.previous, f.current, f.paid, f.period, f.variants)).toEqual({
      invoiceId: '2',
      subscriptionVersion: '2026-10-17T08:21:43Z',
      startsAt: '2026-10-17T08:21:42Z',
      periodEndsAt: '2027-10-17T08:21:39Z',
    })
  })
  it.each(['pending', 'refunded', 'void'] as const)('rejects %s invoice', (status) => {
    const f = facts()
    f.paid.attributes.status = status
    expect(
      paidMonthlyToAnnualSwitch(f.previous, f.current, f.paid, f.period, f.variants),
    ).toBeNull()
  })
  it('rejects a moved customer, unpaid amount, and unchanged renewal boundary', () => {
    const f = facts()
    f.paid.attributes.customer_id = '999'
    expect(
      paidMonthlyToAnnualSwitch(f.previous, f.current, f.paid, f.period, f.variants),
    ).toBeNull()
    f.paid.attributes.customer_id = '20'
    f.paid.attributes.subtotal = 80000
    f.paid.attributes.total = 80000
    expect(
      paidMonthlyToAnnualSwitch(f.previous, f.current, f.paid, f.period, f.variants),
    ).toBeNull()
    f.paid.attributes.subtotal = 130528
    f.paid.attributes.total = 130528
    f.current.attributes.renews_at = f.previous.attributes.renews_at
    expect(
      paidMonthlyToAnnualSwitch(f.previous, f.current, f.paid, f.period, f.variants),
    ).toBeNull()
  })
})

it('accepts only the provider USD-cent round trip for the TWD catalog subtotal', () => {
  expect(invoiceMatchesCatalogPrice(invoice(), initialExpected)).toBe(true)
  const underpaid = invoice()
  underpaid.attributes.subtotal = 11000
  underpaid.attributes.total = 11000
  expect(invoiceMatchesCatalogPrice(underpaid, initialExpected)).toBe(false)
  const wrongUsd = invoice()
  wrongUsd.attributes.subtotal_usd = 340
  expect(invoiceMatchesCatalogPrice(wrongUsd, initialExpected)).toBe(false)
  const wrongRate = invoice()
  wrongRate.attributes.currency_rate = '0.03000000'
  expect(invoiceMatchesCatalogPrice(wrongRate, initialExpected)).toBe(false)
  const movedRate = invoice()
  movedRate.attributes.currency_rate = '0.02'
  movedRate.attributes.subtotal_usd = 234
  movedRate.attributes.subtotal = 11700
  movedRate.attributes.total = 11700
  expect(invoiceMatchesCatalogPrice(movedRate, initialExpected)).toBe(true)
  movedRate.attributes.subtotal_usd = 235
  movedRate.attributes.subtotal = 11750
  movedRate.attributes.total = 11750
  expect(invoiceMatchesCatalogPrice(movedRate, initialExpected)).toBe(false)
})

describe('initial verified period', () => {
  it('accepts the provider trial boundary without a paid invoice', () => {
    expect(initialPeriod(subscription(), null, true, initialExpected)).toMatchObject({
      origin: 'trial',
      endsAt: '2026-11-15T00:00:00Z',
      invoiceId: null,
    })
  })
  it('requires the matched paid initial invoice and original next-cycle boundary', () => {
    const s = subscription()
    s.attributes.status = 'active'
    s.attributes.trial_ends_at = null
    expect(initialPeriod(s, null, false, initialExpected)).toBeNull()
    expect(initialPeriod(s, invoice(), false, initialExpected)).toMatchObject({
      origin: 'payment',
      invoiceId: '2',
      originalDueAt: '2026-11-15T00:00:00Z',
    })
    const underpaid = invoice()
    underpaid.attributes.subtotal = 11000
    underpaid.attributes.total = 11000
    expect(initialPeriod(s, underpaid, false, initialExpected)).toBeNull()
    const wrong = invoice()
    wrong.attributes.subscription_id = 'other'
    expect(initialPeriod(s, wrong, false, initialExpected)).toBeNull()
    wrong.attributes.subscription_id = '1'
    wrong.attributes.billing_reason = 'renewal'
    expect(initialPeriod(s, wrong, false, initialExpected)).toBeNull()
  })
  it('does not infer trial or paid access from cancellation, retry status or missing evidence', () => {
    const s = subscription()
    s.attributes.status = 'cancelled'
    s.attributes.cancelled = true
    s.attributes.trial_ends_at = null
    s.attributes.ends_at = '2026-11-15T00:00:00Z'
    expect(initialPeriod(s, null, true, initialExpected)).toBeNull()
    s.attributes.status = 'past_due'
    expect(initialPeriod(s, invoice(), false, initialExpected)).toBeNull()
  })
  it('can recover a cancelled initial cycle only while its original boundary is unchanged', () => {
    const s = subscription()
    s.attributes.status = 'cancelled'
    s.attributes.cancelled = true
    s.attributes.ends_at = s.attributes.renews_at
    expect(initialPeriod(s, null, true, initialExpected)?.origin).toBe('trial')
    s.attributes.trial_ends_at = null
    expect(initialPeriod(s, null, true, initialExpected)).toBeNull()
    s.attributes.renews_at = '2026-12-15T00:00:00Z'
    expect(initialPeriod(s, invoice(), false, initialExpected)).toBeNull()
  })
  it('rejects reversed period boundaries', () => {
    const s = subscription()
    s.attributes.trial_ends_at = '2026-10-14T00:00:00Z'
    s.attributes.renews_at = s.attributes.trial_ends_at
    expect(() => initialPeriod(s, null, true, initialExpected)).toThrow('invalid_trial_period')
  })
})

describe('verified renewal period', () => {
  const priorEnd = '2026-11-15T00:00:00Z'
  const renewedSubscription = () => {
    const value = subscription()
    value.attributes.status = 'active' as const
    value.attributes.trial_ends_at = null
    value.attributes.renews_at = '2026-12-15T00:00:00Z'
    value.attributes.updated_at = '2026-11-15T00:00:20Z'
    return value
  }
  const renewalInvoice = () => {
    const value = invoice()
    value.id = '3'
    value.attributes.billing_reason = 'renewal' as const
    value.attributes.created_at = '2026-11-15T00:00:10Z'
    value.attributes.updated_at = '2026-11-15T00:00:15Z'
    value.attributes.total = 11489
    value.attributes.subtotal = 11489
    value.attributes.subtotal_usd = 354
    value.attributes.currency_rate = '0.03081322'
    return value
  }
  const expected = { variantId: '30', currency: 'TWD', total: 11500 }

  it('creates the next period only from the matched paid renewal invoice', () => {
    expect(renewalPeriod(renewedSubscription(), renewalInvoice(), priorEnd, expected)).toEqual({
      origin: 'renewal',
      startsAt: priorEnd,
      endsAt: '2026-12-15T00:00:00Z',
      subscriptionVersion: '2026-11-15T00:00:20Z',
      invoiceId: '3',
      invoiceVersion: '2026-11-15T00:00:15Z',
      originalDueAt: priorEnd,
    })
  })

  it.each(['pending', 'void', 'refunded', 'partial_refund'] as const)(
    'does not treat %s as current renewal payment proof',
    (status) => {
      const value = renewalInvoice()
      value.attributes.status = status
      expect(renewalPeriod(renewedSubscription(), value, priorEnd, expected)).toBeNull()
    },
  )

  it('does not infer payment from active status and an advanced renewal date', () => {
    const value = renewalInvoice()
    value.attributes.status = 'pending'
    expect(renewalPeriod(renewedSubscription(), value, priorEnd, expected)).toBeNull()
  })

  it('rejects a wrong subscription, variant, amount, currency or billing reason', () => {
    const wrongSubscription = renewalInvoice()
    wrongSubscription.attributes.subscription_id = '999'
    expect(renewalPeriod(renewedSubscription(), wrongSubscription, priorEnd, expected)).toBeNull()

    const wrongVariant = renewedSubscription()
    wrongVariant.attributes.variant_id = '31'
    expect(renewalPeriod(wrongVariant, renewalInvoice(), priorEnd, expected)).toBeNull()

    expect(
      renewalPeriod(renewedSubscription(), renewalInvoice(), priorEnd, {
        ...expected,
        total: 14500,
      }),
    ).toBeNull()
    expect(
      renewalPeriod(renewedSubscription(), renewalInvoice(), priorEnd, {
        ...expected,
        currency: 'USD',
      }),
    ).toBeNull()

    const updated = renewalInvoice()
    updated.attributes.billing_reason = 'updated'
    expect(renewalPeriod(renewedSubscription(), updated, priorEnd, expected)).toBeNull()
  })

  it('rejects an invoice outside the exact next period boundary', () => {
    const early = renewalInvoice()
    early.attributes.created_at = '2026-11-14T23:59:59Z'
    expect(renewalPeriod(renewedSubscription(), early, priorEnd, expected)).toBeNull()

    const invalid = renewedSubscription()
    invalid.attributes.renews_at = priorEnd
    expect(renewalPeriod(invalid, renewalInvoice(), priorEnd, expected)).toBeNull()
  })
})
