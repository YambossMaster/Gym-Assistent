import { afterEach, expect, it, vi } from 'vitest'
import { createReviewGateway } from './review-gateway'
import {
  readReviewProgress,
  saveReviewProgress,
  reviewSessionKey,
  type ReviewProgress
} from './review-session'

afterEach(() => vi.useRealTimers())
const signal = () => new AbortController().signal

it('restores one unfinished ordinary annual checkout after reload', async () => {
  let saved: ReviewProgress | undefined
  const first = createReviewGateway('first', {
    save: (p) => {
      saved = p
    }
  })
  const quote = await first.gateway.quote({ tier: 'advanced', interval: 'year' }, signal())
  const intent = await first.gateway.begin({ quoteId: quote.id, termsVersion: quote.termsVersion })
  const restored = createReviewGateway('first', { restored: saved })
  expect(restored.current().intent).toEqual(intent)
  expect(restored.current().quote).toMatchObject({
    trial: 'one_month',
    interval: 'year',
    renewal: { amount: 145000 }
  })
  await expect(
    restored.gateway.quote({ tier: 'basic', interval: 'month' }, signal())
  ).rejects.toThrow('checkout_pending')
  expect(await restored.gateway.begin({ quoteId: 'new', termsVersion: 'new' })).toEqual(intent)
  restored.markPending()
  restored.confirm()
  expect(await restored.gateway.intent(intent.id)).toMatchObject({
    status: 'confirmed',
    activation: 'trial'
  })
})

it('rejects an annual-to-monthly trial downgrade without changing the subscription', async () => {
  let saved: ReviewProgress | undefined
  const fixture = createReviewGateway('first', {
    save: (p) => {
      saved = p
    }
  })
  const quote = await fixture.gateway.quote({ tier: 'basic', interval: 'year' }, signal())
  await fixture.gateway.begin({ quoteId: quote.id, termsVersion: quote.termsVersion })
  fixture.markPending()
  fixture.confirm()
  const originalEnd = fixture.currentSubscription()!.endsAt
  expect(fixture.currentSubscription()).toMatchObject({
    tier: 'basic',
    interval: 'year',
    status: 'trial'
  })
  await expect(fixture.gateway.changeTrial({ tier: 'basic', interval: 'month' })).rejects.toThrow(
    'downgrade_unavailable'
  )
  expect(fixture.currentSubscription()).toMatchObject({
    tier: 'basic',
    interval: 'year',
    endsAt: originalEnd
  })
  const restored = createReviewGateway('first', { restored: saved })
  expect(restored.currentSubscription()).toMatchObject({
    tier: 'basic',
    interval: 'year',
    endsAt: originalEnd
  })
})

it('restores allowed trial upgrades and rejects a Prime-to-Pro downgrade', async () => {
  let saved: ReviewProgress | undefined
  const fixture = createReviewGateway('first', {
    save: (p) => {
      saved = p
    }
  })
  const quote = await fixture.gateway.quote({ tier: 'basic', interval: 'year' }, signal())
  await fixture.gateway.begin({ quoteId: quote.id, termsVersion: quote.termsVersion })
  fixture.markPending()
  fixture.confirm()
  const originalEnd = fixture.currentSubscription()!.endsAt
  await fixture.gateway.changeTrial({ tier: 'advanced', interval: 'year' })
  await expect(fixture.gateway.changeTrial({ tier: 'basic', interval: 'year' })).rejects.toThrow(
    'downgrade_unavailable'
  )
  expect(fixture.currentSubscription()).toMatchObject({
    tier: 'advanced',
    interval: 'year',
    endsAt: originalEnd
  })
  const restored = createReviewGateway('first', { restored: saved })
  expect(restored.currentSubscription()).toEqual(fixture.currentSubscription())
})

it('keeps a returning paid subscription and cancellation across reload without another charge', async () => {
  let saved: ReviewProgress | undefined
  const fixture = createReviewGateway('returning', {
    save: (p) => {
      saved = p
    }
  })
  const quote = await fixture.gateway.quote({ tier: 'basic', interval: 'month' }, signal())
  expect(quote).toMatchObject({ trial: null, today: { amount: 11500 } })
  await fixture.gateway.begin({ quoteId: quote.id, termsVersion: quote.termsVersion })
  fixture.markPending()
  fixture.confirm()
  fixture.confirm()
  await fixture.gateway.cancel()
  const restored = createReviewGateway('returning', { restored: saved })
  const billing = await restored.gateway.billing(signal())
  expect(restored.current().intent).toMatchObject({ status: 'confirmed', activation: 'paid' })
  expect(billing.subscription?.status).toBe('cancelled')
  expect(billing.invoices).toHaveLength(1)
})

it('keeps delayed confirmation pending across reload without starting a second checkout', async () => {
  let saved: ReviewProgress | undefined
  const fixture = createReviewGateway('pending', {
    save: (p) => {
      saved = p
    }
  })
  const quote = await fixture.gateway.quote({ tier: 'basic', interval: 'month' }, signal())
  const intent = await fixture.gateway.begin({
    quoteId: quote.id,
    termsVersion: quote.termsVersion
  })
  fixture.markPending()
  expect(await fixture.gateway.intent(intent.id)).toMatchObject({ status: 'pending' })
  const restored = createReviewGateway('pending', { restored: saved })
  expect(restored.current().intent).toMatchObject({ status: 'pending' })
  expect(
    await restored.gateway.begin({ quoteId: 'another', termsVersion: quote.termsVersion })
  ).toMatchObject({ status: 'pending' })
  restored.confirm()
  expect(await restored.gateway.intent(intent.id)).toMatchObject({ status: 'confirmed' })
})

it('does not confirm synthetic access before the simulated payment was submitted', async () => {
  const fixture = createReviewGateway('pending')
  const quote = await fixture.gateway.quote({ tier: 'basic', interval: 'month' }, signal())
  const intent = await fixture.gateway.begin({
    quoteId: quote.id,
    termsVersion: quote.termsVersion
  })
  fixture.confirm()
  expect(await fixture.gateway.intent(intent.id)).toMatchObject({ status: 'open' })
  expect((await fixture.gateway.billing(signal())).subscription).toBeNull()
})

it('does not cancel on uncertain result; retry confirms and retains the same expiry', async () => {
  const fixture = createReviewGateway('cancel_error')
  const before = await fixture.gateway.billing(signal())
  expect(fixture.currentSubscription()).toMatchObject(before.subscription!)
  await expect(fixture.gateway.cancel()).rejects.toThrow('cancellation_pending')
  expect((await fixture.gateway.billing(signal())).subscription?.status).toBe('active')
  await fixture.gateway.cancel()
  expect(fixture.currentSubscription()?.status).toBe('cancelled')
  expect((await fixture.gateway.billing(signal())).subscription).toMatchObject({
    status: 'cancelled',
    endsAt: before.subscription!.endsAt
  })
})

it('retains invoices after expiry and denies a repeat trial', async () => {
  const fixture = createReviewGateway('expired')
  const billing = await fixture.gateway.billing(signal())
  expect(billing.subscription).toBeNull()
  expect(billing.invoices).toHaveLength(3)
  const quote = await fixture.gateway.quote({ tier: 'basic', interval: 'year' }, signal())
  expect(quote).toMatchObject({ trial: null, today: { amount: 115000 } })
  expect(
    (await fixture.gateway.quote({ tier: 'advanced', interval: 'month' }, signal())).trial
  ).toBeNull()
})

it('estimates only the display date and rejects outdated terms', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2027-01-31T04:00:00Z'))
  const fixture = createReviewGateway('first')
  const quote = await fixture.gateway.quote({ tier: 'basic', interval: 'year' }, signal())
  expect(quote.chargeAt).toBe('2027-02-28T04:00:00.000Z')
  await expect(
    fixture.gateway.begin({ quoteId: quote.id, termsVersion: 'outdated' })
  ).rejects.toThrow('terms_changed')
  expect(fixture.current().intent).toBeUndefined()
})

it('rejects invalid/expired review storage and stores only synthetic progress', () => {
  const storage = { getItem: vi.fn(), setItem: vi.fn() }
  for (const value of ['{', '{}', '{"scenario":"production"}']) {
    storage.getItem.mockReturnValue(value)
    expect(readReviewProgress(storage)).toBeUndefined()
  }
  const progress: ReviewProgress = {
    scenario: 'first',
    startedAt: new Date().toISOString(),
    selection: { tier: 'basic', interval: 'month' },
    begun: false,
    confirmed: false,
    cancelled: false
  }
  saveReviewProgress(storage, progress)
  expect(storage.setItem).toHaveBeenCalledWith(reviewSessionKey, JSON.stringify(progress))
  storage.getItem.mockReturnValue(JSON.stringify(progress))
  expect(readReviewProgress(storage)).toEqual(progress)
  storage.getItem.mockReturnValue(
    JSON.stringify({
      ...progress,
      begun: true,
      paymentSubmitted: true,
      confirmed: true,
      trialChange: { tier: 'basic', interval: 'year' }
    })
  )
  expect(readReviewProgress(storage)?.trialChanges).toEqual([{ tier: 'basic', interval: 'year' }])
  storage.getItem.mockReturnValue(JSON.stringify({ ...progress, begun: true, confirmed: true }))
  expect(readReviewProgress(storage)).toBeUndefined()
  storage.getItem.mockReturnValue(
    JSON.stringify({ ...progress, startedAt: '2020-01-01T00:00:00Z' })
  )
  expect(readReviewProgress(storage)).toBeUndefined()
  storage.setItem.mockImplementation(() => {
    throw new Error('denied')
  })
  expect(() => saveReviewProgress(storage, progress)).not.toThrow()
})
