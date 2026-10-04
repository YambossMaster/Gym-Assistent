import { describe, expect, it } from 'vitest'
import { ExportError, ExportModule } from './export-module.js'
import { zonedMidnight } from '../today/today.js'

const identity = { userId: 'coach-1' }
const studentId = '00000000-0000-4000-8000-000000000001'
const definitionId = '00000000-0000-4000-8000-000000000002'
const venueId = '00000000-0000-4000-8000-000000000003'
const session = {
  id: 'session-1',
  studentId,
  studentName: '陳同學',
  startsAt: '2026-10-05T01:00:00.000Z',
  endsAt: '2026-10-05T02:00:00.000Z',
  status: 'completed',
  location: '台北',
  venueId,
  seriesId: null,
}
const block = {
  id: 'block-1',
  startsAt: '2026-10-04T15:30:00.000Z',
  endsAt: '2026-10-04T17:30:00.000Z',
  note: '私人行程',
}

function module(blocks = [block]) {
  return new ExportModule({
    workspace: { getSettings: async () => ({ timeZone: 'Asia/Taipei' }) },
    students: { list: async () => [{ id: studentId, name: '陳同學', active: false }] },
    scheduling: {
      calendar: async () => ({ sessions: [{ session, conflicts: [] }], blocks }),
    },
    training: {
      listDefinitions: async () => ({ definitions: [{ id: definitionId, name: '深蹲' }] }),
      getSessionTraining: async () => ({
        session: {
          ...session,
          startsAt: new Date(session.startsAt),
          endsAt: new Date(session.endsAt),
        },
        record: {
          id: 'record-1',
          privateNote: '私人訓練筆記',
          updatedAt: new Date(session.startsAt),
          exercises: [
            {
              id: 'exercise-1',
              definitionId,
              definitionName: '深蹲',
              recording: { type: 'weight_reps' },
              sets: [
                {
                  id: 'set-1',
                  plannedWeight: 80,
                  plannedReps: 5,
                  actualReps: 5,
                  rpe: 7,
                  result: 'completed',
                  unit: 'kg',
                  measurements: undefined,
                },
              ],
            },
          ],
        },
      }),
      getStudentPerformance: async () => [
        {
          definitionId,
          name: '深蹲',
          series: [
            {
              metric: 'weight',
              unit: 'kg',
              direction: 'higher',
              points: [{ sessionId: session.id, startsAt: session.startsAt, value: 80 }],
            },
          ],
        },
      ],
      getStudentTrend: async () => ({ points: [] }),
    },
    finances: {
      exportVisibleRows: async () => ({
        venues: [{ id: venueId, name: '台北場地' }],
        rows: [
          {
            id: 'manual:entry-1',
            date: '2026-10-05',
            occurredAt: session.startsAt,
            kind: 'manual',
            direction: 'income',
            label: '教練費',
            amountMinor: 1000,
            currency: 'TWD',
            venueId: null,
            status: 'manual',
          },
        ],
        manualNotes: new Map([['manual:entry-1', '財務私人筆記']]),
      }),
    },
    now: () => new Date('2026-10-05T03:00:00.000Z'),
  } as never)
}

const base = { format: 'json', start: '2026-10-05', end: '2026-10-05' }

describe('Export selection rules', () => {
  it('rejects impossible and excessive local-day ranges before reading data', async () => {
    await expect(
      module().select(identity, { ...base, type: 'training', start: '2026-02-30' }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'invalid_export_range' })
    expect(
      zonedMidnight('2026-03-09', 'America/New_York').getTime() -
        zonedMidnight('2026-03-08', 'America/New_York').getTime(),
    ).toBe(23 * 60 * 60 * 1000)
    await expect(
      module().select(identity, { ...base, type: 'training', start: '2026-09-01' }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'invalid_export_range' })
    await expect(
      module().select(identity, { ...base, type: 'training', format: 'pdf', start: '2026-09-28' }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'invalid_export_range' })
  })

  it('keeps Training notes out by default and includes exactly one selected Set', async () => {
    const plain = await module().select(identity, { ...base, type: 'training', studentId })
    expect(plain.rows).toHaveLength(1)
    expect(plain.rows[0]).toMatchObject({ studentName: '陳同學', plannedWeight: 80, setNumber: 1 })
    expect(JSON.stringify(plain.records)).not.toContain('私人訓練筆記')
    const privateData = await module().select(identity, {
      ...base,
      type: 'training',
      includePrivateNotes: true,
    })
    expect(privateData.rows[0]?.privateNote).toBe('私人訓練筆記')
    await expect(
      module().select(identity, { ...base, type: 'training', studentId: venueId }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'not_found' })
  })

  it('uses existing growth points and validates the selected Exercise', async () => {
    const growth = await module().select(identity, { ...base, type: 'growth', definitionId })
    expect(growth.rows).toHaveLength(1)
    expect(growth.rows[0]).toMatchObject({
      metric: 'weight',
      value: 80,
      sessionStartsAt: session.startsAt,
    })
    await expect(
      module().select(identity, { ...base, type: 'growth', definitionId: venueId }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'not_found' })
  })

  it('includes an intersecting midnight block once and opts its note in', async () => {
    const calendar = await module().select(identity, {
      ...base,
      type: 'calendar',
      includeBlocks: true,
    })
    expect(calendar.rows).toHaveLength(2)
    expect(JSON.stringify(calendar.rows)).not.toContain('私人行程')
    const selected = await module().select(identity, {
      ...base,
      type: 'calendar',
      includeBlocks: true,
      includePrivateNotes: true,
    })
    expect(selected.rows.find((row) => row.eventType === 'block')?.blockNote).toBe('私人行程')
    await expect(
      module(
        Array.from({ length: 501 }, (_, index) => ({ ...block, id: `block-${index}` })),
      ).select(identity, { ...base, type: 'calendar', format: 'pdf', includeBlocks: true }),
    ).rejects.toMatchObject({ statusCode: 413, code: 'export_too_large' })
  })

  it('derives Finance notes only by opt-in and keeps selected visible-row values', async () => {
    const plain = await module().select(identity, { ...base, type: 'finance' })
    expect(plain.rows[0]).toMatchObject({ rowId: 'manual:entry-1', amountMinor: 1000 })
    expect(JSON.stringify(plain.records)).not.toContain('財務私人筆記')
    const selected = await module().select(identity, {
      ...base,
      type: 'finance',
      includePrivateNotes: true,
    })
    expect(selected.rows[0]?.privateNote).toBe('財務私人筆記')
    await expect(
      module().select(identity, { ...base, type: 'finance', income: false }),
    ).rejects.toBeInstanceOf(ExportError)
  })
})
