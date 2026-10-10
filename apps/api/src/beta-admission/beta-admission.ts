import { createHash, createHmac, randomBytes } from 'node:crypto'
import type { AuthenticatedIdentity } from '../identity/identity.js'

const PERIOD_MS = 60 * 24 * 60 * 60 * 1000

export type BetaGrant =
  | { state: 'promotional'; startedAt: string; endsAt: string }
  | { state: 'free'; startedAt?: string; endsAt?: string }
  | { state: 'permanent'; startedAt: string }

export type RedemptionFailure =
  | 'invalid_code'
  | 'code_closed'
  | 'code_exhausted'
  | 'already_used'
  | 'already_eligible'

export class BetaAdmissionError extends Error {
  constructor(
    readonly reason: RedemptionFailure | 'email_unverified',
    readonly statusCode = 400,
  ) {
    super(reason)
  }
}

export class BetaRedemptionRateError extends Error {
  constructor(readonly retryAfter: number) {
    super('Too many redemption attempts')
  }
}

export interface BetaAdmissionRepository {
  grant(userId: string): Promise<BetaGrant>
  redeem(input: {
    userId: string
    verifiedEmail: string
    codeDigest: string
    now: Date
    endsAt: Date
  }): Promise<BetaGrant | RedemptionFailure>
  consumeRateLimit(
    kind: 'identity' | 'ip',
    digest: string,
    limit: number,
    now: Date,
  ): Promise<{ allowed: boolean; retryAfter: number }>
}

export interface VerifiedCoachEmail {
  getVerifiedEmail(userId: string): Promise<string | null>
}

export class BetaAdmissionModule {
  constructor(
    private readonly repository: BetaAdmissionRepository,
    private readonly verifiedEmail: VerifiedCoachEmail,
    private readonly secret: string,
    private readonly now = () => new Date(),
  ) {}

  status(identity: AuthenticatedIdentity): Promise<BetaGrant> {
    return this.repository.grant(identity.userId)
  }

  async redeem(
    identity: AuthenticatedIdentity,
    clientIp: string,
    raw: unknown,
    alreadyThrottled = false,
  ): Promise<BetaGrant> {
    const now = this.now()
    if (!alreadyThrottled) await this.throttle(identity, clientIp, now)
    const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
    const email = await this.verifiedEmail.getVerifiedEmail(identity.userId)
    if (!email) throw new BetaAdmissionError('email_unverified', 403)
    if (typeof input.code !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(input.code))
      throw new BetaAdmissionError('invalid_code')
    const result = await this.repository.redeem({
      userId: identity.userId,
      verifiedEmail: email.trim().toLowerCase(),
      codeDigest: codeDigest(input.code),
      now,
      endsAt: new Date(now.getTime() + PERIOD_MS),
    })
    if (typeof result === 'string') throw new BetaAdmissionError(result)
    return result
  }

  async throttle(
    identity: AuthenticatedIdentity,
    clientIp: string,
    now = this.now(),
  ): Promise<void> {
    await this.limit('identity', identity.userId, 5, now)
    await this.limit('ip', clientIp, 30, now)
  }

  private async limit(kind: 'identity' | 'ip', subject: string, count: number, now: Date) {
    const digest = createHmac('sha256', this.secret).update(`${kind}:${subject}`).digest('hex')
    const result = await this.repository.consumeRateLimit(kind, digest, count, now)
    if (!result.allowed) throw new BetaRedemptionRateError(result.retryAfter)
  }
}

export function newBetaCode(): string {
  return randomBytes(32).toString('base64url')
}

export function codeDigest(code: string): string {
  return createHash('sha256').update(code, 'ascii').digest('hex')
}
