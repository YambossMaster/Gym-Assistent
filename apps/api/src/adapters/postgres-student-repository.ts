import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
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
import type { WorkspaceSettings } from '../workspace/workspace.js'
import type { AccountLifecycleRepository } from '../account-lifecycle/account-lifecycle-repository.js'
import type { AccountLifecycleStatus } from '../account-lifecycle/account-lifecycle.js'

interface StudentRow {
  id: string
  name: string
  phone: string
  goal: string
  private_note: string
  age_range: Student['ageRange']
  active: boolean
  line_linked: boolean
  version: number
  created_at: Date
  updated_at: Date
  next_session_starts_at?: Date | null
}

interface LessonPurchaseRow {
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

interface WorkspaceSettingsRow {
  display_name: string
  time_zone: string
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
        `INSERT INTO app_private.workspace (id, owner_user_id)
         VALUES ($1, $2)
         ON CONFLICT (owner_user_id) DO NOTHING`,
        [candidateWorkspaceId, identity.userId],
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
      `SELECT id, name, phone, goal, private_note, age_range, active, line_linked, version,
              created_at, updated_at,
              (SELECT MIN(session.starts_at)
               FROM app_private.course_session session
               WHERE session.workspace_id = student.workspace_id
                 AND session.student_id = student.id
                 AND session.status = 'scheduled'
                 AND NOT session.is_legacy
                 AND session.starts_at > now()) AS next_session_starts_at
       FROM app_private.student student
       WHERE workspace_id = $1
       ORDER BY created_at, id`,
      [workspaceId],
    )
    return Promise.all(
      result.rows.map(async (student) => ({
        ...mapStudent(student),
        lessonSummary: (await this.lessonSummary(workspaceId, student.id))!,
        nextSessionAt: student.next_session_starts_at?.toISOString() ?? null,
      })),
    )
  }

  async getWorkspaceSettings(workspaceId: WorkspaceId): Promise<WorkspaceSettings> {
    const result = await this.#pool.query<WorkspaceSettingsRow>(
      `SELECT display_name, time_zone, version, updated_at
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
       SET display_name = $2, time_zone = $3, version = version + 1, updated_at = $4
       WHERE id = $1 AND version = $5
       RETURNING display_name, time_zone, version, updated_at`,
      [workspaceId, input.displayName, input.timeZone, input.now, input.expectedVersion],
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
         age_range,
         created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $10, $9, $9)
       RETURNING id, name, phone, goal, private_note, age_range, active, line_linked, version,
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
    const [studentResult, purchasesResult, summary] = await Promise.all([
      this.#pool.query<StudentRow>(
        `SELECT id, name, phone, goal, private_note, age_range, active, line_linked, version, created_at, updated_at
         FROM app_private.student WHERE workspace_id = $1 AND id = $2`,
        [workspaceId, studentId],
      ),
      this.#pool.query<LessonPurchaseRow>(
        `SELECT id, purchased_at, lesson_count, amount_minor, currency, private_note, version, created_at, updated_at
         FROM app_private.lesson_purchase
         WHERE workspace_id = $1 AND student_id = $2 ORDER BY purchased_at, id`,
        [workspaceId, studentId],
      ),
      this.lessonSummary(workspaceId, studentId),
    ])
    const student = studentResult.rows[0]
    if (!student || !summary) return null
    return {
      student: mapStudent(student),
      purchases: purchasesResult.rows.map(mapLessonPurchase),
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
           version = version + 1, updated_at = $9
       WHERE workspace_id = $1 AND id = $2 AND version = $10
       RETURNING id, name, phone, goal, private_note, age_range, active, line_linked, version, created_at, updated_at`,
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
    const result = await this.#pool.query<LessonPurchaseRow>(
      `INSERT INTO app_private.lesson_purchase (id, workspace_id, student_id, purchased_at, lesson_count, amount_minor, currency, private_note, created_at, updated_at)
       SELECT $3, $1, student.id, $4, $5, $6, $7, $8, $9, $9
       FROM app_private.student AS student WHERE student.workspace_id = $1 AND student.id = $2
       RETURNING id, purchased_at, lesson_count, amount_minor, currency, private_note, version, created_at, updated_at`,
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
      ],
    )
    const purchase = result.rows[0]
    return purchase ? mapLessonPurchase(purchase) : null
  }

  async updateLessonPurchase(
    workspaceId: WorkspaceId,
    studentId: string,
    purchaseId: string,
    input: UpdatedLessonPurchase,
  ): Promise<LessonPurchase | null> {
    const result = await this.#pool.query<LessonPurchaseRow>(
      `UPDATE app_private.lesson_purchase
       SET purchased_at = $4, lesson_count = $5, amount_minor = $6, currency = $7, private_note = $8,
           version = version + 1, updated_at = $9
       WHERE workspace_id = $1 AND student_id = $2 AND id = $3 AND version = $10
       RETURNING id, purchased_at, lesson_count, amount_minor, currency, private_note, version, created_at, updated_at`,
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
      ],
    )
    if (result.rows[0]) return mapLessonPurchase(result.rows[0])
    const current = await this.#pool.query<LessonPurchaseRow>(
      `SELECT id, purchased_at, lesson_count, amount_minor, currency, private_note, version, created_at, updated_at
       FROM app_private.lesson_purchase WHERE workspace_id = $1 AND student_id = $2 AND id = $3`,
      [workspaceId, studentId, purchaseId],
    )
    if (current.rows[0])
      throw new LessonPurchaseVersionConflictError(mapLessonPurchase(current.rows[0]))
    return null
  }

  async deleteLessonPurchase(
    workspaceId: WorkspaceId,
    studentId: string,
    purchaseId: string,
    expectedVersion: number,
  ): Promise<boolean> {
    const result = await this.#pool.query(
      'DELETE FROM app_private.lesson_purchase WHERE workspace_id = $1 AND student_id = $2 AND id = $3 AND version = $4',
      [workspaceId, studentId, purchaseId, expectedVersion],
    )
    if (result.rowCount) return true
    const current = await this.#pool.query<LessonPurchaseRow>(
      `SELECT id, purchased_at, lesson_count, amount_minor, currency, private_note, version, created_at, updated_at
       FROM app_private.lesson_purchase WHERE workspace_id = $1 AND student_id = $2 AND id = $3`,
      [workspaceId, studentId, purchaseId],
    )
    if (current.rows[0])
      throw new LessonPurchaseVersionConflictError(mapLessonPurchase(current.rows[0]))
    return false
  }

  async lessonSummary(workspaceId: WorkspaceId, studentId: string): Promise<LessonSummary | null> {
    const result = await this.#pool.query<LessonSummary & { student_exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM app_private.student WHERE workspace_id = $1 AND id = $2) AS student_exists,
              COALESCE((SELECT SUM(lesson_count)::integer FROM app_private.lesson_purchase WHERE workspace_id = $1 AND student_id = $2), 0) AS purchased,
              COALESCE((SELECT COUNT(*)::integer FROM app_private.course_session WHERE workspace_id = $1 AND student_id = $2 AND status = 'completed'), 0) AS completed`,
      [workspaceId, studentId],
    )
    const row = result.rows[0]
    return row?.student_exists
      ? {
          purchased: row.purchased,
          completed: row.completed,
          remaining: row.purchased - row.completed,
        }
      : null
  }

  async incomeSummary(workspaceId: WorkspaceId): Promise<LessonIncomeSummary[]> {
    const result = await this.#pool.query<LessonIncomeSummary>(
      `SELECT currency, COALESCE(SUM(amount_minor), 0)::bigint AS "amountMinor"
       FROM app_private.lesson_purchase
       WHERE workspace_id = $1
       GROUP BY currency
       ORDER BY currency`,
      [workspaceId],
    )
    return result.rows.map((row) => ({ ...row, amountMinor: Number(row.amountMinor) }))
  }

  async incomeSummaryForPeriod(
    workspaceId: WorkspaceId,
    startsAt: Date,
    endsAt: Date,
  ): Promise<LessonIncomeSummary[]> {
    const result = await this.#pool.query<LessonIncomeSummary>(
      `SELECT currency, COALESCE(SUM(amount_minor), 0)::bigint AS "amountMinor"
       FROM app_private.lesson_purchase
       WHERE workspace_id = $1 AND purchased_at >= $2 AND purchased_at < $3
       GROUP BY currency
       ORDER BY currency`,
      [workspaceId, startsAt, endsAt],
    )
    return result.rows.map((row) => ({ ...row, amountMinor: Number(row.amountMinor) }))
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

function mapWorkspaceSettings(row: WorkspaceSettingsRow): WorkspaceSettings {
  return {
    displayName: row.display_name,
    timeZone: row.time_zone,
    version: row.version,
    updatedAt: row.updated_at.toISOString(),
  }
}
