import { createHmac } from 'node:crypto'
import type { BetaAdmissionRepository, BetaGrant, RedemptionFailure } from './beta-admission.js'

interface Code {
  digest: string
  kind: 'promotional' | 'permanent' | 'tester'
  limit: number | null
  used: number
  closesAt: Date
  revoked: boolean
}

export class MemoryBetaAdmissionRepository implements BetaAdmissionRepository {
  private readonly codes = new Map<string, Code>()
  private readonly grants = new Map<string, BetaGrant>()
  private readonly grantCodes = new Map<string, string>()
  private readonly redeemed = new Set<string>()
  private readonly buckets = new Map<string, number>()

  constructor(
    private readonly secret: string,
    private readonly now = () => new Date(),
  ) {}

  issueForTest(
    digest: string,
    limit: number | null,
    closesAt: Date,
    kind: Code['kind'] = 'promotional',
  ) {
    this.codes.set(digest, { digest, kind, limit, used: 0, closesAt, revoked: false })
  }

  revokeForTest(digest: string) {
    const code = this.codes.get(digest)
    if (code) code.revoked = true
  }

  deleteUserForTest(userId: string) {
    this.grants.delete(userId)
    this.grantCodes.delete(userId)
  }

  usageForTest(digest: string) {
    return this.codes.get(digest)?.used ?? 0
  }

  async grant(userId: string): Promise<BetaGrant> {
    const grant = this.grants.get(userId)
    if (!grant) return { state: 'free' }
    if (grant.state === 'promotional' && new Date(grant.endsAt) <= this.now())
      return { ...grant, state: 'free' }
    return grant
  }

  async redeem(input: {
    userId: string
    verifiedEmail: string
    codeDigest: string
    now: Date
    endsAt: Date
  }): Promise<BetaGrant | RedemptionFailure> {
    const existing = await this.grant(input.userId)
    if (this.grants.has(input.userId))
      return this.grantCodes.get(input.userId) === input.codeDigest ? existing : 'already_eligible'
    const code = this.codes.get(input.codeDigest)
    if (!code) return 'invalid_code'
    if (code.revoked || code.closesAt <= input.now) return 'code_closed'
    if (code.limit !== null && code.used >= code.limit) return 'code_exhausted'
    const fingerprint = createHmac('sha256', this.secret)
      .update(`${code.digest}:${input.verifiedEmail}`)
      .digest('hex')
    if (this.redeemed.has(fingerprint)) return 'already_used'
    this.redeemed.add(fingerprint)
    code.used += 1
    const grant: BetaGrant =
      code.kind === 'promotional'
        ? {
            state: 'promotional',
            startedAt: input.now.toISOString(),
            endsAt: input.endsAt.toISOString(),
          }
        : { state: code.kind, startedAt: input.now.toISOString() }
    this.grants.set(input.userId, grant)
    this.grantCodes.set(input.userId, input.codeDigest)
    return grant
  }

  async consumeRateLimit(kind: 'identity' | 'ip', digest: string, limit: number, now: Date) {
    const bucket = Math.floor(now.getTime() / 300_000)
    const key = `${kind}:${digest}:${bucket}`
    const count = (this.buckets.get(key) ?? 0) + 1
    this.buckets.set(key, count)
    return {
      allowed: count <= limit,
      retryAfter: Math.max(1, Math.ceil(((bucket + 1) * 300_000 - now.getTime()) / 1000)),
    }
  }
}
