import type { Selection } from '../types'

export const reviewScenarios = [
  'first',
  'returning',
  'invoices',
  'pending',
  'overlay_error',
  'cancel_error',
  'past_due',
  'expired'
] as const
export type ReviewScenario = (typeof reviewScenarios)[number]
export type ReviewProgress = {
  scenario: ReviewScenario
  selection: Selection
  startedAt: string
  begun: boolean
  paymentSubmitted?: boolean
  confirmed: boolean
  cancelled: boolean
  trialChanges?: Array<{ tier: 'basic' | 'advanced'; interval: 'month' | 'year' }>
  /** Previous local preview storage only; normalized to trialChanges when read. */
  trialChange?: { tier: 'basic' | 'advanced'; interval: 'month' | 'year' }
}
export const reviewSessionKey = 'form:billing:synthetic-review:v1'

/** Only synthetic selections and actions, never identity, provider URLs or account data. */
export function readReviewProgress(storage: Pick<Storage, 'getItem'>): ReviewProgress | undefined {
  try {
    const p = JSON.parse(storage.getItem(reviewSessionKey) ?? 'null') as ReviewProgress | null
    if (
      !p ||
      !reviewScenarios.includes(p.scenario) ||
      !p.selection ||
      !['basic', 'advanced'].includes(p.selection.tier) ||
      !['month', 'year'].includes(p.selection.interval) ||
      'code' in p.selection ||
      !Number.isFinite(Date.parse(p.startedAt)) ||
      Date.parse(p.startedAt) > Date.now() ||
      Date.now() - Date.parse(p.startedAt) > 24 * 60 * 60 * 1000 ||
      ![p.begun, p.confirmed, p.cancelled].every((v) => typeof v === 'boolean') ||
      (p.paymentSubmitted !== undefined && typeof p.paymentSubmitted !== 'boolean') ||
      (p.paymentSubmitted && !p.begun) ||
      (p.confirmed && (!p.begun || !p.paymentSubmitted)) ||
      (p.cancelled &&
        !p.confirmed &&
        !['invoices', 'cancel_error', 'past_due'].includes(p.scenario)) ||
      (p.trialChanges !== undefined &&
        (!p.confirmed ||
          !Array.isArray(p.trialChanges) ||
          p.trialChanges.length > 20 ||
          p.trialChanges.some(
            (change) =>
              !change ||
              !['basic', 'advanced'].includes(change.tier) ||
              !['month', 'year'].includes(change.interval)
          ))) ||
      (p.trialChange !== undefined &&
        (!p.confirmed ||
          !['basic', 'advanced'].includes(p.trialChange.tier) ||
          !['month', 'year'].includes(p.trialChange.interval)))
    )
      return undefined
    return {
      scenario: p.scenario,
      selection: { tier: p.selection.tier, interval: p.selection.interval },
      startedAt: p.startedAt,
      begun: p.begun,
      ...(p.paymentSubmitted ? { paymentSubmitted: true } : {}),
      confirmed: p.confirmed,
      cancelled: p.cancelled,
      ...(p.trialChanges || p.trialChange
        ? { trialChanges: p.trialChanges ?? [p.trialChange!] }
        : {})
    }
  } catch {
    return undefined
  }
}

export function saveReviewProgress(storage: Pick<Storage, 'setItem'>, progress: ReviewProgress) {
  try {
    storage.setItem(reviewSessionKey, JSON.stringify(progress))
  } catch {
    /* Private browsing can deny storage; keep the current in-memory flow usable. */
  }
}
