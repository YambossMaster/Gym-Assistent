import type { Pool } from 'pg'
import { describe, expect, it, vi } from 'vitest'
import {
  PostgresPublicAccessRepository,
  publicCoachName,
  rescheduleCandidateDates,
} from './postgres-public-access-repository.js'

it('uses the saved Coach display name and never publishes the old Workspace label as a person', () => {
  expect(publicCoachName(' 林教練 ')).toBe('林教練')
  expect(publicCoachName('我的工作台')).toBe('教練')
})

it('refuses to issue a note-sharing result link when the server record has no saved note', async () => {
  const statements: string[] = []
  const client = {
    query: vi.fn(async (sql: string) => {
      statements.push(sql)
      if (sql.includes('select s.id,s.starts_at'))
        return {
          rows: [
            {
              status: 'completed',
              is_legacy: false,
              record_id: 'record-1',
              record_version: 4,
              student_kind: 'person',
              private_note: '',
            },
          ],
        }
      return { rows: [], rowCount: 0 }
    }),
    release: vi.fn(),
  }
  const repository = new PostgresPublicAccessRepository({
    connect: async () => client,
  } as unknown as Pool)
  await expect(
    repository.issue(
      'workspace-1',
      'session-1',
      {
        purpose: 'training_result',
        includeTrainingNote: true,
        tokenHash: 'a'.repeat(64),
      },
      new Date('2026-10-24T00:00:00Z'),
    ),
  ).rejects.toMatchObject({ reason: 'note_unavailable', statusCode: 409 })
  expect(statements.some((sql) => sql.includes('insert into app_private.capability_link'))).toBe(
    false,
  )
  expect(statements).toContain('rollback')
})

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
