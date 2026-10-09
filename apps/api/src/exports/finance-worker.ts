import { Worker, parentPort, workerData, isMainThread } from 'node:worker_threads'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import type { FinanceModule } from '../finances/finance-module.js'
import type { FinanceSnapshot } from '../finances/finance.js'
import { ExportError } from './export-module.js'

export type ReportFile = { body: Buffer; filename: string; contentType: string }
export type FinanceJob = {
  input: unknown
  settings: { displayName: string; timeZone: string }
  now: Date
  source?: Awaited<ReturnType<FinanceModule['reportSource']>>
  snapshot?: FinanceSnapshot
}

// Short-lived, bounded workers release private data/heap on success, failure or cancellation.
// Admission is enforced before snapshot retrieval by the HTTP adapter.
export function runFinanceWorker(job: FinanceJob, signal: AbortSignal): Promise<ReportFile> {
  signal.throwIfAborted()
  const entry = new URL(import.meta.url)
  const sourceMode = entry.pathname.endsWith('.ts')
  const loader = sourceMode
    ? pathToFileURL(createRequire(import.meta.url).resolve('tsx/esm/api')).href
    : ''
  const worker = new Worker(
    sourceMode
      ? new URL(
          `data:text/javascript,${encodeURIComponent(`import { tsImport } from ${JSON.stringify(loader)}; await tsImport(${JSON.stringify(entry.href)}, ${JSON.stringify(entry.href)});`)}`,
        )
      : entry,
    {
      workerData: job,
      execArgv: [],
      resourceLimits: { maxOldGenerationSizeMb: 192 },
      env: { TSX_DISABLE_CACHE: '1' },
    },
  )
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (error?: unknown, file?: ReportFile) => {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', abort)
      void worker.terminate().then(() => (error ? reject(error) : resolve(file!)), reject)
    }
    const abort = () => finish(new ExportError(422, 'export_processing_limit'))
    signal.addEventListener('abort', abort, { once: true })
    worker.once('message', (message) => {
      if (message.error) finish(new ExportError(message.status, message.error))
      else finish(undefined, { ...message, body: Buffer.from(message.body) })
    })
    worker.once('error', () => finish(new ExportError(422, 'export_processing_limit')))
    worker.once('exit', () => finish(new ExportError(422, 'export_processing_limit')))
    if (signal.aborted) abort()
  })
}

if (!isMainThread && parentPort) {
  void (async () => {
    const job = workerData as FinanceJob
    try {
      const { FinanceReportModule } = await import('./finance-report.js')
      const { FinanceModule: Finance } = await import('../finances/finance-module.js')
      const finance = job.snapshot
        ? new Finance(
            { resolveWorkspace: async () => 'scoped' },
            {
              snapshot: async () => job.snapshot!,
              command: async () => undefined,
            },
            () => job.now,
          )
        : { reportSource: async () => job.source! }
      const report = new FinanceReportModule(
        finance,
        {
          getSettings: async () => job.settings,
        } as never,
        () => job.now,
      )
      const file = await report.generate(
        { userId: 'scoped' },
        job.input,
        new AbortController().signal,
      )
      const bytes = Uint8Array.from(file.body)
      parentPort!.postMessage({ ...file, body: bytes }, [bytes.buffer])
    } catch (error) {
      parentPort!.postMessage(
        error instanceof ExportError
          ? { status: error.statusCode, error: error.code }
          : { status: 422, error: 'export_processing_limit' },
      )
    }
  })()
}
