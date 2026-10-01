// Local, no-spend routing and memory probe. Never use this as a public server.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
}

function send(response, status, headers, body) {
  response.writeHead(status, headers)
  response.end(body)
}

export function createPrototype({ webRoot, apiOrigin }) {
  const root = resolve(webRoot)
  const api = new URL(apiOrigin)
  if (!['127.0.0.1', 'localhost'].includes(api.hostname)) {
    throw new Error('The prototype API target must be local')
  }

  return createServer(async (request, response) => {
    const rawPath = (request.url ?? '/').split('?')[0]
    let path
    try {
      path = decodeURIComponent(rawPath)
    } catch {
      send(response, 400, { 'Content-Type': 'text/plain' }, 'Bad path')
      return
    }
    if (!path.startsWith('/') || path.includes('\\') || path.includes('\0')) {
      send(response, 400, { 'Content-Type': 'text/plain' }, 'Bad path')
      return
    }

    if (path === '/api' || path.startsWith('/api/')) {
      try {
        const target = new URL(api)
        target.pathname = path.slice(4) || '/'
        target.search = new URL(request.url, 'http://localhost').search
        const upstream = await fetch(target, {
          method: request.method,
          headers: {
            ...Object.fromEntries(
              Object.entries(request.headers).filter(
                ([name]) => !['host', 'connection', 'content-length'].includes(name),
              ),
            ),
          },
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : request,
          duplex: 'half',
          redirect: 'manual',
        })
        const headers = Object.fromEntries(
          [...upstream.headers].filter(
            ([name]) => !['connection', 'transfer-encoding'].includes(name),
          ),
        )
        headers['cache-control'] = 'no-store'
        send(response, upstream.status, headers, Buffer.from(await upstream.arrayBuffer()))
      } catch {
        send(
          response,
          502,
          { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
          JSON.stringify({ error: 'api_unavailable' }),
        )
      }
      return
    }

    if (!['GET', 'HEAD'].includes(request.method)) {
      send(response, 405, { Allow: 'GET, HEAD' }, '')
      return
    }
    const candidate = resolve(root, `.${path}`)
    if (candidate !== root && !candidate.startsWith(root + sep)) {
      send(response, 400, { 'Content-Type': 'text/plain' }, 'Bad path')
      return
    }
    let file = candidate
    try {
      if (!(await stat(file)).isFile()) throw new Error('Not a file')
    } catch {
      // Browser navigation needs the SPA shell; missing assets must stay 404.
      if (path.includes('.') || !request.headers.accept?.includes('text/html')) {
        send(response, 404, { 'Content-Type': 'text/plain' }, 'Not found')
        return
      }
      file = resolve(root, 'index.html')
    }
    try {
      const body = await readFile(file)
      const asset = path.startsWith('/assets/') && /-[\w]{8,}\./.test(path)
      send(
        response,
        200,
        {
          'Content-Type': types[extname(file)] ?? 'application/octet-stream',
          'Cache-Control': asset ? 'public, max-age=31536000, immutable' : 'no-cache',
        },
        request.method === 'HEAD' ? '' : body,
      )
    } catch {
      send(response, 404, { 'Content-Type': 'text/plain' }, 'Not found')
    }
  })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.env.NODE_ENV === 'production') throw new Error('Local prototype only')
  const server = createPrototype({
    webRoot: resolve('apps/web/dist'),
    apiOrigin: process.env.M8_PROTOTYPE_API_ORIGIN ?? 'http://127.0.0.1:3000',
  })
  server.listen(0, '127.0.0.1', () => {
    const address = server.address()
    process.stdout.write(`Local prototype: http://127.0.0.1:${address.port}\n`)
    process.stdout.write(`RSS MiB: ${(process.memoryUsage().rss / 1048576).toFixed(1)}\n`)
  })
}
