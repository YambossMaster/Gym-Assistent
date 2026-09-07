import type { AuthenticatedIdentity } from '../identity/identity.js'
import type { Student } from './student.js'

export type WorkspaceId = string

export interface NewStudent {
  id: string
  name: string
  phone: string
  goal: string
  privateNote: string
  active: boolean
  lineLinked: boolean
  now: Date
}

export interface StudentRepository {
  resolveWorkspace(identity: AuthenticatedIdentity): Promise<WorkspaceId>
  listStudents(workspaceId: WorkspaceId): Promise<Student[]>
  createStudent(workspaceId: WorkspaceId, student: NewStudent): Promise<Student>
}
