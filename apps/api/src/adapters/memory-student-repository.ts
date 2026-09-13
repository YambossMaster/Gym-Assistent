import { randomUUID } from 'node:crypto'
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

export class MemoryStudentRepository
  implements StudentRepository, WorkspaceSettingsRepository, AccountLifecycleRepository
{
  readonly #workspaceByIdentity = new Map<string, WorkspaceId>()
  readonly #studentsByWorkspace = new Map<WorkspaceId, Student[]>()
  readonly #purchasesByWorkspace = new Map<WorkspaceId, Map<string, LessonPurchase[]>>()
  readonly #completedSessionsByWorkspace = new Map<WorkspaceId, Map<string, number>>()
  readonly #settingsByWorkspace = new Map<WorkspaceId, WorkspaceSettings>()
  readonly #lifecycleByWorkspace = new Map<WorkspaceId, AccountLifecycleStatus>()

  async resolveWorkspace(identity: AuthenticatedIdentity): Promise<WorkspaceId> {
    const key = identity.userId
    const existing = this.#workspaceByIdentity.get(key)
    if (existing) return existing

    const workspaceId = randomUUID()
    this.#workspaceByIdentity.set(key, workspaceId)
    this.#studentsByWorkspace.set(workspaceId, [])
    this.#purchasesByWorkspace.set(workspaceId, new Map())
    this.#completedSessionsByWorkspace.set(workspaceId, new Map())
    this.#settingsByWorkspace.set(workspaceId, {
      displayName: '我的工作台',
      timeZone: 'Asia/Taipei',
      version: 1,
      updatedAt: new Date(0).toISOString(),
    })
    this.#lifecycleByWorkspace.set(workspaceId, { deletionDueAt: null })
    return workspaceId
  }

  async getAccountLifecycle(workspaceId: WorkspaceId): Promise<AccountLifecycleStatus> {
    const lifecycle = this.#lifecycleByWorkspace.get(workspaceId)
    if (!lifecycle) throw new Error('Workspace does not exist')
    return { ...lifecycle }
  }

  async requestDeletion(
    _workspaceId: WorkspaceId,
    _requestedAt: Date,
    dueAt: Date,
  ): Promise<AccountLifecycleStatus> {
    const lifecycle = this.#lifecycleByWorkspace.get(_workspaceId)
    if (!lifecycle) throw new Error('Workspace does not exist')
    const next = { deletionDueAt: dueAt.toISOString() }
    this.#lifecycleByWorkspace.set(_workspaceId, next)
    return { ...next }
  }

  async cancelDeletion(workspaceId: WorkspaceId): Promise<AccountLifecycleStatus> {
    if (!this.#lifecycleByWorkspace.has(workspaceId)) throw new Error('Workspace does not exist')
    const next = { deletionDueAt: null }
    this.#lifecycleByWorkspace.set(workspaceId, next)
    return { ...next }
  }

  async recordActivity(workspaceId: WorkspaceId, _now: Date): Promise<void> {
    if (!this.#lifecycleByWorkspace.has(workspaceId)) throw new Error('Workspace does not exist')
  }

  async getWorkspaceSettings(workspaceId: WorkspaceId): Promise<WorkspaceSettings> {
    const settings = this.#settingsByWorkspace.get(workspaceId)
    if (!settings) throw new Error('Workspace does not exist')
    return { ...settings }
  }

  async updateWorkspaceSettings(
    workspaceId: WorkspaceId,
    input: NewWorkspaceSettings,
  ): Promise<WorkspaceSettings> {
    const current = this.#settingsByWorkspace.get(workspaceId)
    if (!current) throw new Error('Workspace does not exist')
    if (current.version !== input.expectedVersion) throw new WorkspaceVersionConflictError()
    const settings = {
      displayName: input.displayName,
      timeZone: input.timeZone,
      version: current.version + 1,
      updatedAt: input.now.toISOString(),
    }
    this.#settingsByWorkspace.set(workspaceId, settings)
    return { ...settings }
  }

  async listStudents(workspaceId: WorkspaceId) {
    return Promise.all(
      (this.#studentsByWorkspace.get(workspaceId) ?? []).map(async (student) => ({
        ...student,
        lessonSummary: (await this.lessonSummary(workspaceId, student.id))!,
      })),
    )
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

  async updateLessonPurchase(
    workspaceId: WorkspaceId,
    studentId: string,
    purchaseId: string,
    input: UpdatedLessonPurchase,
  ): Promise<LessonPurchase | null> {
    const purchases = this.#purchasesByWorkspace.get(workspaceId)?.get(studentId)
    const index = purchases?.findIndex((purchase) => purchase.id === purchaseId) ?? -1
    if (index < 0 || !purchases) return null
    const current = purchases[index]
    if (!current) return null
    if (current.version !== input.expectedVersion)
      throw new LessonPurchaseVersionConflictError(copyPurchase(current))
    const next: LessonPurchase = {
      ...current,
      purchasedAt: input.purchasedAt.toISOString(),
      lessonCount: input.lessonCount,
      amountMinor: input.amountMinor,
      currency: input.currency,
      privateNote: input.privateNote,
      version: current.version + 1,
      updatedAt: input.now.toISOString(),
    }
    purchases[index] = next
    return copyPurchase(next)
  }

  async deleteLessonPurchase(
    workspaceId: WorkspaceId,
    studentId: string,
    purchaseId: string,
    expectedVersion: number,
  ): Promise<boolean> {
    const purchases = this.#purchasesByWorkspace.get(workspaceId)?.get(studentId)
    const index = purchases?.findIndex((purchase) => purchase.id === purchaseId) ?? -1
    if (index < 0 || !purchases) return false
    const current = purchases[index]
    if (!current) return false
    if (current.version !== expectedVersion)
      throw new LessonPurchaseVersionConflictError(copyPurchase(current))
    purchases.splice(index, 1)
    return true
  }

  async getStudentDetail(
    workspaceId: WorkspaceId,
    studentId: string,
  ): Promise<StudentDetail | null> {
    const student = this.#studentsByWorkspace
      .get(workspaceId)
      ?.find((item) => item.id === studentId)
    if (!student) return null
    const purchases = this.#purchasesByWorkspace.get(workspaceId)?.get(studentId) ?? []
    const lessonSummary = await this.lessonSummary(workspaceId, studentId)
    if (!lessonSummary) return null
    return { student: { ...student }, purchases: purchases.map(copyPurchase), lessonSummary }
  }

  async updateStudent(
    workspaceId: WorkspaceId,
    studentId: string,
    input: UpdatedStudent,
  ): Promise<Student | null> {
    const students = this.#studentsByWorkspace.get(workspaceId)
    const index = students?.findIndex((item) => item.id === studentId) ?? -1
    if (index < 0 || !students) return null
    const current = students[index]
    if (!current) return null
    if (current.version !== input.expectedVersion) throw new StudentVersionConflictError()
    const next: Student = {
      id: current.id,
      name: input.name,
      phone: input.phone,
      goal: input.goal,
      privateNote: input.privateNote,
      active: input.active,
      lineLinked: input.lineLinked,
      version: current.version + 1,
      createdAt: current.createdAt,
      updatedAt: input.now.toISOString(),
    }
    students[index] = next
    return { ...next }
  }

  async deleteStudent(
    workspaceId: WorkspaceId,
    studentId: string,
    expectedVersion: number,
  ): Promise<boolean> {
    const students = this.#studentsByWorkspace.get(workspaceId)
    const index = students?.findIndex((item) => item.id === studentId) ?? -1
    if (index < 0 || !students) return false
    const current = students[index]
    if (!current) return false
    if (current.version !== expectedVersion) throw new StudentVersionConflictError()
    students.splice(index, 1)
    this.#purchasesByWorkspace.get(workspaceId)?.delete(studentId)
    this.#completedSessionsByWorkspace.get(workspaceId)?.delete(studentId)
    return true
  }

  async createLessonPurchase(
    workspaceId: WorkspaceId,
    studentId: string,
    input: NewLessonPurchase,
  ): Promise<LessonPurchase | null> {
    if (!this.#studentsByWorkspace.get(workspaceId)?.some((student) => student.id === studentId))
      return null
    const timestamp = input.now.toISOString()
    const purchase: LessonPurchase = {
      id: input.id,
      purchasedAt: input.purchasedAt.toISOString(),
      lessonCount: input.lessonCount,
      amountMinor: input.amountMinor,
      currency: input.currency,
      privateNote: input.privateNote,
      version: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    const byStudent = this.#purchasesByWorkspace.get(workspaceId)
    if (!byStudent) throw new Error('Workspace does not exist')
    byStudent.set(studentId, [...(byStudent.get(studentId) ?? []), purchase])
    return copyPurchase(purchase)
  }

  async lessonSummary(workspaceId: WorkspaceId, studentId: string): Promise<LessonSummary | null> {
    if (!this.#studentsByWorkspace.get(workspaceId)?.some((student) => student.id === studentId))
      return null
    const purchased = (this.#purchasesByWorkspace.get(workspaceId)?.get(studentId) ?? []).reduce(
      (total, purchase) => total + purchase.lessonCount,
      0,
    )
    const completed = this.#completedSessionsByWorkspace.get(workspaceId)?.get(studentId) ?? 0
    return { purchased, completed, remaining: purchased - completed }
  }

  async incomeSummary(workspaceId: WorkspaceId): Promise<LessonIncomeSummary[]> {
    const grouped = new Map<string, number>()
    for (const purchases of this.#purchasesByWorkspace.get(workspaceId)?.values() ?? []) {
      for (const purchase of purchases)
        grouped.set(purchase.currency, (grouped.get(purchase.currency) ?? 0) + purchase.amountMinor)
    }
    return incomeRows(grouped)
  }

  async incomeSummaryForPeriod(
    workspaceId: WorkspaceId,
    startsAt: Date,
    endsAt: Date,
  ): Promise<LessonIncomeSummary[]> {
    const grouped = new Map<string, number>()
    for (const purchases of this.#purchasesByWorkspace.get(workspaceId)?.values() ?? []) {
      for (const purchase of purchases) {
        const purchasedAt = new Date(purchase.purchasedAt)
        if (purchasedAt >= startsAt && purchasedAt < endsAt)
          grouped.set(
            purchase.currency,
            (grouped.get(purchase.currency) ?? 0) + purchase.amountMinor,
          )
      }
    }
    return incomeRows(grouped)
  }

  // Test seam for M3's derived entitlement. M4 owns session creation and transitions.
  recordCompletedSessionForTest(workspaceId: WorkspaceId, studentId: string): void {
    const sessions = this.#completedSessionsByWorkspace.get(workspaceId)
    if (!sessions) throw new Error('Workspace does not exist')
    sessions.set(studentId, (sessions.get(studentId) ?? 0) + 1)
  }
}

function copyPurchase(purchase: LessonPurchase): LessonPurchase {
  return { ...purchase }
}

function incomeRows(grouped: Map<string, number>): LessonIncomeSummary[] {
  return [...grouped]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amountMinor]) => ({ currency, amountMinor }))
}
