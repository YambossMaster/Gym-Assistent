import { afterEach, expect, it, vi } from 'vitest'
import { CheckoutModule } from './checkout.js'
import { buildServer } from '../http/server.js'
import { DevelopmentIdentityVerifier } from '../identity/development-identity.js'
import { MemoryStudentRepository } from '../adapters/memory-student-repository.js'
import { AccountLifecycleModule } from '../account-lifecycle/account-lifecycle-module.js'
import { StudentModule } from '../students/student-module.js'
import { TodayModule } from '../today/today-module.js'
import { WorkspaceModule } from '../workspace/workspace-module.js'

const servers: ReturnType<typeof buildServer>[] = []
afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => s.close()))
})
function setup(enabled = true) {
  const repository = new MemoryStudentRepository()
  const quote = vi.fn(async (_identity: { userId: string }, _input: unknown) => ({
    id: 'quote',
    today: { amount: 0, currency: 'TWD' },
  }))
  const checkout = { quote, pending: vi.fn(async () => null) } as unknown as CheckoutModule
  const server = buildServer({
    identityVerifier: new DevelopmentIdentityVerifier(),
    students: new StudentModule({ repository }),
    today: new TodayModule(repository),
    workspace: new WorkspaceModule({ repository }),
    accountLifecycle: new AccountLifecycleModule({
      repository,
      deletionExecutor: { deleteCoach: async () => {} },
    }),
    registrationEmails: { isRegistered: async () => false },
    ...(enabled ? { checkout } : {}),
  })
  servers.push(server)
  return { server, quote }
}
it('requires verified identity before touching checkout, including current-intent recovery', async () => {
  const { server, quote } = setup()
  for (const url of [
    '/v1/billing/quote',
    '/v1/billing/checkouts',
    '/v1/billing/checkouts/current',
    '/v1/billing/checkouts/00000000-0000-4000-8000-000000000001/abandon',
    '/v1/billing/checkouts/00000000-0000-4000-8000-000000000001/submitted',
  ]) {
    const response = await server.inject({
      method: url.endsWith('current') ? 'GET' : 'POST',
      url,
      ...(url.endsWith('current') ? {} : { payload: {} }),
    })
    expect(response.statusCode).toBe(401)
  }
  expect(quote).not.toHaveBeenCalled()
  const response = await server.inject({
    method: 'POST',
    url: '/v1/billing/quote',
    headers: { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000001' },
    payload: { tier: 'basic', interval: 'month' },
  })
  expect(response.statusCode).toBe(200)
  expect(response.headers['cache-control']).toBe('no-store, private')
  expect(quote.mock.calls[0]?.[0]).toEqual({ userId: '00000000-0000-4000-8000-000000000001' })
})
it('does not register checkout routes unless the local module is explicitly provided', async () => {
  const { server } = setup(false)
  expect((await server.inject({ url: '/v1/billing/checkouts/current' })).statusCode).toBe(404)
})
