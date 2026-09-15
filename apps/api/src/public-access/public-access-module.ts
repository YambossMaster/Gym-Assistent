import { createHash, createHmac, randomBytes } from 'node:crypto'
import type { AuthenticatedIdentity } from '../identity/identity.js'
import {
  issueCapabilitySchema,
  PublicCapabilityError,
  PublicRateLimitError,
  redeemCapabilitySchema,
  reissueCapabilitySchema,
  revokeCapabilitySchema,
  tokenIsWellFormed,
} from './public-access.js'
import type { PublicAccessRepository } from './public-access-repository.js'

export class PublicAccessModule {
  constructor(
    private readonly repository: PublicAccessRepository,
    private readonly rateLimitSecret: string,
    private readonly now = () => new Date(),
  ) {}

  async list(identity: AuthenticatedIdentity, sessionId: string) {
    return this.repository.listLinks(
      await this.repository.resolveWorkspace(identity),
      sessionId,
      this.now(),
    )
  }

  async issue(identity: AuthenticatedIdentity, sessionId: string, raw: unknown) {
    const input = issueCapabilitySchema.parse(raw)
    const token = newToken()
    const link = await this.repository.issue(
      await this.repository.resolveWorkspace(identity),
      sessionId,
      { ...input, tokenHash: tokenHash(token) },
      this.now(),
    )
    return link ? { link, token } : null
  }

  async reissue(identity: AuthenticatedIdentity, linkId: string, raw: unknown) {
    const input = reissueCapabilitySchema.parse(raw)
    const token = newToken()
    const link = await this.repository.reissue(
      await this.repository.resolveWorkspace(identity),
      linkId,
      { ...input, tokenHash: tokenHash(token) },
      this.now(),
    )
    return link ? { link, token } : null
  }

  async revoke(identity: AuthenticatedIdentity, linkId: string, raw: unknown) {
    const input = revokeCapabilitySchema.parse(raw)
    return this.repository.revoke(
      await this.repository.resolveWorkspace(identity),
      linkId,
      input.version,
      this.now(),
    )
  }

  async trainingResult(token: string, clientIp: string) {
    const hash = await this.publicRequest('projection', token, clientIp)
    return this.repository.readTraining(hash, this.now())
  }

  async reschedule(token: string, clientIp: string) {
    const hash = await this.publicRequest('projection', token, clientIp)
    return this.repository.readReschedule(hash, this.now())
  }

  async redeem(token: string, clientIp: string, raw: unknown) {
    const input = redeemCapabilitySchema.parse(raw)
    const hash = await this.publicRequest('redemption', token, clientIp)
    return this.repository.redeem(hash, new Date(input.startsAt), this.now())
  }

  private async publicRequest(
    operation: 'projection' | 'redemption',
    token: string,
    clientIp: string,
  ) {
    const now = this.now()
    await this.limit(operation, `ip:${clientIp}`, operation === 'projection' ? 60 : 10, now)
    if (!tokenIsWellFormed(token)) throw new PublicCapabilityError('invalid_link', 404)
    const hash = tokenHash(token)
    await this.limit(operation, `token:${hash}`, operation === 'projection' ? 30 : 5, now)
    return hash
  }

  private async limit(
    operation: 'projection' | 'redemption',
    key: string,
    limit: number,
    now: Date,
  ) {
    const digest = createHmac('sha256', this.rateLimitSecret).update(key).digest('hex')
    const result = await this.repository.consumeRateLimit(operation, digest, limit, now)
    if (!result.allowed) throw new PublicRateLimitError(result.retryAfter)
  }
}

export function newToken() {
  return randomBytes(32).toString('base64url')
}

export function tokenHash(token: string) {
  return createHash('sha256').update(token, 'ascii').digest('hex')
}
