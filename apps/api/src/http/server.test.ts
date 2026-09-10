import { afterEach, describe, expect, it } from 'vitest'
import { MemoryStudentRepository } from '../adapters/memory-student-repository.js'
import { DevelopmentIdentityVerifier } from '../identity/development-identity.js'
import { StudentModule } from '../students/student-module.js'
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
