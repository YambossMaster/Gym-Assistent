export type PaidTier = 'basic' | 'advanced'
export type BillingInterval = 'month' | 'year'

export interface PlanSubscription {
  tier: PaidTier
  interval: BillingInterval
  periodStart: Date
  periodEnd: Date
  pendingTier: 'free' | PaidTier | null
  pendingInterval: BillingInterval | null
  version: number
}

export type PlanSubscriptionAction =
  | { kind: 'select'; tier: PaidTier; interval: BillingInterval; version: number }
  | { kind: 'cancel'; version: number }

export class PlanSelectionError extends Error {
  constructor(readonly reason: 'no_subscription' | 'version_conflict' | 'plan_test_required') {
    super(reason)
  }
}

export function nextTestSubscription(
  stored: PlanSubscription | null,
  action: PlanSubscriptionAction,
  now: Date,
): PlanSubscription | null {
  if (action.version !== (stored?.version ?? 0)) throw new PlanSelectionError('version_conflict')
  if (action.kind === 'cancel') {
    if (!stored) throw new PlanSelectionError('no_subscription')
    return null
  }
  return {
    tier: action.tier,
    interval: action.interval,
    periodStart: now,
    periodEnd: addInterval(now, action.interval),
    pendingTier: null,
    pendingInterval: null,
    version: action.version + 1,
  }
}

function addInterval(anchor: Date, interval: BillingInterval, count = 1): Date {
  const months = interval === 'year' ? 12 * count : count
  const first = new Date(
    Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth() + months,
      1,
      anchor.getUTCHours(),
      anchor.getUTCMinutes(),
      anchor.getUTCSeconds(),
      anchor.getUTCMilliseconds(),
    ),
  )
  const lastDay = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate()
  first.setUTCDate(Math.min(anchor.getUTCDate(), lastDay))
  return first
}

export function activeSubscription(
  stored: PlanSubscription | null,
  now: Date,
): PlanSubscription | null {
  if (!stored) return null
  if (now < stored.periodEnd) return stored
  if (stored.pendingTier === 'free') return null
  const tier = stored.pendingTier ?? stored.tier
  const interval = stored.pendingInterval ?? stored.interval
  const anchor = stored.pendingTier ? stored.periodEnd : stored.periodStart
  let count = 1
  while (addInterval(anchor, interval, count) <= now) count++
  return {
    ...stored,
    tier,
    interval,
    periodStart: addInterval(anchor, interval, count - 1),
    periodEnd: addInterval(anchor, interval, count),
    pendingTier: null,
    pendingInterval: null,
  }
}

export function nextSubscription(
  stored: PlanSubscription | null,
  action: PlanSubscriptionAction,
  now: Date,
): PlanSubscription {
  if (action.version !== (stored?.version ?? 0)) throw new PlanSelectionError('version_conflict')
  const active = activeSubscription(stored, now)
  if (action.kind === 'cancel') {
    if (!active) throw new PlanSelectionError('no_subscription')
    return {
      ...active,
      pendingTier: 'free',
      pendingInterval: null,
      version: action.version + 1,
    }
  }
  if (!active) {
    return {
      tier: action.tier,
      interval: action.interval,
      periodStart: now,
      periodEnd: addInterval(now, action.interval),
      pendingTier: null,
      pendingInterval: null,
      version: action.version + 1,
    }
  }
  const lowerTier = active.tier === 'advanced' && action.tier === 'basic'
  const shorterInterval = active.interval === 'year' && action.interval === 'month'
  if (lowerTier || (active.tier === action.tier && shorterInterval)) {
    return {
      ...active,
      pendingTier: action.tier,
      pendingInterval: action.interval,
      version: action.version + 1,
    }
  }
  if (active.tier === action.tier && active.interval === action.interval) {
    return {
      ...active,
      pendingTier: null,
      pendingInterval: null,
      version: action.version + 1,
    }
  }
  return {
    ...active,
    tier: action.tier,
    interval: action.interval,
    ...(active.interval === action.interval
      ? {}
      : { periodStart: now, periodEnd: addInterval(now, action.interval) }),
    pendingTier: null,
    pendingInterval: null,
    version: action.version + 1,
  }
}
