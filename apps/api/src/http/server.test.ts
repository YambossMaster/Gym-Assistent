import { afterEach, describe, expect, it } from 'vitest'
import { MemoryStudentRepository } from '../adapters/memory-student-repository.js'
import { DevelopmentIdentityVerifier } from '../identity/development-identity.js'
import { StudentModule } from '../students/student-module.js'
import { TodayModule } from '../today/today-module.js'
import { WorkspaceModule } from '../workspace/workspace-module.js'
import { AccountLifecycleModule } from '../account-lifecycle/account-lifecycle-module.js'
import { buildServer } from './server.js'

const openServers: ReturnType<typeof buildServer>[] = []

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => server.close()))
})

function createServer() {
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
  })
  openServers.push(server)
  return server
}

describe('student HTTP interface', () => {
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
        lessonCount: 2,
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
            lessonSummary: { purchased: 2, completed: 0, remaining: 2 },
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
      payload: { displayName: 'FORM Taipei', timeZone: 'Asia/Taipei', version: 1 },
    })
    expect(updateResponse.statusCode).toBe(200)
    expect(updateResponse.json().settings).toMatchObject({ displayName: 'FORM Taipei', version: 2 })

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
