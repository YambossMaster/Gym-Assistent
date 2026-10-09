// Offline, synthetic product-output fixture. No environment or database access.
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { FinanceReportModule } from '../exports/finance-report.js'
import type { WorkspaceModule } from '../workspace/workspace-module.js'
import type { FinanceRow } from '../finances/finance.js'
import { calendarFile, eventUid, reconcileEvents } from '../calendar-integration/calendar.js'

const directory = resolve(process.argv[2] ?? 'output/settings-data-review')
const now = new Date('2026-10-10T02:00:00Z')
const venueId = '00000000-0000-4000-8000-000000000099'
const base: FinanceRow = {
  id: 'manual:synthetic-income',
  date: '2024-02-29',
  kind: 'manual',
  label: '教練課程收入',
  amountMinor: 12000,
  currency: 'TWD',
  direction: 'income',
  targetRoute: '',
  venueId,
  status: 'manual',
}
const rows: FinanceRow[] = [
  base,
  {
    ...base,
    id: 'manual:synthetic-rent',
    date: '2024-03-01',
    label: '三月場地費用',
    amountMinor: 3000,
    direction: 'expense',
    detail: '三月場租。此列用較長的說明檢查自動換行，下載後仍能閱讀完整內容。',
  },
  {
    ...base,
    id: 'manual:synthetic-credit',
    date: '2024-03-05',
    label: '場地費用沖減',
    amountMinor: -200,
    direction: 'expense',
    status: 'modified',
  },
  {
    ...base,
    id: 'manual:synthetic-jpy',
    date: '2024-03-06',
    label: '外幣收入範例',
    amountMinor: 1234,
    currency: 'JPY',
  },
]
const report = new FinanceReportModule(
  {
    reportSource: async () => ({
      rows,
      venues: [{ id: venueId, name: '範例訓練空間' }],
      timeZone: 'Asia/Taipei',
      manualNotes: new Map(),
      missing: [],
      untracked: [],
    }),
  },
  {
    getSettings: async () => ({ displayName: '呂曉白（範例）', timeZone: 'Asia/Taipei' }),
  } as unknown as Pick<WorkspaceModule, 'getSettings'>,
  () => now,
)
await mkdir(directory, { recursive: true })
for (const format of ['xlsx', 'csv']) {
  const result = await report.generate(
    { userId: 'synthetic-owner' },
    { format, start: '2024-01-01', end: '2024-12-31' },
    new AbortController().signal,
  )
  const path = resolve(directory, result.filename)
  await writeFile(path, result.body)
  console.log(path)
}
const events = reconcileEvents(
  [
    {
      uid: eventUid('session', 'synthetic-example'),
      startsAt: '2026-10-12T01:00:00Z',
      endsAt: '2026-10-12T02:00:00Z',
      summary: '教練課程',
      location: '範例訓練空間',
      cancelled: false,
    },
  ],
  [],
  now,
)
const ics = resolve(directory, '日曆整合_合成樣本.ics')
await writeFile(ics, calendarFile(events))
console.log(ics)
