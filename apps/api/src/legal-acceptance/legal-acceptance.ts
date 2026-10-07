import { z } from 'zod'
import type { AuthenticatedIdentity } from '../identity/identity.js'

export const CURRENT_TERMS_VERSION = '2026-10-07-alpha'
export const CURRENT_PRIVACY_VERSION = '2026-10-07-alpha'

export interface LegalAcceptanceStatus {
  accepted: boolean
  termsVersion: string
  privacyVersion: string
  acceptedAt: string | null
}

export interface LegalAcceptanceRepository {
  status(userId: string, termsVersion: string, privacyVersion: string): Promise<string | null>
  accept(input: {
    userId: string
    termsVersion: string
    privacyVersion: string
    source: 'web'
    acceptedAt: Date
  }): Promise<string>
}

export class LegalAcceptanceError extends Error {
  constructor(readonly reason: 'version_mismatch' | 'explicit_acceptance_required') {
    super(reason)
  }
}

const acceptanceSchema = z.object({
  termsVersion: z.literal(CURRENT_TERMS_VERSION),
  privacyVersion: z.literal(CURRENT_PRIVACY_VERSION),
  accepted: z.literal(true),
})

export class LegalAcceptanceModule {
  constructor(
    private readonly repository: LegalAcceptanceRepository,
    private readonly now = () => new Date(),
  ) {}

  async status(identity: AuthenticatedIdentity): Promise<LegalAcceptanceStatus> {
    const acceptedAt = await this.repository.status(
      identity.userId,
      CURRENT_TERMS_VERSION,
      CURRENT_PRIVACY_VERSION,
    )
    return {
      accepted: acceptedAt !== null,
      termsVersion: CURRENT_TERMS_VERSION,
      privacyVersion: CURRENT_PRIVACY_VERSION,
      acceptedAt,
    }
  }

  async accept(identity: AuthenticatedIdentity, raw: unknown): Promise<LegalAcceptanceStatus> {
    const parsed = acceptanceSchema.safeParse(raw)
    if (!parsed.success) {
      const input = raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
      const versionMismatch =
        input.termsVersion !== CURRENT_TERMS_VERSION ||
        input.privacyVersion !== CURRENT_PRIVACY_VERSION
      throw new LegalAcceptanceError(
        versionMismatch ? 'version_mismatch' : 'explicit_acceptance_required',
      )
    }
    const acceptedAt = await this.repository.accept({
      userId: identity.userId,
      termsVersion: parsed.data.termsVersion,
      privacyVersion: parsed.data.privacyVersion,
      source: 'web',
      acceptedAt: this.now(),
    })
    return {
      accepted: true,
      termsVersion: parsed.data.termsVersion,
      privacyVersion: parsed.data.privacyVersion,
      acceptedAt,
    }
  }
}
