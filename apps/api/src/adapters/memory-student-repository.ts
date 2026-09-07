import { randomUUID } from 'node:crypto'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import type { Student } from '../students/student.js'
import type {
  NewStudent,
  StudentRepository,
  WorkspaceId,
} from '../students/student-repository.js'

export class MemoryStudentRepository implements StudentRepository {
  readonly #workspaceByIdentity = new Map<string, WorkspaceId>()
  readonly #studentsByWorkspace = new Map<WorkspaceId, Student[]>()

  async resolveWorkspace(identity: AuthenticatedIdentity): Promise<WorkspaceId> {
    const key = identity.userId
    const existing = this.#workspaceByIdentity.get(key)
    if (existing) return existing

    const workspaceId = randomUUID()
    this.#workspaceByIdentity.set(key, workspaceId)
    this.#studentsByWorkspace.set(workspaceId, [])
    return workspaceId
  }

  async listStudents(workspaceId: WorkspaceId): Promise<Student[]> {
    return (this.#studentsByWorkspace.get(workspaceId) ?? []).map((student) => ({ ...student }))
  }

  async createStudent(workspaceId: WorkspaceId, input: NewStudent): Promise<Student> {
    const students = this.#studentsByWorkspace.get(workspaceId)
    if (!students) throw new Error('Workspace does not exist')

    const timestamp = input.now.toISOString()
    const student: Student = {
      id: input.id,
      name: input.name,
      phone: input.phone,
      goal: input.goal,
      privateNote: input.privateNote,
      active: input.active,
      lineLinked: input.lineLinked,
      version: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    students.push(student)
    return { ...student }
  }
}
