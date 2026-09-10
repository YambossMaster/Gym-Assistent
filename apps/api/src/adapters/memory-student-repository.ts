import { randomUUID } from 'node:crypto'
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

export class MemoryStudentRepository
  implements StudentRepository, WorkspaceSettingsRepository, AccountLifecycleRepository
{
  readonly #workspaceByIdentity = new Map<string, WorkspaceId>()
  readonly #studentsByWorkspace = new Map<WorkspaceId, Student[]>()
  readonly #settingsByWorkspace = new Map<WorkspaceId, WorkspaceSettings>()
  readonly #lifecycleByWorkspace = new Map<WorkspaceId, AccountLifecycleStatus>()

  async resolveWorkspace(identity: AuthenticatedIdentity): Promise<WorkspaceId> {
    const key = identity.userId
    const existing = this.#workspaceByIdentity.get(key)
    if (existing) return existing

    const workspaceId = randomUUID()
    this.#workspaceByIdentity.set(key, workspaceId)
    this.#studentsByWorkspace.set(workspaceId, [])
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
