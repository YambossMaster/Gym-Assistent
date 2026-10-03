import { afterEach, expect, it } from 'vitest'
import { MemoryStudentRepository } from '../adapters/memory-student-repository.js'
import { AccountLifecycleModule } from '../account-lifecycle/account-lifecycle-module.js'
import { buildServer } from '../http/server.js'
import { DevelopmentIdentityVerifier } from '../identity/development-identity.js'
import { StudentModule } from '../students/student-module.js'
import { TodayModule } from '../today/today-module.js'
import { WorkspaceModule } from '../workspace/workspace-module.js'
import { PlanAccessModule } from './plan-access.js'

const headers = { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000001' }
const servers: ReturnType<typeof buildServer>[] = []
afterEach(async () => Promise.all(servers.splice(0).map((server) => server.close())))

function setup() {
  const repository = new MemoryStudentRepository()
  let grant: { kind: 'promotional'; endsAt: Date } | null = null
  const planAccess = new PlanAccessModule(
    {
      get: async (identity) => {
        const workspaceId = await repository.resolveWorkspace(identity)
        return {
          grant,
          activeStudents: (await repository.listStudents(workspaceId)).filter((s) => s.active)
            .length,
          activeVenues: 0,
        }
      },
    },
    () => new Date('2026-10-03T02:00:00.000Z'),
  )
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
    planAccess,
  })
  servers.push(server)
  return { server, setGrant: (value: typeof grant) => (grant = value) }
}

it('limits Free creation and preserves all Students when an Advanced offer expires', async () => {
  const { server, setGrant } = setup()
  setGrant({ kind: 'promotional', endsAt: new Date('2026-10-04T02:00:00.000Z') })
  const students: Array<Record<string, unknown>> = []
  for (let i = 0; i < 6; i++) {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/students',
      headers,
      payload: { name: `Student ${i}` },
    })
    expect(response.statusCode).toBe(201)
    students.push(response.json().student)
  }
  setGrant({ kind: 'promotional', endsAt: new Date('2026-10-03T02:00:00.000Z') })
  expect((await server.inject({ url: '/v1/plan', headers })).json().plan).toMatchObject({
    tier: 'free',
    activeStudents: 6,
    overCapacity: true,
  })
  const blocked = await server.inject({
    method: 'POST',
    url: '/v1/students',
    headers,
    payload: { name: 'Blocked' },
  })
  expect(blocked.statusCode).toBe(403)
  expect(blocked.json()).toEqual({ error: 'capacity_limit' })
  const first = students[0]!
  const edit = await server.inject({
    method: 'PATCH',
    url: `/v1/students/${first.id}`,
    headers,
    payload: {
      name: 'Blocked edit',
      phone: first.phone,
      goal: first.goal,
      privateNote: first.privateNote,
      ageRange: first.ageRange,
      defaultVenueId: first.defaultVenueId,
      lineLinked: first.lineLinked,
      active: true,
      version: first.version,
    },
  })
  expect(edit.statusCode).toBe(403)
  expect(edit.json()).toEqual({ error: 'capacity_limit' })
  const purchase = await server.inject({
    method: 'POST',
    url: `/v1/students/${first.id}/lesson-purchases`,
    headers,
    payload: {
      purchasedAt: '2026-10-03T02:00:00.000Z',
      lessonCount: 1,
      amountMinor: 0,
      currency: 'TWD',
      privateNote: '',
    },
  })
  expect(purchase.statusCode).toBe(403)
  expect(purchase.json()).toEqual({ error: 'capacity_limit' })
  const archive = await server.inject({
    method: 'PATCH',
    url: `/v1/students/${first.id}`,
    headers,
    payload: {
      name: first.name,
      phone: first.phone,
      goal: first.goal,
      privateNote: first.privateNote,
      ageRange: first.ageRange,
      defaultVenueId: first.defaultVenueId,
      lineLinked: first.lineLinked,
      active: false,
      version: first.version,
    },
  })
  expect(archive.statusCode).toBe(200)
  expect((await server.inject({ url: '/v1/plan', headers })).json().plan).toMatchObject({
    activeStudents: 5,
    overCapacity: false,
  })
  expect((await server.inject({ url: '/v1/students', headers })).json().students).toHaveLength(6)
  expect(
    (
      await server.inject({
        method: 'POST',
        url: '/v1/students',
        headers,
        payload: { name: 'Still full' },
      })
    ).statusCode,
  ).toBe(403)
})
