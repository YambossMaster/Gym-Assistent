import { expect, it } from 'vitest'
import { formatVenueRecordDateTime } from './VenueCourseRecords'

it('uses 24-hour times in Venue course records', () => {
  expect(
    formatVenueRecordDateTime('2026-06-01T07:30:00Z', 'Asia/Taipei', { timeStyle: 'short' })
  ).toBe('15:30')
  expect(
    formatVenueRecordDateTime('2026-06-01T16:00:00Z', 'Asia/Taipei', { timeStyle: 'short' })
  ).toBe('00:00')
})
