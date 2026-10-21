import type { Pool } from 'pg'
import { expect, it, vi } from 'vitest'
import { PostgresSchedulingRepository } from './postgres-scheduling-repository.js'
import { SchedulingVersionConflictError } from '../scheduling/scheduling-repository.js'
import { SchedulingStudentChangeError } from '../scheduling/scheduling-repository.js'

it('does not reactivate an archived group Series after Pro is restored', async () => {
  const calls: string[] = []
  const query = vi.fn(async (sql: string) => {
    calls.push(sql)
    if (sql.startsWith('select kind,active from app_private.student'))
      return { rows: [{ kind: 'group', active: false }], rowCount: 1 }
    return { rows: [], rowCount: 0 }
  })
  const repository = new PostgresSchedulingRepository({
    query: async (sql: string) =>
      sql.startsWith('select student_id from app_private.schedule_series')
        ? { rows: [{ student_id: 'group-1' }] }
        : { rows: [{ time_zone: 'Asia/Taipei' }] },
    connect: async () => ({ query, release: vi.fn() }),
  } as unknown as Pool)
  await expect(
    repository.updateSeries('workspace-1', 'series-1', {
      anchorStartsAt: new Date('2026-10-21T10:00:00.000Z'),
      localWeekday: 3,
      localStartTime: '18:00',
      durationMinutes: 60,
      intervalWeeks: 1,
      autoScheduleHorizon: 'NONE',
      location: 'FORM A',
      active: true,
      expectedVersion: 1,
      now: new Date('2026-10-21T00:00:00.000Z'),
    }),
  ).rejects.toBeInstanceOf(SchedulingStudentChangeError)
  expect(calls.some((sql) => sql.startsWith('update app_private.schedule_series'))).toBe(false)
  expect(calls.at(-1)).toBe('rollback')
})

it('reconciles a group Series without borrowing another pool connection during its transaction', async () => {
  const calls: string[] = []
  const query = vi.fn(async (sql: string) => {
    calls.push(sql)
    if (sql.startsWith('select kind,active from app_private.student'))
      return { rows: [{ kind: 'group', active: true }], rowCount: 1 }
    if (sql.includes('from app_private.student_group_member'))
      return { rows: [{ '?column?': 1 }], rowCount: 1 }
    if (sql.startsWith('select time_zone from app_private.workspace'))
      return { rows: [{ time_zone: 'Asia/Taipei' }], rowCount: 1 }
    return { rows: [], rowCount: 0 }
  })
  const poolQuery = vi.fn(() => {
    throw new Error('A pool connection was borrowed while the transaction held one')
  })
  const repository = new PostgresSchedulingRepository({
    connect: async () => ({ query, release: vi.fn() }),
    query: poolQuery,
  } as unknown as Pool)

  await expect(repository.reconcileSeries('workspace-1', 'group-1', new Date())).resolves.toEqual(
    [],
  )
  expect(poolQuery).not.toHaveBeenCalled()
  expect(calls.some((sql) => sql.startsWith('select time_zone from app_private.workspace'))).toBe(
    true,
  )
  expect(calls.at(-1)).toBe('commit')
})

it('checks Series version before deletion and leaves existing Sessions to the FK', async () => {
  const calls: string[] = []
  const query = vi.fn(async (sql: string) => {
    calls.push(sql)
    if (sql.includes('from app_private.schedule_series where'))
      return {
        rows: [
          {
            id: 'series-1',
            student_id: 'student-1',
            anchor_starts_at: new Date(),
            local_weekday: 1,
            local_start_time: '10:00',
            duration_minutes: 60,
            interval_weeks: 1,
            auto_schedule_horizon: 'NONE',
            location: 'FORM A',
            active: true,
            version: 4,
          },
        ],
        rowCount: 1,
      }
    return { rows: [], rowCount: 1 }
  })
  const release = vi.fn()
  const repository = new PostgresSchedulingRepository({
    connect: async () => ({ query, release }),
  } as unknown as Pool)

  await expect(repository.deleteSeries('workspace-1', 'series-1', 3)).rejects.toBeInstanceOf(
    SchedulingVersionConflictError,
  )
  expect(calls.some((sql) => sql.startsWith('delete from app_private.schedule_series'))).toBe(false)
  calls.length = 0
  await expect(repository.deleteSeries('workspace-1', 'series-1', 4)).resolves.toEqual({
    studentId: 'student-1',
  })
  expect(calls.some((sql) => sql.startsWith('delete from app_private.schedule_series'))).toBe(true)
  expect(calls.some((sql) => sql.includes('course_session'))).toBe(false)
  expect(release).toHaveBeenCalledTimes(2)
})

it('permits explicit deletion of a completed temporal Session', async () => {
  const calls: string[] = []
  const query = vi.fn(async (sql: string) => {
    calls.push(sql)
    if (sql.startsWith('select student_id from app_private.course_session'))
      return { rows: [{ student_id: 'student-1' }], rowCount: 1 }
    if (sql.startsWith('select kind from app_private.student'))
      return { rows: [{ kind: 'person' }], rowCount: 1 }
    if (sql.startsWith('select student_id,status,version,is_legacy,series_id'))
      return {
        rows: [
          {
            student_id: 'student-1',
            status: 'completed',
            version: 4,
            is_legacy: false,
            series_id: null,
          },
        ],
        rowCount: 1,
      }
    if (sql.includes('from app_private.session_lesson_source'))
      return { rows: [{ kind: 'generated_single', purchase_id: 'purchase-1' }], rowCount: 1 }
    return { rows: [], rowCount: 1 }
  })
  const repository = new PostgresSchedulingRepository({
    connect: async () => ({ query, release: vi.fn() }),
  } as unknown as Pool)

  await expect(repository.deleteSession('workspace-1', 'session-1', 4)).resolves.toBe(true)

  expect(
    calls.findIndex((sql) => sql.startsWith('delete from app_private.finance_entry_state')),
  ).toBeLessThan(
    calls.findIndex((sql) => sql.startsWith('delete from app_private.session_lesson_source')),
  )
  expect(
    calls.findIndex((sql) => sql.startsWith('delete from app_private.session_lesson_source')),
  ).toBeLessThan(
    calls.findIndex((sql) => sql.startsWith('delete from app_private.lesson_purchase')),
  )
  expect(
    calls.findIndex((sql) => sql.startsWith('delete from app_private.lesson_purchase')),
  ).toBeLessThan(calls.findIndex((sql) => sql.startsWith('delete from app_private.course_session')))
  expect(calls.at(-1)).toBe('commit')
})

it('locks the Student and fixes an eligible manual source within completion', async () => {
  const calls: string[] = []
  const query = vi.fn(async (sql: string) => {
    calls.push(sql)
    if (sql.startsWith('select student_id from app_private.course_session'))
      return { rows: [{ student_id: 'student-1' }], rowCount: 1 }
    if (sql.startsWith('select kind from app_private.student'))
      return { rows: [{ kind: 'person' }], rowCount: 1 }
    if (sql.startsWith('select student_id,version,status,venue_id,ends_at,is_legacy'))
      return {
        rows: [
          {
            student_id: 'student-1',
            version: 2,
            status: 'scheduled',
            venue_id: 'venue-1',
            ends_at: new Date('2026-09-01T03:00:00Z'),
            is_legacy: false,
          },
        ],
        rowCount: 1,
      }
    if (sql.startsWith('select ($2::timestamptz'))
      return { rows: [{ local_day: '2026-09-01' }], rowCount: 1 }
    if (sql.startsWith('select p.id from app_private.lesson_purchase'))
      return { rows: [{ id: 'manual-1' }], rowCount: 1 }
    if (sql.startsWith('update app_private.course_session set status='))
      return {
        rows: [
          {
            id: 'session-1',
            student_id: 'student-1',
            student_name: '學生',
            series_id: null,
            starts_at: new Date('2026-09-01T02:00:00Z'),
            ends_at: new Date('2026-09-01T03:00:00Z'),
            venue_id: 'venue-1',
            customer_source: null,
            fee_rule_id: null,
            location: '場地',
            status: 'completed',
            completed_at: new Date(),
            version: 3,
            is_legacy: false,
          },
        ],
        rowCount: 1,
      }
    return { rows: [], rowCount: 1 }
  })
  const repository = new PostgresSchedulingRepository({
    connect: async () => ({ query, release: vi.fn() }),
  } as unknown as Pool)
  await expect(
    repository.transitionSession('workspace-1', 'session-1', 'complete', 2, new Date()),
  ).resolves.toMatchObject({ status: 'completed', version: 3 })
  expect(
    calls.findIndex((sql) => sql.startsWith('select id from app_private.student')),
  ).toBeLessThan(
    calls.findIndex((sql) => sql.startsWith('select p.id from app_private.lesson_purchase')),
  )
  expect(
    calls.some((sql) => sql.includes("kind,purchase_id,decided_at) values($1,$2,$3,'manual'")),
  ).toBe(true)
  expect(calls.some((sql) => sql.startsWith('insert into app_private.lesson_purchase'))).toBe(false)
  expect(calls.at(-1)).toBe('commit')
})

it('finalizes group attendance and removes absent sets before allocating one lesson', async () => {
  const calls: string[] = []
  const query = vi.fn(async (sql: string) => {
    calls.push(sql)
    if (sql.startsWith('select student_id from app_private.course_session'))
      return { rows: [{ student_id: 'group-1' }], rowCount: 1 }
    if (sql.startsWith('select kind from app_private.student'))
      return { rows: [{ kind: 'group' }], rowCount: 1 }
    if (sql.startsWith('select student_id,version,status,venue_id,ends_at,is_legacy'))
      return {
        rows: [
          {
            student_id: 'group-1',
            version: 2,
            status: 'scheduled',
            venue_id: null,
            ends_at: new Date('2026-10-21T03:00:00Z'),
            is_legacy: false,
          },
        ],
        rowCount: 1,
      }
    if (sql.startsWith('select student_id from app_private.course_session_participant'))
      return { rows: [{ student_id: 'person-1' }, { student_id: 'person-2' }], rowCount: 2 }
    if (sql.startsWith('select ($2::timestamptz'))
      return { rows: [{ local_day: '2026-10-21' }], rowCount: 1 }
    if (sql.startsWith('update app_private.course_session set status='))
      return {
        rows: [
          {
            id: 'session-1',
            student_id: 'group-1',
            student_name: '晨練組',
            starts_at: new Date('2026-10-21T02:00:00Z'),
            ends_at: new Date('2026-10-21T03:00:00Z'),
            status: 'completed',
            version: 3,
            is_legacy: false,
          },
        ],
        rowCount: 1,
      }
    return { rows: [], rowCount: 1 }
  })
  const repository = new PostgresSchedulingRepository({
    connect: async () => ({ query, release: vi.fn() }),
  } as unknown as Pool)

  await expect(
    repository.transitionSession('workspace-1', 'session-1', 'complete', 2, new Date()),
  ).resolves.toMatchObject({ status: 'completed' })
  const deletion = calls.findIndex((sql) =>
    sql.startsWith('delete from app_private.training_set ts'),
  )
  const attendance = calls.findIndex((sql) =>
    sql.startsWith('update app_private.course_session_participant'),
  )
  const record = calls.findIndex((sql) => sql.startsWith('update app_private.training_record'))
  const source = calls.findIndex((sql) =>
    sql.startsWith('insert into app_private.session_lesson_source'),
  )
  expect(deletion).toBeGreaterThan(-1)
  expect(attendance).toBeGreaterThan(deletion)
  expect(record).toBeGreaterThan(attendance)
  expect(source).toBeGreaterThan(record)
  expect(calls.at(-1)).toBe('commit')
})

it('allows a scheduled Series occurrence to change Student without changing its Series', async () => {
  const session = {
    id: 'session-1',
    student_id: 'student-1',
    student_name: '學生',
    owner_kind: 'person',
    series_id: 'series-1',
    starts_at: new Date('2026-09-19T02:00:00.000Z'),
    ends_at: new Date('2026-09-19T03:00:00.000Z'),
    location: 'FORM A',
    status: 'scheduled',
    version: 3,
    is_legacy: false,
  }
  const query = vi.fn(async (sql: string, _params?: unknown[]) => {
    if (sql.includes('from app_private.course_session s') && sql.includes('for update'))
      return { rows: [session], rowCount: 1 }
    if (sql.startsWith('select kind,active from app_private.student'))
      return { rows: [{ kind: 'person', active: true }], rowCount: 1 }
    if (sql.startsWith('update app_private.course_session set starts_at'))
      return {
        rows: [{ ...session, student_id: '00000000-0000-4000-8000-000000000011', version: 4 }],
        rowCount: 1,
      }
    return { rows: [], rowCount: 1 }
  })
  const repository = new PostgresSchedulingRepository({
    connect: async () => ({ query, release: vi.fn() }),
  } as unknown as Pool)

  await repository.updateSession('workspace-1', 'session-1', {
    studentId: '00000000-0000-4000-8000-000000000011',
    startsAt: new Date('2026-09-19T02:00:00.000Z'),
    endsAt: new Date('2026-09-19T03:00:00.000Z'),
    location: 'FORM A',
    expectedVersion: 3,
    now: new Date('2026-09-19T00:00:00.000Z'),
  })

  const changed = query.mock.calls.find(([sql]) =>
    sql.startsWith('update app_private.course_session set starts_at'),
  )
  expect(changed?.[0]).not.toContain('series_id is null')
  expect(changed?.[1]?.[7]).toBe('00000000-0000-4000-8000-000000000011')
  expect(
    query.mock.calls.some(([sql]) => sql.startsWith('update app_private.training_set ts')),
  ).toBe(true)
  expect(query.mock.calls.at(-1)?.[0]).toBe('commit')
})

it('returns a new group Session with its snapshot in the same transaction', async () => {
  const calls: string[] = []
  const startsAt = new Date('2026-10-23T02:00:00.000Z')
  const endsAt = new Date('2026-10-23T03:00:00.000Z')
  const query = vi.fn(async (sql: string) => {
    calls.push(sql)
    if (sql.startsWith('select kind,active from app_private.student'))
      return { rows: [{ kind: 'group', active: true }], rowCount: 1 }
    if (sql.startsWith('select 1 from app_private.student_group_member'))
      return { rows: [{ '?column?': 1 }], rowCount: 1 }
    if (sql.startsWith('insert into app_private.course_session '))
      return {
        rows: [
          {
            id: 'session-1',
            student_id: 'group-1',
            student_name: '晨練組',
            series_id: null,
            starts_at: startsAt,
            ends_at: endsAt,
            location: 'FORM A',
            status: 'scheduled',
            version: 1,
            is_legacy: false,
          },
        ],
        rowCount: 1,
      }
    if (sql.startsWith('select owner.kind owner_kind'))
      return {
        rows: [{ owner_kind: 'group', participant_names: ['陳同學', '林同學'] }],
        rowCount: 1,
      }
    return { rows: [], rowCount: 1 }
  })
  const repository = new PostgresSchedulingRepository({
    connect: async () => ({ query, release: vi.fn() }),
  } as unknown as Pool)

  await expect(
    repository.createSession('workspace-1', {
      id: 'session-1',
      studentId: 'group-1',
      startsAt,
      endsAt,
      location: 'FORM A',
      now: new Date('2026-10-21T00:00:00.000Z'),
    }),
  ).resolves.toMatchObject({
    id: 'session-1',
    ownerKind: 'group',
    participantNames: ['陳同學', '林同學'],
  })
  expect(
    calls.findIndex((sql) => sql.startsWith('insert into app_private.course_session_participant')),
  ).toBeLessThan(calls.findIndex((sql) => sql.startsWith('select owner.kind owner_kind')))
  expect(calls.at(-1)).toBe('commit')
})
