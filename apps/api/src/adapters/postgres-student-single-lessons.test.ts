import type { Pool } from 'pg'
import { expect, it } from 'vitest'
import { PostgresStudentRepository } from './postgres-student-repository.js'

it('includes every completed unpriced single lesson beside a later priced purchase, using the effective ledger amount', async () => {
  const student = {
    id: 'student-1',
    name: 'Student',
    phone: '',
    goal: '',
    private_note: '',
    age_range: null,
    default_venue_id: null,
    single_lesson_amount_minor: 1500,
    single_lesson_currency: 'TWD',
    active: true,
    line_linked: false,
    version: 2,
    created_at: new Date('2026-10-19T00:00:00Z'),
    updated_at: new Date('2026-10-21T00:00:00Z'),
  }
  const generated = {
    id: 'purchase-3',
    purchased_at: new Date('2026-10-21T03:00:00Z'),
    lesson_count: 1,
    amount_minor: 1500,
    currency: 'TWD',
    private_note: '',
    version: 1,
    created_at: new Date('2026-10-21T03:00:00Z'),
    updated_at: new Date('2026-10-21T03:00:00Z'),
    collection_mode: 'coach',
    venue_id: null,
    source_kind: 'generated_single',
    source_session_id: 'session-3',
    source_session_version: 2,
    source_version: 1,
  }
  const pending = [
    {
      session_id: 'session-1',
      ended_at: new Date('2026-10-19T03:00:00Z'),
      session_version: 2,
      source_version: 1,
      decided_at: new Date('2026-10-19T03:05:00Z'),
      amount_minor: null,
      entry_version: null,
      default_currency: 'TWD',
    },
    {
      session_id: 'session-2',
      ended_at: new Date('2026-10-20T03:00:00Z'),
      session_version: 2,
      source_version: 1,
      decided_at: new Date('2026-10-20T03:05:00Z'),
      amount_minor: 600,
      entry_version: 1,
      default_currency: 'TWD',
    },
  ]
  const client = {
    query: async (sql: string) => {
      if (sql.includes('FROM app_private.lesson_purchase p')) return { rows: [generated] }
      if (
        sql.includes('FROM app_private.session_lesson_source a') &&
        sql.includes('finance_entry_state')
      )
        return { rows: pending }
      if (sql.includes('AS student_exists'))
        return { rows: [{ student_exists: true, purchased: 0, completed: 3, manual_used: 0 }] }
      return { rows: [] }
    },
    release: () => undefined,
  }
  const pool = {
    query: async () => ({ rows: [student] }),
    connect: async () => client,
  } as unknown as Pool

  const detail = await new PostgresStudentRepository(pool).getStudentDetail(
    'workspace-1',
    'student-1',
  )
  expect(detail?.purchases).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceKind: 'pending_single',
        sourceSessionId: 'session-1',
        amountMinor: 0,
        version: 0,
        priceUnset: true,
      }),
      expect.objectContaining({
        sourceKind: 'pending_single',
        sourceSessionId: 'session-2',
        amountMinor: 600,
        version: 1,
        priceUnset: true,
        amountModified: true,
      }),
      expect.objectContaining({
        sourceKind: 'generated_single',
        sourceSessionId: 'session-3',
        amountMinor: 1500,
      }),
    ]),
  )
  expect(detail?.purchases).toHaveLength(3)
  expect(detail?.lessonSummary.remaining).toBe(0)
})
