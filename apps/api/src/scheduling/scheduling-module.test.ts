import { describe, expect, it } from 'vitest'
import { SchedulingModule } from './scheduling-module.js'
import { createBlockSchema, createSessionSchema } from './scheduling.js'
import type {
  NewScheduleSeries,
  NewSession,
  SchedulingRepository,
} from './scheduling-repository.js'

const identity = {
  userId: '00000000-0000-4000-8000-000000000001',
  email: 'coach@example.com',
}

describe('SchedulingModule', () => {
  it('uses date keys and an override when projecting effective availability', async () => {
    const module = new SchedulingModule({
      resolveWorkspace: async () => 'workspace-1',
      getTimeZone: async () => 'Asia/Taipei',
      listSessions: async () => [],
      listBlocks: async () => [],
      listAvailability: async () => [
        { weekday: 1, windows: [{ startTime: '09:00', endTime: '12:00' }], version: 3 },
      ],
      getAvailabilityOverride: async (_workspaceId: string, date: string) =>
        date === '2026-09-15' ? { windows: [], version: 1 } : null,
    } as unknown as SchedulingRepository)

    await expect(
      module.calendar(identity, { start: '2026-09-14', end: '2026-09-16' }),
    ).resolves.toMatchObject({
      availabilityByDate: {
        '2026-09-14': [{ startTime: '09:00', endTime: '12:00' }],
        '2026-09-15': [],
      },
      availabilityVersionsByDate: { '2026-09-14': 3, '2026-09-15': 1 },
      availabilityRulesByWeekday: {
        '1': { windows: [{ startTime: '09:00', endTime: '12:00' }], version: 3 },
      },
    })
  })

  it('rejects Session and Block times that are not on 15-minute increments', () => {
    expect(() =>
      createSessionSchema.parse({
        studentId: '00000000-0000-4000-8000-000000000010',
        startsAt: '2026-09-14T01:07:00.000Z',
        endsAt: '2026-09-14T02:00:00.000Z',
        location: 'Studio',
      }),
    ).toThrow(/15-minute/)
    expect(() =>
      createBlockSchema.parse({
        startsAt: '2026-09-14T01:00:30.000Z',
        endsAt: '2026-09-14T02:00:00.000Z',
      }),
    ).toThrow(/15-minute/)
  })

  it('derives local Series cadence and sends its anchor in the same repository operation', async () => {
    const received: {
      current?: {
        seriesId: string
        anchorSeriesId: string | undefined
        weekday: number
        startTime: string
      }
    } = {}
    const module = new SchedulingModule({
      resolveWorkspace: async () => 'workspace-1',
      getTimeZone: async () => 'Asia/Taipei',
      hasStudent: async () => true,
      createSeriesAndAnchor: async (
        _workspaceId: string,
        series: NewScheduleSeries,
        anchor: NewSession,
      ) => {
        received.current = {
          seriesId: series.id,
          anchorSeriesId: anchor.seriesId,
          weekday: series.localWeekday,
          startTime: series.localStartTime,
        }
        return {} as never
      },
      reconcileSeries: async () => [],
    } as unknown as SchedulingRepository)

    await module.createSeries(identity, '00000000-0000-4000-8000-000000000010', {
      startsAt: '2026-09-14T02:00:00.000Z',
      endsAt: '2026-09-14T03:00:00.000Z',
      location: 'Studio',
      intervalWeeks: 1,
      autoScheduleHorizon: 'NONE',
    })

    expect(received.current).toMatchObject({ weekday: 1, startTime: '10:00' })
    expect(received.current?.anchorSeriesId).toBe(received.current?.seriesId)
  })

  it('reconciles only an authorized Student through the repository transaction boundary', async () => {
    const calls: string[] = []
    const module = new SchedulingModule({
      resolveWorkspace: async () => 'workspace-1',
      hasStudent: async (_workspaceId: string, studentId: string) =>
        studentId === '00000000-0000-4000-8000-000000000010',
      reconcileSeries: async (_workspaceId: string, studentId: string) => {
        calls.push(studentId)
        return []
      },
    } as unknown as SchedulingRepository)
    await expect(
      module.reconcileSeries(identity, '00000000-0000-4000-8000-000000000010'),
    ).resolves.toEqual([])
    await expect(
      module.reconcileSeries(identity, '00000000-0000-4000-8000-000000000011'),
    ).resolves.toBeNull()
    expect(calls).toEqual(['00000000-0000-4000-8000-000000000010'])
  })

  it('reconciles the owning Student after an accepted Series edit', async () => {
    const calls: string[] = []
    const module = new SchedulingModule({
      resolveWorkspace: async () => 'workspace-1',
      getTimeZone: async () => 'Asia/Taipei',
      updateSeries: async () => ({
        id: 'series-1',
        studentId: '00000000-0000-4000-8000-000000000010',
        anchorStartsAt: '2026-09-14T02:00:00.000Z',
        localWeekday: 1,
        localStartTime: '10:00',
        durationMinutes: 60,
        intervalWeeks: 1,
        autoScheduleHorizon: 'NONE',
        location: 'Studio',
        active: true,
        version: 2,
      }),
      reconcileSeries: async (_workspaceId: string, studentId: string) => {
        calls.push(studentId)
        return []
      },
    } as unknown as SchedulingRepository)

    await expect(
      module.updateSeries(identity, 'series-1', {
        startsAt: '2026-09-14T02:00:00.000Z',
        endsAt: '2026-09-14T03:00:00.000Z',
        location: 'Studio',
        intervalWeeks: 1,
        autoScheduleHorizon: 'NONE',
        active: true,
        version: 1,
      }),
    ).resolves.toMatchObject({ series: { id: 'series-1' }, generatedIds: [] })
    expect(calls).toEqual(['00000000-0000-4000-8000-000000000010'])
  })

  it('passes the optional effective Session boundary to Series persistence', async () => {
    let effectiveFromSessionId: string | undefined
    const module = new SchedulingModule({
      resolveWorkspace: async () => 'workspace-1',
      getTimeZone: async () => 'Asia/Taipei',
      updateSeries: async (
        _workspaceId: string,
        _seriesId: string,
        input: Parameters<SchedulingRepository['updateSeries']>[2],
      ) => {
        effectiveFromSessionId = input.effectiveFromSessionId
        return {
          id: 'series-1',
          studentId: 'student-1',
          anchorStartsAt: '2026-09-14T02:00:00.000Z',
          localWeekday: 1,
          localStartTime: '10:00',
          durationMinutes: 60,
          intervalWeeks: 1,
          autoScheduleHorizon: '2_WEEKS',
          location: 'Studio',
          active: true,
          version: 2,
        }
      },
      reconcileSeries: async () => [],
    } as unknown as SchedulingRepository)
    await module.updateSeries(identity, 'series-1', {
      startsAt: '2026-09-21T02:00:00.000Z',
      endsAt: '2026-09-21T03:00:00.000Z',
      location: 'Studio',
      intervalWeeks: 1,
      autoScheduleHorizon: '2_WEEKS',
      active: true,
      effective_from_session_id: '00000000-0000-4000-8000-000000000012',
      version: 1,
    })
    expect(effectiveFromSessionId).toBe('00000000-0000-4000-8000-000000000012')
  })

  it('rejects overlapping Availability replacement windows before persistence', async () => {
    const replaceAvailability = async () => {
      throw new Error('must not persist')
    }
    const module = new SchedulingModule({
      resolveWorkspace: async () => 'workspace-1',
      replaceAvailability,
    } as unknown as SchedulingRepository)

    await expect(
      module.replaceAvailability(identity, 'rule', 1, {
        version: 1,
        windows: [
          { startTime: '09:00', endTime: '12:00' },
          { startTime: '11:00', endTime: '13:00' },
        ],
      }),
    ).rejects.toThrow('must not overlap')
  })

  it('requires explicit DELETE confirmation before deleting a Session', async () => {
    const module = new SchedulingModule({
      resolveWorkspace: async () => 'workspace-1',
      getSession: async () => null,
      deleteSession: async () => true,
    } as unknown as SchedulingRepository)
    await expect(module.deleteSession(identity, 'session-1', { version: 1 })).rejects.toThrow()
  })

  it('returns an outside-availability warning without rejecting Session creation', async () => {
    const session = {
      id: 'session-1',
      studentId: '00000000-0000-4000-8000-000000000010',
      studentName: 'Alice',
      seriesId: null,
      startsAt: '2026-09-14T01:00:00.000Z',
      endsAt: '2026-09-14T02:00:00.000Z',
      location: 'Studio',
      status: 'scheduled' as const,
      completedAt: null,
      version: 1,
      isLegacy: false,
    }
    const module = new SchedulingModule({
      resolveWorkspace: async () => 'workspace-1',
      hasStudent: async () => true,
      createSession: async () => session,
      reconcileSeries: async () => [],
      listSessions: async () => [session],
      listBlocks: async () => [],
      getTimeZone: async () => 'Asia/Taipei',
      listAvailability: async () => [
        { weekday: 1, windows: [{ startTime: '10:00', endTime: '12:00' }], version: 1 },
      ],
      getAvailabilityOverride: async () => null,
    } as unknown as SchedulingRepository)
    await expect(
      module.createSession(identity, {
        studentId: session.studentId,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        location: session.location,
      }),
    ).resolves.toMatchObject({ conflicts: [{ kind: 'outside_availability' }] })
  })
})
