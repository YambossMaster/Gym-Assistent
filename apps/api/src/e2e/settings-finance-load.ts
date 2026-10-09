// Synthetic serializer load probe; no customer data, database or network.
import assert from 'node:assert/strict'
import { monitorEventLoopDelay } from 'node:perf_hooks'
import { FinanceReportModule } from '../exports/finance-report.js'
import type { FinanceRow } from '../finances/finance.js'

const rows: FinanceRow[] = Array.from({ length: 20000 }, (_, index) => ({
  id: `manual:load-${index}`,
  date: '2024-02-29',
  kind: 'manual',
  label: `合成負載測試 ${index}`,
  amountMinor: 1200,
  currency: 'TWD',
  direction: index % 2 ? 'expense' : 'income',
  targetRoute: '',
  venueId: null,
}))
const report = new FinanceReportModule(
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
  { getSettings: async () => ({ displayName: '合成負載測試', timeZone: 'Asia/Taipei' }) } as never,
)
const lag = monitorEventLoopDelay({ resolution: 20 })
lag.enable()
let peakRss = process.memoryUsage().rss
const timer = setInterval(() => {
  peakRss = Math.max(peakRss, process.memoryUsage().rss)
}, 50)
try {
  const start = performance.now()
  const file = await report.generate(
    { userId: 'synthetic' },
    { start: '2024-01-01', end: '2024-12-31', format: 'xlsx' },
    AbortSignal.timeout(30000),
  )
  const milliseconds = Math.round(performance.now() - start)
  assert.ok(milliseconds < 30000)
  assert.equal(file.body.subarray(0, 2).toString(), 'PK')
  await new Promise<void>((resolve) => setTimeout(resolve, 30))
  assert.ok(lag.max / 1e6 < 1000, 'main-thread delay must remain below one second')
  assert.ok(peakRss < 384 * 1048576, 'serializer process must leave headroom on the 512 MiB host')
  console.log(
    JSON.stringify({
      rows: rows.length,
      milliseconds,
      bytes: file.body.length,
      peakRssMiB: Math.round(peakRss / 1048576),
      maximumEventLoopDelayMs: Math.round(lag.max / 1e6),
      scope: 'local serializer only; not production host or database',
    }),
  )
} finally {
  clearInterval(timer)
  lag.disable()
}
