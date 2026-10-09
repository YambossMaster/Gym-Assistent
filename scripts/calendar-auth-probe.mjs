// Disposable synthetic-only compatibility probe. Never load application env files or databases.
// Public listener exposes only four exact synthetic ICS routes; control port is loopback-only.
import { createServer } from 'node:http'
import { randomBytes, timingSafeEqual } from 'node:crypto'

const secret = randomBytes(32).toString('base64url')
const expected = Buffer.from(`Basic ${Buffer.from(`form:${secret}`).toString('base64')}`)
const started = new Date()
const stamp = started
  .toISOString()
  .replace(/[-:]/g, '')
  .replace(/\.\d{3}Z$/, 'Z')
const day = stamp.slice(0, 8)
const next = new Date(
  Date.UTC(started.getUTCFullYear(), started.getUTCMonth(), started.getUTCDate() + 1),
)
  .toISOString()
  .slice(0, 10)
  .replaceAll('-', '')
const events = []
let expired = false
const routes = new Map([
  ['/google/calendar.ics', 'google-basic'],
  [`/v1/public/calendar/${secret}.ics`, 'google-private-path'],
  ['/apple/calendar.ics', 'apple-basic'],
  ['/control/calendar.ics', 'public-control'],
])
function feed(label) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Form Synthetic Compatibility Probe//EN',
    `X-WR-CALNAME:FORM TEST ${label}`,
    'BEGIN:VEVENT',
    `UID:${expired ? 'expiry' : 'fixture'}-${label}@form-synthetic.invalid`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day}`,
    `DTEND;VALUE=DATE:${next}`,
    'SEQUENCE:0',
    `SUMMARY:${expired ? 'Prime 方案已到期（合成測試）' : `FORM BASIC AUTH TEST ${label}`}`,
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}
const publicServer = createServer({ maxHeaderSize: 8192 }, (req, res) => {
  res.setHeader('Cache-Control', 'no-store, private')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  const label = routes.get(req.url)
  if (!label || !['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(404).end()
    return
  }
  const actual = Buffer.from(req.headers.authorization ?? '')
  const authenticated = actual.length === expected.length && timingSafeEqual(actual, expected)
  const allowed = label === 'public-control' || label === 'google-private-path' || authenticated
  const ua = req.headers['user-agent'] ?? ''
  const entry = {
    at: new Date().toISOString(),
    route: label,
    authPresent: !!actual.length,
    authenticated,
    status: allowed ? 200 : 401,
    client: /Google/i.test(ua)
      ? 'google'
      : /Calendar|iOS|Darwin/i.test(ua)
        ? 'apple-like'
        : 'other',
    expired,
  }
  if (events.length < 500) events.push(entry)
  console.log(JSON.stringify(entry)) // Allowlist only: no URL, IP, headers or credential values.
  if (!allowed) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Form Calendar", charset="UTF-8"')
    res.writeHead(401).end()
    return
  }
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.writeHead(200).end(req.method === 'HEAD' ? undefined : feed(label))
})
const controlServer = createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json')
  if (req.method === 'GET' && req.url === '/setup') {
    res.end(
      JSON.stringify({
        username: 'form',
        disposableSecret: secret,
        expiresAt: new Date(+started + 3600000),
      }),
    )
  } else if (req.method === 'GET' && req.url === '/status') {
    res.end(JSON.stringify({ started, expired, events }))
  } else if (
    req.method === 'POST' &&
    req.url === '/expire' &&
    req.headers['content-type'] === 'application/json'
  ) {
    expired = true
    res.end(JSON.stringify({ expired }))
  } else {
    res.writeHead(404).end()
  }
})
publicServer.listen(5187, '127.0.0.1')
controlServer.listen(5188, '127.0.0.1')
const stop = () => {
  publicServer.closeAllConnections()
  controlServer.closeAllConnections()
  publicServer.close()
  controlServer.close()
  clearTimeout(timer)
}
const timer = setTimeout(stop, 3600000)
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
console.log(
  JSON.stringify({
    probe: 'synthetic-only',
    publicPort: 5187,
    controlPort: 5188,
    lifetimeMinutes: 60,
  }),
)
