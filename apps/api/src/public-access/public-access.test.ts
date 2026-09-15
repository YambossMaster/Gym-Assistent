import { describe, expect, it } from 'vitest'
import { PublicAccessModule, newToken, tokenHash } from './public-access-module.js'
import {
  linkStatus,
  PublicCapabilityError,
  PublicRateLimitError,
  tokenIsWellFormed,
  type CapabilityLinkMetadata,
} from './public-access.js'
import type { PublicAccessRepository } from './public-access-repository.js'

const identity = { userId: '00000000-0000-4000-8000-000000000001' }
const now = new Date('2026-09-15T03:00:00.000Z')
const metadata: CapabilityLinkMetadata = {
  id: '10000000-0000-4000-8000-000000000001',
  purpose: 'training_result',
  status: 'active',
  expiresAt: new Date('2026-09-16T03:00:00.000Z'),
  includeTrainingNote: false,
  createdAt: now,
  version: 1,
  allowedActions: { canReissue: true, canRevoke: true },
}

class FakeRepository implements PublicAccessRepository {
  rateCalls: Array<{ operation: string; keyHash: string; limit: number }> = []
  lastTokenHash = ''
  denyRate = false
  resolveWorkspace = async () => 'workspace-1'
  listLinks = async () => [metadata]
  issue = async (_workspace: string, _session: string, input: { tokenHash: string }) => {
    this.lastTokenHash = input.tokenHash
    return metadata
  }
  reissue = async (_workspace: string, _link: string, input: { tokenHash: string }) => {
    this.lastTokenHash = input.tokenHash
    return metadata
  }
  revoke = async () => ({ ...metadata, status: 'revoked' as const })
  readTraining = async (hash: string) => {
    this.lastTokenHash = hash
    return {
      coachDisplayName: 'FORM',
      studentDisplayName: '品妤',
      session: {
        startsAt: now,
        endsAt: new Date(now.getTime() + 3_600_000),
        timeZone: 'Asia/Taipei',
        durationMinutes: 60,
      },
      exercises: [],
    }
  }
  readReschedule = async () => ({
    coachDisplayName: 'FORM',
    studentDisplayName: '品妤',
    timeZone: 'Asia/Taipei',
    expiresAt: new Date(now.getTime() + 86_400_000),
    originalSession: {
      startsAt: new Date(now.getTime() + 86_400_000),
      endsAt: new Date(now.getTime() + 90_000_000),
      durationMinutes: 60,
    },
    slots: [],
  })
  redeem = async () => ({
    reschedule: await this.readReschedule(),
    used: { coachDisplayName: 'FORM', timeZone: 'Asia/Taipei', redeemedStartsAt: now },
  })
  consumeRateLimit = async (
    operation: 'projection' | 'redemption',
    keyHash: string,
    limit: number,
  ) => {
    this.rateCalls.push({ operation, keyHash, limit })
    return { allowed: !this.denyRate, retryAfter: 45 }
  }
}

describe('public capability domain', () => {
  it('generates a 256-bit base64url token and a digest without retaining the token', async () => {
    const repository = new FakeRepository()
    const module = new PublicAccessModule(repository, 'x'.repeat(32), () => now)
    const issued = await module.issue(identity, 'session-1', {
      purpose: 'training_result',
      includeTrainingNote: false,
    })
    expect(issued?.token).toHaveLength(43)
    expect(tokenIsWellFormed(issued!.token)).toBe(true)
    expect(repository.lastTokenHash).toBe(tokenHash(issued!.token))
    expect(repository.lastTokenHash).not.toContain(issued!.token)
  })

  it('applies revoked, used, expired, and active precedence', () => {
    const expiresAt = new Date(now.getTime() + 1_000)
    expect(linkStatus({ expiresAt, revokedAt: now, usedAt: now }, now)).toBe('revoked')
    expect(linkStatus({ expiresAt, revokedAt: null, usedAt: now }, now)).toBe('used')
    expect(linkStatus({ expiresAt: now, revokedAt: null, usedAt: null }, now)).toBe('expired')
    expect(linkStatus({ expiresAt, revokedAt: null, usedAt: null }, now)).toBe('active')
  })

  it('counts malformed tokens against IP limits but never performs a token lookup', async () => {
    const repository = new FakeRepository()
    const module = new PublicAccessModule(repository, 'x'.repeat(32), () => now)
    await expect(module.trainingResult('bad', '127.0.0.1')).rejects.toMatchObject({
      reason: 'invalid_link',
      statusCode: 404,
    })
    expect(repository.rateCalls).toHaveLength(1)
    expect(repository.lastTokenHash).toBe('')
  })

  it('uses independent IP and token digest rate buckets with frozen limits', async () => {
    const repository = new FakeRepository()
    const module = new PublicAccessModule(repository, 'x'.repeat(32), () => now)
    const token = newToken()
    await module.trainingResult(token, '127.0.0.1')
    expect(repository.rateCalls.map((call) => [call.operation, call.limit])).toEqual([
      ['projection', 60],
      ['projection', 30],
    ])
    expect(repository.rateCalls[0]!.keyHash).not.toBe(repository.rateCalls[1]!.keyHash)
  })

  it('surfaces Retry-After state and validates note consent by purpose', async () => {
    const repository = new FakeRepository()
    const module = new PublicAccessModule(repository, 'x'.repeat(32), () => now)
    repository.denyRate = true
    await expect(module.trainingResult(newToken(), '127.0.0.1')).rejects.toBeInstanceOf(
      PublicRateLimitError,
    )
    await expect(
      module.issue(identity, 'session-1', {
        purpose: 'reschedule_session',
        includeTrainingNote: true,
      }),
    ).rejects.toBeTruthy()
  })

  it('never accepts a wrong-length token as a public capability', () => {
    expect(tokenIsWellFormed('a'.repeat(42))).toBe(false)
    expect(tokenIsWellFormed('a'.repeat(43))).toBe(true)
    expect(new PublicCapabilityError('invalid_link', 404).message).toBe('invalid_link')
  })
})
