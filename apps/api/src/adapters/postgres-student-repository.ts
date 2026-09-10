import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import type { Student } from '../students/student.js'
import {
  type NewStudent,
  type StudentRepository,
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
  active: boolean
  line_linked: boolean
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

  async listStudents(workspaceId: WorkspaceId): Promise<Student[]> {
    const result = await this.#pool.query<StudentRow>(
      `SELECT id, name, phone, goal, private_note, active, line_linked, version,
              created_at, updated_at
       FROM app_private.student
       WHERE workspace_id = $1
       ORDER BY created_at, id`,
      [workspaceId],
    )
    return result.rows.map(mapStudent)
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
         created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
       RETURNING id, name, phone, goal, private_note, active, line_linked, version,
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
      ],
    )
    const student = result.rows[0]
    if (!student) throw new Error('Failed to create student')
    return mapStudent(student)
  }
}

function mapStudent(row: StudentRow): Student {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    goal: row.goal,
    privateNote: row.private_note,
    active: row.active,
    lineLinked: row.line_linked,
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
