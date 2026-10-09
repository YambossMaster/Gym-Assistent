import { afterEach, expect, it, vi } from 'vitest'
import { MemoryStudentRepository } from '../adapters/memory-student-repository.js'
import { DevelopmentIdentityVerifier } from '../identity/development-identity.js'
import { StudentModule } from '../students/student-module.js'
import { TodayModule } from '../today/today-module.js'
import { WorkspaceModule } from '../workspace/workspace-module.js'
import { AccountLifecycleModule } from '../account-lifecycle/account-lifecycle-module.js'
import { PlanAccessModule } from '../plan-access/plan-access.js'
import { buildServer } from '../http/server.js'
import { FinanceReportModule } from './finance-report.js'
import { ExportModule } from './export-module.js'
import { defaultSharing } from '../calendar-integration/calendar.js'

const coach = '00000000-0000-4000-8000-000000000001'
const other = '00000000-0000-4000-8000-000000000002'
const servers: ReturnType<typeof buildServer>[] = []
afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => s.close()))
})
function fixture(logger: boolean | Record<string, unknown> = false) {
  const repository = new MemoryStudentRepository()
  let prime = true
  const file = {
    filename: '[呂曉白]_收支明細.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    body: Buffer.from('file'),
  }
  const finance = new FinanceReportModule({} as never, {} as never)
  finance.generate = vi.fn(async () => file)
  const calendar = {
    get: vi.fn(async () => ({ ...defaultSharing, version: 1, active: true })),
    change: vi.fn(async () => ({ ...defaultSharing, version: 2, active: false })),
    download: vi.fn(async () => ({ ...file, filename: '行程.ics' })),
    feed: vi.fn(async () => Buffer.from('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n')),
  }
  const server = buildServer({
    logger,
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
        grant: prime && identity.userId === coach ? { kind: 'permanent', endsAt: null } : null,
        activeStudents: 20,
        activeVenues: 1,
      }),
    }),
    exports: new ExportModule({} as never),
    financeReport: finance,
    calendarIntegration: calendar,
  })
  servers.push(server)
  return {
    server,
    finance,
    calendar,
    downgrade: () => {
      prime = false
    },
    file,
  }
}
const auth = (user = coach) => ({ authorization: `Bearer dev:${user}` })
it('rejects duplicate jobs without blocking readiness, then releases the slot', async () => {
  const { server, finance, file } = fixture()
  let release!: () => void
  finance.generate = vi.fn(
    () =>
      new Promise<typeof file>((resolve) => {
        release = () => resolve(file)
      }),
  )
  const first = server
    .inject({ method: 'POST', url: '/v1/finance-export', headers: auth(), payload: {} })
    .then((r) => r)
  await vi.waitFor(() => expect(finance.generate).toHaveBeenCalledTimes(1))
  const second = await server.inject({
    method: 'POST',
    url: '/v1/finance-export',
    headers: auth(),
    payload: {},
  })
  expect(second.statusCode).toBe(422)
  expect(second.json().error).toBe('export_busy')
  expect((await server.inject({ url: '/health' })).statusCode).toBe(200)
  release()
  expect((await first).statusCode).toBe(200)
  finance.generate = vi.fn(async () => file)
  expect(
    (
      await server.inject({
        method: 'POST',
        url: '/v1/finance-export',
        headers: auth(),
        payload: {},
      })
    ).statusCode,
  ).toBe(200)
})
it('checks identity and Prime before either private download; retires the old endpoint', async () => {
  const { server, finance, calendar } = fixture()
  for (const url of ['/v1/finance-export', '/v1/calendar-integration/download']) {
    expect((await server.inject({ method: 'POST', url, payload: {} })).statusCode).toBe(401)
    const denied = await server.inject({ method: 'POST', url, headers: auth(other), payload: {} })
    expect(denied.statusCode).toBe(403)
    expect(denied.json().error).toBe('plan_required')
  }
  expect(finance.generate).not.toHaveBeenCalled()
  expect(calendar.download).not.toHaveBeenCalled()
  expect(
    (await server.inject({ method: 'POST', url: '/v1/exports', headers: auth(), payload: {} }))
      .statusCode,
  ).toBe(410)
})
it('uses UTF-8 filenames and private headers, rechecks entitlement after generation', async () => {
  const { server, finance, downgrade, file } = fixture()
  const response = await server.inject({
    method: 'POST',
    url: '/v1/finance-export',
    headers: auth(),
    payload: {},
  })
  expect(response.statusCode).toBe(200)
  expect(response.headers['content-disposition']).toContain(encodeURIComponent('[呂曉白]'))
  expect(response.headers['cache-control']).toBe('no-store, private')
  expect(response.headers['referrer-policy']).toBe('no-referrer')
  finance.generate = vi.fn(async () => {
    downgrade()
    return file
  })
  expect(
    (
      await server.inject({
        method: 'POST',
        url: '/v1/finance-export',
        headers: auth(),
        payload: {},
      })
    ).statusCode,
  ).toBe(403)
})
it('allows over-capacity downgraded owners to inspect and revoke without reopening downloads', async () => {
  const { server, calendar } = fixture()
  const input = { action: 'disable', version: 1 }
  expect(
    (await server.inject({ url: '/v1/calendar-integration', headers: auth(other) })).statusCode,
  ).toBe(200)
  expect(
    (
      await server.inject({
        method: 'POST',
        url: '/v1/calendar-integration',
        headers: auth(other),
        payload: input,
      })
    ).statusCode,
  ).toBe(200)
  expect(calendar.change).toHaveBeenCalledWith({ userId: other }, input)
})
it('serves a no-store feed from an unguessable private path', async () => {
  const { server, calendar } = fixture()
  const token = 'a'.repeat(43)
  const result = await server.inject({ url: `/v1/public/calendar/${token}.ics` })
  expect(result.statusCode).toBe(200)
  expect(result.headers['content-type']).toContain('text/calendar')
  expect(result.headers['cache-control']).toBe('no-store, private')
  expect(calendar.feed).toHaveBeenCalledWith(token)
  expect((await server.inject({ url: '/v1/public/calendar.ics' })).statusCode).toBe(404)
})

it('never logs subscription credentials across success, failure and unmatched routes', async () => {
  const lines: string[] = []
  const { server, calendar } = fixture({ stream: { write: (line: string) => lines.push(line) } })
  const token = 'sensitive-calendar-token-marker'.padEnd(43, 'x')
  const headers = { authorization: 'Bearer sensitive-auth-marker', cookie: 'secret-cookie-marker' }
  await server.inject({ url: `/v1/public/calendar/${token}.ics`, headers })
  calendar.feed.mockRejectedValueOnce(new Error(`failed fetching ${token}`))
  expect(
    (await server.inject({ url: `/v1/public/calendar/${token}.ics`, headers })).statusCode,
  ).toBe(500)
  await server.inject({ url: `/v1/public/calendar/${token}/unknown`, headers })
  const output = lines.join('')
  expect(output).toContain('calendar_feed_failed')
  expect(output).toContain('request completed')
  for (const secret of [token, headers.authorization, 'secret-cookie-marker'])
    expect(output).not.toContain(secret)
})

it('returns the changed feed even when the client supplies a previous cache validator', async () => {
  const { server, calendar } = fixture()
  calendar.feed.mockResolvedValueOnce(
    Buffer.from('BEGIN:VCALENDAR\r\nSUMMARY:Prime 方案已到期\r\nEND:VCALENDAR\r\n'),
  )
  const response = await server.inject({
    url: `/v1/public/calendar/${'a'.repeat(43)}.ics`,
    headers: {
      'if-none-match': 'previous-active-feed',
      'if-modified-since': new Date().toUTCString(),
    },
  })
  expect(response.statusCode).toBe(200)
  expect(response.body).toContain('Prime 方案已到期')
  expect(response.headers['cache-control']).toBe('no-store, private')
  expect(calendar.feed).toHaveBeenCalledTimes(1)
})

it('rejects malformed private paths without querying schedules', async () => {
  const { server, calendar } = fixture()
  for (const token of ['short', 'a'.repeat(44), `wrong:${'a'.repeat(37)}`]) {
    const response = await server.inject({
      url: `/v1/public/calendar/${token}.ics`,
    })
    expect(response.statusCode).toBe(404)
    expect(response.headers['cache-control']).toBe('no-store, private')
  }
  expect(calendar.feed).not.toHaveBeenCalled()
})
