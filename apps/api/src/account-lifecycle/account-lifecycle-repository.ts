import type { AuthenticatedIdentity } from '../identity/identity.js'
import type { WorkspaceId } from '../students/student-repository.js'
import type { AccountLifecycleStatus } from './account-lifecycle.js'

export interface AccountLifecycleRepository {
  resolveWorkspace(identity: AuthenticatedIdentity): Promise<WorkspaceId>
  getAccountLifecycle(workspaceId: WorkspaceId): Promise<AccountLifecycleStatus>
  requestDeletion(
    workspaceId: WorkspaceId,
    requestedAt: Date,
    dueAt: Date,
  ): Promise<AccountLifecycleStatus>
  cancelDeletion(workspaceId: WorkspaceId): Promise<AccountLifecycleStatus>
  recordActivity(workspaceId: WorkspaceId, now: Date): Promise<void>
}
