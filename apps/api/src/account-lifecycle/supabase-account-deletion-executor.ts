import type { AccountDeletionExecutor } from './account-lifecycle.js'

export class AccountDeletionUnavailableError extends Error {
  constructor() {
    super('Account deletion is not configured')
  }
}

export class SupabaseAccountDeletionExecutor implements AccountDeletionExecutor {
  readonly #baseUrl: string
  readonly #secretKey: string | undefined
  readonly #fetch: typeof fetch

  constructor({
    supabaseUrl,
    secretKey,
    fetchImplementation = fetch,
  }: {
    supabaseUrl: string
    secretKey: string | undefined
    fetchImplementation?: typeof fetch
  }) {
    this.#baseUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/users`
    this.#secretKey = secretKey
    this.#fetch = fetchImplementation
  }

  async deleteCoach(userId: string): Promise<void> {
    if (!this.#secretKey) throw new AccountDeletionUnavailableError()
    const url = `${this.#baseUrl}/${encodeURIComponent(userId)}`
    const headers = { apikey: this.#secretKey, authorization: `Bearer ${this.#secretKey}` }
    const revoke = await this.#fetch(`${url}/logout`, { method: 'POST', headers })
    if (!revoke.ok && revoke.status !== 404) throw new Error('Could not revoke account sessions')
    const deletion = await this.#fetch(url, { method: 'DELETE', headers })
    if (!deletion.ok) throw new Error('Could not permanently delete account')
  }
}
