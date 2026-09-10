import type { AuthenticatedIdentity } from '../identity/identity.js'
import type { WorkspaceId } from '../students/student-repository.js'
import type { WorkspaceSettings } from './workspace.js'

export interface NewWorkspaceSettings {
  displayName: string
  timeZone: string
  expectedVersion: number
  now: Date
}

export class WorkspaceVersionConflictError extends Error {
  constructor() {
    super('Workspace settings were updated in another session')
    this.name = 'WorkspaceVersionConflictError'
  }
}

export interface WorkspaceSettingsRepository {
  resolveWorkspace(identity: AuthenticatedIdentity): Promise<WorkspaceId>
  getWorkspaceSettings(workspaceId: WorkspaceId): Promise<WorkspaceSettings>
  updateWorkspaceSettings(
    workspaceId: WorkspaceId,
    settings: NewWorkspaceSettings,
  ): Promise<WorkspaceSettings>
}
