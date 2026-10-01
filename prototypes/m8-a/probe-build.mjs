import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { MemoryStudentRepository } from '../../apps/api/dist/adapters/memory-student-repository.js'
import { AccountLifecycleModule } from '../../apps/api/dist/account-lifecycle/account-lifecycle-module.js'
import { buildServer } from '../../apps/api/dist/http/server.js'
import { DevelopmentIdentityVerifier } from '../../apps/api/dist/identity/development-identity.js'
import { StudentModule } from '../../apps/api/dist/students/student-module.js'
import { TodayModule } from '../../apps/api/dist/today/today-module.js'
import { WorkspaceModule } from '../../apps/api/dist/workspace/workspace-module.js'
import { createPrototype } from './same-origin.mjs'

const repository = new MemoryStudentRepository()
const api = buildServer({
  identityVerifier: new DevelopmentIdentityVerifier(),
  students: new StudentModule({ repository }),
  today: new TodayModule(repository),
  workspace: new WorkspaceModule({ repository }),
  accountLifecycle: new AccountLifecycleModule({
    repository,
    deletionExecutor: { deleteCoach: async () => undefined },
  }),
  registrationEmails: { isRegistered: async () => false },
})
await api.listen({ port: 0, host: '127.0.0.1' })
const gateway = createPrototype({
  webRoot: resolve('apps/web/dist'),
  apiOrigin: `http://127.0.0.1:${api.server.address().port}`,
})
await new Promise((done) => gateway.listen(0, '127.0.0.1', done))
try {
  const origin = `http://127.0.0.1:${gateway.address().port}`
  const results = {}
  for (const path of ['/', '/today', '/t/synthetic-token', '/r/synthetic-token', '/api/health']) {
    const response = await fetch(origin + path, { headers: { accept: 'text/html' } })
    results[path] = {
      status: response.status,
      type: response.headers.get('content-type'),
      cache: response.headers.get('cache-control'),
    }
    await response.arrayBuffer()
  }
  const missingApi = await fetch(origin + '/api/missing')
  results['/api/missing'] = {
    status: missingApi.status,
    type: missingApi.headers.get('content-type'),
    cache: missingApi.headers.get('cache-control'),
  }
  const asset = await fetch(origin + '/assets/missing.js')
  results['/assets/missing.js'] = { status: asset.status }
  const denied = await fetch(origin + '/api/v1/students')
  results['/api/v1/students without Auth'] = { status: denied.status }
  const syntheticAuth = { authorization: 'Bearer dev:00000000-0000-4000-8000-000000000001' }
  const allowed = await fetch(origin + '/api/v1/students', { headers: syntheticAuth })
  results['/api/v1/students with synthetic Auth'] = { status: allowed.status }
  const written = await fetch(origin + '/api/v1/students', {
    method: 'POST',
    headers: { ...syntheticAuth, 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'M8-A synthetic probe' }),
  })
  results['POST /api/v1/students with synthetic Auth'] = { status: written.status }
  for (const [path, expected] of Object.entries({
    '/': 200,
    '/today': 200,
    '/t/synthetic-token': 200,
    '/r/synthetic-token': 200,
    '/api/health': 200,
    '/api/missing': 404,
    '/assets/missing.js': 404,
    '/api/v1/students without Auth': 401,
    '/api/v1/students with synthetic Auth': 200,
    'POST /api/v1/students with synthetic Auth': 201,
  })) {
    assert.equal(results[path].status, expected, path)
  }
  assert.equal(results['/api/missing'].cache, 'no-store')
  assert.match(results['/api/missing'].type, /^application\/json/)
  const memory = process.memoryUsage()
  process.stdout.write(
    JSON.stringify(
      {
        results,
        memoryMiB: {
          rss: +(memory.rss / 1048576).toFixed(1),
          heapUsed: +(memory.heapUsed / 1048576).toFixed(1),
        },
        scope:
          'Local static gateway and real Fastify routes with in-memory adapters; excludes PostgreSQL, Supabase Auth, and load',
      },
      null,
      2,
    ) + '\n',
  )
} finally {
  await new Promise((done) => gateway.close(done))
  await api.close()
}
