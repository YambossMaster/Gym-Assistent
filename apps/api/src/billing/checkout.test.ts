import { describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import {
  CheckoutModule,
  nextBillingDate,
  type AccountFacts,
  type CheckoutRepository,
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
        facts: async () => ({ ...state.facts, hasUnresolvedCheckout: state.intents.length > 0 }),
        quote: async (id) => state.quotes.find((q) => q.id === id) ?? null,
        saveQuote: async (quote) => {
          state.quotes.push(quote)
        },
        unresolved: async () => state.intents[0] ?? null,
        intent: async (id) => state.intents.find((i) => i.id === id) ?? null,
        saveIntent: async (intent) => {
          state.intents = [...state.intents.filter((i) => i.id !== intent.id), intent]
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
    create: vi.fn(async () => ({ id: '1', url: 'https://example.lemonsqueezy.com/checkout/1' })),
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
  it('rejects client-authored billing authority and unimplemented campaign codes', async () => {
    const { module } = setup()
    for (const input of [
      { ...selection, workspaceId: randomUUID() },
      { ...selection, today: 0 },
      { ...selection, trial: 60 },
      { ...selection, code: 'DEMO60' },
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
    const restored = await new CheckoutModule(repository, provider).pending(identity)
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
    setNow('2026-10-15T08:00:00Z')
    expect(await module.begin(identity, input)).toEqual(first)
    expect(provider.create).toHaveBeenCalledTimes(1)
    await expect(module.quote(identity, selection)).rejects.toThrow('checkout_pending')
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
    repository.accounts.get(identity.userId)!.facts.hasEverSubscribed = true
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
    facts.hasLegacyOffer = false
    facts.hasPermanentAccess = true
    await expect(module.quote(identity, selection)).rejects.toThrow('permanent_access')
  })
  it('uses Taipei calendar months and clamps month-end, including leap years', () => {
    expect(nextBillingDate(new Date('2026-01-31T15:59:00Z'), 1)).toBe('2026-02-28T15:59:00.000Z')
    expect(nextBillingDate(new Date('2026-01-31T16:00:00Z'), 1)).toBe('2026-02-28T16:00:00.000Z')
    expect(nextBillingDate(new Date('2028-01-31T04:00:00Z'), 1)).toBe('2028-02-29T04:00:00.000Z')
  })
})
export { MemoryCheckouts }
