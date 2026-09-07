import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import type { Student } from '../students/student.js'
import type { NewStudent, StudentRepository, WorkspaceId } from '../students/student-repository.js'

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

export class PostgresStudentRepository implements StudentRepository {
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
