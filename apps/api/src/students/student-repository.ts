import type { AuthenticatedIdentity } from '../identity/identity.js'
import type {
  LessonIncomeSummary,
  LessonPurchase,
  LessonSummary,
  StudentRosterItem,
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
  ageRange: Student['ageRange']
  active: boolean
  lineLinked: boolean
  now: Date
}

export interface UpdatedStudent extends Omit<NewStudent, 'id' | 'ageRange'> {
  ageRange?: Student['ageRange'] | undefined
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
export interface UpdatedLessonPurchase extends Omit<NewLessonPurchase, 'id'> {
  expectedVersion: number
}

export class StudentVersionConflictError extends Error {
  constructor() {
    super('Student was changed on another device. Reload it before choosing the next change.')
    this.name = 'StudentVersionConflictError'
  }
}
export class LessonPurchaseVersionConflictError extends Error {
  constructor(readonly currentPurchase: LessonPurchase) {
    super(
      'Lesson Purchase was changed on another device. Reload it before choosing the next change.',
    )
    this.name = 'LessonPurchaseVersionConflictError'
  }
}

export interface StudentRepository {
  resolveWorkspace(identity: AuthenticatedIdentity): Promise<WorkspaceId>
  listStudents(workspaceId: WorkspaceId): Promise<StudentRosterItem[]>
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
  updateLessonPurchase(
    workspaceId: WorkspaceId,
    studentId: string,
    purchaseId: string,
    purchase: UpdatedLessonPurchase,
  ): Promise<LessonPurchase | null>
  deleteLessonPurchase(
    workspaceId: WorkspaceId,
    studentId: string,
    purchaseId: string,
    expectedVersion: number,
  ): Promise<boolean>
  lessonSummary(workspaceId: WorkspaceId, studentId: string): Promise<LessonSummary | null>
  incomeSummary(workspaceId: WorkspaceId): Promise<LessonIncomeSummary[]>
  incomeSummaryForPeriod(
    workspaceId: WorkspaceId,
    startsAt: Date,
    endsAt: Date,
  ): Promise<LessonIncomeSummary[]>
}
