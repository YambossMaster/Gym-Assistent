import { describe, expect, it } from 'vitest'
import { planSeriesReconciliation } from './series-reconciliation.js'
import type { CourseSession, ScheduleSeries } from './scheduling.js'

const series: ScheduleSeries = {
  id: 'series-1',
  studentId: 'student-1',
  anchorStartsAt: '2026-09-14T02:00:00.000Z',
  localWeekday: 1,
  localStartTime: '10:00',
  durationMinutes: 60,
  intervalWeeks: 1,
  autoScheduleHorizon: 'MAX_WINDOW',
  location: 'Studio',
  active: true,
  version: 1,
}
const anchor: CourseSession = {
  id: 'anchor',
  studentId: 'student-1',
  studentName: 'Alice',
  seriesId: 'series-1',
  startsAt: '2026-09-14T02:00:00.000Z',
  endsAt: '2026-09-14T03:00:00.000Z',
  location: 'Studio',
  status: 'scheduled',
  completedAt: null,
  version: 1,
  isLegacy: false,
}

describe('planSeriesReconciliation', () => {
  it('only fills the future entitlement deficit after the latest Series occurrence', () => {
    const plan = planSeriesReconciliation({
      series,
      remainingLessons: 3,
      sessions: [anchor],
      now: new Date('2026-09-13T00:00:00.000Z'),
    })
    expect(plan.map((value) => value.toISOString())).toEqual([
      '2026-09-21T02:00:00.000Z',
      '2026-09-28T02:00:00.000Z',
    ])
  })
  it('counts manual future Sessions, never backfills, and is idempotent after planned rows exist', () => {
    const manual = {
      ...anchor,
      id: 'manual',
      seriesId: null,
      startsAt: '2026-09-16T02:00:00.000Z',
      endsAt: '2026-09-16T03:00:00.000Z',
    }
    const first = planSeriesReconciliation({
      series,
      remainingLessons: 3,
      sessions: [anchor, manual],
      now: new Date('2026-09-13T00:00:00.000Z'),
    })
    expect(first).toHaveLength(1)
    const generated = {
      ...anchor,
      id: 'generated',
      startsAt: first[0]!.toISOString(),
      endsAt: '2026-09-21T03:00:00.000Z',
    }
    expect(
      planSeriesReconciliation({
        series,
        remainingLessons: 3,
        sessions: [anchor, manual, generated],
        now: new Date('2026-09-13T00:00:00.000Z'),
      }),
    ).toEqual([])
  })
  it('does not generate for an inactive Series', () => {
    expect(
      planSeriesReconciliation({
        series: { ...series, active: false },
        remainingLessons: 4,
        sessions: [anchor],
        now: new Date('2026-09-13T00:00:00.000Z'),
      }),
    ).toEqual([])
  })
  it.each([
    ['NONE', 0],
    ['1_WEEK', 0],
    ['2_WEEKS', 1],
  ] as const)(
    'caps generated Sessions at the %s auto-schedule horizon',
    (autoScheduleHorizon, count) => {
      expect(
        planSeriesReconciliation({
          series: { ...series, autoScheduleHorizon },
          remainingLessons: 12,
          sessions: [anchor],
          now: new Date('2026-09-13T00:00:00.000Z'),
        }),
      ).toHaveLength(count)
    },
  )
})
