import assert from 'node:assert/strict'

// Creates only uniquely named development fixtures, then removes them through
// the product API. No direct database connection or real customer data is used.
const env = process.env
const api = env.API_BASE_URL ?? 'http://127.0.0.1:3000'
const prefix = `[M7.5 開發測試資料] Venue model ${Date.now()}`
const login = async (email: string, password: string) => {
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY!, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  assert.equal(response.status, 200, 'isolated development account sign-in')
  return (await response.json()) as { access_token: string; user: { id: string } }
}
const [coach, other] = await Promise.all([
  login(env.COACH_A_EMAIL!, env.COACH_A_PASSWORD!),
  login(env.COACH_B_EMAIL!, env.COACH_B_PASSWORD!),
])
assert.notEqual(coach.user.id, other.user.id)
const request = async (
  path: string,
  method = 'GET',
  body?: unknown,
  expected = 200,
  token = coach.access_token,
) => {
  const response = await fetch(`${api}/v1${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  assert.equal(response.status, expected, `${method} ${path}: ${await response.clone().text()}`)
  return expected === 204 ? null : ((await response.json()) as any)
}
let studentId: string | null = null
const venue = async (suffix: string) => {
  const created = (await request('/venues', 'POST', { name: `${prefix} ${suffix}` })).entity
  return created
}
const currentVenue = async (id: string) =>
  (await request('/venues')).venues.find((venue: any) => venue.id === id)
const rule = async (id: string, input: object) =>
  request(`/venues/${id}/fee-rules`, 'POST', {
    version: (await currentVenue(id)).version,
    effectiveFrom: '2026-08-01',
    ...input,
  })
const purchase = async (venueId: string | null, amountMinor: number, lessonCount: number) =>
  (
    await request(
      `/students/${studentId}/lesson-purchases`,
      'POST',
      {
        purchasedAt: '2026-08-02T02:00:00Z',
        venueId,
        amountMinor,
        lessonCount,
        currency: 'TWD',
      },
      201,
    )
  ).purchase
const session = async (venueId: string, day: number, expected = 201) =>
  request(
    '/sessions',
    'POST',
    {
      studentId,
      startsAt: `2026-09-${String(day).padStart(2, '0')}T02:00:00Z`,
      endsAt: `2026-09-${String(day).padStart(2, '0')}T03:00:00Z`,
      location: prefix,
      venueId,
    },
    expected,
  )
const complete = async (created: any) =>
  (
    await request(`/sessions/${created.id}/transition`, 'POST', {
      action: 'complete',
      version: created.version,
    })
  ).session

console.log(`Isolated fixture prefix: ${prefix}`)
try {
  const fixedVenue = await venue('fixed')
  const dualVenue = await venue('dual')
  await rule(fixedVenue.id, { kind: 'commission', rate: 20 })
  await rule(dualVenue.id, { kind: 'commission', coachRate: 20, venueRate: 40 })
  const createdStudent = (await request('/students', 'POST', { name: prefix }, 201)).student
  studentId = createdStudent.id
  assert.equal(
    (
      await request(
        `/venues/${fixedVenue.id}`,
        'PATCH',
        {
          version: 1,
          name: prefix,
          active: true,
        },
        404,
        other.access_token,
      )
    ).error,
    'not_found',
  )
  const fixed = await purchase(fixedVenue.id, 1000, 2)
  await session(dualVenue.id, 10, 400)
  const seriesBody = {
    startsAt: '2026-09-25T02:00:00Z',
    endsAt: '2026-09-25T03:00:00Z',
    location: prefix,
    intervalWeeks: 1,
    autoScheduleHorizon: '2_WEEKS',
  }
  await request(
    `/students/${studentId}/schedule-series`,
    'POST',
    { ...seriesBody, venueId: dualVenue.id },
    400,
  )
  assert.equal(
    (
      await request(
        `/students/${studentId}/schedule-series`,
        'POST',
        { ...seriesBody, venueId: fixedVenue.id },
        201,
      )
    ).series.venueId,
    fixedVenue.id,
  )
  const first = (await session(fixedVenue.id, 11)).session
  await request(
    `/students/${studentId}/lesson-purchases/${fixed.id}`,
    'DELETE',
    { confirmation: 'DELETE', version: fixed.version },
    409,
  )
  await complete(first)
  const august = await request('/finances/months/2026-08')
  assert.equal(
    august.rows.find((row: any) => row.id === `purchase-commission:${fixed.id}`).amountMinor,
    200,
  )
  const septemberBefore = await request('/finances/months/2026-09')
  assert.ok(!septemberBefore.rows.some((row: any) => row.id === `session:${first.id}`))
  await purchase(null, 1500, 3)
  const second = await complete((await session(dualVenue.id, 12)).session)
  const september = await request('/finances/months/2026-09')
  assert.equal(
    september.rows.find((row: any) => row.id === `session:${second.id}`).amountMinor,
    200,
  )
  await request(`/venues/${dualVenue.id}/coach-supplied-students`, 'POST', {
    version: (await currentVenue(dualVenue.id)).version,
    studentId,
    coachSupplied: true,
  })
  const third = await complete((await session(dualVenue.id, 13)).session)
  const afterSource = await request('/finances/months/2026-09')
  assert.equal(
    afterSource.rows.find((row: any) => row.id === `session:${third.id}`).amountMinor,
    100,
  )
  console.log(
    'PASS isolated API Venue entitlement, Calendar/series eligibility, commission timing, source default/exception and isolation',
  )
} finally {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const students = (await request('/students')).students.filter(
        (student: any) => student.name === prefix,
      )
      for (const student of students) {
        const detail = (await request(`/students/${student.id}`)).detail
        assert.equal(detail.student.name, prefix, 'cleanup targets only this fixture')
        await request(
          `/students/${student.id}`,
          'DELETE',
          { confirmation: 'DELETE', version: detail.student.version },
          204,
        )
      }
      const venues = (await request('/venues')).venues.filter((venue: any) =>
        venue.name.startsWith(prefix),
      )
      for (const venue of venues) {
        assert.equal(venue.canDelete, true, 'fixture Venue still has references')
        await request(`/venues/${venue.id}`, 'DELETE', { version: venue.version })
      }
      console.log('Cleaned exact isolated Venue model fixtures.')
      break
    } catch (error) {
      if (attempt === 5) throw error
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt))
    }
  }
}
