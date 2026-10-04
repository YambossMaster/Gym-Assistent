import { afterEach, describe, expect, it } from 'vitest'
import { MemoryStudentRepository } from '../adapters/memory-student-repository.js'
import { DevelopmentIdentityVerifier } from '../identity/development-identity.js'
import { StudentModule } from '../students/student-module.js'
import { TodayModule } from '../today/today-module.js'
import { WorkspaceModule } from '../workspace/workspace-module.js'
import { AccountLifecycleModule } from '../account-lifecycle/account-lifecycle-module.js'
import { PlanAccessModule } from '../plan-access/plan-access.js'
import { buildServer } from '../http/server.js'
import { ExportError, ExportModule, type ExportData } from './export-module.js'

const coach = '00000000-0000-4000-8000-000000000001'
const other = '00000000-0000-4000-8000-000000000002'
const servers: ReturnType<typeof buildServer>[] = []
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

function serverWithExport(select: ExportModule['select']) {
  const repository = new MemoryStudentRepository()
  const exports = new ExportModule({} as never)
  exports.select = select
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
    planAccess: new PlanAccessModule({
      get: async (identity) => ({
        grant: identity.userId === coach ? { kind: 'permanent' as const, endsAt: null } : null,
        activeStudents: identity.userId === other ? 6 : 0,
        activeVenues: 1,
      }),
    }),
    exports,
  })
  servers.push(server)
  return server
}

const input = { type: 'training', format: 'csv', start: '2026-10-05', end: '2026-10-05' }
const data: ExportData = {
  type: 'training',
  format: 'csv',
  start: input.start,
  end: input.end,
  timeZone: 'Asia/Taipei',
  generatedAt: '2026-10-05T01:00:00.000Z',
  includePrivateNotes: false,
  filters: { studentId: null },
  columns: ['studentName'],
  rows: [{ studentName: '陳同學' }],
  records: [{ studentName: '陳同學' }],
}

describe('Prime export HTTP boundary', () => {
  it('rejects Free even when over capacity before selecting any private data', async () => {
    let selected = false
    const server = serverWithExport(async () => {
      selected = true
      return data
    })
    const response = await server.inject({
      method: 'POST',
      url: '/v1/exports',
      headers: { authorization: `Bearer dev:${other}` },
      payload: input,
    })
    expect(response.statusCode).toBe(403)
    expect(response.json()).toMatchObject({ error: 'plan_required', requiredPlan: 'prime' })
    expect(selected).toBe(false)
    expect(response.headers['cache-control']).toBe('no-store, private')
  })

  it('returns one attachment with private cache headers for current Prime', async () => {
    const server = serverWithExport(async () => data)
    const response = await server.inject({
      method: 'POST',
      url: '/v1/exports',
      headers: { authorization: `Bearer dev:${coach}` },
      payload: input,
    })
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-disposition']).toContain('form-coach-training-')
    expect(response.headers['cache-control']).toBe('no-store, private')
    expect(response.headers['referrer-policy']).toBe('no-referrer')
    expect(response.body).toContain('陳同學')
  })

  it('distinguishes an empty selection from missing entities', async () => {
    const server = serverWithExport(async () => {
      throw new ExportError(404, 'export_empty')
    })
    const response = await server.inject({
      method: 'POST',
      url: '/v1/exports',
      headers: { authorization: `Bearer dev:${coach}` },
      payload: input,
    })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ error: 'export_empty' })
  })
})
