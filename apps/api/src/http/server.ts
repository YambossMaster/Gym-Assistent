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

export interface ServerDependencies {
  identityVerifier: IdentityVerifier
  students: StudentModule
  today: TodayModule
  workspace: WorkspaceModule
  accountLifecycle: AccountLifecycleModule
  registrationEmails: RegistrationEmailLookup
  logger?: boolean
}

const createStudentBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 120 },
    phone: { type: 'string', maxLength: 40 },
    goal: { type: 'string', maxLength: 1000 },
    privateNote: { type: 'string', maxLength: 4000 },
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
  workspace,
  accountLifecycle,
  registrationEmails,
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

  server.get('/v1/today', async (request) => {
    const identity = await identityVerifier.verify(request.headers.authorization)
    const projection = await today.get(identity)
    await accountLifecycle.recordActivity(identity)
    return { today: projection }
  })

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
      await accountLifecycle.recordActivity(identity)
      return { detail }
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
