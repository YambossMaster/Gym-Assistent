import type { AuthenticatedIdentity } from '../identity/identity.js'
import type {
  LessonIncomeSummary,
  LessonPurchase,
  LessonSummary,
  Student,
  StudentDetail,
} from './student.js'

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

export interface UpdatedStudent extends Omit<NewStudent, 'id'> {
  expectedVersion: number
}

export interface NewLessonPurchase {
  id: string
  purchasedAt: Date
  lessonCount: number
  amountMinor: number
  currency: string
  privateNote: string
  now: Date
}

export class StudentVersionConflictError extends Error {
  constructor() {
    super('Student was changed on another device. Reload it before choosing the next change.')
    this.name = 'StudentVersionConflictError'
  }
}

export interface StudentRepository {
  resolveWorkspace(identity: AuthenticatedIdentity): Promise<WorkspaceId>
  listStudents(workspaceId: WorkspaceId): Promise<Student[]>
  createStudent(workspaceId: WorkspaceId, student: NewStudent): Promise<Student>
  getStudentDetail(workspaceId: WorkspaceId, studentId: string): Promise<StudentDetail | null>
  updateStudent(
    workspaceId: WorkspaceId,
    studentId: string,
    student: UpdatedStudent,
  ): Promise<Student | null>
  deleteStudent(
    workspaceId: WorkspaceId,
    studentId: string,
    expectedVersion: number,
  ): Promise<boolean>
  createLessonPurchase(
    workspaceId: WorkspaceId,
    studentId: string,
    purchase: NewLessonPurchase,
  ): Promise<LessonPurchase | null>
  lessonSummary(workspaceId: WorkspaceId, studentId: string): Promise<LessonSummary | null>
  incomeSummary(workspaceId: WorkspaceId): Promise<LessonIncomeSummary[]>
}
