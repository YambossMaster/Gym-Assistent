import type { FastifyInstance } from 'fastify'
import type { IdentityVerifier } from '../identity/identity.js'
import type { PlanAccessModule } from '../plan-access/plan-access.js'
import { PlanAccessError } from '../plan-access/plan-access.js'
import type { FinanceReportModule } from './finance-report.js'
import type { PostgresCalendarIntegration } from '../calendar-integration/postgres-calendar.js'
import { ExportError } from './export-module.js'
import { attachment } from './report-common.js'

export function settingsDataRoutes(
  server: FastifyInstance,
  deps: {
    identityVerifier: IdentityVerifier
    planAccess: PlanAccessModule
    financeReport?: FinanceReportModule
    calendarIntegration?: Pick<PostgresCalendarIntegration, 'get' | 'change' | 'download' | 'feed'>
  },
) {
  const busy = new Set<string>(),
    buckets = new Map<string, { count: number; until: number }>()
  let financeBusy = false
  const generating = async <T>(
    key: string,
    work: (signal: AbortSignal) => Promise<T>,
    disconnected?: AbortSignal,
    heavy = false,
  ) => {
    // Bound aggregate memory and leave database-pool headroom for entitlement reads.
    if (busy.has(key) || busy.size >= 2 || (heavy && financeBusy))
      throw new ExportError(422, 'export_busy')
    busy.add(key)
    if (heavy) financeBusy = true
    const controller = new AbortController()
    const abort = () => controller.abort()
    disconnected?.addEventListener('abort', abort, { once: true })
    if (disconnected?.aborted) controller.abort()
    let timer: ReturnType<typeof setTimeout>
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort()
        reject(new ExportError(422, 'export_processing_limit'))
      }, 30000)
    })
    const running = work(controller.signal).finally(() => {
      clearTimeout(timer)
      disconnected?.removeEventListener('abort', abort)
      busy.delete(key)
      if (heavy) financeBusy = false
    })
    return Promise.race([running, deadline])
  }
  for (const [path, work] of [
    [
      '/v1/finance-export',
      deps.financeReport
        ? (id: { userId: string }, body: unknown, signal: AbortSignal) =>
            deps.financeReport!.generate(id, body, signal)
        : undefined,
    ],
    [
      '/v1/calendar-integration/download',
      deps.calendarIntegration
        ? (id: { userId: string }, body: unknown) => deps.calendarIntegration!.download(id, body)
        : undefined,
    ],
  ] as const) {
    if (!work) continue
    server.post(path, async (request, reply) => {
      const id = await deps.identityVerifier.verify(request.headers.authorization)
      if ((await deps.planAccess.get(id)).tier !== 'advanced')
        throw new PlanAccessError('plan_required')
      const disconnected = new AbortController()
      const onClose = () => {
        if (!reply.raw.writableFinished) disconnected.abort()
      }
      reply.raw.once('close', onClose)
      let file
      try {
        file = await generating(
          id.userId,
          (signal) => work(id, request.body, signal),
          disconnected.signal,
          path === '/v1/finance-export',
        )
      } finally {
        reply.raw.removeListener('close', onClose)
      }
      if ((await deps.planAccess.get(id)).tier !== 'advanced')
        throw new PlanAccessError('plan_required')
      return reply
        .type(file.contentType)
        .header('Content-Disposition', attachment(file.filename))
        .send(file.body)
    })
  }
  const calendar = deps.calendarIntegration
  if (!calendar) return
  server.get('/v1/calendar-integration', async (request) =>
    calendar.get(await deps.identityVerifier.verify(request.headers.authorization)),
  )
  server.post('/v1/calendar-integration', async (request) =>
    calendar.change(
      await deps.identityVerifier.verify(request.headers.authorization),
      request.body,
    ),
  )
  server.get<{ Params: { token: string } }>(
    '/v1/public/calendar/:token.ics',
    async (request, reply) => {
      // Per-process burst protection; fixed maximum map size, no raw token in keys or logs.
      const now = Date.now()
      const forwarded = request.headers['x-site-client-ip']
      const key =
        typeof forwarded === 'string' && ['127.0.0.1', '::1'].includes(request.ip)
          ? forwarded
          : request.ip
      for (const [ip, b] of buckets) if (b.until <= now) buckets.delete(ip)
      const bucket = buckets.get(key) ?? { count: 0, until: now + 60000 }
      if ((buckets.size >= 2000 && !buckets.has(key)) || ++bucket.count > 60)
        return reply.code(429).header('Retry-After', '60').send()
      buckets.set(key, bucket)
      const token = request.params.token
      if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return reply.code(404).send({ error: 'not_found' })
      const body = await generating(`feed:${key}`, () => calendar.feed(token))
      return reply.type('text/calendar; charset=utf-8').send(body)
    },
  )
}
