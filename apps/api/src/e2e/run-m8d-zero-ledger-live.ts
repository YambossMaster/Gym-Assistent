import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

const manifest = process.argv[2]
const origin = process.env.API_BASE_URL
const authUrl = process.env.SUPABASE_URL
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
assert.ok(manifest && origin && authUrl && publishableKey)
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname))
const fixture = JSON.parse(readFileSync(manifest, 'utf8')) as {
  kind: string
  email: string
  password: string
  studentIds: string[]
}
assert.equal(fixture.kind, 'beta-browser-acceptance-v1')
const auth = await fetch(`${authUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: publishableKey, 'content-type': 'application/json' },
  body: JSON.stringify({ email: fixture.email, password: fixture.password }),
})
assert.equal(auth.status, 200)
const token = String(((await auth.json()) as { access_token: string }).access_token)
const call = async <T>(
  route: string,
  method = 'GET',
  body?: unknown,
  expected = 200,
): Promise<T> => {
  const response = await fetch(`${origin}${route}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  assert.equal(response.status, expected, `${method} ${route}: ${await response.clone().text()}`)
  return expected === 204 ? (undefined as T) : ((await response.json()) as T)
}
type Session = { id: string; version: number }
const studentId = fixture.studentIds[0]!
const previous = await call<{ venues: Array<{ id: string; name: string; version: number }> }>(
  '/v1/venues',
)
for (const item of previous.venues.filter((item) => item.name.startsWith('M8-D zero ledger ')))
  await call(`/v1/venues/${item.id}`, 'DELETE', { version: item.version })
const venue = await call<{ entity: { id: string; version: number } }>('/v1/venues', 'POST', {
  name: `M8-D zero ledger ${randomUUID()}`,
  rule: {
    effectiveFrom: '2026-01-01',
    kind: 'commission',
    collectionMode: 'coach',
    rate: 70,
    coachRate: null,
    venueRate: null,
    amountMinor: null,
    currency: null,
  },
})
const venueId = venue.entity.id
const sessionIds: string[] = []
try {
  const startingStudent = await call<{ detail: { student: { name: string; version: number } } }>(
    `/v1/students/${studentId}`,
  )
  await call(`/v1/students/${studentId}`, 'PATCH', {
    name: startingStudent.detail.student.name,
    version: startingStudent.detail.student.version,
    singleLessonPrice: null,
  })
  const start = new Date()
  start.setUTCHours(3, 0, 0, 0)
  const create = async (offsetHours: number) => {
    const startsAt = new Date(start.getTime() + offsetHours * 3_600_000).toISOString()
    const endsAt = new Date(start.getTime() + (offsetHours + 1) * 3_600_000).toISOString()
    const result = await call<{ session: Session }>(
      '/v1/sessions',
      'POST',
      {
        studentId,
        startsAt,
        endsAt,
        venueId,
        location: 'M8-D zero ledger',
      },
      201,
    )
    sessionIds.push(result.session.id)
    return result.session
  }
  const complete = async (session: Session) =>
    (
      await call<{ session: Session }>(`/v1/sessions/${session.id}/transition`, 'POST', {
        action: 'complete',
        version: session.version,
      })
    ).session
  const month = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
  }).format(start)
  const ledger = () =>
    call<{
      rows: Array<{
        id: string
        detail?: string
        amountMinor: number
        direction: string
        singleLessonPriceUnset?: boolean
        singleLessonSessionVersion?: number
        originalAmountMinor?: number
        status?: string
        version?: number
      }>
      totals: Array<{ incomeMinor: number; expenseMinor: number; currency: string }>
    }>(`/v1/finances/months/${month}`)
  const first = await complete(await create(0))
  let finance = await ledger()
  const zero = finance.rows.find((row) => row.id === `single-lesson:${first.id}`)
  assert.deepEqual(
    {
      amount: zero?.amountMinor,
      direction: zero?.direction,
      detail: zero?.detail,
      unset: zero?.singleLessonPriceUnset,
    },
    {
      amount: 0,
      direction: 'income',
      detail: '尚未設定學生課堂單價',
      unset: true,
    },
  )
  assert.equal(finance.rows.filter((row) => row.id === `single-lesson:${first.id}`).length, 1)
  assert.equal(finance.rows.find((row) => row.id === `session:${first.id}`)?.amountMinor, 0)
  assert.match(
    finance.rows.find((row) => row.id === `session:${first.id}`)?.detail ?? '',
    /尚未設定學生課堂單價/,
  )
  assert.equal(finance.totals.find((total) => total.currency === 'TWD')?.incomeMinor, 0)

  const student = await call<{ detail: { student: { name: string; version: number } } }>(
    `/v1/students/${studentId}`,
  )
  await call(`/v1/students/${studentId}`, 'PATCH', {
    name: student.detail.student.name,
    version: student.detail.student.version,
    singleLessonPrice: { amountMinor: 900, currency: 'TWD' },
  })
  finance = await ledger()
  assert.equal(
    finance.rows.find((row) => row.id === `single-lesson:${first.id}`)?.amountMinor,
    0,
    'setting future Student price must not rewrite the historic zero row',
  )

  const second = await complete(await create(2))
  finance = await ledger()
  assert.ok(finance.rows.some((row) => row.id.startsWith('purchase:') && row.amountMinor === 900))
  assert.equal(finance.rows.find((row) => row.id === `single-lesson:${first.id}`)?.amountMinor, 0)

  const incomeId = `single-lesson:${first.id}`
  const expenseId = `session:${first.id}`
  await call(`/v1/finances/entries/${encodeURIComponent(incomeId)}`, 'PATCH', {
    version: zero!.version ?? 0,
    amountMinor: 600,
  })
  finance = await ledger()
  assert.deepEqual(
    [
      finance.rows.find((row) => row.id === incomeId)?.amountMinor,
      finance.rows.find((row) => row.id === incomeId)?.originalAmountMinor,
      finance.rows.find((row) => row.id === incomeId)?.status,
      finance.rows.find((row) => row.id === expenseId)?.amountMinor,
    ],
    [600, 0, 'modified', 420],
  )
  assert.equal(finance.rows.find((row) => row.id === incomeId)?.detail, '尚未設定學生課堂單價')
  await call(`/v1/finances/entries/${encodeURIComponent(expenseId)}`, 'PATCH', {
    version: finance.rows.find((row) => row.id === expenseId)?.version ?? 0,
    amountMinor: 100,
  })
  finance = await ledger()
  await call(`/v1/finances/entries/${encodeURIComponent(incomeId)}`, 'PATCH', {
    version: finance.rows.find((row) => row.id === incomeId)?.version ?? 0,
    amountMinor: 800,
  })
  finance = await ledger()
  assert.equal(finance.rows.find((row) => row.id === expenseId)?.amountMinor, 100)
  await call(`/v1/finances/entries/${encodeURIComponent(expenseId)}/adjustment`, 'DELETE', {
    version: finance.rows.find((row) => row.id === expenseId)?.version ?? 0,
  })
  finance = await ledger()
  assert.equal(finance.rows.find((row) => row.id === expenseId)?.amountMinor, 560)
  assert.equal(finance.totals.find((total) => total.currency === 'TWD')?.incomeMinor, 1700)
  console.log(
    'Development M8-D: immutable zero source, simultaneous commission, independent ledger overrides and reset passed.',
  )
} finally {
  for (const id of sessionIds.reverse()) {
    const detail = await call<{ session: Session }>(`/v1/sessions/${id}`)
    await call(
      `/v1/sessions/${id}`,
      'DELETE',
      { confirmation: 'DELETE', version: detail.session.version },
      204,
    )
  }
  const venues = await call<{ venues: Array<{ id: string; version: number }> }>('/v1/venues')
  const current = venues.venues.find((item) => item.id === venueId)
  if (current) await call(`/v1/venues/${venueId}`, 'DELETE', { version: current.version })
}
