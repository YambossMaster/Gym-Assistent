import { describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import {
  CheckoutModule,
  type AccountFacts,
  type CheckoutRepository,
  type CheckoutProvider,
  type CheckoutTransaction,
  type StoredIntent,
  type StoredQuote,
} from './checkout.js'

// Models atomic commit/rollback and owner scoping, not external provider success.
class MemoryCheckouts implements CheckoutRepository {
  accounts = new Map<
    string,
    { facts: AccountFacts; quotes: StoredQuote[]; intents: StoredIntent[] }
  >()
  private tail = Promise.resolve()
  async transaction<T>(
    identity: { userId: string },
    work: (tx: CheckoutTransaction) => Promise<T>,
  ) {
    const previous = this.tail
    let release!: () => void
    this.tail = new Promise<void>((resolve) => {
      release = resolve
    })
    await previous
    const state = structuredClone(
      this.accounts.get(identity.userId) ?? {
        facts: {
          hasEverSubscribed: false,
          hasCurrentSubscription: false,
          hasUnresolvedCheckout: false,
          hasPermanentAccess: false,
          hasLegacyOffer: false,
          eligibilityVersion: 1,
        },
        quotes: [],
        intents: [],
      },
    )
    try {
      const result = await work({
        facts: async () => ({
          ...state.facts,
          hasUnresolvedCheckout: state.intents.some((i) =>
            ['creating', 'open', 'pending', 'abandon_requested'].includes(i.status),
          ),
        }),
        quote: async (id) => state.quotes.find((q) => q.id === id) ?? null,
        saveQuote: async (quote) => {
          state.quotes.push(quote)
        },
        unresolved: async () =>
          state.intents.find((i) =>
            ['creating', 'open', 'pending', 'abandon_requested'].includes(i.status),
          ) ?? null,
        intent: async (id) => state.intents.find((i) => i.id === id) ?? null,
        saveIntent: async (intent) => {
          state.intents = [...state.intents.filter((i) => i.id !== intent.id), intent]
        },
        abandonExpired: async (id, now) => {
          const intent = state.intents.find((i) => i.id === id)
          if (
            !intent ||
            !['open', 'pending', 'abandon_requested'].includes(intent.status) ||
            Date.parse(intent.expiresAt) > now.getTime() - 300_000
          )
            return false
          intent.status = 'abandoned'
          intent.url = null
          return true
        },
        markSubmitted: async (id) => {
          const intent = state.intents.find((i) => i.id === id)
          if (!intent || intent.status !== 'open') return false
          intent.status = 'pending'
          intent.url = null
          return true
        },
        requestAbandon: async (id) => {
          const intent = state.intents.find((i) => i.id === id)
          if (!intent || intent.status !== 'open') return false
          intent.status = 'abandoned'
          intent.url = null
          return true
        },
      })
      this.accounts.set(identity.userId, state)
      return result
    } finally {
      release()
    }
  }
}
const identity = { userId: randomUUID(), email: 'coach@example.invalid' }
function setup() {
  const repository = new MemoryCheckouts()
  const provider = {
    ready: vi.fn(() => true),
    create: vi.fn(async (_input: Parameters<CheckoutProvider['create']>[0]) => ({
      id: '1',
      url: 'https://example.lemonsqueezy.com/checkout/1',
    })),
    hasSubscriptionSince: vi.fn(async () => false),
  }
  let now = new Date('2026-10-14T08:00:00Z')
  const module = new CheckoutModule(repository, provider, undefined, () => now)
  return {
    module,
    repository,
    provider,
    setNow: (value: string) => {
      now = new Date(value)
    },
  }
}
const selection = { tier: 'basic', interval: 'month' }
describe('authenticated durable checkout operations', () => {
  it('quotes a provider-owned one-month trial with a display-only estimated payment date', async () => {
    const { module, provider } = setup()
    const quote = await module.quote(identity, { tier: 'basic', interval: 'year' })
    expect(quote).toMatchObject({
      tier: 'basic',
      trial: 'one_month',
      today: { amount: 0 },
      renewal: { amount: 115000 },
    })
    expect(quote.chargeAt).toBe('2026-11-14T08:00:00.000Z')
    const intent = await module.begin(identity, {
      quoteId: quote.id,
      termsVersion: quote.termsVersion,
    })
    expect(intent.status).toBe('open')
    expect(provider.create.mock.calls[0]![0]).not.toHaveProperty('proof')
  })
  it('rejects client-authored billing authority and unimplemented campaign codes', async () => {
    const { module } = setup()
    for (const input of [
      { ...selection, workspaceId: randomUUID() },
      { ...selection, today: 0 },
      { ...selection, trial: 60 },
      { ...selection, code: 'bad' },
    ])
      await expect(module.quote(identity, input)).rejects.toThrow()
  })
  it('isolates quotes and intents between accounts', async () => {
    const { module, provider } = setup()
    const q = await module.quote(identity, selection)
    const other = { ...identity, userId: randomUUID() }
    await expect(
      module.begin(other, { quoteId: q.id, termsVersion: q.termsVersion }),
    ).rejects.toThrow('quote_not_found')
    const intent = await module.begin(identity, { quoteId: q.id, termsVersion: q.termsVersion })
    await expect(module.intent(other, intent.id)).rejects.toThrow('not_found')
    expect(await module.pending(other)).toBeNull()
    expect(provider.create).toHaveBeenCalledTimes(1)
  })
  it('dispatches once for concurrent same-quote requests and recovers after module recreation', async () => {
    const { module, provider, repository } = setup()
    const q = await module.quote(identity, selection)
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        module.begin(identity, { quoteId: q.id, termsVersion: q.termsVersion }),
      ),
    )
    expect(new Set(results.map((i) => i.id)).size).toBe(1)
    expect(provider.create).toHaveBeenCalledTimes(1)
    const restored = await new CheckoutModule(
      repository,
      provider,
      undefined,
      () => new Date('2026-10-14T08:00:00Z'),
    ).pending(identity)
    expect(restored?.quote).toMatchObject({ id: q.id, today: { amount: 0 } })
    expect(restored?.quote).not.toHaveProperty('eligibilityVersion')
    expect(restored?.intent.id).toBe(results[0]!.id)
  })
  it('blocks a second quote racing to create a different checkout', async () => {
    const { module, provider } = setup()
    const a = await module.quote(identity, selection)
    const b = await module.quote(identity, { tier: 'advanced', interval: 'year' })
    const results = await Promise.allSettled(
      [a, b].map((q) => module.begin(identity, { quoteId: q.id, termsVersion: q.termsVersion })),
    )
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(provider.create).toHaveBeenCalledTimes(1)
  })
  it('never retries an uncertain provider create, including after the URL expires', async () => {
    const { module, provider, setNow } = setup()
    provider.create.mockRejectedValue(new Error('socket disconnected'))
    const q = await module.quote(identity, selection)
    const input = { quoteId: q.id, termsVersion: q.termsVersion }
    const first = await module.begin(identity, input)
    expect(first.status).toBe('pending')
    setNow('2026-10-14T08:19:59Z')
    expect(await module.begin(identity, input)).toEqual(first)
    expect(provider.create).toHaveBeenCalledTimes(1)
    await expect(module.quote(identity, selection)).rejects.toThrow('checkout_pending')
    setNow('2026-10-14T08:20:00Z')
    expect((await module.quote(identity, selection)).id).not.toBe(q.id)
  })
  it('releases an expired unpaid provider link only after a negative provider check', async () => {
    const { module, provider, setNow } = setup()
    const old = await module.quote(identity, { tier: 'advanced', interval: 'year' })
    const opened = await module.begin(identity, { quoteId: old.id, termsVersion: old.termsVersion })
    setNow('2026-10-14T08:19:59Z')
    await expect(module.quote(identity, selection)).rejects.toThrow('checkout_pending')
    setNow('2026-10-14T08:20:00Z')
    provider.hasSubscriptionSince.mockResolvedValueOnce(true)
    await expect(module.quote(identity, selection)).rejects.toThrow('checkout_pending')
    provider.hasSubscriptionSince.mockRejectedValueOnce(new Error('provider unavailable'))
    await expect(module.quote(identity, selection)).rejects.toThrow('checkout_pending')
    const fresh = await module.quote(identity, selection)
    expect(fresh.tier).toBe('basic')
    expect(await module.pending(identity)).toBeNull()
    expect(await module.intent(identity, opened.id)).toEqual({ id: opened.id, status: 'abandoned' })
    expect(provider.create).toHaveBeenCalledTimes(1)
  })
  it('abandons an unsubmitted checkout immediately and allows a fresh choice', async () => {
    const { module, provider, setNow } = setup()
    const oldQuote = await module.quote(identity, { tier: 'advanced', interval: 'year' })
    const old = await module.begin(identity, {
      quoteId: oldQuote.id,
      termsVersion: oldQuote.termsVersion,
    })
    expect(old.status).toBe('open')
    const abandoned = await module.abandon(identity, old.id)
    expect(abandoned).toEqual({ id: old.id, status: 'abandoned' })
    expect(await module.pending(identity)).toBeNull()
    const fresh = await module.quote(identity, selection)
    const next = await module.begin(identity, {
      quoteId: fresh.id,
      termsVersion: fresh.termsVersion,
    })
    expect(next.status).toBe('open')
    expect(next.id).not.toBe(old.id)
    expect(provider.create).toHaveBeenCalledTimes(2)
  })
  it('keeps a submitted checkout in reconciliation and blocks a second payment path', async () => {
    const { module, provider, setNow } = setup()
    const q = await module.quote(identity, selection)
    const opened = await module.begin(identity, { quoteId: q.id, termsVersion: q.termsVersion })
    expect(await module.submitted(identity, opened.id)).toEqual({
      id: opened.id,
      status: 'pending',
    })
    expect(await module.submitted(identity, opened.id)).toEqual({
      id: opened.id,
      status: 'pending',
    })
    expect(await module.abandon(identity, opened.id)).toEqual({ id: opened.id, status: 'pending' })
    expect((await module.pending(identity))?.intent.status).toBe('pending')
    await expect(module.quote(identity, { tier: 'advanced', interval: 'year' })).rejects.toThrow(
      'checkout_pending',
    )
    const other = { ...identity, userId: randomUUID() }
    await expect(module.submitted(other, opened.id)).rejects.toThrow('not_found')
    setNow('2026-10-14T08:20:00Z')
    provider.hasSubscriptionSince.mockResolvedValueOnce(true)
    await expect(module.quote(identity, selection)).rejects.toThrow('checkout_pending')
    const fresh = await module.quote(identity, selection)
    expect(fresh.id).not.toBe(q.id)
  })
  it('lets an in-flight submit beat a delayed abandon check', async () => {
    const { module, provider } = setup()
    const q = await module.quote(identity, selection)
    const opened = await module.begin(identity, { quoteId: q.id, termsVersion: q.termsVersion })
    let finishCheck!: (value: boolean) => void
    provider.hasSubscriptionSince.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          finishCheck = resolve
        }),
    )
    const leaving = module.abandon(identity, opened.id)
    await vi.waitFor(() => expect(finishCheck).toBeTypeOf('function'))
    expect(await module.submitted(identity, opened.id)).toEqual({
      id: opened.id,
      status: 'pending',
    })
    finishCheck(false)
    expect(await leaving).toEqual({ id: opened.id, status: 'pending' })
    expect((await module.pending(identity))?.intent.status).toBe('pending')
  })
  it('keeps the old checkout locked when provider reports payment or cannot answer', async () => {
    const { module, provider } = setup()
    const quote = await module.quote(identity, selection)
    const intent = await module.begin(identity, {
      quoteId: quote.id,
      termsVersion: quote.termsVersion,
    })
    provider.hasSubscriptionSince.mockResolvedValueOnce(true)
    await expect(module.abandon(identity, intent.id)).rejects.toThrow('checkout_pending')
    expect((await module.pending(identity))?.intent.status).toBe('open')
    provider.hasSubscriptionSince.mockRejectedValueOnce(new Error('unavailable'))
    await expect(module.abandon(identity, intent.id)).rejects.toThrow(
      'checkout_recovery_unavailable',
    )
    await expect(module.quote(identity, { tier: 'advanced', interval: 'year' })).rejects.toThrow(
      'checkout_pending',
    )
    expect(provider.create).toHaveBeenCalledTimes(1)
  })
  it('rejects stale quote/terms/eligibility and missing configuration before claiming', async () => {
    const { module, provider, repository, setNow } = setup()
    const q = await module.quote(identity, selection)
    await expect(module.begin(identity, { quoteId: q.id, termsVersion: 'old' })).rejects.toThrow(
      'terms_changed',
    )
    provider.ready.mockReturnValue(false)
    await expect(
      module.begin(identity, { quoteId: q.id, termsVersion: q.termsVersion }),
    ).rejects.toThrow('billing_unavailable')
    expect(await module.pending(identity)).toBeNull()
    provider.ready.mockReturnValue(true)
    repository.accounts.get(identity.userId)!.facts.eligibilityVersion++
    await expect(
      module.begin(identity, { quoteId: q.id, termsVersion: q.termsVersion }),
    ).rejects.toThrow('quote_expired')
    setNow('2026-10-14T08:05:00Z')
    await expect(
      module.begin(identity, { quoteId: q.id, termsVersion: q.termsVersion }),
    ).rejects.toThrow('quote_expired')
    expect(provider.create).not.toHaveBeenCalled()
  })
  it('protects legacy offers and permanent access', async () => {
    const { module, repository } = setup()
    await module.quote(identity, selection)
    const facts = repository.accounts.get(identity.userId)!.facts
    facts.hasLegacyOffer = true
    await expect(module.quote(identity, selection)).rejects.toThrow('existing_offer')
    repository.accounts.get(identity.userId)!.facts.hasLegacyOffer = false
    repository.accounts.get(identity.userId)!.facts.hasPermanentAccess = true
    await expect(module.quote(identity, selection)).rejects.toThrow('permanent_access')
  })
  it('charges a returning subscriber immediately without another provider trial', async () => {
    const { module, repository } = setup()
    const first = await module.quote(identity, { tier: 'basic', interval: 'year' })
    expect(first).toMatchObject({
      today: { amount: 0, currency: 'TWD' },
      renewal: { amount: 115000, currency: 'TWD' },
      trial: 'one_month',
      chargeAt: '2026-11-14T08:00:00.000Z',
    })
    repository.accounts.get(identity.userId)!.facts.hasEverSubscribed = true
    const returning = await module.quote(identity, { tier: 'basic', interval: 'year' })
    expect(returning).toMatchObject({
      today: { amount: 115000, currency: 'TWD' },
      renewal: { amount: 115000, currency: 'TWD' },
      trial: null,
      chargeAt: '2026-10-14T08:00:00.000Z',
    })
  })
  it('clamps the first trial date estimate at the end of a shorter calendar month', async () => {
    const { module, setNow } = setup()
    setNow('2026-01-31T08:00:00Z')
    const quote = await module.quote(identity, selection)
    expect(quote.chargeAt).toBe('2026-02-28T08:00:00.000Z')
  })
  it('expires a trial quote when verified subscription history changes before begin', async () => {
    const { module, repository, provider } = setup()
    const quote = await module.quote(identity, selection)
    repository.accounts.get(identity.userId)!.facts.hasEverSubscribed = true
    await expect(
      module.begin(identity, { quoteId: quote.id, termsVersion: quote.termsVersion }),
    ).rejects.toThrow('quote_expired')
    expect(provider.create).not.toHaveBeenCalled()
  })
})
export { MemoryCheckouts }
