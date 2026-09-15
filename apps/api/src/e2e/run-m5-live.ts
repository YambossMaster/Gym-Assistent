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
const name = `M5 E2E ${Date.now()}`
const studentResponse = await expectStatus(
  'create Student',
  await request('/v1/students', coachA, json('POST', { name, goal: 'isolated M5 verification' })),
  201,
)
const student = ((await studentResponse.json()) as any).student
try {
  const start = new Date(Math.ceil((Date.now() + 3_600_000) / 900_000) * 900_000)
  const startsAt = start.toISOString(),
    endsAt = new Date(start.getTime() + 3_600_000).toISOString()
  const sessionResponse = await expectStatus(
    'create Session',
    await request(
      '/v1/sessions',
      coachA,
      json('POST', { studentId: student.id, startsAt, endsAt, location: 'M5 isolated fixture' }),
    ),
    201,
  )
  const session = ((await sessionResponse.json()) as any).session
  const libraryResponse = await expectStatus(
    'catalog bootstrap',
    await request('/v1/exercises', coachA),
    200,
  )
  const library = (await libraryResponse.json()) as any
  if (
    library.definitions.length !== 100 ||
    new Set(library.definitions.map((x: any) => x.catalogKey)).size !== 100
  )
    throw new Error('Catalog bootstrap was not deterministic.')
  await expectStatus(
    'two-Coach Session isolation',
    await request(`/v1/sessions/${session.id}/training`, coachB),
    404,
  )
  const first = library.definitions[0],
    operationId = uuid()
  const payload = {
    privateNote: 'PRIVATE-M5-E2E',
    recordVersion: 0,
    sessionVersion: session.version,
    operationId,
    exercises: [
      {
        id: uuid(),
        definitionId: first.id,
        definitionVersion: first.version,
        sets: [
          {
            id: uuid(),
            plannedWeight: 80,
            plannedReps: 8,
            actualReps: 8,
            rpe: 7.5,
            result: 'completed',
            unit: 'lb',
          },
        ],
      },
    ],
  }
  const savedResponse = await expectStatus(
    'save record',
    await request(`/v1/sessions/${session.id}/training`, coachA, json('PUT', payload)),
    200,
  )
  const saved = ((await savedResponse.json()) as any).training
  const replayResponse = await expectStatus(
    'receipt replay',
    await request(`/v1/sessions/${session.id}/training`, coachA, json('PUT', payload)),
    200,
  )
  const replay = ((await replayResponse.json()) as any).training
  if (replay.record.id !== saved.record.id || replay.record.version !== saved.record.version)
    throw new Error('Receipt retry duplicated the record.')
  await expectStatus(
    'operation mismatch',
    await request(
      `/v1/sessions/${session.id}/training`,
      coachA,
      json('PUT', { ...payload, privateNote: 'different' }),
    ),
    409,
  )
  const completion = {
    ...payload,
    recordVersion: saved.record.version,
    sessionVersion: saved.session.version,
    operationId: uuid(),
  }
  const completedResponse = await expectStatus(
    'atomic completion',
    await request(`/v1/sessions/${session.id}/training/complete`, coachA, json('POST', completion)),
    200,
  )
  const completed = ((await completedResponse.json()) as any).training
  if (completed.session.status !== 'completed' || completed.record.privateNote !== 'PRIVATE-M5-E2E')
    throw new Error('Atomic completion did not retain the record.')
  const completedEditResponse = await expectStatus(
    'edit completed Training record',
    await request(
      `/v1/sessions/${session.id}/training`,
      coachA,
      json('PUT', {
        ...payload,
        privateNote: 'PRIVATE-M5-E2E-EDITED',
        recordVersion: completed.record.version,
        sessionVersion: completed.session.version,
        operationId: uuid(),
      }),
    ),
    200,
  )
  const completedEdit = ((await completedEditResponse.json()) as any).training
  if (
    completedEdit.session.status !== 'completed' ||
    completedEdit.record.privateNote !== 'PRIVATE-M5-E2E-EDITED'
  )
    throw new Error('Completed Training record was not editable.')
  const performanceResponse = await expectStatus(
    'performance',
    await request(`/v1/students/${student.id}/performance`, coachA),
    200,
  )
  const performanceText = await performanceResponse.text()
  if (performanceText.includes('PRIVATE-M5-E2E'))
    throw new Error('Private note leaked into performance response.')
  await expectStatus(
    'reopen regression',
    await request(
      `/v1/sessions/${session.id}/transition`,
      coachA,
      json('POST', { action: 'reopen', version: completedEdit.session.version }),
    ),
    200,
  )
  console.log(
    `M5 live E2E passed for isolated Student ${student.id}: 100-item catalog, Training save/replay/mismatch, atomic completion, completed-record editing, performance allowlist, reopen, and two-Coach isolation.`,
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
