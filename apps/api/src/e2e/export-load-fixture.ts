import assert from 'node:assert/strict'
import { AddressInfo } from 'node:net'
import { resolve } from 'node:path'
import { MemoryStudentRepository } from '../adapters/memory-student-repository.js'
import { AccountLifecycleModule } from '../account-lifecycle/account-lifecycle-module.js'
import { ExportModule, type ExportData } from '../exports/export-module.js'
import { DevelopmentIdentityVerifier } from '../identity/development-identity.js'
import { PlanAccessModule } from '../plan-access/plan-access.js'
import { StudentModule } from '../students/student-module.js'
import { TodayModule } from '../today/today-module.js'
import { WorkspaceModule } from '../workspace/workspace-module.js'
import { buildServer } from '../http/server.js'
import { createSiteServer } from '../http/site-server.js'

const coachId = '00000000-0000-4000-8000-000000000001'
const repository = new MemoryStudentRepository()
const exports = new ExportModule({} as never)
const rows = Array.from({ length: 500 }, (_, index) => ({
  rowId: `manual:synthetic-${index}`,
  date: '2026-10-05',
  occurredAt: '2026-10-05 09:00:00',
  label: `Synthetic coaching fee ${index}`,
  kind: 'manual',
  direction: index % 2 ? 'expense' : 'income',
  amountMinor: 1000,
  currency: index % 3 ? 'TWD' : 'USD',
  status: 'original',
}))
const data: ExportData = {
  type: 'finance',
  format: 'pdf',
  start: '2026-10-05',
  end: '2026-10-05',
  timeZone: 'Asia/Taipei',
  generatedAt: '2026-10-05T01:00:00.000Z',
  includePrivateNotes: false,
  filters: {},
  columns: [],
  rows,
  records: rows,
}
exports.select = async () => data
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
    get: async () => ({
      grant: { kind: 'permanent' as const, endsAt: null },
      activeStudents: 0,
      activeVenues: 0,
    }),
  }),
  exports,
})

await server.listen({ host: '127.0.0.1', port: 0 })
const apiPort = (server.server.address() as AddressInfo).port
const site = createSiteServer(resolve('..', 'web', 'dist'), `http://127.0.0.1:${apiPort}`)
try {
  await new Promise<void>((resolveReady) => site.listen(0, '127.0.0.1', resolveReady))
  const sitePort = (site.address() as AddressInfo).port
  const started = performance.now()
  const response = await fetch(`http://127.0.0.1:${sitePort}/api/v1/exports`, {
    method: 'POST',
    headers: {
      authorization: `Bearer dev:${coachId}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ type: 'finance', format: 'pdf', start: data.start, end: data.end }),
  })
  const file = Buffer.from(await response.arrayBuffer())
  const milliseconds = Math.round(performance.now() - started)
  assert.equal(response.status, 200)
  assert.equal(file.subarray(0, 4).toString(), '%PDF')
  assert.ok(milliseconds < 30_000, `500-row API/Site PDF exceeded 30 seconds: ${milliseconds}`)
  console.log(JSON.stringify({ rows: rows.length, milliseconds, bytes: file.length }))
} finally {
  await new Promise<void>((resolveClosed) => site.close(() => resolveClosed()))
  await server.close()
}
