import { afterEach, expect, it } from 'vitest'
import { MemoryStudentRepository } from '../adapters/memory-student-repository.js'
import { AccountLifecycleModule } from '../account-lifecycle/account-lifecycle-module.js'
import { buildServer } from '../http/server.js'
import { DevelopmentIdentityVerifier } from '../identity/development-identity.js'
import { StudentModule } from '../students/student-module.js'
import { TodayModule } from '../today/today-module.js'
import { WorkspaceModule } from '../workspace/workspace-module.js'
import { PlanAccessModule } from './plan-access.js'
import type { TrainingModule } from '../training/training-module.js'
import type { SchedulingModule } from '../scheduling/scheduling-module.js'
import type { SessionTraining } from '../training/training.js'

const headers = { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000001' }
const servers: ReturnType<typeof buildServer>[] = []
afterEach(async () => Promise.all(servers.splice(0).map((server) => server.close())))

it('keeps inline Training bests on Free while withholding trajectory points', async () => {
  const repository = new MemoryStudentRepository()
  const summary = {
    occurrenceId: 'exercise-1',
    definitionId: 'squat',
    metric: 'weight' as const,
    unit: 'kg' as const,
    current: 80,
    previous: 75,
    personal: 90,
    history: [{ sessionId: 'older-session', startsAt: new Date(), value: 75, unit: 'kg' as const }],
    series: [
      {
        metric: 'weight' as const,
        unit: 'kg',
        current: 80,
        previous: 75,
        personal: 90,
        direction: 'higher' as const,
        points: [{ sessionId: 'older-session', startsAt: new Date(), value: 75 }],
      },
    ],
  }
  const training = {
    getSessionTraining: async () =>
      ({ exerciseSummaries: [summary] }) as unknown as SessionTraining,
  } as unknown as TrainingModule
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
    training,
    planAccess: new PlanAccessModule({
      get: async () => ({ grant: null, activeStudents: 0, activeVenues: 0 }),
    }),
  })
  servers.push(server)
  const response = await server.inject({ url: '/v1/sessions/session-1/training', headers })
  expect(response.statusCode).toBe(200)
  expect(response.json().training.exerciseSummaries[0]).toMatchObject({
    current: 80,
    previous: 75,
    personal: 90,
    history: [],
    series: [{ points: [] }],
  })
})

function setup(scheduling?: SchedulingModule) {
  const repository = new MemoryStudentRepository()
  let grant: { kind: 'promotional'; endsAt: Date } | { kind: 'permanent'; endsAt: null } | null =
    null
  const now = new Date('2026-10-03T02:00:00.000Z')
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
    () => now,
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
    ...(scheduling ? { scheduling } : {}),
    planAccess,
  })
  servers.push(server)
  return { server, setGrant: (value: typeof grant) => (grant = value) }
}

it('does not expose a pre-payment plan mutation route', async () => {
  const { server } = setup()
  const response = await server.inject({
    method: 'POST',
    url: '/v1/plan/subscription',
    headers,
    payload: { kind: 'select', tier: 'basic', interval: 'month', version: 0 },
  })
  expect(response.statusCode).toBe(404)
  expect((await server.inject({ url: '/v1/plan', headers })).json().plan).toMatchObject({
    tier: 'free',
    source: 'free',
  })
})

it('gates group creation and later group writes while retaining downgraded data', async () => {
  const { server, setGrant } = setup()
  const person = await server.inject({
    method: 'POST',
    url: '/v1/students',
    headers,
    payload: { name: '成員' },
  })
  expect(person.statusCode).toBe(201)
  const memberId = person.json().student.id as string
  const groupPayload = { name: '共課群組', kind: 'group', memberIds: [memberId] }
  const freeCreate = await server.inject({
    method: 'POST',
    url: '/v1/students',
    headers,
    payload: groupPayload,
  })
  expect(freeCreate.statusCode).toBe(403)
  expect(freeCreate.json()).toEqual({ error: 'plan_required' })

  setGrant({ kind: 'promotional', endsAt: new Date('2026-10-04T02:00:00.000Z') })
  const created = await server.inject({
    method: 'POST',
    url: '/v1/students',
    headers,
    payload: groupPayload,
  })
  expect(created.statusCode).toBe(201)
  const group = created.json().student as { id: string; version: number }
  setGrant(null)
  const archived = await server.inject({ url: `/v1/students/${group.id}`, headers })
  expect(archived.statusCode).toBe(200)
  expect(archived.json().detail.student.active).toBe(false)
  const update = await server.inject({
    method: 'PATCH',
    url: `/v1/students/${group.id}`,
    headers,
    payload: { name: '改名', memberIds: [memberId], version: group.version },
  })
  expect(update.statusCode).toBe(403)
  expect(update.json()).toEqual({ error: 'plan_required' })
  const purchase = await server.inject({
    method: 'POST',
    url: `/v1/students/${group.id}/lesson-purchases`,
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
  expect(purchase.json()).toEqual({ error: 'plan_required' })
  expect((await server.inject({ url: `/v1/students/${group.id}`, headers })).statusCode).toBe(200)
})

it('rejects a group Series write addressed only by Series ID on Free', async () => {
  let groupId = ''
  const scheduling = {
    seriesOwner: async () => groupId,
  } as unknown as SchedulingModule
  const { server, setGrant } = setup(scheduling)
  const person = await server.inject({
    method: 'POST',
    url: '/v1/students',
    headers,
    payload: { name: '甲' },
  })
  setGrant({ kind: 'permanent', endsAt: null })
  const group = await server.inject({
    method: 'POST',
    url: '/v1/students',
    headers,
    payload: { name: '共課', kind: 'group', memberIds: [person.json().student.id] },
  })
  groupId = group.json().student.id
  setGrant(null)
  const response = await server.inject({
    method: 'DELETE',
    url: '/v1/schedule-series/00000000-0000-4000-8000-000000000002',
    headers,
    payload: { confirmation: 'DELETE', version: 1 },
  })
  expect(response.statusCode).toBe(403)
  expect(response.json()).toEqual({ error: 'plan_required' })
})

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
