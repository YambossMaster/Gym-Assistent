import { describe, expect, it } from 'vitest'
import { previewDemoScheduling } from './demo-scheduling.js'

describe('M4 Demo scheduling preview', () => {
  it('reports counts, temporal rejection, warning conflicts, and deterministic checksums', () => {
    const source = {
      sessions: [
        {
          id: 'a',
          studentId: 's',
          startsAt: '2026-09-14T01:00:00.000Z',
          endsAt: '2026-09-14T02:00:00.000Z',
          status: 'scheduled',
          location: 'A',
        },
        {
          id: 'b',
          studentId: 's',
          startsAt: '2026-09-14T01:30:00.000Z',
          endsAt: '2026-09-14T02:30:00.000Z',
          status: 'scheduled',
          location: 'B',
        },
        {
          id: 'bad',
          studentId: 's',
          startsAt: '2026-09-14T04:00:00.000Z',
          endsAt: '2026-09-14T03:00:00.000Z',
          status: 'completed',
          location: 'C',
        },
      ],
      series: [],
      availability: [],
      availabilityOverrides: [],
      blocks: [],
    }
    const first = previewDemoScheduling(source)
    expect(first.counts.sessions).toBe(2)
    expect(first.rejected).toEqual([
      { entity: 'session', id: 'bad', reason: 'end_not_after_start' },
    ])
    expect(first.conflicts).toHaveLength(1)
    expect(previewDemoScheduling(source).checksums).toEqual(first.checksums)
  })
})
