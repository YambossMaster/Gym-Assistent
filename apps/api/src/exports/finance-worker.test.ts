import { expect, it } from 'vitest'
import { runFinanceWorker, type FinanceJob } from './finance-worker.js'

const job: FinanceJob = {
  settings: { displayName: 'Synthetic', timeZone: 'Asia/Taipei' },
  now: new Date('2026-10-10'),
  input: { start: '2024-01-01', end: '2024-12-31', format: 'xlsx' },
  source: {
    rows: [
      {
        id: 'manual:test',
        date: '2024-01-01',
        kind: 'manual',
        direction: 'income',
        label: 'synthetic',
        amountMinor: 100,
        currency: 'TWD',
        venueId: null,
        targetRoute: '',
      },
    ],
    venues: [],
    timeZone: 'Asia/Taipei',
    manualNotes: new Map(),
    missing: [],
    untracked: [],
  },
}
it(
  'terminates an aborted worker and can generate again afterward',
  { timeout: 15000 },
  async () => {
    const controller = new AbortController()
    const pending = runFinanceWorker(job, controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ code: 'export_processing_limit' })
    const file = await runFinanceWorker(job, new AbortController().signal)
    expect(file.body.subarray(0, 2).toString()).toBe('PK')
  },
)
it('rejects a pre-aborted request without starting a worker', () => {
  const controller = new AbortController()
  controller.abort()
  expect(() => runFinanceWorker(job, controller.signal)).toThrow()
})
