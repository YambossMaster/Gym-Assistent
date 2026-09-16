import { describe, expect, it } from 'vitest'
import { trainingQuotes } from './quotes'

describe('Today quotations', () => {
  it('keeps all twelve supplied sayings in the random rotation with source links', () => {
    expect(trainingQuotes).toHaveLength(12)
    expect(new Set(trainingQuotes.map((quote) => quote.text)).size).toBe(12)
    expect(trainingQuotes.every((quote) => quote.author && quote.title && quote.source)).toBe(true)
  })
})
