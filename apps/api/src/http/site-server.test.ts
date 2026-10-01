import { afterEach, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createSiteServer } from './site-server.js'

const servers: Server[] = []
const directories: string[] = []

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map((server) => new Promise<void>((done) => server.close(() => done()))),
  )
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'gym-site-'))
  directories.push(root)
  await mkdir(join(root, 'assets'))
  await writeFile(join(root, 'index.html'), '<html>SPA</html>')
  await writeFile(join(root, 'sw.js'), 'worker')
  await writeFile(join(root, 'assets', 'main-12345678.js'), 'asset')
  const api = createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json')
    if (request.url === '/health') return response.end('{"status":"ok"}')
    if (request.url === '/v1/write' && request.method === 'POST') {
      let body = ''
      for await (const chunk of request) body += chunk
      return response.end(JSON.stringify({ body, authorized: !!request.headers.authorization }))
    }
    response.statusCode = 404
    response.end('{"error":"not_found"}')
  })
  servers.push(api)
  await new Promise<void>((done) => api.listen(0, '127.0.0.1', done))
  const apiAddress = api.address()
  if (!apiAddress || typeof apiAddress === 'string') throw new Error('API did not bind')
  const site = createSiteServer(root, `http://127.0.0.1:${apiAddress.port}`)
  servers.push(site)
  await new Promise<void>((done) => site.listen(0, '127.0.0.1', done))
  const siteAddress = site.address()
  if (!siteAddress || typeof siteAddress === 'string') throw new Error('Site did not bind')
  return `http://127.0.0.1:${siteAddress.port}`
}

describe('same-origin site server', () => {
  it('keeps API JSON responses and writes under /api without caching', async () => {
    const origin = await fixture()
    const health = await fetch(origin + '/api/health')
    expect(health.status).toBe(200)
    expect(health.headers.get('cache-control')).toBe('no-store')
    expect(await health.json()).toEqual({ status: 'ok' })
    const missing = await fetch(origin + '/api/missing', { headers: { accept: 'text/html' } })
    expect(missing.status).toBe(404)
    expect(await missing.json()).toEqual({ error: 'not_found' })
    const write = await fetch(origin + '/api/v1/write', {
      method: 'POST',
      headers: { authorization: 'Bearer synthetic', 'content-type': 'application/json' },
      body: '{"example":true}',
    })
    expect(write.status).toBe(200)
    expect(await write.json()).toEqual({ body: '{"example":true}', authorized: true })
  })

  it('serves SPA links but not missing or hidden files', async () => {
    const origin = await fixture()
    const link = await fetch(origin + '/t/synthetic-token', { headers: { accept: 'text/html' } })
    expect(link.status).toBe(200)
    expect(await link.text()).toBe('<html>SPA</html>')
    expect((await fetch(origin + '/assets/missing.js')).status).toBe(404)
    expect((await fetch(origin + '/.env', { headers: { accept: 'text/html' } })).status).toBe(404)
  })

  it('caches only hashed assets immutably', async () => {
    const origin = await fixture()
    const asset = await fetch(origin + '/assets/main-12345678.js')
    expect(asset.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    const worker = await fetch(origin + '/sw.js')
    expect(worker.headers.get('cache-control')).toBe('no-cache')
  })
})
