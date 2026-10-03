import { createHmac } from 'node:crypto'
import type { BetaAdmissionRepository, BetaGrant, RedemptionFailure } from './beta-admission.js'

interface Code {
  digest: string
  limit: number
  used: number
  closesAt: Date
  revoked: boolean
}

export class MemoryBetaAdmissionRepository implements BetaAdmissionRepository {
  private readonly codes = new Map<string, Code>()
  private readonly grants = new Map<string, BetaGrant>()
  private readonly redeemed = new Set<string>()
  private readonly buckets = new Map<string, number>()

  constructor(
    private readonly secret: string,
    private readonly now = () => new Date(),
  ) {}

  issueForTest(digest: string, limit: number, closesAt: Date) {
    this.codes.set(digest, { digest, limit, used: 0, closesAt, revoked: false })
  }

  revokeForTest(digest: string) {
    const code = this.codes.get(digest)
    if (code) code.revoked = true
  }

  deleteUserForTest(userId: string) {
    this.grants.delete(userId)
  }

  usageForTest(digest: string) {
    return this.codes.get(digest)?.used ?? 0
  }

  async grant(userId: string): Promise<BetaGrant> {
    const grant = this.grants.get(userId)
    if (!grant) return { state: 'unactivated' }
    if (grant.state === 'promotional' && new Date(grant.endsAt) <= this.now())
      return { ...grant, state: 'free' }
    return grant
  }

  async redeem(input: {
    userId: string
    verifiedEmail: string
    codeDigest: string
    disclosureVersion: string
    now: Date
    endsAt: Date
  }): Promise<BetaGrant | RedemptionFailure> {
    const existing = await this.grant(input.userId)
    if (existing.state !== 'unactivated') return existing
    const code = this.codes.get(input.codeDigest)
    if (!code) return 'invalid_code'
    if (code.revoked || code.closesAt <= input.now) return 'code_closed'
    if (code.used >= code.limit) return 'code_exhausted'
    const fingerprint = createHmac('sha256', this.secret)
      .update(`${code.digest}:${input.verifiedEmail}`)
      .digest('hex')
    if (this.redeemed.has(fingerprint)) return 'already_used'
    this.redeemed.add(fingerprint)
    code.used += 1
    const grant: BetaGrant = {
      state: 'promotional',
      startedAt: input.now.toISOString(),
      endsAt: input.endsAt.toISOString(),
    }
    this.grants.set(input.userId, grant)
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
