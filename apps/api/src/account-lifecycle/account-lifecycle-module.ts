import type { AuthenticatedIdentity } from '../identity/identity.js'
import {
  deletionRequestSchema,
  type AccountDeletionExecutor,
  type AccountLifecycleStatus,
  type DeletionRequestInput,
} from './account-lifecycle.js'
import type { AccountLifecycleRepository } from './account-lifecycle-repository.js'

const DELETION_GRACE_PERIOD_MS = 14 * 24 * 60 * 60 * 1000

export class AccountLifecycleModule {
  readonly #repository: AccountLifecycleRepository
  readonly #deletionExecutor: AccountDeletionExecutor
  readonly #now: () => Date

  constructor({
    repository,
    deletionExecutor,
    now = () => new Date(),
  }: {
    repository: AccountLifecycleRepository
    deletionExecutor: AccountDeletionExecutor
    now?: () => Date
  }) {
    this.#repository = repository
    this.#deletionExecutor = deletionExecutor
    this.#now = now
  }

  async getStatus(identity: AuthenticatedIdentity): Promise<AccountLifecycleStatus> {
    return this.#repository.getAccountLifecycle(await this.#repository.resolveWorkspace(identity))
  }

  async requestDeletion(
    identity: AuthenticatedIdentity,
    rawInput: DeletionRequestInput,
  ): Promise<AccountLifecycleStatus> {
    deletionRequestSchema.parse(rawInput)
    const requestedAt = this.#now()
    return this.#repository.requestDeletion(
      await this.#repository.resolveWorkspace(identity),
      requestedAt,
      new Date(requestedAt.getTime() + DELETION_GRACE_PERIOD_MS),
    )
  }

  async cancelDeletion(identity: AuthenticatedIdentity): Promise<AccountLifecycleStatus> {
    return this.#repository.cancelDeletion(await this.#repository.resolveWorkspace(identity))
  }

  async deleteImmediately(
    identity: AuthenticatedIdentity,
    rawInput: DeletionRequestInput,
  ): Promise<void> {
    deletionRequestSchema.parse(rawInput)
    await this.#deletionExecutor.deleteCoach(identity.userId)
  }

  async recordActivity(identity: AuthenticatedIdentity): Promise<void> {
    await this.#repository.recordActivity(
      await this.#repository.resolveWorkspace(identity),
      this.#now(),
    )
  }
}
