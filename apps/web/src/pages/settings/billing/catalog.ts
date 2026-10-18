import type { Money, Selection } from './types'

/** Display catalog only. Charge amounts and eligibility must come from an API quote. */
export function catalogPrice(selection: Selection): Money {
  const monthly = selection.tier === 'basic' ? 11500 : 14500
  return { amount: monthly * (selection.interval === 'year' ? 10 : 1), currency: 'TWD' }
}
