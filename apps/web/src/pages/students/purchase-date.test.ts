import { expect, it } from 'vitest'
import { purchaseDateInstant } from './purchase-date'

it('records the selected receipt date in the Workspace month, independent of browser time zone', () => {
  expect(purchaseDateInstant('2026-09-01', 'America/Los_Angeles')).toBe('2026-09-01T07:00:00.000Z')
  expect(purchaseDateInstant('2026-09-01', 'Asia/Taipei')).toBe('2026-08-31T16:00:00.000Z')
})
it('preserves purchase ordering when only money or collection is corrected', () => {
  expect(purchaseDateInstant('2026-09-01', 'Asia/Taipei', '2026-09-01T06:30:00.000Z')).toBe(
    '2026-09-01T06:30:00.000Z'
  )
})
