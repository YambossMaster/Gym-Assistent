import type { Selection } from './types'

export const billingQuoteKey = (accountId: string, selection: Selection) =>
  ['billing', accountId, 'quote', selection] as const

// A plan-choice preflight stays fresh long enough for the route transition.
export const billingQuoteStaleTime = 30_000
