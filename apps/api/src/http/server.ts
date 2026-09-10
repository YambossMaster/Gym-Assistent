import Fastify, { type FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import { type IdentityVerifier, IdentityVerificationError } from '../identity/identity.js'
import { type CreateStudentInput } from '../students/student.js'
import { StudentModule } from '../students/student-module.js'
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
