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
  kind: Student['kind']
  memberIds: string[]
  name: string
  phone: string
  goal: string
  privateNote: string
  ageRange: Student['ageRange']
  defaultVenueId: string | null
  singleLessonPrice: Student['singleLessonPrice']
  active: boolean
  lineLinked: boolean
  now: Date
}

export interface UpdatedStudent
  extends Omit<
    NewStudent,
    'id' | 'kind' | 'memberIds' | 'ageRange' | 'defaultVenueId' | 'singleLessonPrice'
  > {
  ageRange?: Student['ageRange'] | undefined
  defaultVenueId?: string | null | undefined
  singleLessonPrice?: Student['singleLessonPrice'] | undefined
  memberIds?: string[] | undefined
  expectedVersion: number
}

export interface NewLessonPurchase {
  collectionMode?: 'coach' | 'venue'
  venueId?: string | null
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
  constructor(
    readonly currentStudent?: Student,
    readonly currentMemberIds?: string[],
    readonly affectedSessions?: { id: string; status: string; version: number }[],
  ) {
    super('Student was changed on another device. Reload it before choosing the next change.')
    this.name = 'StudentVersionConflictError'
  }
}

export class StudentGroupMemberError extends Error {
  constructor() {
    super('群組成員必須是此教練名下使用中的學生。')
    this.name = 'StudentGroupMemberError'
  }
}

export class StudentGroupDraftConflictError extends Error {
  constructor(readonly sessionIds: string[]) {
    super('未來課已有被移出成員的訓練草稿；請先處理該課的組數。')
    this.name = 'StudentGroupDraftConflictError'
  }
}

export class StudentHasHistoryError extends Error {
  constructor() {
    super('此學生或群組已有正式紀錄，請改用封存。')
    this.name = 'StudentHasHistoryError'
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
export class LessonPurchaseAllocationConflictError extends Error {
  constructor(
    readonly currentPurchase: LessonPurchase,
    readonly sessionIds: string[],
  ) {
    super('這筆購課已用於完成的課堂；目前變更會使已固定的堂數來源失效。')
    this.name = 'LessonPurchaseAllocationConflictError'
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
