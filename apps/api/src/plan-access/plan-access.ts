import type { AuthenticatedIdentity } from '../identity/identity.js'
import {
  activeSubscription,
  type PlanSubscription,
  type PlanSubscriptionAction,
} from './plan-subscription.js'

export type PlanTier = 'free' | 'basic' | 'advanced'
export type PlanSource = 'free' | 'promotional' | 'permanent' | 'subscription'

export interface PlanAccess {
  tier: PlanTier
  source: PlanSource
  activeStudents: number
  activeVenues: number
  studentLimit: number | null
  venueLimit: number | null
  overCapacity: boolean
  offerEndsAt?: string
  version: number
  subscription?: {
    tier: 'basic' | 'advanced'
    interval: 'month' | 'year'
    periodEndsAt: string
    pendingTier: 'free' | 'basic' | 'advanced' | null
    pendingInterval: 'month' | 'year' | null
  }
}

export interface PlanAccessRepository {
  get(identity: AuthenticatedIdentity): Promise<{
    grant: { kind: 'promotional' | 'permanent'; endsAt: Date | null } | null
    activeStudents: number
    activeVenues: number
    subscription?: PlanSubscription | null
    version?: number
  }>
  change?(identity: AuthenticatedIdentity, action: PlanSubscriptionAction, now: Date): Promise<void>
}

export class PlanAccessModule {
  constructor(
    private readonly repository: PlanAccessRepository,
    private readonly now = () => new Date(),
  ) {}

  async get(identity: AuthenticatedIdentity): Promise<PlanAccess> {
    const { grant, activeStudents, activeVenues, subscription, version } =
      await this.repository.get(identity)
    const activeChoice = activeSubscription(subscription ?? null, this.now())
    const activeOffer =
      grant?.kind === 'promotional' && grant.endsAt !== null && grant.endsAt > this.now()
    const tier: PlanTier =
      grant?.kind === 'permanent' || activeOffer ? 'advanced' : (activeChoice?.tier ?? 'free')
    const source: PlanSource =
      grant?.kind === 'permanent'
        ? 'permanent'
        : activeOffer
          ? 'promotional'
          : activeChoice
            ? 'subscription'
            : 'free'
    const { studentLimit, venueLimit } = limitsForTier(tier)
    return {
      tier,
      source,
      activeStudents,
      activeVenues,
      studentLimit,
      venueLimit,
      overCapacity:
        (studentLimit !== null && activeStudents > studentLimit) ||
        (venueLimit !== null && activeVenues > venueLimit),
      ...(activeOffer ? { offerEndsAt: grant.endsAt!.toISOString() } : {}),
      version: version ?? subscription?.version ?? 0,
      ...(activeChoice
        ? {
            subscription: {
              tier: activeChoice.tier,
              interval: activeChoice.interval,
              periodEndsAt: activeChoice.periodEnd.toISOString(),
              pendingTier: activeChoice.pendingTier,
              pendingInterval: activeChoice.pendingInterval,
            },
          }
        : {}),
    }
  }

  async change(
    identity: AuthenticatedIdentity,
    action: PlanSubscriptionAction,
  ): Promise<PlanAccess> {
    if (!this.repository.change) throw new Error('Plan selection unavailable')
    await this.repository.change(identity, action, this.now())
    return this.get(identity)
  }
}

export function limitsForTier(tier: PlanTier): {
  studentLimit: number | null
  venueLimit: number | null
} {
  if (tier === 'free') return { studentLimit: 5, venueLimit: 1 }
  if (tier === 'basic') return { studentLimit: 15, venueLimit: null }
  return { studentLimit: null, venueLimit: null }
}

export class PlanAccessError extends Error {
  constructor(readonly reason: 'plan_required' | 'capacity_limit') {
    super(reason)
  }
}
