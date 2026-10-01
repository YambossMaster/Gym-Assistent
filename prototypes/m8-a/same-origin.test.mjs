import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { createPrototype } from './same-origin.mjs'

const root = await mkdtemp(join(tmpdir(), 'gym-m8-a-'))
await mkdir(join(root, 'assets'))
await writeFile(join(root, 'index.html'), '<html>SPA</html>')
await writeFile(join(root, 'sw.js'), 'self.addEventListener("fetch", () => {})')
await writeFile(join(root, 'assets', 'app-12345678.js'), 'console.log("asset")')

const api = createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json')
  if (request.url === '/health') response.end('{"status":"ok"}')
  else if (request.url === '/v1/write' && request.method === 'POST') {
    let body = ''
    request.on('data', (chunk) => (body += chunk))
    request.on('end', () =>
      response.end(JSON.stringify({ body, authorized: !!request.headers.authorization })),
    )
  } else {
    response.statusCode = 404
    response.end('{"error":"not_found"}')
  }
})
await new Promise((resolve) => api.listen(0, '127.0.0.1', resolve))
const gateway = createPrototype({
  webRoot: root,
  apiOrigin: `http://127.0.0.1:${api.address().port}`,
})
await new Promise((resolve) => gateway.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${gateway.address().port}`

after(async () => {
  await new Promise((resolve) => gateway.close(resolve))
  await new Promise((resolve) => api.close(resolve))
  await rm(root, { recursive: true, force: true })
})

test('API stays JSON and is not cached, including unknown routes', async () => {
  const health = await fetch(`${origin}/api/health`)
  assert.equal(health.status, 200)
  assert.equal(health.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await health.json(), { status: 'ok' })
  const missing = await fetch(`${origin}/api/missing`, { headers: { accept: 'text/html' } })
  assert.equal(missing.status, 404)
  assert.deepEqual(await missing.json(), { error: 'not_found' })
})

test('same-origin write forwards body and authorization', async () => {
  const response = await fetch(`${origin}/api/v1/write`, {
    method: 'POST',
    headers: { authorization: 'Bearer synthetic', 'content-type': 'application/json' },
    body: '{"example":true}',
  })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { body: '{"example":true}', authorized: true })
})

test('public deep links get the SPA, while missing assets stay 404', async () => {
  const link = await fetch(`${origin}/t/test-token`, { headers: { accept: 'text/html' } })
  assert.equal(link.status, 200)
  assert.equal(await link.text(), '<html>SPA</html>')
  assert.equal(link.headers.get('cache-control'), 'no-cache')
  assert.equal((await fetch(`${origin}/assets/missing.js`)).status, 404)
})

test('hashed assets are immutable, service worker revalidates', async () => {
  const asset = await fetch(`${origin}/assets/app-12345678.js`)
  assert.equal(asset.headers.get('cache-control'), 'public, max-age=31536000, immutable')
  const worker = await fetch(`${origin}/sw.js`)
  assert.equal(worker.headers.get('cache-control'), 'no-cache')
})
