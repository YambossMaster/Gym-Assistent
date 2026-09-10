import { type RegistrationEmailLookup } from './registration-email-lookup.js'

interface SupabaseUserPage {
  users?: Array<{ email?: string | null }>
}

/**
 * This intentionally exposes whether an email exists because the approved M2
 * signup UX explicitly tells a coach that an account is already registered.
 * Keep the secret key in the API process only.
 */
export class SupabaseRegistrationEmailLookup implements RegistrationEmailLookup {
  constructor(
    private readonly options: { supabaseUrl: string; secretKey?: string; fetch?: typeof fetch },
  ) {}

  async isRegistered(email: string): Promise<boolean> {
    if (!this.options.secretKey) throw new RegistrationLookupUnavailableError()

    const normalizedEmail = email.trim().toLowerCase()
    const request = this.options.fetch ?? fetch
    const baseUrl = this.options.supabaseUrl.replace(/\/$/, '')

    for (let page = 1; page <= 100; page += 1) {
      const response = await request(`${baseUrl}/auth/v1/admin/users?page=${page}&per_page=1000`, {
        headers: {
          apikey: this.options.secretKey,
          authorization: `Bearer ${this.options.secretKey}`,
        },
      })
      if (!response.ok) throw new RegistrationLookupUnavailableError()

      const body = (await response.json()) as SupabaseUserPage
      const users = body.users ?? []
      if (users.some((user) => user.email?.trim().toLowerCase() === normalizedEmail)) return true
      if (users.length < 1000) return false
    }

    throw new RegistrationLookupUnavailableError()
  }
}

export class RegistrationLookupUnavailableError extends Error {
  constructor() {
    super('Registration lookup is temporarily unavailable')
    this.name = 'RegistrationLookupUnavailableError'
  }
}
