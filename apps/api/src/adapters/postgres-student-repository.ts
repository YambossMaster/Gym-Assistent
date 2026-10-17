import { PostgresFinanceRepository } from './postgres-finance-repository.js'
import { randomUUID } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import type {
  LessonIncomeSummary,
  LessonPurchase,
  LessonSummary,
  Student,
  StudentDetail,
} from '../students/student.js'
import {
  type NewStudent,
  type NewLessonPurchase,
  type UpdatedLessonPurchase,
  LessonPurchaseVersionConflictError,
  LessonPurchaseAllocationConflictError,
  type StudentRepository,
  StudentVersionConflictError,
  type UpdatedStudent,
  type WorkspaceId,
} from '../students/student-repository.js'
import {
  type NewWorkspaceSettings,
  type WorkspaceSettingsRepository,
  WorkspaceVersionConflictError,
} from '../workspace/workspace-repository.js'
import { defaultWorkspaceDisplayName, type WorkspaceSettings } from '../workspace/workspace.js'
import type { AccountLifecycleRepository } from '../account-lifecycle/account-lifecycle-repository.js'
import type { AccountLifecycleStatus } from '../account-lifecycle/account-lifecycle.js'

interface StudentRow {
  id: string
  name: string
  phone: string
  goal: string
  private_note: string
  age_range: Student['ageRange']
  default_venue_id: string | null
  single_lesson_amount_minor: string | number | null
  single_lesson_currency: string | null
  active: boolean
  line_linked: boolean
  version: number
  created_at: Date
  updated_at: Date
  next_session_starts_at?: Date | null
  latest_purchase_lesson_count?: number | null
}

interface LessonPurchaseRow {
  source_kind: 'manual' | 'generated_single'
  source_session_id: string | null
  source_session_version?: number | null
  source_version?: number | null
  collection_mode: 'coach' | 'venue'
  venue_id: string | null
  id: string
  purchased_at: Date
  lesson_count: number
  amount_minor: string | number
  currency: string
  private_note: string
  version: number
  created_at: Date
  updated_at: Date
}

interface PendingSingleLessonRow {
  session_id: string
  ended_at: Date
  session_version: number
  source_version: number
  decided_at: Date
  amount_minor: string | number | null
  entry_version: number | null
  default_currency: string
}

interface WorkspaceSettingsRow {
  display_name: string
  time_zone: string
  default_currency: WorkspaceSettings['defaultCurrency']
  calendar_start_hour: number
  calendar_end_hour: number
  calendar_week_start: 0 | 1
  default_session_minutes: WorkspaceSettings['defaultSessionMinutes']
  version: number
  updated_at: Date
}

interface AccountLifecycleRow {
  deletion_due_at: Date | null
}

export class PostgresStudentRepository
  implements StudentRepository, WorkspaceSettingsRepository, AccountLifecycleRepository
{
  readonly #pool: Pool

  constructor(pool: Pool) {
    this.#pool = pool
  }

  private async purchaseTransaction<T>(
    workspaceId: string,
    studentId: string,
    work: (client: PoolClient) => Promise<T>,
  ): Promise<T | null> {
    const client = await this.#pool.connect()
    try {
      await client.query('begin')
      await client.query("select set_config('app.current_workspace_id',$1,true)", [workspaceId])
      const student = await client.query(
        'select id from app_private.student where workspace_id=$1 and id=$2 for update',
        [workspaceId, studentId],
      )
      if (!student.rowCount) {
        await client.query('rollback')
        return null
      }
      const result = await work(client)
      await client.query('commit')
      return result
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }

  async resolveWorkspace(identity: AuthenticatedIdentity): Promise<WorkspaceId> {
    const existingWorkspace = await this.#pool.query<{ id: string }>(
      `SELECT workspace.id
       FROM app_private.workspace
       WHERE workspace.owner_user_id = $1`,
      [identity.userId],
    )
    const existingWorkspaceId = existingWorkspace.rows[0]?.id
    if (existingWorkspaceId) return existingWorkspaceId

    const client = await this.#pool.connect()
    try {
      await client.query('BEGIN')
      const candidateWorkspaceId = randomUUID()

      await client.query(
        `INSERT INTO app_private.workspace (id, owner_user_id, display_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (owner_user_id) DO NOTHING`,
        [candidateWorkspaceId, identity.userId, defaultWorkspaceDisplayName(identity.email)],
      )

      const workspaceResult = await client.query<{ id: string }>(
        'SELECT id FROM app_private.workspace WHERE owner_user_id = $1',
        [identity.userId],
      )
      const workspaceId = workspaceResult.rows[0]?.id
      if (!workspaceId) throw new Error('Failed to resolve workspace')

      await client.query('COMMIT')
      return workspaceId
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async listStudents(workspaceId: WorkspaceId) {
    const result = await this.#pool.query<StudentRow>(
      `SELECT id, name, phone, goal, private_note, age_range, default_venue_id, single_lesson_amount_minor, single_lesson_currency, active, line_linked, version,
              created_at, updated_at,
              (SELECT MIN(session.starts_at)
               FROM app_private.course_session session
               WHERE session.workspace_id = student.workspace_id
                 AND session.student_id = student.id
                 AND session.status = 'scheduled'
                 AND NOT session.is_legacy
                 AND session.starts_at > now()) AS next_session_starts_at,
              (SELECT purchase.lesson_count
               FROM app_private.lesson_purchase purchase
               WHERE purchase.workspace_id = student.workspace_id
                 AND purchase.student_id = student.id
                 AND purchase.source_kind = 'manual'
               ORDER BY purchase.purchased_at DESC, purchase.created_at DESC, purchase.id DESC
               LIMIT 1) AS latest_purchase_lesson_count
       FROM app_private.student student
       WHERE workspace_id = $1
       ORDER BY created_at, id`,
      [workspaceId],
    )
    return Promise.all(
      result.rows.map(async (student) => ({
        ...mapStudent(student),
        lessonSummary: (await this.lessonSummary(workspaceId, student.id))!,
        latestPurchaseLessonCount: student.latest_purchase_lesson_count ?? null,
        nextSessionAt: student.next_session_starts_at?.toISOString() ?? null,
      })),
    )
  }

  async getWorkspaceSettings(workspaceId: WorkspaceId): Promise<WorkspaceSettings> {
    const result = await this.#pool.query<WorkspaceSettingsRow>(
      `SELECT display_name, time_zone, default_currency, calendar_start_hour,
              calendar_end_hour, calendar_week_start, default_session_minutes, version, updated_at
       FROM app_private.workspace
       WHERE id = $1`,
      [workspaceId],
    )
    const settings = result.rows[0]
    if (!settings) throw new Error('Workspace does not exist')
    return mapWorkspaceSettings(settings)
  }

  async updateWorkspaceSettings(
    workspaceId: WorkspaceId,
    input: NewWorkspaceSettings,
  ): Promise<WorkspaceSettings> {
    const result = await this.#pool.query<WorkspaceSettingsRow>(
      `UPDATE app_private.workspace
       SET display_name = $2, time_zone = $3,
           default_currency = COALESCE($4, default_currency),
           calendar_start_hour = COALESCE($5, calendar_start_hour),
           calendar_end_hour = COALESCE($6, calendar_end_hour),
           calendar_week_start = COALESCE($7, calendar_week_start),
           default_session_minutes = COALESCE($8, default_session_minutes),
           version = version + 1, updated_at = $9
       WHERE id = $1 AND version = $10
       RETURNING display_name, time_zone, default_currency, calendar_start_hour,
                 calendar_end_hour, calendar_week_start, default_session_minutes, version, updated_at`,
      [
        workspaceId,
        input.displayName,
        input.timeZone,
        input.defaultCurrency ?? null,
        input.calendarStartHour ?? null,
        input.calendarEndHour ?? null,
        input.calendarWeekStart ?? null,
        input.defaultSessionMinutes ?? null,
        input.now,
        input.expectedVersion,
      ],
    )
    const settings = result.rows[0]
    if (!settings) throw new WorkspaceVersionConflictError()
    return mapWorkspaceSettings(settings)
  }

  async getAccountLifecycle(workspaceId: WorkspaceId): Promise<AccountLifecycleStatus> {
    const result = await this.#pool.query<AccountLifecycleRow>(
      'SELECT deletion_due_at FROM app_private.workspace WHERE id = $1',
      [workspaceId],
    )
    const lifecycle = result.rows[0]
    if (!lifecycle) throw new Error('Workspace does not exist')
    return { deletionDueAt: lifecycle.deletion_due_at?.toISOString() ?? null }
  }

  async requestDeletion(
    workspaceId: WorkspaceId,
    requestedAt: Date,
    dueAt: Date,
  ): Promise<AccountLifecycleStatus> {
    const result = await this.#pool.query<AccountLifecycleRow>(
      `UPDATE app_private.workspace
       SET deletion_requested_at = $2, deletion_due_at = $3
       WHERE id = $1
       RETURNING deletion_due_at`,
      [workspaceId, requestedAt, dueAt],
    )
    const lifecycle = result.rows[0]
    if (!lifecycle?.deletion_due_at) throw new Error('Workspace does not exist')
    return { deletionDueAt: lifecycle.deletion_due_at.toISOString() }
  }

  async cancelDeletion(workspaceId: WorkspaceId): Promise<AccountLifecycleStatus> {
    const result = await this.#pool.query<AccountLifecycleRow>(
      `UPDATE app_private.workspace
       SET deletion_requested_at = NULL, deletion_due_at = NULL
       WHERE id = $1
       RETURNING deletion_due_at`,
      [workspaceId],
    )
    if (!result.rows[0]) throw new Error('Workspace does not exist')
    return { deletionDueAt: null }
  }

  async recordActivity(workspaceId: WorkspaceId, now: Date): Promise<void> {
    await this.#pool.query('UPDATE app_private.workspace SET last_activity_at = $2 WHERE id = $1', [
      workspaceId,
      now,
    ])
  }

  async createStudent(workspaceId: WorkspaceId, input: NewStudent): Promise<Student> {
    const result = await this.#pool.query<StudentRow>(
      `INSERT INTO app_private.student (
         id, workspace_id, name, phone, goal, private_note, active, line_linked,
         age_range, default_venue_id, single_lesson_amount_minor, single_lesson_currency,
         created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $10, $11, $12, $13, $9, $9)
       RETURNING id, name, phone, goal, private_note, age_range, default_venue_id, single_lesson_amount_minor, single_lesson_currency, active, line_linked, version,
                 created_at, updated_at`,
      [
        input.id,
        workspaceId,
        input.name,
        input.phone,
        input.goal,
        input.privateNote,
        input.active,
        input.lineLinked,
        input.now,
        input.ageRange,
        input.defaultVenueId,
        input.singleLessonPrice?.amountMinor ?? null,
        input.singleLessonPrice?.currency ?? null,
      ],
    )
    const student = result.rows[0]
    if (!student) throw new Error('Failed to create student')
    return mapStudent(student)
  }

  async getStudentDetail(
    workspaceId: WorkspaceId,
    studentId: string,
  ): Promise<StudentDetail | null> {
    const [studentResult, purchaseRecords, summary] = await Promise.all([
      this.#pool.query<StudentRow>(
        `SELECT id, name, phone, goal, private_note, age_range, default_venue_id, single_lesson_amount_minor, single_lesson_currency, active, line_linked, version, created_at, updated_at
         FROM app_private.student WHERE workspace_id = $1 AND id = $2`,
        [workspaceId, studentId],
      ),
      new PostgresFinanceRepository(this.#pool).scoped(workspaceId, async (client) => {
        const purchases = await client.query<LessonPurchaseRow>(
          `SELECT p.id,p.purchased_at,p.lesson_count,p.amount_minor,p.currency,p.private_note,p.version,p.created_at,p.updated_at,p.collection_mode,p.entitlement_venue_id venue_id,p.source_kind,p.source_session_id,
          s.version source_session_version,a.version source_version
         FROM app_private.lesson_purchase p
         LEFT JOIN app_private.course_session s ON s.workspace_id=p.workspace_id AND s.id=p.source_session_id
         LEFT JOIN app_private.session_lesson_source a ON a.workspace_id=p.workspace_id AND a.session_id=p.source_session_id
         WHERE p.workspace_id = $1 AND p.student_id = $2 ORDER BY p.purchased_at, p.id`,
          [workspaceId, studentId],
        )
        const pending = await client.query<PendingSingleLessonRow>(
          `SELECT a.session_id, s.ends_at ended_at, s.version session_version,
                  a.version source_version, a.decided_at,
                  e.manual_amount_minor amount_minor, e.version entry_version,
                  w.default_currency
           FROM app_private.session_lesson_source a
           JOIN app_private.course_session s ON s.workspace_id=a.workspace_id AND s.id=a.session_id
           JOIN app_private.workspace w ON w.id=a.workspace_id
           LEFT JOIN app_private.finance_entry_state e
             ON e.workspace_id=a.workspace_id AND e.entry_id='single-lesson:' || a.session_id
           WHERE a.workspace_id=$1 AND a.student_id=$2 AND a.kind='pending'
             AND s.status='completed' AND s.ends_at IS NOT NULL
           ORDER BY s.ends_at, a.session_id`,
          [workspaceId, studentId],
        )
        return { purchases: purchases.rows, pending: pending.rows }
      }),
      this.lessonSummary(workspaceId, studentId),
    ])
    const student = studentResult.rows[0]
    if (!student || !summary) return null
    return {
      student: mapStudent(student),
      purchases: [
        ...purchaseRecords.purchases.map(mapLessonPurchase),
        ...purchaseRecords.pending.map(mapPendingSingleLesson),
      ],
      lessonSummary: summary,
    }
  }

  async updateStudent(
    workspaceId: WorkspaceId,
    studentId: string,
    input: UpdatedStudent,
  ): Promise<Student | null> {
    const result = await this.#pool.query<StudentRow>(
      `UPDATE app_private.student
       SET name = $3, phone = $4, goal = $5, private_note = $6, active = $7, line_linked = $8,
           age_range = CASE WHEN $11 THEN $12 ELSE age_range END,
           default_venue_id = CASE WHEN $14 THEN $13 ELSE default_venue_id END,
           single_lesson_amount_minor = CASE WHEN $15 THEN $16 ELSE single_lesson_amount_minor END,
           single_lesson_currency = CASE WHEN $15 THEN $17 ELSE single_lesson_currency END,
           version = version + 1, updated_at = $9
       WHERE workspace_id = $1 AND id = $2 AND version = $10
       RETURNING id, name, phone, goal, private_note, age_range, default_venue_id, single_lesson_amount_minor, single_lesson_currency, active, line_linked, version, created_at, updated_at`,
      [
        workspaceId,
        studentId,
        input.name,
        input.phone,
        input.goal,
        input.privateNote,
        input.active,
        input.lineLinked,
        input.now,
        input.expectedVersion,
        input.ageRange !== undefined,
        input.ageRange ?? null,
        input.defaultVenueId,
        input.defaultVenueId !== undefined,
        input.singleLessonPrice !== undefined,
        input.singleLessonPrice?.amountMinor ?? null,
        input.singleLessonPrice?.currency ?? null,
      ],
    )
    const student = result.rows[0]
    if (student) return mapStudent(student)
    const exists = await this.#pool.query(
      'SELECT 1 FROM app_private.student WHERE workspace_id = $1 AND id = $2',
      [workspaceId, studentId],
    )
    if (exists.rowCount) throw new StudentVersionConflictError()
    return null
  }

  async deleteStudent(
    workspaceId: WorkspaceId,
    studentId: string,
    expectedVersion: number,
  ): Promise<boolean> {
    const result = await this.#pool.query(
      'DELETE FROM app_private.student WHERE workspace_id = $1 AND id = $2 AND version = $3',
      [workspaceId, studentId, expectedVersion],
    )
    if (result.rowCount) return true
    const exists = await this.#pool.query(
      'SELECT 1 FROM app_private.student WHERE workspace_id = $1 AND id = $2',
      [workspaceId, studentId],
    )
    if (exists.rowCount) throw new StudentVersionConflictError()
    return false
  }

  async createLessonPurchase(
    workspaceId: WorkspaceId,
    studentId: string,
    input: NewLessonPurchase,
  ): Promise<LessonPurchase | null> {
    return this.purchaseTransaction(workspaceId, studentId, async (client) => {
      const result = await client.query<LessonPurchaseRow>(
        `INSERT INTO app_private.lesson_purchase (id, workspace_id, student_id, purchased_at, lesson_count, amount_minor, currency, private_note, created_at, updated_at, collection_mode, entitlement_venue_id)
       SELECT $3, $1, student.id, $4, $5, $6, $7, $8, $9, $9, $10, $11
       FROM app_private.student AS student WHERE student.workspace_id = $1 AND student.id = $2
       RETURNING id, purchased_at, lesson_count, amount_minor, currency, private_note, version, created_at, updated_at, collection_mode, entitlement_venue_id as venue_id, source_kind, source_session_id`,
        [
          workspaceId,
          studentId,
          input.id,
          input.purchasedAt,
          input.lessonCount,
          input.amountMinor,
          input.currency,
          input.privateNote,
          input.now,
          input.collectionMode ?? 'coach',
          input.venueId ?? null,
        ],
      )
      const purchase = result.rows[0]
      return purchase ? mapLessonPurchase(purchase) : null
    })
  }

  async updateLessonPurchase(
    workspaceId: WorkspaceId,
    studentId: string,
    purchaseId: string,
    input: UpdatedLessonPurchase,
  ): Promise<LessonPurchase | null> {
    return this.purchaseTransaction(workspaceId, studentId, async (client) => {
      const current = await client.query<LessonPurchaseRow>(
        `select id,purchased_at,lesson_count,amount_minor,currency,private_note,version,created_at,updated_at,collection_mode,entitlement_venue_id venue_id,source_kind,source_session_id
       from app_private.lesson_purchase where workspace_id=$1 and student_id=$2 and id=$3 for update`,
        [workspaceId, studentId, purchaseId],
      )
      const previous = current.rows[0]
      if (!previous) return null
      if (previous.source_kind !== 'manual' || previous.version !== input.expectedVersion)
        throw new LessonPurchaseVersionConflictError(mapLessonPurchase(previous))
      const allocations = await client.query<{
        count: string
        earliest_date: string | null
        venue_ids: string[]
        no_venue_count: string
        session_ids: string[]
      }>(
        `select count(*)::text count,
        min((s.ends_at at time zone w.time_zone)::date)::text earliest_date,
        array_agg(distinct s.venue_id::text) filter (where s.venue_id is not null) venue_ids,
        count(*) filter (where s.venue_id is null)::text no_venue_count,
        array_agg(a.session_id::text) session_ids
       from app_private.session_lesson_source a
       join app_private.course_session s on s.workspace_id=a.workspace_id and s.id=a.session_id
       join app_private.workspace w on w.id=a.workspace_id
       where a.workspace_id=$1 and a.purchase_id=$2 and a.kind='manual' and s.status='completed'`,
        [workspaceId, purchaseId],
      )
      const fixed = allocations.rows[0]
      const purchaseDay = await client.query<{ day: string }>(
        'select ($2::timestamptz at time zone time_zone)::date::text day from app_private.workspace where id=$1',
        [workspaceId, input.purchasedAt],
      )
      const nextVenue = input.venueId === undefined ? previous.venue_id : input.venueId
      if (
        fixed &&
        (input.lessonCount < Number(fixed.count) ||
          (fixed.earliest_date !== null && purchaseDay.rows[0]!.day > fixed.earliest_date) ||
          (nextVenue !== null &&
            (Number(fixed.no_venue_count) > 0 ||
              (fixed.venue_ids ?? []).some((id) => id !== nextVenue))))
      )
        throw new LessonPurchaseAllocationConflictError(
          mapLessonPurchase(previous),
          fixed.session_ids ?? [],
        )
      const result = await client.query<LessonPurchaseRow>(
        `UPDATE app_private.lesson_purchase
       SET purchased_at = $4, lesson_count = $5, amount_minor = $6, currency = $7, private_note = $8,
           entitlement_venue_id = CASE WHEN $11 THEN $12 ELSE entitlement_venue_id END,
           version = version + 1, updated_at = $9
       WHERE workspace_id = $1 AND student_id = $2 AND id = $3 AND version = $10 AND source_kind='manual'
       RETURNING id, purchased_at, lesson_count, amount_minor, currency, private_note, version, created_at, updated_at, collection_mode, entitlement_venue_id as venue_id, source_kind, source_session_id`,
        [
          workspaceId,
          studentId,
          purchaseId,
          input.purchasedAt,
          input.lessonCount,
          input.amountMinor,
          input.currency,
          input.privateNote,
          input.now,
          input.expectedVersion,
          input.venueId !== undefined,
          input.venueId ?? null,
        ],
      )
      return mapLessonPurchase(result.rows[0]!)
    })
  }

  async deleteLessonPurchase(
    workspaceId: WorkspaceId,
    studentId: string,
    purchaseId: string,
    expectedVersion: number,
  ): Promise<boolean> {
    return (
      (await this.purchaseTransaction(workspaceId, studentId, async (client) => {
        const current = await client.query<LessonPurchaseRow>(
          `select id,purchased_at,lesson_count,amount_minor,currency,private_note,version,created_at,updated_at,collection_mode,entitlement_venue_id venue_id,source_kind,source_session_id
       from app_private.lesson_purchase where workspace_id=$1 and student_id=$2 and id=$3 for update`,
          [workspaceId, studentId, purchaseId],
        )
        const previous = current.rows[0]
        if (!previous) return false
        if (previous.source_kind !== 'manual' || previous.version !== expectedVersion)
          throw new LessonPurchaseVersionConflictError(mapLessonPurchase(previous))
        const allocated = await client.query<{ session_id: string }>(
          "select session_id from app_private.session_lesson_source where workspace_id=$1 and purchase_id=$2 and kind='manual'",
          [workspaceId, purchaseId],
        )
        if (allocated.rowCount)
          throw new LessonPurchaseAllocationConflictError(
            mapLessonPurchase(previous),
            allocated.rows.map((row) => row.session_id),
          )
        const result = await client.query(
          "DELETE FROM app_private.lesson_purchase WHERE workspace_id = $1 AND student_id = $2 AND id = $3 AND version = $4 AND source_kind='manual'",
          [workspaceId, studentId, purchaseId, expectedVersion],
        )
        return Boolean(result.rowCount)
      })) ?? false
    )
  }

  async lessonSummary(workspaceId: WorkspaceId, studentId: string): Promise<LessonSummary | null> {
    const result = await new PostgresFinanceRepository(this.#pool).scoped(workspaceId, (client) =>
      client.query<LessonSummary & { student_exists: boolean; manual_used: number }>(
        `SELECT EXISTS(SELECT 1 FROM app_private.student WHERE workspace_id = $1 AND id = $2) AS student_exists,
              COALESCE((SELECT SUM(lesson_count)::integer FROM app_private.lesson_purchase WHERE workspace_id = $1 AND student_id = $2 AND source_kind='manual'), 0) AS purchased,
              COALESCE((SELECT COUNT(*)::integer FROM app_private.course_session WHERE workspace_id = $1 AND student_id = $2 AND status = 'completed'), 0) AS completed,
              COALESCE((SELECT COUNT(*)::integer FROM app_private.session_lesson_source a join app_private.course_session s on s.workspace_id=a.workspace_id and s.id=a.session_id WHERE a.workspace_id=$1 AND a.student_id=$2 AND a.kind in ('manual','legacy_unallocated') AND s.status='completed'),0) AS manual_used`,
        [workspaceId, studentId],
      ),
    )
    const row = result.rows[0]
    return row?.student_exists
      ? {
          purchased: row.purchased,
          completed: row.completed,
          remaining: row.purchased - row.manual_used,
        }
      : null
  }

  async incomeSummary(workspaceId: WorkspaceId): Promise<LessonIncomeSummary[]> {
    return new PostgresFinanceRepository(this.#pool).income(workspaceId)
  }
  async incomeSummaryForPeriod(
    workspaceId: WorkspaceId,
    startsAt: Date,
    endsAt: Date,
  ): Promise<LessonIncomeSummary[]> {
    return new PostgresFinanceRepository(this.#pool).income(workspaceId, startsAt, endsAt)
  }
}

function mapStudent(row: StudentRow): Student {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    goal: row.goal,
    privateNote: row.private_note,
    ageRange: row.age_range,
    defaultVenueId: row.default_venue_id,
    singleLessonPrice:
      row.single_lesson_amount_minor === null || row.single_lesson_currency === null
        ? null
        : {
            amountMinor: Number(row.single_lesson_amount_minor),
            currency: row.single_lesson_currency,
          },
    active: row.active,
    lineLinked: row.line_linked,
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function mapLessonPurchase(row: LessonPurchaseRow): LessonPurchase {
  return {
    id: row.id,
    collectionMode: row.collection_mode,
    venueId: row.venue_id,
    sourceKind: row.source_kind,
    sourceSessionId: row.source_session_id,
    sourceSessionVersion: row.source_session_version ?? null,
    sourceVersion: row.source_version ?? null,
    purchasedAt: row.purchased_at.toISOString(),
    lessonCount: row.lesson_count,
    amountMinor: Number(row.amount_minor),
    currency: row.currency,
    privateNote: row.private_note,
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function mapPendingSingleLesson(row: PendingSingleLessonRow): LessonPurchase {
  const occurredAt = row.ended_at.toISOString()
  return {
    id: `single-lesson:${row.session_id}`,
    collectionMode: 'coach',
    venueId: null,
    sourceKind: 'pending_single',
    sourceSessionId: row.session_id,
    sourceSessionVersion: row.session_version,
    sourceVersion: row.source_version,
    priceUnset: true,
    amountModified: row.amount_minor !== null,
    purchasedAt: occurredAt,
    lessonCount: 1,
    amountMinor: Number(row.amount_minor ?? 0),
    currency: row.default_currency,
    privateNote: '',
    version: row.entry_version ?? 0,
    createdAt: row.decided_at.toISOString(),
    updatedAt: row.decided_at.toISOString(),
  }
}

function mapWorkspaceSettings(row: WorkspaceSettingsRow): WorkspaceSettings {
  return {
    displayName: row.display_name,
    timeZone: row.time_zone,
    defaultCurrency: row.default_currency,
    calendarStartHour: row.calendar_start_hour,
    calendarEndHour: row.calendar_end_hour,
    calendarWeekStart: row.calendar_week_start,
    defaultSessionMinutes: row.default_session_minutes,
    version: row.version,
    updatedAt: row.updated_at.toISOString(),
  }
}
