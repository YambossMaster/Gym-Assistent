import { describe, expect, it } from 'vitest'
import { previewM5Training } from './preview-m5-training.js'
describe('M5 migration preview', () => {
  it('is deterministic and does not invent history', () => {
    const first = previewM5Training(),
      second = previewM5Training()
    expect(second).toEqual(first)
    expect(first).toMatchObject({
      manifestCount: 100,
      duplicateKeys: 0,
      rejections: [],
      preservedLegacyRows: true,
      createdHistoricalTrainingFacts: 0,
    })
    expect(first.checksum).toHaveLength(64)
  })
})
