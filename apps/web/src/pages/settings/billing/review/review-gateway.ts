import type { BillingGateway, BillingSnapshot, CheckoutIntent, Quote, Selection } from '../types'
import { formatDate } from '../types'
import type { ReviewProgress, ReviewScenario } from './review-session'
export type { ReviewScenario } from './review-session'

/** Only imported by the DEV review entry. No HTTP, real payment, persisted identity or entitlement. */
export function createReviewGateway(
  scenario: ReviewScenario,
  options: { restored?: ReviewProgress; save?: (p: ReviewProgress) => void } = {}
) {
  const progress: ReviewProgress = options.restored
    ? structuredClone(options.restored)
    : {
        scenario,
        selection: { tier: 'basic', interval: 'month' },
        startedAt: new Date().toISOString(),
        begun: false,
        confirmed: false,
        cancelled: false
      }
  const save = () => options.save?.(structuredClone(progress))
  let cancellationFailed = false
  let revision = 0
  let chosen: Quote | null = null
  let status: CheckoutIntent | null = null
  let overview: BillingSnapshot = { subscription: null, invoices: [] }
  const applyTrialChange = (selection: Selection) => {
    const current = overview.subscription
    if (!current || current.status !== 'trial') throw new Error('trial_change_unavailable')
    if (
      (current.tier === 'advanced' && selection.tier === 'basic') ||
      (current.interval === 'year' && selection.interval === 'month')
    )
      throw new Error('downgrade_unavailable')
    else {
      current.tier = selection.tier
      current.interval = selection.interval
      current.renewal = {
        amount:
          (selection.tier === 'basic' ? 11500 : 14500) * (selection.interval === 'year' ? 10 : 1),
        currency: 'TWD'
      }
      delete current.scheduledChange
    }
  }
  const start = progress.startedAt
  const boundary = (months: number, days = 0) => {
    const date = new Date(start)
    const day = date.getUTCDate()
    date.setUTCDate(1)
    date.setUTCMonth(date.getUTCMonth() + months)
    const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
    date.setUTCDate(Math.min(day, last) + days)
    return date.toISOString()
  }
  if (['invoices', 'cancel_error', 'past_due', 'expired'].includes(scenario))
    overview = {
      subscription: {
        tier: 'advanced',
        interval: 'month',
        status: scenario === 'past_due' ? 'past_due' : 'active',
        endsAt: scenario === 'past_due' ? boundary(0, 1) : boundary(1),
        renewal: { amount: 14500, currency: 'TWD' }
      },
      invoices: [
        {
          id: 'review-3',
          number: 'FCD-103',
          createdAt: start,
          description: 'Prime · 月繳',
          period: `${formatDate(start)} — ${formatDate(boundary(1))}`,
          status: 'paid',
          total: { amount: 14500, currency: 'TWD' },
          refunded: { amount: 0, currency: 'TWD' },
          receiptAvailable: true
        },
        {
          id: 'review-2',
          number: 'FCD-102',
          createdAt: boundary(-1),
          description: 'Prime · 月繳',
          period: `${formatDate(boundary(-1))} — ${formatDate(start)}`,
          status: 'partial_refund',
          total: { amount: 14500, currency: 'TWD' },
          refunded: { amount: 4500, currency: 'TWD' },
          receiptAvailable: true
        },
        {
          id: 'review-1',
          number: 'FCD-101',
          createdAt: boundary(-2),
          description: 'Prime · 月繳',
          period: `${formatDate(boundary(-2))} — ${formatDate(boundary(-1))}`,
          status: 'refunded',
          total: { amount: 14500, currency: 'TWD' },
          refunded: { amount: 14500, currency: 'TWD' },
          receiptAvailable: true
        }
      ]
    }
  if (scenario === 'expired') overview.subscription = null
  if (scenario === 'past_due')
    overview.invoices.unshift({
      id: 'review-pending',
      number: 'FCD-104',
      createdAt: start,
      description: 'Prime · 月繳',
      period: null,
      status: 'pending',
      total: { amount: 14500, currency: 'TWD' },
      refunded: { amount: 0, currency: 'TWD' },
      receiptAvailable: false
    })
  const makeQuote = (selection: Selection): Quote => {
    const tier = selection.tier
    const amount = (tier === 'basic' ? 11500 : 14500) * (selection.interval === 'year' ? 10 : 1)
    const trial = scenario === 'expired' || scenario === 'returning' ? null : 'one_month'
    const result: Quote = {
      id: `review-quote-${++revision}`,
      expiresAt: new Date(Date.now() + 5 * 60000).toISOString(),
      termsVersion: 'review-only',
      tier,
      interval: selection.interval,
      today: { amount: trial ? 0 : amount, currency: 'TWD' },
      renewal: { amount, currency: 'TWD' },
      trial,
      chargeAt: trial ? boundary(1) : start
    }
    return result
  }
  const gateway: BillingGateway = {
    async quote(selection: Selection, signal) {
      await new Promise((resolve) => setTimeout(resolve, 180))
      signal.throwIfAborted()
      if (status) throw new Error('checkout_pending')
      if (overview.subscription) throw new Error('already_subscribed')
      chosen = makeQuote(selection)
      progress.selection = selection
      save()
      return chosen
    },
    async begin(input) {
      if (status) return status
      if (!chosen || input.quoteId !== chosen.id || Date.parse(chosen.expiresAt) <= Date.now())
        throw new Error('quote_expired')
      if (input.termsVersion !== chosen.termsVersion) throw new Error('terms_changed')
      status = {
        id: 'review-intent',
        status: 'open',
        url: 'https://review.lemonsqueezy.com/checkout/review-not-a-real-checkout'
      }
      progress.begun = true
      save()
      return status
    },
    async intent() {
      return status ?? { id: 'review-intent', status: 'pending' }
    },
    async submitted() {
      if (!status) return { id: 'review-intent', status: 'abandoned' }
      if (status.status === 'open') status = { id: status.id, status: 'pending' }
      progress.paymentSubmitted = true
      save()
      return status
    },
    async abandon() {
      if (!status || status.status !== 'open') throw new Error('checkout_unavailable')
      const abandoned = { id: status.id, status: 'abandoned' as const }
      status = null
      chosen = null
      progress.begun = false
      progress.abandonRequested = false
      progress.paymentSubmitted = false
      save()
      return abandoned
    },
    async billing() {
      return structuredClone({
        ...overview,
        pendingCheckout: Boolean(status && status.status !== 'confirmed')
      })
    },
    async cancel() {
      if (scenario === 'cancel_error' && !cancellationFailed) {
        cancellationFailed = true
        throw new Error('cancellation_pending')
      }
      if (overview.subscription) overview.subscription.status = 'cancelled'
      progress.cancelled = true
      save()
    },
    async changeTrial(selection) {
      applyTrialChange(selection)
      progress.trialChanges = [...(progress.trialChanges ?? []), selection]
      save()
      return { status: 'confirmed' }
    },
    async previewPaid() {
      throw new Error('paid_change_unavailable_in_review')
    },
    async confirmPaid() {
      throw new Error('paid_change_unavailable_in_review')
    },
    async receipt() {
      throw new Error('no_real_receipt_in_review')
    }
  }
  const confirm = () => {
    if (!chosen || !status || status.status !== 'pending' || !progress.paymentSubmitted) return
    status = {
      id: 'review-intent',
      status: 'confirmed',
      activation: chosen.trial ? 'trial' : 'paid'
    }
    overview = {
      subscription: {
        tier: chosen.tier,
        interval: chosen.interval,
        status: chosen.trial ? 'trial' : 'active',
        endsAt: boundary(1),
        renewal: chosen.renewal
      },
      invoices:
        chosen.today.amount > 0
          ? [
              {
                id: 'review-paid',
                number: 'FCD-104',
                createdAt: start,
                description: `${chosen.tier === 'basic' ? 'Pro' : 'Prime'} · ${chosen.interval === 'month' ? '月繳' : '年繳'}`,
                period: null,
                status: 'paid',
                total: chosen.today,
                refunded: { amount: 0, currency: 'TWD' },
                receiptAvailable: true
              }
            ]
          : []
    }
    progress.confirmed = true
    save()
  }
  if (progress.begun) {
    chosen = makeQuote(progress.selection)
    status = {
      id: 'review-intent',
      status: 'open',
      url: 'https://review.lemonsqueezy.com/checkout/review-not-a-real-checkout'
    }
    if (progress.paymentSubmitted) status = { id: 'review-intent', status: 'pending' }
    if (progress.abandonRequested)
      status = {
        id: 'review-intent',
        status: 'abandon_requested',
        expiresAt: new Date(Date.now() + 900_000).toISOString()
      }
    if (progress.confirmed) confirm()
  }
  if (progress.cancelled && overview.subscription) overview.subscription.status = 'cancelled'
  if (overview.subscription?.status === 'trial')
    for (const change of progress.trialChanges ?? []) applyTrialChange(change)
  save()
  return {
    gateway,
    confirm,
    markPending: () => {
      if (!status || status.status !== 'open') return
      status = { id: status.id, status: 'pending' }
      progress.paymentSubmitted = true
      save()
    },
    releaseAbandoned: () => {
      if (status?.status !== 'abandon_requested') return
      status = null
      chosen = null
      progress.begun = false
      progress.abandonRequested = false
      save()
    },
    current: () => ({ intent: status ?? undefined, quote: chosen ?? undefined }),
    currentSubscription: () =>
      overview.subscription ? structuredClone(overview.subscription) : null,
    hasSubscription: () => Boolean(overview.subscription)
  }
}
