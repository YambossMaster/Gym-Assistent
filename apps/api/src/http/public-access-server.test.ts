import { afterEach, describe, expect, it } from 'vitest'
import { AccountLifecycleModule } from '../account-lifecycle/account-lifecycle-module.js'
import { MemoryStudentRepository } from '../adapters/memory-student-repository.js'
import { DevelopmentIdentityVerifier } from '../identity/development-identity.js'
import { PublicAccessModule, newToken } from '../public-access/public-access-module.js'
import type { PublicAccessRepository } from '../public-access/public-access-repository.js'
import type { CapabilityLinkMetadata } from '../public-access/public-access.js'
import { StudentModule } from '../students/student-module.js'
import { TodayModule } from '../today/today-module.js'
import { WorkspaceModule } from '../workspace/workspace-module.js'
import { buildServer } from './server.js'

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
class PublicRepository implements PublicAccessRepository {
  resolveWorkspace = async () => 'workspace-1'
  listLinks = async () => [metadata]
  issue = async () => metadata
  reissue = async () => metadata
  revoke = async () => ({ ...metadata, status: 'revoked' as const })
  readTraining = async () => ({
    coachDisplayName: 'FORM',
    studentDisplayName: '品妤',
    session: {
      startsAt: now,
      endsAt: new Date(now.getTime() + 3_600_000),
      timeZone: 'Asia/Taipei',
      durationMinutes: 60,
    },
    exercises: [],
  })
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
  consumeRateLimit = async () => ({ allowed: true, retryAfter: 30 })
}
const servers: ReturnType<typeof buildServer>[] = []
afterEach(async () => Promise.all(servers.splice(0).map((server) => server.close())))
function createServer(repository = new PublicRepository()) {
  const core = new MemoryStudentRepository()
  const server = buildServer({
    identityVerifier: new DevelopmentIdentityVerifier(),
    students: new StudentModule({ repository: core }),
    today: new TodayModule(core, () => now),
    workspace: new WorkspaceModule({ repository: core }),
    accountLifecycle: new AccountLifecycleModule({
      repository: core,
      deletionExecutor: { deleteCoach: async () => undefined },
      now: () => now,
    }),
    registrationEmails: { isRegistered: async () => false },
    publicAccess: new PublicAccessModule(repository, 'x'.repeat(32), () => now),
  })
  servers.push(server)
  return server
}

describe('public capability HTTP boundary', () => {
  it('requires no Auth, sends the token only by header, and applies every no-store header', async () => {
    const response = await createServer().inject({
      method: 'GET',
      url: '/v1/public/training-result',
      headers: { 'x-capability-token': newToken() },
    })
    expect(response.statusCode).toBe(200)
    expect(response.headers).toMatchObject({
      'cache-control': 'no-store, private',
      pragma: 'no-cache',
      'referrer-policy': 'no-referrer',
      'x-robots-tag': 'noindex, nofollow',
    })
    expect(response.json()).toEqual({
      trainingResult: {
        coachDisplayName: 'FORM',
        studentDisplayName: '品妤',
        session: {
          startsAt: now.toISOString(),
          endsAt: new Date(now.getTime() + 3_600_000).toISOString(),
          timeZone: 'Asia/Taipei',
          durationMinutes: 60,
        },
        exercises: [],
      },
    })
  })

  it('normalizes malformed capabilities to the public-safe invalid reason', async () => {
    const response = await createServer().inject({
      method: 'GET',
      url: '/v1/public/reschedule',
      headers: { 'x-capability-token': 'bad' },
    })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ error: 'invalid_link' })
    expect(response.body).not.toContain('bad')
  })

  it('keeps Coach link management behind verified identity', async () => {
    const response = await createServer().inject({
      method: 'GET',
      url: '/v1/sessions/session-1/capability-links',
    })
    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({ error: 'unauthorized' })
  })
})
