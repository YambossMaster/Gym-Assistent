import type { AuthenticatedIdentity } from '../identity/identity.js'

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
  billingEndsAt?: string
}

export interface PlanAccessRepository {
  get(identity: AuthenticatedIdentity): Promise<{
    grant: { kind: 'promotional' | 'permanent'; endsAt: Date | null } | null
    activeStudents: number
    activeVenues: number
  }>
}

export class PlanAccessModule {
  constructor(
    private readonly repository: PlanAccessRepository,
    private readonly now = () => new Date(),
    private readonly billing?: {
      get(
        identity: AuthenticatedIdentity,
      ): Promise<{ tier: 'basic' | 'advanced'; endsAt: Date } | null>
    },
  ) {}

  async get(identity: AuthenticatedIdentity): Promise<PlanAccess> {
    const { grant, activeStudents, activeVenues } = await this.repository.get(identity)
    const now = this.now()
    const activeOffer = grant?.kind === 'promotional' && grant.endsAt !== null && grant.endsAt > now
    const paid =
      grant?.kind === 'permanent' || activeOffer ? null : await this.billing?.get(identity)
    const activePaid = paid && Number.isFinite(+paid.endsAt) && paid.endsAt > now
    const tier: PlanTier =
      grant?.kind === 'permanent' || activeOffer ? 'advanced' : activePaid ? paid.tier : 'free'
    const source: PlanSource =
      grant?.kind === 'permanent'
        ? 'permanent'
        : activeOffer
          ? 'promotional'
          : activePaid
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
      ...(activePaid ? { billingEndsAt: paid.endsAt.toISOString() } : {}),
    }
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
