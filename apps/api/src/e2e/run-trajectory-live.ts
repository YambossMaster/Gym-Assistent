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
const token = async (email: string, password: string) => {
  const response = await fetch(`${environment.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: environment.SUPABASE_PUBLISHABLE_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) throw new Error(`sign-in failed: ${response.status}`)
  return String(((await response.json()) as any).access_token)
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
const uuid = () => crypto.randomUUID()
const [coachA, coachB] = await Promise.all([
  token(environment.COACH_A_EMAIL, environment.COACH_A_PASSWORD),
  token(environment.COACH_B_EMAIL, environment.COACH_B_PASSWORD),
])
const name = 'M7.5 trajectory regression ' + Date.now()
const studentResponse = await expectStatus(
  'create isolated Student',
  await request(
    '/v1/students',
    coachA,
    json('POST', { name, goal: 'isolated trajectory regression' }),
  ),
  201,
)
const student = ((await studentResponse.json()) as any).student
try {
  const startsAt = new Date(Math.ceil(Date.now() / 900000) * 900000).toISOString()
  const created = await expectStatus(
    'create scheduled Session',
    await request(
      '/v1/sessions',
      coachA,
      json('POST', {
        studentId: student.id,
        startsAt,
        endsAt: new Date(Date.parse(startsAt) + 3600000).toISOString(),
        location: 'isolated trajectory regression',
      }),
    ),
    201,
  )
  const session = ((await created.json()) as any).session
  const library = (await (
    await expectStatus('library', await request('/v1/exercises', coachA), 200)
  ).json()) as any
  const definition = library.definitions.find((x: any) => x.performanceMetric === 'weight')
  const exerciseId = uuid(),
    setId = uuid()
  let recordVersion = 0
  const save = async (weight: number | null, result: 'completed' | 'incomplete' | null) => {
    const response = await expectStatus(
      'save scheduled record',
      await request(
        '/v1/sessions/' + session.id + '/training',
        coachA,
        json('PUT', {
          privateNote: 'PRIVATE-TRAJECTORY',
          recordVersion,
          sessionVersion: session.version,
          operationId: uuid(),
          exercises: [
            {
              id: exerciseId,
              definitionId: definition.id,
              definitionVersion: definition.version,
              sets: [
                {
                  id: setId,
                  plannedWeight: weight,
                  plannedReps: 5,
                  actualReps: result === 'completed' ? 5 : 0,
                  rpe: null,
                  result,
                  unit: 'kg',
                },
              ],
            },
          ],
        }),
      ),
      200,
    )
    const training = ((await response.json()) as any).training
    recordVersion = training.record.version
    if (training.session.status !== 'scheduled' || training.lessonSummary.completed !== 0)
      throw new Error('Saving performance changed Session status or entitlement')
    return training.exerciseSummaries[0].history
  }
  const trendPath =
    '/v1/students/' + student.id + '/performance/' + definition.id + '?metric=weight'
  const assertPoints = (label: string, points: any[], expected: number | null) => {
    if (
      points.length !== (expected === null ? 0 : 1) ||
      (expected !== null && points[0].value !== expected)
    )
      throw new Error(
        label + ': expected ' + expected + ', got ' + JSON.stringify(points.map((p) => p.value)),
      )
  }
  const assertTrend = async (expected: number | null) => {
    const response = await expectStatus('Student trend', await request(trendPath, coachA), 200)
    const text = await response.text()
    if (text.includes('PRIVATE-TRAJECTORY')) throw new Error('Private note leaked')
    assertPoints('Student trend', JSON.parse(text).trend.points, expected)
  }
  assertPoints('scheduled Session history', await save(91.5, 'completed'), 91.5)
  await assertTrend(91.5)
  assertPoints('corrected Session history', await save(92, 'completed'), 92)
  await assertTrend(92)
  assertPoints('removed qualified set', await save(92, 'incomplete'), null)
  await assertTrend(null)
  assertPoints('missing weight', await save(null, 'completed'), null)
  await assertTrend(null)
  await expectStatus('two-Coach trend isolation', await request(trendPath, coachB), 404)
  assertPoints('restore qualified record', await save(93, 'completed'), 93)
  let sessionVersion = session.version
  for (const action of ['complete', 'reopen', 'cancel']) {
    const response = await expectStatus(
      action,
      await request(
        '/v1/sessions/' + session.id + '/transition',
        coachA,
        json('POST', { action, version: sessionVersion }),
      ),
      200,
    )
    sessionVersion = ((await response.json()) as any).session.version
    await assertTrend(action === 'cancel' ? null : 93)
  }
  console.log(
    'Trajectory live regression passed: scheduled saves, corrections, removal, null weights, completion/reopening/cancellation, entitlement, private-note exclusion and tenant isolation.',
  )
} finally {
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
