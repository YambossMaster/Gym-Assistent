import { describe, expect, it } from 'vitest'
import { rescheduleCandidateDates } from './postgres-public-access-repository.js'

describe('reschedule candidate dates', () => {
  it('uses today through the next six local dates for an overdue scheduled Session', () => {
    expect(
      rescheduleCandidateDates(
        new Date('2026-09-07T02:00:00.000Z'),
        'Asia/Taipei',
        new Date('2026-09-19T10:00:00.000Z'),
      ),
    ).toEqual([
      '2026-09-19',
      '2026-09-20',
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
    ])
  })

  it('keeps the original local date plus or minus three days for a future Session', () => {
    expect(
      rescheduleCandidateDates(
        new Date('2026-09-28T02:00:00.000Z'),
        'Asia/Taipei',
        new Date('2026-09-19T10:00:00.000Z'),
      ),
    ).toEqual([
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
    ])
  })
})
