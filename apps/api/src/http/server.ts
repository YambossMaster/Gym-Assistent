import Fastify, { type FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import { type IdentityVerifier, IdentityVerificationError } from '../identity/identity.js'
import {
  type CreateLessonPurchaseInput,
  type CreateStudentInput,
  type UpdateLessonPurchaseInput,
  type UpdateStudentInput,
} from '../students/student.js'
import { StudentModule } from '../students/student-module.js'
import { TodayModule } from '../today/today-module.js'
import { TodayNotificationModule } from '../today/today-notifications.js'
import {
  LessonPurchaseVersionConflictError,
  StudentVersionConflictError,
} from '../students/student-repository.js'
import { WorkspaceVersionConflictError } from '../workspace/workspace-repository.js'
import { WorkspaceModule } from '../workspace/workspace-module.js'
import { type UpdateWorkspaceSettingsInput } from '../workspace/workspace.js'
import { type DeletionRequestInput } from '../account-lifecycle/account-lifecycle.js'
import { AccountLifecycleModule } from '../account-lifecycle/account-lifecycle-module.js'
import { AccountDeletionUnavailableError } from '../account-lifecycle/supabase-account-deletion-executor.js'
import { type RegistrationEmailLookup } from '../account-registration/registration-email-lookup.js'
import { RegistrationLookupUnavailableError } from '../account-registration/supabase-registration-email-lookup.js'
import { SchedulingModule } from '../scheduling/scheduling-module.js'
import {
  SchedulingStudentChangeError,
  SchedulingVersionConflictError,
} from '../scheduling/scheduling-repository.js'
import { TrainingModule } from '../training/training-module.js'
import { TrainingVersionConflictError } from '../training/training-repository.js'
import { PublicAccessModule } from '../public-access/public-access-module.js'
import { PublicCapabilityError, PublicRateLimitError } from '../public-access/public-access.js'
import { DemoImportConflictError, DemoImportModule } from '../demo-import/demo-import.js'

export interface ServerDependencies {
  identityVerifier: IdentityVerifier
  students: StudentModule
  today: TodayModule
  todayNotifications?: TodayNotificationModule
  workspace: WorkspaceModule
  accountLifecycle: AccountLifecycleModule
  registrationEmails: RegistrationEmailLookup
  scheduling?: SchedulingModule
  training?: TrainingModule
  publicAccess?: PublicAccessModule
  demoImport?: DemoImportModule
  logger?: boolean | Record<string, unknown>
}

const studentAgeRangeBodySchema = {
  type: 'string',
  enum: [
    'UNDER_18',
    'AGE_18_24',
    'AGE_25_34',
    'AGE_35_44',
    'AGE_45_54',
    'AGE_55_64',
    'AGE_65_PLUS',
    null,
  ],
  nullable: true,
} as const

const createStudentBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 120 },
    phone: { type: 'string', maxLength: 40 },
    goal: { type: 'string', maxLength: 1000 },
    privateNote: { type: 'string', maxLength: 4000 },
    ageRange: studentAgeRangeBodySchema,
    active: { type: 'boolean' },
    lineLinked: { type: 'boolean' },
  },
} as const

const updateStudentBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'version'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 120 },
    phone: { type: 'string', maxLength: 40 },
    goal: { type: 'string', maxLength: 1000 },
    privateNote: { type: 'string', maxLength: 4000 },
    ageRange: studentAgeRangeBodySchema,
    active: { type: 'boolean' },
    lineLinked: { type: 'boolean' },
    version: { type: 'integer', minimum: 1 },
  },
} as const

const createLessonPurchaseBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['purchasedAt', 'lessonCount', 'amountMinor', 'currency'],
  properties: {
    purchasedAt: { type: 'string', format: 'date-time' },
    lessonCount: { type: 'integer', minimum: 1, maximum: 10000 },
    amountMinor: { type: 'integer', minimum: 0, maximum: 999999999999 },
    currency: { type: 'string', pattern: '^[A-Z]{3}$' },
    privateNote: { type: 'string', maxLength: 4000 },
  },
} as const
const updateLessonPurchaseBodySchema = {
  ...createLessonPurchaseBodySchema,
  required: ['purchasedAt', 'lessonCount', 'amountMinor', 'currency', 'version'],
  properties: {
    ...createLessonPurchaseBodySchema.properties,
    version: { type: 'integer', minimum: 1 },
  },
} as const
const lessonPurchaseDeleteBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['confirmation', 'version'],
  properties: { confirmation: { const: 'DELETE' }, version: { type: 'integer', minimum: 1 } },
} as const

const studentDeleteBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['confirmation', 'version'],
  properties: { confirmation: { const: 'DELETE' }, version: { type: 'integer', minimum: 1 } },
} as const

const deletionConfirmationBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['confirmation'],
  properties: { confirmation: { const: 'DELETE' } },
} as const

const registrationCheckBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['email'],
  properties: {
    email: { type: 'string', format: 'email', maxLength: 320 },
  },
} as const

const updateWorkspaceSettingsBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['displayName', 'timeZone', 'version'],
  properties: {
    displayName: { type: 'string', minLength: 1, maxLength: 120 },
    timeZone: { type: 'string', minLength: 1, maxLength: 64 },
    version: { type: 'integer', minimum: 1 },
  },
} as const

export function buildServer({
  identityVerifier,
  students,
  today,
  todayNotifications,
  workspace,
  accountLifecycle,
  registrationEmails,
  scheduling,
  training,
  publicAccess,
  demoImport,
  logger = false,
}: ServerDependencies): FastifyInstance {
  const server = Fastify({
    logger,
    ajv: { customOptions: { removeAdditional: false } },
  })

  server.setErrorHandler((error, _request, reply) => {
    if (error instanceof IdentityVerificationError) {
      return reply.status(401).send({ error: 'unauthorized', message: error.message })
    }
    if (error instanceof ZodError) {
      return reply.status(400).send({ error: 'invalid_request', message: z.prettifyError(error) })
    }
    if (error instanceof WorkspaceVersionConflictError) {
      return reply.status(409).send({ error: 'version_conflict', message: error.message })
    }
    if (error instanceof StudentVersionConflictError) {
      return reply.status(409).send({ error: 'version_conflict', message: error.message })
    }
    if (error instanceof LessonPurchaseVersionConflictError) {
      return reply.status(409).send({
        error: 'version_conflict',
        reason: 'lesson_purchase_version_conflict',
        message: error.message,
        currentPurchase: error.currentPurchase,
      })
    }
    if (error instanceof SchedulingVersionConflictError) {
      return reply.status(409).send({
        error: 'version_conflict',
        reason: 'scheduling_version_conflict',
        message: error.message,
        current: error.current,
      })
    }
    if (error instanceof SchedulingStudentChangeError) {
      return reply.status(error.reason === 'student_not_found' ? 404 : 400).send({
        error: error.reason,
        message: error.message,
      })
    }
    if (error instanceof TrainingVersionConflictError) {
      return reply.status(409).send({
        error: 'version_conflict',
        reason: error.reason,
        message: 'Training data changed on another device.',
        current: error.current,
      })
    }
    if (error instanceof PublicRateLimitError) {
      return reply
        .header('Retry-After', String(error.retryAfter))
        .status(429)
        .send({ error: 'rate_limited', message: 'Too many requests.' })
    }
    if (error instanceof PublicCapabilityError) {
      return reply.status(error.statusCode).send({
        error: error.reason,
        ...(error.current === undefined ? {} : { current: error.current }),
      })
    }
    if (error instanceof DemoImportConflictError) {
      return reply.status(409).send({ error: error.reason, message: error.message })
    }
    if (error instanceof AccountDeletionUnavailableError) {
      return reply
        .status(503)
        .send({ error: 'account_deletion_unavailable', message: error.message })
    }
    if (error instanceof RegistrationLookupUnavailableError) {
      return reply
        .status(503)
        .send({ error: 'registration_lookup_unavailable', message: error.message })
    }
    if (error && typeof error === 'object' && 'validation' in error && error.validation) {
      const message = error instanceof Error ? error.message : 'Request validation failed'
      return reply.status(400).send({ error: 'invalid_request', message })
    }
    server.log.error(error)
    return reply.status(500).send({ error: 'internal_error', message: 'Unexpected server error' })
  })

  server.get('/health', async () => ({ status: 'ok' }))

  server.addHook('onSend', async (request, reply, payload) => {
    if (
      request.routeOptions.url?.startsWith('/v1/public/') ||
      request.routeOptions.url?.startsWith('/v1/demo-imports')
    ) {
      reply.header('Cache-Control', 'no-store, private')
      reply.header('Pragma', 'no-cache')
      reply.header('Referrer-Policy', 'no-referrer')
      reply.header('X-Robots-Tag', 'noindex, nofollow')
    }
    return payload
  })

  server.post<{ Body: { email: string } }>(
    '/v1/account-registration-check',
    { schema: { body: registrationCheckBodySchema } },
    async (request) => ({ exists: await registrationEmails.isRegistered(request.body.email) }),
  )

  server.get('/v1/students', async (request) => {
    const identity = await identityVerifier.verify(request.headers.authorization)
    const listed = await students.list(identity)
    await accountLifecycle.recordActivity(identity)
    return { students: listed }
  })

  server.get('/v1/lesson-purchase-income', async (request) => {
    const identity = await identityVerifier.verify(request.headers.authorization)
    const income = await students.incomeSummary(identity)
    await accountLifecycle.recordActivity(identity)
    return { income }
  })

  server.get<{ Querystring: { date?: string } }>('/v1/today', async (request) => {
    const identity = await identityVerifier.verify(request.headers.authorization)
    const projection = await today.get(identity)
    await accountLifecycle.recordActivity(identity)
    if (!scheduling) return { today: projection }
    const schedule = await scheduling.today(identity, request.query.date ?? projection.date)
    const plans = training
      ? await training.todayTrainingPlans(
          identity,
          schedule.sessions.map(({ session }) => session.id),
        )
      : {}
    const notifications = todayNotifications
      ? await todayNotifications.list(
          identity,
          projection.attention,
          schedule.date === projection.date ? schedule.conflictAttention : [],
          projection.timeZone,
        )
      : []
    return {
      today: {
        ...projection,
        notifications,
        schedule: {
          ...schedule,
          sessions: schedule.sessions.map((item) => ({
            ...item,
            ...(plans[item.session.id] ? { trainingPlan: plans[item.session.id] } : {}),
          })),
        },
      },
    }
  })

  if (todayNotifications) {
    server.post<{ Body: unknown }>('/v1/today/notifications/read', async (request, reply) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      const { id } = z
        .object({ id: z.string().min(1).max(160) })
        .strict()
        .parse(request.body)
      const projection = await today.get(identity)
      const schedule = scheduling ? await scheduling.today(identity, projection.date) : null
      const readAt = await todayNotifications.read(
        identity,
        id,
        projection.attention,
        schedule?.conflictAttention ?? [],
        projection.timeZone,
      )
      if (!readAt) return reply.status(404).send({ error: 'notification_not_found' })
      await accountLifecycle.recordActivity(identity)
      return { id, readAt }
    })
    server.post<{ Body: unknown }>('/v1/today/notifications/dismiss', async (request, reply) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      const { id } = z
        .object({ id: z.string().min(1).max(160) })
        .strict()
        .parse(request.body)
      const projection = await today.get(identity)
      const schedule = scheduling ? await scheduling.today(identity, projection.date) : null
      const dismissed = await todayNotifications.dismiss(
        identity,
        id,
        projection.attention,
        schedule?.conflictAttention ?? [],
        projection.timeZone,
      )
      if (!dismissed) return reply.status(404).send({ error: 'notification_not_found' })
      await accountLifecycle.recordActivity(identity)
      return { id }
    })
  }

  if (scheduling) {
    server.get<{ Querystring: { start: string; end: string } }>('/v1/calendar', async (request) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      const calendar = await scheduling.calendar(identity, request.query)
      await accountLifecycle.recordActivity(identity)
      return { calendar }
    })
    server.post<{ Body: unknown }>('/v1/sessions', async (request, reply) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      const session = await scheduling.createSession(identity, request.body)
      if (!session)
        return reply
          .status(404)
          .send({ error: 'student_not_found', message: 'Student was not found.' })
      await accountLifecycle.recordActivity(identity)
      return reply.status(201).send(session)
    })
    server.get<{ Params: { sessionId: string } }>(
      '/v1/sessions/:sessionId',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const detail = await scheduling.session(identity, request.params.sessionId)
        if (!detail)
          return reply
            .status(404)
            .send({ error: 'session_not_found', message: 'Course Session was not found.' })
        await accountLifecycle.recordActivity(identity)
        return detail
      },
    )
    server.get<{ Params: { studentId: string } }>(
      '/v1/students/:studentId/schedule-series',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const series = await scheduling.listSeries(identity, request.params.studentId)
        if (!series)
          return reply
            .status(404)
            .send({ error: 'student_not_found', message: 'Student was not found.' })
        await accountLifecycle.recordActivity(identity)
        return { series }
      },
    )
    server.post<{ Params: { studentId: string }; Body: unknown }>(
      '/v1/students/:studentId/schedule-series',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const created = await scheduling.createSeries(
          identity,
          request.params.studentId,
          request.body,
        )
        if (!created)
          return reply
            .status(404)
            .send({ error: 'student_not_found', message: 'Student was not found.' })
        await accountLifecycle.recordActivity(identity)
        return reply.status(201).send(created)
      },
    )
    server.patch<{ Params: { seriesId: string }; Body: unknown }>(
      '/v1/schedule-series/:seriesId',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const series = await scheduling.updateSeries(
          identity,
          request.params.seriesId,
          request.body,
        )
        if (!series)
          return reply
            .status(404)
            .send({ error: 'schedule_series_not_found', message: 'Schedule Series was not found.' })
        await accountLifecycle.recordActivity(identity)
        return series
      },
    )
    server.delete<{ Params: { seriesId: string }; Body: unknown }>(
      '/v1/schedule-series/:seriesId',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const deleted = await scheduling.deleteSeries(
          identity,
          request.params.seriesId,
          request.body,
        )
        if (!deleted)
          return reply
            .status(404)
            .send({ error: 'schedule_series_not_found', message: 'Schedule Series was not found.' })
        await accountLifecycle.recordActivity(identity)
        return deleted
      },
    )
    server.post<{ Params: { studentId: string } }>(
      '/v1/students/:studentId/schedule-series/reconcile',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const sessions = await scheduling.reconcileSeries(identity, request.params.studentId)
        if (!sessions)
          return reply
            .status(404)
            .send({ error: 'student_not_found', message: 'Student was not found.' })
        await accountLifecycle.recordActivity(identity)
        return { generatedIds: sessions.map((session) => session.id), sessions }
      },
    )
    server.patch<{ Params: { sessionId: string }; Body: unknown }>(
      '/v1/sessions/:sessionId',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const session = await scheduling.updateSession(
          identity,
          request.params.sessionId,
          request.body,
        )
        if (!session)
          return reply
            .status(404)
            .send({ error: 'session_not_found', message: 'Course Session was not found.' })
        await accountLifecycle.recordActivity(identity)
        return session
      },
    )
    server.post<{ Params: { sessionId: string }; Body: unknown }>(
      '/v1/sessions/:sessionId/transition',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const session = await scheduling.transitionSession(
          identity,
          request.params.sessionId,
          request.body,
        )
        if (!session)
          return reply
            .status(404)
            .send({ error: 'session_not_found', message: 'Course Session was not found.' })
        await accountLifecycle.recordActivity(identity)
        return session
      },
    )
    server.post<{ Body: unknown }>('/v1/calendar-blocks', async (request, reply) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      const blocks = await scheduling.createBlock(identity, request.body)
      await accountLifecycle.recordActivity(identity)
      return reply.status(201).send({ blocks })
    })
    server.patch<{ Params: { blockId: string }; Body: unknown }>(
      '/v1/calendar-blocks/:blockId',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const blocks = await scheduling.updateBlock(identity, request.params.blockId, request.body)
        if (!blocks)
          return reply
            .status(404)
            .send({ error: 'calendar_block_not_found', message: 'Calendar Block was not found.' })
        await accountLifecycle.recordActivity(identity)
        return { blocks }
      },
    )
    server.delete<{ Params: { blockId: string }; Body: unknown }>(
      '/v1/calendar-blocks/:blockId',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const deleted = await scheduling.deleteBlock(identity, request.params.blockId, request.body)
        if (deleted === null)
          return reply
            .status(404)
            .send({ error: 'calendar_block_not_found', message: 'Calendar Block was not found.' })
        await accountLifecycle.recordActivity(identity)
        return reply.status(204).send()
      },
    )
    server.put<{ Params: { weekday: number }; Body: unknown }>(
      '/v1/availability/rules/:weekday',
      async (request) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const availability = await scheduling.replaceAvailability(
          identity,
          'rule',
          request.params.weekday,
          request.body,
        )
        await accountLifecycle.recordActivity(identity)
        return { availability }
      },
    )
    server.put<{ Params: { date: string }; Body: unknown }>(
      '/v1/availability/overrides/:date',
      async (request) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const availability = await scheduling.replaceAvailability(
          identity,
          'override',
          request.params.date,
          request.body,
        )
        await accountLifecycle.recordActivity(identity)
        return { availability }
      },
    )
    server.delete<{ Params: { sessionId: string }; Body: unknown }>(
      '/v1/sessions/:sessionId',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const deleted = await scheduling.deleteSession(
          identity,
          request.params.sessionId,
          request.body,
        )
        if (!deleted)
          return reply
            .status(404)
            .send({ error: 'session_not_found', message: 'Course Session was not found.' })
        await accountLifecycle.recordActivity(identity)
        return reply.status(204).send()
      },
    )
  }

  if (training) {
    server.get<{
      Querystring: {
        q?: string
        equipment?: string
        bodyPart?: string | string[]
        movementType?: string
        view?: string
      }
    }>('/v1/exercises', async (request) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      const bodyParts = request.query.bodyPart
        ? Array.isArray(request.query.bodyPart)
          ? request.query.bodyPart
          : [request.query.bodyPart]
        : undefined
      const library = await training.listDefinitions(identity, {
        ...(request.query.q ? { q: request.query.q } : {}),
        ...(request.query.equipment ? { equipment: request.query.equipment } : {}),
        ...(bodyParts ? { bodyParts } : {}),
        ...(request.query.movementType ? { movementType: request.query.movementType } : {}),
        ...(request.query.view ? { view: request.query.view } : {}),
      })
      await accountLifecycle.recordActivity(identity)
      return library
    })
    server.post<{ Body: unknown }>('/v1/exercises', async (request, reply) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      const definition = await training.createDefinition(identity, request.body)
      await accountLifecycle.recordActivity(identity)
      return reply.status(201).send({ definition })
    })
    server.patch<{ Params: { definitionId: string }; Body: unknown }>(
      '/v1/exercises/:definitionId',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const definition = await training.updateDefinition(
          identity,
          request.params.definitionId,
          request.body,
        )
        if (!definition)
          return reply
            .status(404)
            .send({ error: 'exercise_not_found', message: 'Exercise was not found.' })
        await accountLifecycle.recordActivity(identity)
        return { definition }
      },
    )
    server.put<{ Params: { definitionId: string }; Body: unknown }>(
      '/v1/exercises/:definitionId/favorite',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const definition = await training.favoriteDefinition(
          identity,
          request.params.definitionId,
          request.body,
        )
        if (!definition)
          return reply
            .status(404)
            .send({ error: 'exercise_not_found', message: 'Exercise was not found.' })
        await accountLifecycle.recordActivity(identity)
        return { definition }
      },
    )
    server.delete<{ Params: { definitionId: string }; Body: unknown }>(
      '/v1/exercises/:definitionId',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const deleted = await training.deleteDefinition(
          identity,
          request.params.definitionId,
          request.body,
        )
        if (!deleted)
          return reply
            .status(404)
            .send({ error: 'exercise_not_found', message: 'Exercise was not found.' })
        await accountLifecycle.recordActivity(identity)
        return reply.status(204).send()
      },
    )
    server.get('/v1/training/preferences', async (request) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      return { preference: await training.getPreference(identity) }
    })
    server.put<{ Params: { definitionId: string }; Body: unknown }>(
      '/v1/exercises/:definitionId/metrics',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const definition = await training.setProgressMetrics(
          identity,
          request.params.definitionId,
          request.body,
        )
        if (!definition)
          return reply
            .status(404)
            .send({ error: 'exercise_not_found', message: 'Exercise was not found.' })
        await accountLifecycle.recordActivity(identity)
        return { definition }
      },
    )
    server.put<{ Body: unknown }>('/v1/training/preferences', async (request) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      const preference = await training.setPreference(identity, request.body)
      await accountLifecycle.recordActivity(identity)
      return { preference }
    })
    server.get<{ Params: { sessionId: string } }>(
      '/v1/sessions/:sessionId/training',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const workspace = await training.getSessionTraining(identity, request.params.sessionId)
        if (!workspace)
          return reply
            .status(404)
            .send({ error: 'session_not_found', message: 'Course Session was not found.' })
        await accountLifecycle.recordActivity(identity)
        return { training: workspace }
      },
    )
    server.put<{ Params: { sessionId: string }; Body: unknown }>(
      '/v1/sessions/:sessionId/training',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const workspace = await training.saveSessionTraining(
          identity,
          request.params.sessionId,
          request.body,
        )
        if (!workspace)
          return reply
            .status(404)
            .send({ error: 'session_not_found', message: 'Course Session was not found.' })
        await accountLifecycle.recordActivity(identity)
        return { training: workspace }
      },
    )
    server.post<{ Params: { sessionId: string }; Body: unknown }>(
      '/v1/sessions/:sessionId/training/complete',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const workspace = await training.saveSessionTraining(
          identity,
          request.params.sessionId,
          request.body,
          true,
        )
        if (!workspace)
          return reply
            .status(404)
            .send({ error: 'session_not_found', message: 'Course Session was not found.' })
        await accountLifecycle.recordActivity(identity)
        return { training: workspace }
      },
    )
    server.get<{
      Params: { sessionId: string }
      Querystring: { definitionId: string; metric: string }
    }>('/v1/sessions/:sessionId/training/defaults', async (request, reply) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      const defaults = await training.getDefaults(
        identity,
        request.params.sessionId,
        request.query.definitionId,
        request.query.metric,
      )
      if (!defaults)
        return reply
          .status(404)
          .send({ error: 'session_not_found', message: 'Course Session was not found.' })
      return { defaults }
    })
    server.get<{ Params: { studentId: string } }>(
      '/v1/students/:studentId/performance',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const performance = await training.getStudentPerformance(identity, request.params.studentId)
        if (!performance)
          return reply
            .status(404)
            .send({ error: 'student_not_found', message: 'Student was not found.' })
        return { performance }
      },
    )
    server.get<{
      Params: { studentId: string; definitionId: string }
      Querystring: { metric: string }
    }>('/v1/students/:studentId/performance/:definitionId', async (request, reply) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      const trend = await training.getStudentTrend(
        identity,
        request.params.studentId,
        request.params.definitionId,
        request.query.metric,
      )
      if (!trend)
        return reply
          .status(404)
          .send({ error: 'student_not_found', message: 'Student was not found.' })
      return { trend }
    })
  }

  if (publicAccess) {
    server.get<{ Params: { sessionId: string } }>(
      '/v1/sessions/:sessionId/capability-links',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const links = await publicAccess.list(identity, request.params.sessionId)
        if (!links)
          return reply
            .status(404)
            .send({ error: 'session_not_found', message: 'Course Session was not found.' })
        await accountLifecycle.recordActivity(identity)
        return { links }
      },
    )
    server.post<{ Params: { sessionId: string }; Body: unknown }>(
      '/v1/sessions/:sessionId/capability-links',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const issued = await publicAccess.issue(identity, request.params.sessionId, request.body)
        if (!issued)
          return reply
            .status(404)
            .send({ error: 'session_not_found', message: 'Course Session was not found.' })
        await accountLifecycle.recordActivity(identity)
        return reply.status(201).send(issued)
      },
    )
    server.post<{ Params: { linkId: string }; Body: unknown }>(
      '/v1/capability-links/:linkId/reissue',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const issued = await publicAccess.reissue(identity, request.params.linkId, request.body)
        if (!issued)
          return reply
            .status(404)
            .send({ error: 'capability_link_not_found', message: 'Capability Link was not found.' })
        await accountLifecycle.recordActivity(identity)
        return reply.status(201).send(issued)
      },
    )
    server.post<{ Params: { linkId: string }; Body: unknown }>(
      '/v1/capability-links/:linkId/revoke',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const link = await publicAccess.revoke(identity, request.params.linkId, request.body)
        if (!link)
          return reply
            .status(404)
            .send({ error: 'capability_link_not_found', message: 'Capability Link was not found.' })
        await accountLifecycle.recordActivity(identity)
        return { link }
      },
    )
    server.get('/v1/public/training-result', async (request) => ({
      trainingResult: await publicAccess.trainingResult(
        capabilityHeader(request.headers['x-capability-token']),
        request.ip,
      ),
    }))
    server.get('/v1/public/reschedule', async (request) => ({
      reschedule: await publicAccess.reschedule(
        capabilityHeader(request.headers['x-capability-token']),
        request.ip,
      ),
    }))
    server.post<{ Body: unknown }>('/v1/public/reschedule/redeem', async (request) => ({
      ...(await publicAccess.redeem(
        capabilityHeader(request.headers['x-capability-token']),
        request.ip,
        request.body,
      )),
    }))
  }

  if (demoImport) {
    server.post<{ Body: unknown }>(
      '/v1/demo-imports/previews',
      { bodyLimit: 10 * 1024 * 1024 },
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const preview = await demoImport.preview(identity, request.body)
        await accountLifecycle.recordActivity(identity)
        return reply.status(201).send({ preview })
      },
    )
    server.post<{ Body: unknown }>('/v1/demo-imports', async (request, reply) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      const importRun = await demoImport.create(identity, request.body)
      await accountLifecycle.recordActivity(identity)
      return reply.status(202).send({ importRun })
    })
    server.get<{ Params: { importId: string } }>(
      '/v1/demo-imports/:importId',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const importRun = await demoImport.get(identity, request.params.importId)
        if (!importRun)
          return reply
            .status(404)
            .send({ error: 'demo_import_not_found', message: 'Demo import was not found.' })
        return { importRun }
      },
    )
    server.post<{ Params: { importId: string } }>(
      '/v1/demo-imports/:importId/continue',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const importRun = await demoImport.continue(identity, request.params.importId)
        if (!importRun)
          return reply
            .status(404)
            .send({ error: 'demo_import_not_found', message: 'Demo import was not found.' })
        await accountLifecycle.recordActivity(identity)
        return { importRun }
      },
    )
    server.post<{ Params: { importId: string }; Body: unknown }>(
      '/v1/demo-imports/:importId/rollback',
      async (request, reply) => {
        const identity = await identityVerifier.verify(request.headers.authorization)
        const importRun = await demoImport.rollback(identity, request.params.importId, request.body)
        if (!importRun)
          return reply
            .status(404)
            .send({ error: 'demo_import_not_found', message: 'Demo import was not found.' })
        await accountLifecycle.recordActivity(identity)
        return { importRun }
      },
    )
  }

  server.get('/v1/workspace-settings', async (request) => {
    const identity = await identityVerifier.verify(request.headers.authorization)
    const settings = await workspace.getSettings(identity)
    await accountLifecycle.recordActivity(identity)
    return { settings }
  })

  server.patch<{ Body: UpdateWorkspaceSettingsInput }>(
    '/v1/workspace-settings',
    { schema: { body: updateWorkspaceSettingsBodySchema } },
    async (request) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      const settings = await workspace.updateSettings(identity, request.body)
      await accountLifecycle.recordActivity(identity)
      return { settings }
    },
  )

  server.post<{ Body: CreateStudentInput }>(
    '/v1/students',
    { schema: { body: createStudentBodySchema } },
    async (request, reply) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      const student = await students.create(identity, request.body)
      await accountLifecycle.recordActivity(identity)
      return reply.status(201).send({ student })
    },
  )

  server.get<{ Params: { studentId: string } }>(
    '/v1/students/:studentId',
    async (request, reply) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      const detail = await students.detail(identity, request.params.studentId)
      if (!detail)
        return reply
          .status(404)
          .send({ error: 'student_not_found', message: 'Student was not found.' })
      const schedule = scheduling
        ? await scheduling.studentSchedule(identity, request.params.studentId)
        : undefined
      await accountLifecycle.recordActivity(identity)
      return { detail: schedule ? { ...detail, schedule } : detail }
    },
  )

  server.patch<{ Params: { studentId: string }; Body: UpdateStudentInput }>(
    '/v1/students/:studentId',
    { schema: { body: updateStudentBodySchema } },
    async (request, reply) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      const student = await students.update(identity, request.params.studentId, request.body)
      if (!student)
        return reply
          .status(404)
          .send({ error: 'student_not_found', message: 'Student was not found.' })
      await accountLifecycle.recordActivity(identity)
      return { student }
    },
  )

  server.post<{ Params: { studentId: string }; Body: CreateLessonPurchaseInput }>(
    '/v1/students/:studentId/lesson-purchases',
    { schema: { body: createLessonPurchaseBodySchema } },
    async (request, reply) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      const purchase = await students.createLessonPurchase(
        identity,
        request.params.studentId,
        request.body,
      )
      if (!purchase)
        return reply
          .status(404)
          .send({ error: 'student_not_found', message: 'Student was not found.' })
      if (scheduling) await scheduling.reconcileSeries(identity, request.params.studentId)
      await accountLifecycle.recordActivity(identity)
      return reply.status(201).send({ purchase })
    },
  )

  server.patch<{
    Params: { studentId: string; purchaseId: string }
    Body: UpdateLessonPurchaseInput
  }>(
    '/v1/students/:studentId/lesson-purchases/:purchaseId',
    { schema: { body: updateLessonPurchaseBodySchema } },
    async (request, reply) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      const purchase = await students.updateLessonPurchase(
        identity,
        request.params.studentId,
        request.params.purchaseId,
        request.body,
      )
      if (!purchase)
        return reply
          .status(404)
          .send({ error: 'purchase_not_found', message: 'Lesson Purchase was not found.' })
      if (scheduling) await scheduling.reconcileSeries(identity, request.params.studentId)
      await accountLifecycle.recordActivity(identity)
      return { purchase }
    },
  )

  server.delete<{
    Params: { studentId: string; purchaseId: string }
    Body: { confirmation: string; version: number }
  }>(
    '/v1/students/:studentId/lesson-purchases/:purchaseId',
    { schema: { body: lessonPurchaseDeleteBodySchema } },
    async (request, reply) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      const deleted = await students.deleteLessonPurchase(
        identity,
        request.params.studentId,
        request.params.purchaseId,
        request.body.version,
      )
      if (!deleted)
        return reply
          .status(404)
          .send({ error: 'purchase_not_found', message: 'Lesson Purchase was not found.' })
      if (scheduling) await scheduling.reconcileSeries(identity, request.params.studentId)
      await accountLifecycle.recordActivity(identity)
      return reply.status(204).send()
    },
  )

  server.delete<{ Params: { studentId: string }; Body: { confirmation: string; version: number } }>(
    '/v1/students/:studentId',
    { schema: { body: studentDeleteBodySchema } },
    async (request, reply) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      const deleted = await students.delete(
        identity,
        request.params.studentId,
        request.body.version,
      )
      if (!deleted)
        return reply
          .status(404)
          .send({ error: 'student_not_found', message: 'Student was not found.' })
      await accountLifecycle.recordActivity(identity)
      return reply.status(204).send()
    },
  )

  server.get('/v1/account-lifecycle', async (request) => {
    const identity = await identityVerifier.verify(request.headers.authorization)
    return { lifecycle: await accountLifecycle.getStatus(identity) }
  })

  server.post<{ Body: DeletionRequestInput }>(
    '/v1/account-deletion-request',
    { schema: { body: deletionConfirmationBodySchema } },
    async (request) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      return { lifecycle: await accountLifecycle.requestDeletion(identity, request.body) }
    },
  )

  server.delete('/v1/account-deletion-request', async (request) => {
    const identity = await identityVerifier.verify(request.headers.authorization)
    return { lifecycle: await accountLifecycle.cancelDeletion(identity) }
  })

  server.delete<{ Body: DeletionRequestInput }>(
    '/v1/account',
    { schema: { body: deletionConfirmationBodySchema } },
    async (request, reply) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      await accountLifecycle.deleteImmediately(identity, request.body)
      return reply.status(204).send()
    },
  )

  return server
}

function capabilityHeader(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : ''
}
