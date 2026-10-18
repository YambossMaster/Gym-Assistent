import { createServer } from 'node:http'

// Temporary Development acceptance proxy: the public tunnel cannot reach other app routes.
const apiPort = Number(process.env.BILLING_TEST_API_PORT ?? '3008')
if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
  throw new Error('Invalid Development billing API port')
}
const upstream = `http://127.0.0.1:${apiPort}/hooks/lemonsqueezy`
const server = createServer(async (request, response) => {
  if (request.method !== 'POST' || request.url !== '/hooks/lemonsqueezy') {
    response.writeHead(404).end()
    return
  }
  try {
    const body: Buffer[] = []
    let length = 0
    for await (const chunk of request) {
      const bytes = Buffer.from(chunk)
      length += bytes.length
      if (length > 262144) {
        response.writeHead(413).end()
        return
      }
      body.push(bytes)
    }
    const result = await fetch(upstream, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-signature': request.headers['x-signature']?.toString() ?? '',
      },
      body: Buffer.concat(body),
      signal: AbortSignal.timeout(10000),
    })
    response.writeHead(result.status, { 'content-type': 'application/json' })
    response.end(await result.text())
  } catch {
    response.writeHead(503).end()
  }
})
server.listen(3009, '127.0.0.1', () => {
  console.log('Development Test Mode webhook-only proxy ready on 127.0.0.1:3009')
})
