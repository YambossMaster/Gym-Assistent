import type { FastifyInstance } from 'fastify'
import type { IdentityVerifier } from '../identity/identity.js'
import type { CheckoutModule } from './checkout.js'

export function checkoutRoutes(
  server: FastifyInstance,
  identity: IdentityVerifier,
  checkout: CheckoutModule,
) {
  // Registration is local-only. The normal API identity/plan/legal hooks still apply.
  server.post('/v1/billing/quote', { bodyLimit: 2048 }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store, private')
    return checkout.quote(await identity.verify(request.headers.authorization), request.body)
  })
  server.post('/v1/billing/checkouts', { bodyLimit: 2048 }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store, private')
    return checkout.begin(await identity.verify(request.headers.authorization), request.body)
  })
  server.get('/v1/billing/checkouts/current', async (request, reply) => {
    reply.header('Cache-Control', 'no-store, private')
    return { current: await checkout.pending(await identity.verify(request.headers.authorization)) }
  })
  server.get<{ Params: { id: string } }>('/v1/billing/checkouts/:id', async (request, reply) => {
    reply.header('Cache-Control', 'no-store, private')
    return checkout.intent(await identity.verify(request.headers.authorization), request.params.id)
  })
  server.post<{ Params: { id: string } }>(
    '/v1/billing/checkouts/:id/submitted',
    { bodyLimit: 2 },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store, private')
      return checkout.submitted(
        await identity.verify(request.headers.authorization),
        request.params.id,
      )
    },
  )
  server.post<{ Params: { id: string } }>(
    '/v1/billing/checkouts/:id/abandon',
    { bodyLimit: 2 },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store, private')
      return checkout.abandon(
        await identity.verify(request.headers.authorization),
        request.params.id,
      )
    },
  )
}
