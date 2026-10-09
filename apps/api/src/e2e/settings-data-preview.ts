// Loopback-only, synthetic browser/HTTP review. Never connects to a database or Auth service.
import { MemoryStudentRepository } from '../adapters/memory-student-repository.js'
import { DevelopmentIdentityVerifier } from '../identity/development-identity.js'
import { StudentModule } from '../students/student-module.js'
import { TodayModule } from '../today/today-module.js'
import { WorkspaceModule } from '../workspace/workspace-module.js'
import { AccountLifecycleModule } from '../account-lifecycle/account-lifecycle-module.js'
import { PlanAccessModule } from '../plan-access/plan-access.js'
import { FinanceReportModule } from '../exports/finance-report.js'
import { buildServer } from '../http/server.js'
import { defaultSharing } from '../calendar-integration/calendar.js'
import type { FinanceRow } from '../finances/finance.js'
const repository = new MemoryStudentRepository()
const rows: FinanceRow[] = Array.from({ length: 20000 }, (_, i) => ({
  id: `manual:synthetic-${i}`,
  date: '2026-09-05',
  kind: 'manual',
  label: `合成測試 ${i}`,
  amountMinor: 1200,
  currency: 'TWD',
  direction: i % 2 ? 'expense' : 'income',
  targetRoute: '',
  venueId: null,
}))
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
      grant: { kind: 'permanent', endsAt: null },
      activeStudents: 0,
      activeVenues: 0,
    }),
  }),
  financeReport: new FinanceReportModule(
    {
      reportSource: async () => ({
        rows,
        venues: [],
        timeZone: 'Asia/Taipei',
        manualNotes: new Map(),
        missing: [],
        untracked: [],
      }),
    },
    { getSettings: async () => ({ displayName: '合成測試', timeZone: 'Asia/Taipei' }) } as never,
  ),
  calendarIntegration: {
    get: async () => ({ ...defaultSharing, version: 0, active: false }),
    change: async () => {
      throw new Error('Use the live isolated database test for subscription mutations')
    },
    download: async () => ({
      body: Buffer.from(
        'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Form Coach Desk//Review//EN\r\nEND:VCALENDAR\r\n',
      ),
      filename: '合成行事曆.ics',
      contentType: 'text/calendar; charset=utf-8',
    }),
    feed: async () => {
      throw new Error('No public subscription in synthetic browser fixture')
    },
  },
})
await server.listen({ host: '127.0.0.1', port: 3007 })
console.log('Synthetic Settings preview API: http://127.0.0.1:3007')
