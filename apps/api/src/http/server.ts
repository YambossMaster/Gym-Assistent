import Fastify, { type FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import {
  type IdentityVerifier,
  IdentityVerificationError,
} from '../identity/identity.js'
import { type CreateStudentInput } from '../students/student.js'
import { StudentModule } from '../students/student-module.js'

export interface ServerDependencies {
  identityVerifier: IdentityVerifier
  students: StudentModule
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

export function buildServer({
  identityVerifier,
  students,
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
    if (error && typeof error === 'object' && 'validation' in error && error.validation) {
      const message = error instanceof Error ? error.message : 'Request validation failed'
      return reply.status(400).send({ error: 'invalid_request', message })
    }
    server.log.error(error)
    return reply.status(500).send({ error: 'internal_error', message: 'Unexpected server error' })
  })

  server.get('/health', async () => ({ status: 'ok' }))

  server.get('/v1/students', async (request) => {
    const identity = await identityVerifier.verify(request.headers.authorization)
    return { students: await students.list(identity) }
  })

  server.post<{ Body: CreateStudentInput }>(
    '/v1/students',
    { schema: { body: createStudentBodySchema } },
    async (request, reply) => {
      const identity = await identityVerifier.verify(request.headers.authorization)
      const student = await students.create(identity, request.body)
      return reply.status(201).send({ student })
    },
  )

  return server
}
