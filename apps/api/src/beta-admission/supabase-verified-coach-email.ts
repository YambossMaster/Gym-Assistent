import type { VerifiedCoachEmail } from './beta-admission.js'

interface AdminUser {
  id?: string
  email?: string | null
  email_confirmed_at?: string | null
}

export class SupabaseVerifiedCoachEmail implements VerifiedCoachEmail {
  constructor(
    private readonly url: string,
    private readonly secretKey: string,
    private readonly request: typeof fetch = fetch,
  ) {}

  async getVerifiedEmail(userId: string): Promise<string | null> {
    const response = await this.request(
      `${this.url.replace(/\/$/, '')}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
      {
        headers: {
          apikey: this.secretKey,
          authorization: `Bearer ${this.secretKey}`,
        },
      },
    )
    if (!response.ok) throw new Error('Could not verify Coach Email')
    const user = (await response.json()) as AdminUser
    if (user.id !== userId || !user.email_confirmed_at || !user.email) return null
    return user.email
  }
}
