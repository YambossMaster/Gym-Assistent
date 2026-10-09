import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
}

function send(
  response: ServerResponse,
  status: number,
  headers: Record<string, string>,
  body: string | Buffer,
) {
  response.writeHead(status, headers)
  response.end(body)
}

async function handleApi(
  request: IncomingMessage,
  response: ServerResponse,
  api: URL,
  path: string,
) {
  const controller = new AbortController()
  const disconnected = () => {
    if (!response.writableFinished) controller.abort()
  }
  request.once('aborted', disconnected)
  response.once('close', disconnected)
  try {
    const target = new URL(api)
    target.pathname = path.slice(4) || '/'
    target.search = new URL(request.url ?? '/', 'http://localhost').search
    const forwarded = new Headers()
    for (const [name, value] of Object.entries(request.headers)) {
      if (!value || ['host', 'connection', 'content-length', 'transfer-encoding'].includes(name))
        continue
      if (name.startsWith('x-forwarded-')) continue
      if (name === 'x-site-client-ip') continue
      forwarded.set(name, Array.isArray(value) ? value.join(', ') : value)
    }
    forwarded.set('x-site-client-ip', request.socket.remoteAddress ?? 'unknown')
    const upstream = await fetch(target, {
      method: request.method ?? 'GET',
      headers: forwarded,
      body:
        request.method === 'GET' || request.method === 'HEAD'
          ? undefined
          : (request as unknown as BodyInit),
      duplex: 'half',
      redirect: 'manual',
      signal: controller.signal,
    } as RequestInit & { duplex: 'half' })
    const headers: Record<string, string> = { 'cache-control': 'no-store' }
    for (const [name, value] of upstream.headers) {
      if (['connection', 'content-encoding', 'content-length', 'transfer-encoding'].includes(name))
        continue
      headers[name] = value
    }
    if (path.startsWith('/api/v1/public/')) headers['referrer-policy'] = 'no-referrer'
    send(response, upstream.status, headers, Buffer.from(await upstream.arrayBuffer()))
  } catch {
    if (controller.signal.aborted || response.destroyed) return
    send(
      response,
      502,
      { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      JSON.stringify({ error: 'api_unavailable' }),
    )
  } finally {
    request.removeListener('aborted', disconnected)
    response.removeListener('close', disconnected)
  }
}

export function createSiteServer(webRoot: string, apiOrigin: string) {
  const root = resolve(webRoot)
  const api = new URL(apiOrigin)
  if (api.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(api.hostname)) {
    throw new Error('The internal API must use loopback HTTP')
  }

  return createServer(async (request, response) => {
    const rawPath = (request.url ?? '/').split('?')[0] ?? '/'
    let path: string
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
      await handleApi(request, response, api, path)
      return
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      send(response, 405, { Allow: 'GET, HEAD' }, '')
      return
    }
    if (path.split('/').some((segment) => segment.startsWith('.'))) {
      send(response, 404, { 'Content-Type': 'text/plain' }, 'Not found')
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
      if (path.includes('.') || !request.headers.accept?.includes('text/html')) {
        send(response, 404, { 'Content-Type': 'text/plain' }, 'Not found')
        return
      }
      file = resolve(root, 'index.html')
    }
    try {
      const body = await readFile(file)
      const hashedAsset = path.startsWith('/assets/') && /-[\w]{8,}\./.test(path)
      send(
        response,
        200,
        {
          'Content-Type': contentTypes[extname(file)] ?? 'application/octet-stream',
          'Cache-Control': hashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
          'Referrer-Policy': 'no-referrer',
          ...(path.startsWith('/t/') || path.startsWith('/r/')
            ? { 'X-Robots-Tag': 'noindex, nofollow' }
            : {}),
        },
        request.method === 'HEAD' ? '' : body,
      )
    } catch {
      send(response, 404, { 'Content-Type': 'text/plain' }, 'Not found')
    }
  })
}
