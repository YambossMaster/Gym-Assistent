import { z } from 'zod'

const environment = z
  .object({
    SUPABASE_URL: z.string().url(),
    SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    API_BASE_URL: z.string().url(),
    COACH_A_EMAIL: z.string().email(),
    COACH_A_PASSWORD: z.string().min(1),
    COACH_B_EMAIL: z.string().email(),
    COACH_B_PASSWORD: z.string().min(1),
  })
  .parse(process.env)
const api = environment.API_BASE_URL.replace(/\/$/, '')
const authToken = async (email: string, password: string) => {
  const response = await fetch(`${environment.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: environment.SUPABASE_PUBLISHABLE_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) throw new Error(`sign-in failed: ${response.status}`)
  return String(((await response.json()) as { access_token: string }).access_token)
}
const request = (path: string, accessToken: string, init: RequestInit = {}) =>
  fetch(`${api}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
  })
const publicRequest = (path: string, capability: string, init: RequestInit = {}) =>
  fetch(`${api}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-capability-token': capability,
      ...init.headers,
    },
  })
const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
})
const expectStatus = async (label: string, response: Response, status: number) => {
  if (response.status !== status)
    throw new Error(
      `${label}: expected ${status}, got ${response.status}: ${await response.text()}`,
    )
  return response
}
const assertPublicHeaders = (response: Response) => {
  if (
    response.headers.get('cache-control') !== 'no-store, private' ||
    response.headers.get('referrer-policy') !== 'no-referrer'
  )
    throw new Error('Public security headers were incomplete.')
}
const assertNoKeys = (value: unknown, forbidden: Set<string>) => {
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.has(key)) throw new Error(`Public projection leaked ${key}.`)
    assertNoKeys(child, forbidden)
  }
}
const localDate = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)

const [coachA, coachB] = await Promise.all([
  authToken(environment.COACH_A_EMAIL, environment.COACH_A_PASSWORD),
  authToken(environment.COACH_B_EMAIL, environment.COACH_B_PASSWORD),
])
const marker = `M6 E2E ${Date.now()}`
const studentResponse = await expectStatus(
  'create Student',
  await request(
    '/v1/students',
    coachA,
    json('POST', { name: marker, phone: 'PRIVATE-PHONE', privateNote: 'PRIVATE-STUDENT' }),
  ),
  201,
)
const student = ((await studentResponse.json()) as any).student
const availabilityBackups = new Map<
  number,
  { windows: Array<{ startTime: string; endTime: string }>; version: number }
>()
try {
  await expectStatus(
    'create Purchase',
    await request(
      `/v1/students/${student.id}/lesson-purchases`,
      coachA,
      json('POST', {
        purchasedAt: new Date().toISOString(),
        lessonCount: 6,
        amountMinor: 6000,
        currency: 'TWD',
        privateNote: 'PRIVATE-PURCHASE',
      }),
    ),
    201,
  )
  const start = new Date(Math.ceil((Date.now() + 5 * 86_400_000) / 1_800_000) * 1_800_000)
  const end = new Date(start.getTime() + 3_600_000)
  const completedSession = (
    (await (
      await expectStatus(
        'create result Session',
        await request(
          '/v1/sessions',
          coachA,
          json('POST', {
            studentId: student.id,
            startsAt: start.toISOString(),
            endsAt: end.toISOString(),
            location: 'PRIVATE-LOCATION',
          }),
        ),
        201,
      )
    ).json()) as any
  ).session
  const draft = {
    privateNote: 'PRIVATE-M6-NOTE',
    exercises: [],
    recordVersion: 0,
    sessionVersion: completedSession.version,
    operationId: crypto.randomUUID(),
  }
  const saved = (
    (await (
      await expectStatus(
        'save empty accepted record',
        await request(`/v1/sessions/${completedSession.id}/training`, coachA, json('PUT', draft)),
        200,
      )
    ).json()) as any
  ).training
  const completed = (
    (await (
      await expectStatus(
        'complete accepted record',
        await request(
          `/v1/sessions/${completedSession.id}/training/complete`,
          coachA,
          json('POST', {
            ...draft,
            recordVersion: saved.record.version,
            sessionVersion: saved.session.version,
            operationId: crypto.randomUUID(),
          }),
        ),
        200,
      )
    ).json()) as any
  ).training
  await expectStatus(
    'Coach B link isolation',
    await request(`/v1/sessions/${completedSession.id}/capability-links`, coachB),
    404,
  )
  const issuedTraining = (await (
    await expectStatus(
      'issue Training link',
      await request(
        `/v1/sessions/${completedSession.id}/capability-links`,
        coachA,
        json('POST', { purpose: 'training_result', includeTrainingNote: false }),
      ),
      201,
    )
  ).json()) as any
  await expectStatus(
    'one-current-link',
    await request(
      `/v1/sessions/${completedSession.id}/capability-links`,
      coachA,
      json('POST', { purpose: 'training_result', includeTrainingNote: false }),
    ),
    409,
  )
  const publicTrainingResponse = await expectStatus(
    'read Training result',
    await publicRequest('/v1/public/training-result', issuedTraining.token),
    200,
  )
  assertPublicHeaders(publicTrainingResponse)
  const publicTraining = (await publicTrainingResponse.json()) as any
  assertNoKeys(
    publicTraining,
    new Set([
      'id',
      'version',
      'workspaceId',
      'studentId',
      'sessionId',
      'recordId',
      'location',
      'phone',
      'email',
      'privateNote',
      'plannedReps',
    ]),
  )
  if (JSON.stringify(publicTraining).includes('PRIVATE-'))
    throw new Error('Unconsented private value leaked.')
  await expectStatus(
    'wrong-purpose link',
    await publicRequest('/v1/public/reschedule', issuedTraining.token),
    404,
  )
  await expectStatus(
    'tampered token',
    await publicRequest('/v1/public/training-result', `${issuedTraining.token.slice(0, -1)}x`),
    404,
  )
  const revoked = (
    (await (
      await expectStatus(
        'revoke Training link',
        await request(
          `/v1/capability-links/${issuedTraining.link.id}/revoke`,
          coachA,
          json('POST', { version: issuedTraining.link.version }),
        ),
        200,
      )
    ).json()) as any
  ).link
  await expectStatus(
    'revoked Training terminal',
    await publicRequest('/v1/public/training-result', issuedTraining.token),
    410,
  )
  const reissuedTraining = (await (
    await expectStatus(
      'reissue Training link with note',
      await request(
        `/v1/capability-links/${revoked.id}/reissue`,
        coachA,
        json('POST', { version: revoked.version, includeTrainingNote: true }),
      ),
      201,
    )
  ).json()) as any
  const notedResult = (await (
    await expectStatus(
      'read consented note',
      await publicRequest('/v1/public/training-result', reissuedTraining.token),
      200,
    )
  ).json()) as any
  if (notedResult.trainingResult.trainingNote !== 'PRIVATE-M6-NOTE')
    throw new Error('Explicit Training Note consent was not projected.')
  await expectStatus(
    'edit completed record',
    await request(
      `/v1/sessions/${completedSession.id}/training`,
      coachA,
      json('PUT', {
        ...draft,
        privateNote: 'PRIVATE-M6-EDITED',
        recordVersion: completed.record.version,
        sessionVersion: completed.session.version,
        operationId: crypto.randomUUID(),
      }),
    ),
    200,
  )
  await expectStatus(
    'record edit auto-revokes result link',
    await publicRequest('/v1/public/training-result', reissuedTraining.token),
    410,
  )

  const scheduleStart = new Date(start.getTime() + 2 * 86_400_000)
  const scheduleEnd = new Date(scheduleStart.getTime() + 3_600_000)
  const from = localDate(new Date(scheduleStart.getTime() - 3 * 86_400_000))
  const through = localDate(new Date(scheduleStart.getTime() + 4 * 86_400_000))
  const calendar = (
    (await (
      await expectStatus(
        'read Availability versions',
        await request(`/v1/calendar?start=${from}&end=${through}`, coachA),
        200,
      )
    ).json()) as any
  ).calendar
  for (let weekday = 1; weekday <= 7; weekday += 1) {
    const prior = calendar.availabilityRulesByWeekday[String(weekday)] ?? {
      windows: [],
      version: 1,
    }
    availabilityBackups.set(weekday, prior)
    const updated = (
      (await (
        await expectStatus(
          `open Availability ${weekday}`,
          await request(
            `/v1/availability/rules/${weekday}`,
            coachA,
            json('PUT', {
              windows: [{ startTime: '06:00', endTime: '22:00' }],
              version: prior.version,
            }),
          ),
          200,
        )
      ).json()) as any
    ).availability
    availabilityBackups.set(weekday, { ...prior, version: updated.version })
  }
  const scheduledSession = (
    (await (
      await expectStatus(
        'create reschedule Session',
        await request(
          '/v1/sessions',
          coachA,
          json('POST', {
            studentId: student.id,
            startsAt: scheduleStart.toISOString(),
            endsAt: scheduleEnd.toISOString(),
            location: 'PRESERVE-LOCATION',
          }),
        ),
        201,
      )
    ).json()) as any
  ).session
  const issuedReschedule = (await (
    await expectStatus(
      'issue reschedule link',
      await request(
        `/v1/sessions/${scheduledSession.id}/capability-links`,
        coachA,
        json('POST', { purpose: 'reschedule_session' }),
      ),
      201,
    )
  ).json()) as any
  const projectionResponse = await expectStatus(
    'read reschedule slots',
    await publicRequest('/v1/public/reschedule', issuedReschedule.token),
    200,
  )
  assertPublicHeaders(projectionResponse)
  const projection = (await projectionResponse.json()) as any
  assertNoKeys(
    projection,
    new Set([
      'id',
      'version',
      'workspaceId',
      'studentId',
      'sessionId',
      'seriesId',
      'location',
      'note',
      'conflicts',
    ]),
  )
  if (projection.reschedule.slots.length < 3)
    throw new Error('Expected deterministic available slots.')
  const staleSlot = projection.reschedule.slots[0]
  await expectStatus(
    'occupy displayed slot',
    await request(
      '/v1/sessions',
      coachA,
      json('POST', {
        studentId: student.id,
        startsAt: staleSlot.startsAt,
        endsAt: staleSlot.endsAt,
        location: 'BLOCKER',
      }),
    ),
    201,
  )
  const conflict = await expectStatus(
    'stale slot conflict',
    await publicRequest(
      '/v1/public/reschedule/redeem',
      issuedReschedule.token,
      json('POST', { startsAt: staleSlot.startsAt }),
    ),
    409,
  )
  const fresh = (await conflict.json()) as any
  if (
    fresh.error !== 'slot_unavailable' ||
    fresh.current.reschedule.slots.some((slot: any) => slot.startsAt === staleSlot.startsAt)
  )
    throw new Error('Conflict did not return a fresh allowlisted slot set.')
  const selected = fresh.current.reschedule.slots[0]
  const attempts = await Promise.all([
    publicRequest(
      '/v1/public/reschedule/redeem',
      issuedReschedule.token,
      json('POST', { startsAt: selected.startsAt }),
    ),
    publicRequest(
      '/v1/public/reschedule/redeem',
      issuedReschedule.token,
      json('POST', { startsAt: selected.startsAt }),
    ),
  ])
  const statuses = attempts.map((response) => response.status).sort()
  if (statuses[0] !== 200 || statuses[1] !== 409)
    throw new Error(`Parallel redemption was not exactly-once: ${statuses.join(',')}`)
  const usedResponse = await expectStatus(
    'used link reload',
    await publicRequest('/v1/public/reschedule', issuedReschedule.token),
    410,
  )
  const used = (await usedResponse.json()) as any
  if (used.error !== 'used_link' || used.current.redeemedStartsAt !== selected.startsAt)
    throw new Error('Used state did not recover the accepted instant.')
  const currentSession = (
    (await (
      await expectStatus(
        'read redeemed Session',
        await request(`/v1/sessions/${scheduledSession.id}`, coachA),
        200,
      )
    ).json()) as any
  ).session
  if (
    currentSession.startsAt !== selected.startsAt ||
    currentSession.location !== 'PRESERVE-LOCATION' ||
    currentSession.version !== scheduledSession.version + 1
  )
    throw new Error('Redemption did not preserve identity/location or increment once.')
  console.log(
    `M6 live E2E passed for isolated Student ${student.id}: result allowlist/consent/revocation, Coach isolation, link lifecycle, secure headers, fresh-slot conflict, and exactly-once redemption.`,
  )
} finally {
  for (const [weekday, backup] of availabilityBackups) {
    const currentCalendar = await request(
      `/v1/calendar?start=${localDate(new Date())}&end=${localDate(new Date(Date.now() + 8 * 86_400_000))}`,
      coachA,
    )
    if (currentCalendar.ok) {
      const current = ((await currentCalendar.json()) as any).calendar.availabilityRulesByWeekday[
        String(weekday)
      ]
      if (current)
        await request(
          `/v1/availability/rules/${weekday}`,
          coachA,
          json('PUT', { windows: backup.windows, version: current.version }),
        )
    }
  }
  const latest = await request(`/v1/students/${student.id}`, coachA)
  if (latest.ok) {
    const detail = ((await latest.json()) as any).detail
    await expectStatus(
      'cleanup Student',
      await request(
        `/v1/students/${student.id}`,
        coachA,
        json('DELETE', { confirmation: 'DELETE', version: detail.student.version }),
      ),
      204,
    )
  }
}
