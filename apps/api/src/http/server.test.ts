import { afterEach, describe, expect, it } from 'vitest'
import { MemoryStudentRepository } from '../adapters/memory-student-repository.js'
import { DevelopmentIdentityVerifier } from '../identity/development-identity.js'
import { StudentModule } from '../students/student-module.js'
import { TodayModule } from '../today/today-module.js'
import { WorkspaceModule } from '../workspace/workspace-module.js'
import { AccountLifecycleModule } from '../account-lifecycle/account-lifecycle-module.js'
import { buildServer } from './server.js'
import { BetaAdmissionModule, codeDigest, newBetaCode } from '../beta-admission/beta-admission.js'
import { MemoryBetaAdmissionRepository } from '../beta-admission/memory-beta-admission-repository.js'
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
  LegalAcceptanceModule,
  type LegalAcceptanceRepository,
} from '../legal-acceptance/legal-acceptance.js'

const openServers: ReturnType<typeof buildServer>[] = []

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => server.close()))
})

function createServer(readiness?: () => Promise<void>) {
  const repository = new MemoryStudentRepository()
  const server = buildServer({
    identityVerifier: new DevelopmentIdentityVerifier(),
    students: new StudentModule({ repository }),
    today: new TodayModule(repository, () => new Date('2026-09-10T00:00:00.000Z')),
    workspace: new WorkspaceModule({ repository }),
    accountLifecycle: new AccountLifecycleModule({
      repository,
      deletionExecutor: { deleteCoach: async () => undefined },
      now: () => new Date('2026-09-10T00:00:00.000Z'),
    }),
    registrationEmails: { isRegistered: async () => false },
    ...(readiness ? { readiness } : {}),
  })
  openServers.push(server)
  return server
}

describe('readiness', () => {
  it('keeps liveness separate from a failed database check', async () => {
    const server = createServer(async () => {
      throw new Error('database connection detail must stay private')
    })
    expect((await server.inject('/health')).statusCode).toBe(200)
    const response = await server.inject('/ready')
    expect(response.statusCode).toBe(503)
    expect(response.json()).toEqual({ error: 'not_ready' })
    expect(response.payload).not.toContain('database connection detail')
  })

  it('reports ready only after the check succeeds', async () => {
    const server = createServer(async () => undefined)
    const response = await server.inject('/ready')
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ready' })
  })
})

describe('production Alpha admission boundary', () => {
  it('allows only named Coaches into private API routes while preserving readiness', async () => {
    const repository = new MemoryStudentRepository()
    const server = buildServer({
      identityVerifier: new DevelopmentIdentityVerifier(),
      students: new StudentModule({ repository }),
      today: new TodayModule(repository),
      workspace: new WorkspaceModule({ repository }),
      accountLifecycle: new AccountLifecycleModule({
        repository,
        deletionExecutor: { deleteCoach: async () => undefined },
      }),
      registrationEmails: { isRegistered: async () => false },
      alphaAllowedCoachIds: new Set(['00000000-0000-4000-8000-000000000001']),
      readiness: async () => undefined,
    })
    openServers.push(server)
    const admitted = { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000001' }
    const excluded = { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000002' }
    expect((await server.inject('/ready')).statusCode).toBe(200)
    expect((await server.inject('/v1/students')).statusCode).toBe(401)
    expect((await server.inject('/v1/public/training-result')).statusCode).not.toBe(403)
    expect((await server.inject({ url: '/v1/students', headers: admitted })).statusCode).toBe(200)
    expect((await server.inject({ url: '/v1/students', headers: excluded })).json()).toEqual({
      error: 'alpha_closed',
    })
    const deniedWrite = await server.inject({
      method: 'POST',
      url: '/v1/students',
      headers: excluded,
      payload: { name: 'Must not exist' },
    })
    expect(deniedWrite.statusCode).toBe(403)
    expect(
      (await server.inject({ url: '/v1/students', headers: admitted })).json().students,
    ).toEqual([])
    expect(
      (
        await server.inject({
          method: 'POST',
          url: '/v1/account-registration-check',
          payload: { email: 'coach@example.com' },
        })
      ).statusCode,
    ).toBe(403)
  })
})

describe('legal acceptance HTTP boundary', () => {
  it('allows reading and accepting the current documents before any Workspace write', async () => {
    const repository = new MemoryStudentRepository()
    const accepted = new Map<string, string>()
    const legalRepository: LegalAcceptanceRepository = {
      status: async (userId) => accepted.get(userId) ?? null,
      accept: async ({ userId, acceptedAt }) => {
        const timestamp = accepted.get(userId) ?? acceptedAt.toISOString()
        accepted.set(userId, timestamp)
        return timestamp
      },
    }
    const server = buildServer({
      identityVerifier: new DevelopmentIdentityVerifier(),
      students: new StudentModule({ repository }),
      today: new TodayModule(repository),
      workspace: new WorkspaceModule({ repository }),
      accountLifecycle: new AccountLifecycleModule({
        repository,
        deletionExecutor: { deleteCoach: async () => undefined },
      }),
      registrationEmails: { isRegistered: async () => false },
      legalAcceptance: new LegalAcceptanceModule(
        legalRepository,
        () => new Date('2026-10-06T15:00:00Z'),
      ),
      requireLegalAcceptance: true,
    })
    openServers.push(server)
    const headers = { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000001' }

    expect((await server.inject({ url: '/v1/legal/status', headers })).json()).toMatchObject({
      legal: { accepted: false, acceptedAt: null },
    })
    expect((await server.inject({ url: '/v1/students', headers })).json()).toEqual({
      error: 'legal_acceptance_required',
    })
    const response = await server.inject({
      method: 'POST',
      url: '/v1/legal/accept',
      headers,
      payload: {
        termsVersion: CURRENT_TERMS_VERSION,
        privacyVersion: CURRENT_PRIVACY_VERSION,
        accepted: true,
        noBackupAcknowledged: true,
      },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      legal: { accepted: true, acceptedAt: '2026-10-06T15:00:00.000Z' },
    })
    expect((await server.inject({ url: '/v1/students', headers })).statusCode).toBe(200)
  })
})

describe('Beta admission HTTP boundary', () => {
  it('opens a free Workspace before optional redemption and keeps other Coaches isolated', async () => {
    const repository = new MemoryStudentRepository()
    const secret = 'test-secret-that-is-at-least-32-characters'
    const betaRepository = new MemoryBetaAdmissionRepository(secret)
    const code = newBetaCode()
    betaRepository.issueForTest(codeDigest(code), 2, new Date('2027-01-01T00:00:00.000Z'))
    const server = buildServer({
      identityVerifier: new DevelopmentIdentityVerifier(),
      students: new StudentModule({ repository }),
      today: new TodayModule(repository),
      workspace: new WorkspaceModule({ repository }),
      accountLifecycle: new AccountLifecycleModule({
        repository,
        deletionExecutor: { deleteCoach: async () => undefined },
      }),
      registrationEmails: { isRegistered: async () => false },
      betaAdmission: new BetaAdmissionModule(
        betaRepository,
        { getVerifiedEmail: async () => 'verified@example.com' },
        secret,
        () => new Date('2026-10-03T02:00:00.000Z'),
      ),
    })
    openServers.push(server)
    const headers = { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000001' }
    expect((await server.inject({ url: '/v1/students', headers })).statusCode).toBe(200)
    expect((await server.inject({ url: '/v1/beta/status', headers })).json()).toEqual({
      grant: { state: 'free' },
    })
    expect(
      (
        await server.inject({
          method: 'POST',
          url: '/v1/students',
          headers,
          payload: { name: 'Free Coach Student' },
        })
      ).statusCode,
    ).toBe(201)
    const redeemed = await server.inject({
      method: 'POST',
      url: '/v1/beta/redeem',
      headers,
      payload: { code },
    })
    expect(redeemed.statusCode).toBe(200)
    expect(redeemed.json().grant.state).toBe('promotional')
    expect(
      (
        await server.inject({
          method: 'POST',
          url: '/v1/students',
          headers,
          payload: { name: 'Beta Coach Student' },
        })
      ).statusCode,
    ).toBe(201)
    const other = { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000002' }
    expect((await server.inject({ url: '/v1/students', headers: other })).statusCode).toBe(200)
    expect((await server.inject({ url: '/v1/students', headers: other })).json()).toEqual({
      students: [],
    })
    expect(betaRepository.usageForTest(codeDigest(code))).toBe(1)
  })

  it('counts malformed JSON before parsing and returns Retry-After without code lookup', async () => {
    const repository = new MemoryStudentRepository()
    const secret = 'test-secret-that-is-at-least-32-characters'
    const betaRepository = new MemoryBetaAdmissionRepository(secret)
    const server = buildServer({
      identityVerifier: new DevelopmentIdentityVerifier(),
      students: new StudentModule({ repository }),
      today: new TodayModule(repository),
      workspace: new WorkspaceModule({ repository }),
      accountLifecycle: new AccountLifecycleModule({
        repository,
        deletionExecutor: { deleteCoach: async () => undefined },
      }),
      registrationEmails: { isRegistered: async () => false },
      betaAdmission: new BetaAdmissionModule(
        betaRepository,
        { getVerifiedEmail: async () => 'verified@example.com' },
        secret,
        () => new Date('2026-10-03T02:00:00.000Z'),
      ),
    })
    openServers.push(server)
    const headers = {
      authorization: 'Bearer dev:00000000-0000-4000-8000-000000000001',
      'content-type': 'application/json',
    }
    for (let count = 0; count < 5; count += 1) {
      const invalid = await server.inject({
        method: 'POST',
        url: '/v1/beta/redeem',
        headers,
        payload: '{',
      })
      expect(invalid.statusCode).toBe(400)
    }
    const limited = await server.inject({
      method: 'POST',
      url: '/v1/beta/redeem',
      headers,
      payload: '{}',
    })
    expect(limited.statusCode).toBe(429)
    expect(limited.headers['retry-after']).toBe('300')
  })
})

describe('student HTTP interface', () => {
  it('accepts an age range and allows clearing it without accepting arbitrary ages', async () => {
    const server = createServer()
    const headers = { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000001' }
    const created = await server.inject({
      method: 'POST',
      url: '/v1/students',
      headers,
      payload: { name: 'Alice', ageRange: 'AGE_25_34' },
    })
    expect(created.statusCode).toBe(201)
    const student = created.json().student as { id: string; version: number; ageRange: string }
    expect(student.ageRange).toBe('AGE_25_34')

    const invalid = await server.inject({
      method: 'PATCH',
      url: `/v1/students/${student.id}`,
      headers,
      payload: { name: 'Alice', version: student.version, ageRange: '25' },
    })
    expect(invalid.statusCode).toBe(400)

    const cleared = await server.inject({
      method: 'PATCH',
      url: `/v1/students/${student.id}`,
      headers,
      payload: { name: 'Alice', version: student.version, ageRange: null },
    })
    expect(cleared.statusCode).toBe(200)
    expect(cleared.json().student.ageRange).toBeNull()
  })

  it('reports an existing registration email through the approved public signup check', async () => {
    const repository = new MemoryStudentRepository()
    const server = buildServer({
      identityVerifier: new DevelopmentIdentityVerifier(),
      students: new StudentModule({ repository }),
      today: new TodayModule(repository, () => new Date('2026-09-10T00:00:00.000Z')),
      workspace: new WorkspaceModule({ repository }),
      accountLifecycle: new AccountLifecycleModule({
        repository,
        deletionExecutor: { deleteCoach: async () => undefined },
      }),
      registrationEmails: { isRegistered: async (email) => email === 'coach@example.com' },
    })
    openServers.push(server)

    const response = await server.inject({
      method: 'POST',
      url: '/v1/account-registration-check',
      payload: { email: 'coach@example.com' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ exists: true })
  })

  it('requires an authenticated coach', async () => {
    const response = await createServer().inject({ method: 'GET', url: '/v1/students' })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({ error: 'unauthorized' })
  })

  it('returns an allowlisted Today projection isolated to the authenticated Coach', async () => {
    const server = createServer()
    const ownerHeaders = {
      authorization: 'Bearer dev:00000000-0000-4000-8000-000000000001',
    }
    const student = (
      await server.inject({
        method: 'POST',
        url: '/v1/students',
        headers: ownerHeaders,
        payload: { name: 'Alice', phone: 'private', privateNote: 'Coach only' },
      })
    ).json().student as { id: string }
    await server.inject({
      method: 'POST',
      url: `/v1/students/${student.id}/lesson-purchases`,
      headers: ownerHeaders,
      payload: {
        purchasedAt: '2026-08-31T16:00:00.000Z',
        lessonCount: 1,
        amountMinor: 6000,
        currency: 'TWD',
        privateNote: 'Never expose',
      },
    })

    const owner = await server.inject({ method: 'GET', url: '/v1/today', headers: ownerHeaders })
    const other = await server.inject({
      method: 'GET',
      url: '/v1/today',
      headers: { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000002' },
    })
    const unauthorized = await server.inject({ method: 'GET', url: '/v1/today' })

    expect(owner.statusCode).toBe(200)
    expect(owner.json()).toEqual({
      today: {
        date: '2026-09-10',
        timeZone: 'Asia/Taipei',
        summary: {
          activeStudents: 1,
          incomePeriod: { startsOn: '2026-09-01', endsOn: '2026-10-01' },
          incomeByCurrency: [{ currency: 'TWD', amountMinor: 6000 }],
          attentionCount: 1,
        },
        attention: [
          {
            kind: 'low_lesson_balance',
            student: { id: student.id, name: 'Alice' },
            lessonSummary: { purchased: 1, completed: 0, remaining: 1 },
            targetRoute: `/students/${student.id}`,
          },
        ],
      },
    })
    expect(Object.keys(owner.json().today.attention[0].student)).toEqual(['id', 'name'])
    expect(owner.json().today.attention[0]).not.toHaveProperty('purchases')
    expect(owner.json().today.attention[0]).not.toHaveProperty('privateNote')
    expect(other.json().today).toMatchObject({
      summary: { activeStudents: 0, incomeByCurrency: [], attentionCount: 0 },
      attention: [],
    })
    expect(unauthorized.statusCode).toBe(401)
  })

  it('creates and lists students without accepting a workspace id', async () => {
    const server = createServer()
    const createResponse = await server.inject({
      method: 'POST',
      url: '/v1/students',
      headers: { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000001' },
      payload: { name: 'Alice', workspaceId: 'attacker-selected-workspace' },
    })

    expect(createResponse.statusCode).toBe(400)

    const validCreateResponse = await server.inject({
      method: 'POST',
      url: '/v1/students',
      headers: { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000001' },
      payload: { name: 'Alice', privateNote: 'Coach only' },
    })
    expect(validCreateResponse.statusCode).toBe(201)

    const ownerList = await server.inject({
      method: 'GET',
      url: '/v1/students',
      headers: { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000001' },
    })
    const otherCoachList = await server.inject({
      method: 'GET',
      url: '/v1/students',
      headers: { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000002' },
    })

    expect(ownerList.json().students).toMatchObject([{ name: 'Alice', privateNote: 'Coach only' }])
    expect(otherCoachList.json()).toEqual({ students: [] })
  })

  it('rejects incomplete student input', async () => {
    const response = await createServer().inject({
      method: 'POST',
      url: '/v1/students',
      headers: { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000001' },
      payload: { name: '' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: 'invalid_request' })
  })

  it('returns a coach-only student detail with a derived lesson balance and versioned deletion', async () => {
    const server = createServer()
    const headers = { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000001' }
    const created = await server.inject({
      method: 'POST',
      url: '/v1/students',
      headers,
      payload: { name: 'Alice' },
    })
    const student = created.json().student as { id: string; version: number }
    const purchase = await server.inject({
      method: 'POST',
      url: `/v1/students/${student.id}/lesson-purchases`,
      headers,
      payload: {
        purchasedAt: '2026-09-01T00:00:00.000Z',
        lessonCount: 3,
        amountMinor: 6000,
        currency: 'TWD',
        privateNote: 'Coach only',
      },
    })
    expect(purchase.statusCode).toBe(201)
    const detail = await server.inject({
      method: 'GET',
      url: `/v1/students/${student.id}`,
      headers,
    })
    expect(detail.statusCode).toBe(200)
    expect(detail.json().detail).toMatchObject({
      lessonSummary: { purchased: 3, completed: 0, remaining: 3 },
      purchases: [{ privateNote: 'Coach only', amountMinor: 6000, currency: 'TWD' }],
    })
    const income = await server.inject({
      method: 'GET',
      url: '/v1/lesson-purchase-income',
      headers,
    })
    expect(income.statusCode).toBe(200)
    expect(income.json()).toEqual({ income: [{ currency: 'TWD', amountMinor: 6000 }] })
    const otherCoach = await server.inject({
      method: 'GET',
      url: `/v1/students/${student.id}`,
      headers: { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000002' },
    })
    expect(otherCoach.statusCode).toBe(404)
    const deleted = await server.inject({
      method: 'DELETE',
      url: `/v1/students/${student.id}`,
      headers,
      payload: { confirmation: 'DELETE', version: student.version },
    })
    expect(deleted.statusCode).toBe(204)
  })

  it('corrects a lesson purchase with its version and returns the current purchase on a stale correction', async () => {
    const server = createServer()
    const headers = { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000001' }
    const student = (
      await server.inject({
        method: 'POST',
        url: '/v1/students',
        headers,
        payload: { name: 'Alice' },
      })
    ).json().student as { id: string }
    const created = await server.inject({
      method: 'POST',
      url: `/v1/students/${student.id}/lesson-purchases`,
      headers,
      payload: {
        purchasedAt: '2026-09-01T00:00:00.000Z',
        lessonCount: 2,
        amountMinor: 4000,
        currency: 'TWD',
      },
    })
    const purchase = created.json().purchase as { id: string; version: number }
    const obsoleteCollection = await server.inject({
      method: 'POST',
      url: `/v1/students/${student.id}/lesson-purchases`,
      headers,
      payload: {
        purchasedAt: '2026-09-01T00:00:00.000Z',
        lessonCount: 2,
        amountMinor: 4000,
        currency: 'TWD',
        collectionMode: 'venue',
      },
    })
    expect(obsoleteCollection.statusCode).toBe(400)
    const updated = await server.inject({
      method: 'PATCH',
      url: `/v1/students/${student.id}/lesson-purchases/${purchase.id}`,
      headers,
      payload: {
        purchasedAt: '2026-09-02T00:00:00.000Z',
        lessonCount: 3,
        amountMinor: 6000,
        currency: 'TWD',
        version: purchase.version,
      },
    })
    expect(updated.statusCode).toBe(200)
    expect(updated.json().purchase).toMatchObject({ lessonCount: 3, version: 2 })
    const stale = await server.inject({
      method: 'PATCH',
      url: `/v1/students/${student.id}/lesson-purchases/${purchase.id}`,
      headers,
      payload: {
        purchasedAt: '2026-09-02T00:00:00.000Z',
        lessonCount: 4,
        amountMinor: 8000,
        currency: 'TWD',
        version: 1,
      },
    })
    expect(stale.statusCode).toBe(409)
    expect(stale.json()).toMatchObject({
      error: 'version_conflict',
      reason: 'lesson_purchase_version_conflict',
      currentPurchase: { lessonCount: 3, version: 2 },
    })
  })
})

describe('workspace settings HTTP interface', () => {
  it('derives the workspace from identity and rejects stale updates', async () => {
    const server = createServer()
    const headers = { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000001' }

    const getResponse = await server.inject({
      method: 'GET',
      url: '/v1/workspace-settings',
      headers,
    })
    expect(getResponse.statusCode).toBe(200)
    expect(getResponse.json().settings).toMatchObject({ timeZone: 'Asia/Taipei', version: 1 })

    const updateResponse = await server.inject({
      method: 'PATCH',
      url: '/v1/workspace-settings',
      headers,
      payload: {
        displayName: 'FORM Taipei',
        timeZone: 'Asia/Taipei',
        calendarStartHour: 8,
        calendarEndHour: 23,
        calendarWeekStart: 0,
        defaultSessionMinutes: 120,
        version: 1,
      },
    })
    expect(updateResponse.statusCode).toBe(200)
    expect(updateResponse.json().settings).toMatchObject({
      displayName: 'FORM Taipei',
      calendarStartHour: 8,
      calendarEndHour: 23,
      calendarWeekStart: 0,
      defaultSessionMinutes: 120,
      version: 2,
    })

    const staleResponse = await server.inject({
      method: 'PATCH',
      url: '/v1/workspace-settings',
      headers,
      payload: { displayName: 'Stale', timeZone: 'Asia/Taipei', version: 1 },
    })
    expect(staleResponse.statusCode).toBe(409)
  })
})

describe('account deletion HTTP interface', () => {
  const headers = { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000001' }

  it('requires DELETE confirmation, schedules 14 days, then allows cancellation', async () => {
    const server = createServer()
    const invalid = await server.inject({
      method: 'POST',
      url: '/v1/account-deletion-request',
      headers,
      payload: {},
    })
    expect(invalid.statusCode).toBe(400)

    const requested = await server.inject({
      method: 'POST',
      url: '/v1/account-deletion-request',
      headers,
      payload: { confirmation: 'DELETE' },
    })
    expect(requested.statusCode).toBe(200)
    expect(requested.json().lifecycle.deletionDueAt).toBe('2026-09-24T00:00:00.000Z')

    const cancelled = await server.inject({
      method: 'DELETE',
      url: '/v1/account-deletion-request',
      headers,
    })
    expect(cancelled.statusCode).toBe(200)
    expect(cancelled.json()).toEqual({ lifecycle: { deletionDueAt: null } })
  })

  it('permanently deletes only after explicit DELETE confirmation', async () => {
    const calls: string[] = []
    const repository = new MemoryStudentRepository()
    const server = buildServer({
      identityVerifier: new DevelopmentIdentityVerifier(),
      students: new StudentModule({ repository }),
      today: new TodayModule(repository, () => new Date('2026-09-10T00:00:00.000Z')),
      workspace: new WorkspaceModule({ repository }),
      accountLifecycle: new AccountLifecycleModule({
        repository,
        deletionExecutor: {
          deleteCoach: async (userId) => {
            calls.push(userId)
          },
        },
      }),
      registrationEmails: { isRegistered: async () => false },
    })
    openServers.push(server)
    const response = await server.inject({
      method: 'DELETE',
      url: '/v1/account',
      headers,
      payload: { confirmation: 'DELETE' },
    })
    expect(response.statusCode).toBe(204)
    expect(calls).toEqual(['00000000-0000-4000-8000-000000000001'])
  })
})
