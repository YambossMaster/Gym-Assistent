import { afterEach, describe, expect, it } from 'vitest'
import { MemoryStudentRepository } from '../adapters/memory-student-repository.js'
import { DevelopmentIdentityVerifier } from '../identity/development-identity.js'
import { StudentModule } from '../students/student-module.js'
import { buildServer } from './server.js'

const openServers: ReturnType<typeof buildServer>[] = []

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => server.close()))
})

function createServer() {
  const server = buildServer({
    identityVerifier: new DevelopmentIdentityVerifier(),
    students: new StudentModule({ repository: new MemoryStudentRepository() }),
  })
  openServers.push(server)
  return server
}

describe('student HTTP interface', () => {
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
