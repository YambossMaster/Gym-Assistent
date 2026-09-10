import type { AuthenticatedIdentity } from '../identity/identity.js'
import {
  updateWorkspaceSettingsSchema,
  type UpdateWorkspaceSettingsInput,
  type WorkspaceSettings,
} from './workspace.js'
import type { WorkspaceSettingsRepository } from './workspace-repository.js'

export interface WorkspaceModuleDependencies {
  repository: WorkspaceSettingsRepository
  now?: () => Date
}

export class WorkspaceModule {
  readonly #repository: WorkspaceSettingsRepository
  readonly #now: () => Date

  constructor({ repository, now = () => new Date() }: WorkspaceModuleDependencies) {
    this.#repository = repository
    this.#now = now
  }

  async getSettings(identity: AuthenticatedIdentity): Promise<WorkspaceSettings> {
    const workspaceId = await this.#repository.resolveWorkspace(identity)
    return this.#repository.getWorkspaceSettings(workspaceId)
  }

  async updateSettings(
    identity: AuthenticatedIdentity,
    rawInput: UpdateWorkspaceSettingsInput,
  ): Promise<WorkspaceSettings> {
    const input = updateWorkspaceSettingsSchema.parse(rawInput)
    const workspaceId = await this.#repository.resolveWorkspace(identity)
    return this.#repository.updateWorkspaceSettings(workspaceId, {
      displayName: input.displayName,
      timeZone: input.timeZone,
      expectedVersion: input.version,
      now: this.#now(),
    })
  }
}
