export interface M3LiveE2eConfig {
  supabaseUrl: string
  supabasePublishableKey: string
  apiBaseUrl: string
  coachA: { email: string; password: string }
  coachB: { email: string; password: string }
}

interface StudentResponse {
  student?: { id?: unknown; version?: unknown; active?: unknown }
}
interface DetailResponse {
  detail?: {
    student?: { id?: unknown; privateNote?: unknown; active?: unknown }
    lessonSummary?: { purchased?: unknown; completed?: unknown; remaining?: unknown }
    purchases?: Array<{
      lessonCount?: unknown
      amountMinor?: unknown
      currency?: unknown
      privateNote?: unknown
    }>
  }
}
interface TodayResponse {
  today?: {
    attention?: Array<{
      student?: { id?: unknown; name?: unknown }
      privateNote?: unknown
      purchases?: unknown
    }>
  }
}

export class M3LiveE2eError extends Error {
  constructor(
    readonly step: string,
    message: string,
    readonly status?: number,
  ) {
    super(`${step}: ${message}`)
    this.name = 'M3LiveE2eError'
  }
}

export async function runM3LiveE2e(
  config: M3LiveE2eConfig,
  fetchImplementation: typeof fetch = fetch,
) {
  const authBaseUrl = config.supabaseUrl.replace(/\/$/, '')
  const apiBaseUrl = config.apiBaseUrl.replace(/\/$/, '')
  const [coachAToken, coachBToken] = await Promise.all([
    signIn(
      'coach-a sign-in',
      authBaseUrl,
      config.supabasePublishableKey,
      config.coachA,
      fetchImplementation,
    ),
    signIn(
      'coach-b sign-in',
      authBaseUrl,
      config.supabasePublishableKey,
      config.coachB,
      fetchImplementation,
    ),
  ])
  const marker = `m3-e2e-${Date.now()}`
  const created = await request(
    'student creation',
    `${apiBaseUrl}/v1/students`,
    fetchImplementation,
    {
      method: 'POST',
      headers: headers(coachAToken),
      body: JSON.stringify({ name: `M3 ${marker}`, privateNote: marker }),
    },
  )
  expectStatus('student creation', created, 201)
  const student = (await created.json()) as StudentResponse
  const studentId = student.student?.id
  const version = student.student?.version
  if (typeof studentId !== 'string' || typeof version !== 'number')
    throw new M3LiveE2eError(
      'student creation',
      'response did not contain a student id and version',
    )

  try {
    const purchase = await request(
      'lesson purchase creation',
      `${apiBaseUrl}/v1/students/${studentId}/lesson-purchases`,
      fetchImplementation,
      {
        method: 'POST',
        headers: headers(coachAToken),
        body: JSON.stringify({
          purchasedAt: '2026-09-10T00:00:00.000Z',
          lessonCount: 2,
          amountMinor: 6000,
          currency: 'TWD',
          privateNote: marker,
        }),
      },
    )
    expectStatus('lesson purchase creation', purchase, 201)
    const detailResponse = await request(
      'owner detail reload',
      `${apiBaseUrl}/v1/students/${studentId}`,
      fetchImplementation,
      { headers: headers(coachAToken) },
    )
    expectStatus('owner detail reload', detailResponse, 200)
    const detail = (await detailResponse.json()) as DetailResponse
    if (
      detail.detail?.student?.privateNote !== marker ||
      detail.detail.lessonSummary?.purchased !== 2 ||
      detail.detail.lessonSummary?.completed !== 0 ||
      detail.detail.lessonSummary?.remaining !== 2 ||
      detail.detail.purchases?.[0]?.privateNote !== marker ||
      detail.detail.purchases?.[0]?.amountMinor !== 6000 ||
      detail.detail.purchases?.[0]?.currency !== 'TWD'
    ) {
      throw new M3LiveE2eError(
        'owner detail reload',
        'owner detail did not retain the private entitlement projection',
      )
    }
    const ownerTodayResponse = await request(
      'owner Today projection',
      `${apiBaseUrl}/v1/today`,
      fetchImplementation,
      { headers: headers(coachAToken) },
    )
    expectStatus('owner Today projection', ownerTodayResponse, 200)
    const ownerToday = (await ownerTodayResponse.json()) as TodayResponse
    const ownerAttention = ownerToday.today?.attention?.find(
      (item) => item.student?.id === studentId,
    )
    if (
      !ownerAttention ||
      ownerAttention.privateNote !== undefined ||
      ownerAttention.purchases !== undefined
    )
      throw new M3LiveE2eError(
        'owner Today projection',
        'Today did not return the isolated allowlisted entitlement attention item',
      )
    const otherTodayResponse = await request(
      'coach-b Today isolation',
      `${apiBaseUrl}/v1/today`,
      fetchImplementation,
      { headers: headers(coachBToken) },
    )
    expectStatus('coach-b Today isolation', otherTodayResponse, 200)
    const otherToday = (await otherTodayResponse.json()) as TodayResponse
    if (otherToday.today?.attention?.some((item) => item.student?.id === studentId))
      throw new M3LiveE2eError('coach-b Today isolation', 'Today leaked another Coach Student')
    const isolated = await request(
      'coach-b detail isolation',
      `${apiBaseUrl}/v1/students/${studentId}`,
      fetchImplementation,
      { headers: headers(coachBToken) },
    )
    expectStatus('coach-b detail isolation', isolated, 404)
    const archived = await request(
      'student archive',
      `${apiBaseUrl}/v1/students/${studentId}`,
      fetchImplementation,
      {
        method: 'PATCH',
        headers: headers(coachAToken),
        body: JSON.stringify({ name: `M3 ${marker}`, privateNote: marker, active: false, version }),
      },
    )
    expectStatus('student archive', archived, 200)
    const archivedPayload = (await archived.json()) as StudentResponse
    if (
      archivedPayload.student?.active !== false ||
      typeof archivedPayload.student.version !== 'number'
    )
      throw new M3LiveE2eError('student archive', 'student did not become archived')
    return {
      studentId,
      checks: [
        'two real coach tokens accepted',
        'owner purchase/detail projection retained',
        'second coach detail isolated',
        'Today attention allowlist and two-coach isolation verified',
        'student archive version transition verified',
        'test student deleted after verification',
      ],
    }
  } finally {
    const current = await request(
      'test cleanup detail',
      `${apiBaseUrl}/v1/students/${studentId}`,
      fetchImplementation,
      { headers: headers(coachAToken) },
    )
    if (current.ok) {
      const currentDetail = (await current.json()) as DetailResponse
      const currentVersion =
        currentDetail.detail?.student &&
        (currentDetail.detail.student as { version?: unknown }).version
      if (typeof currentVersion === 'number') {
        const deleted = await request(
          'test cleanup delete',
          `${apiBaseUrl}/v1/students/${studentId}`,
          fetchImplementation,
          {
            method: 'DELETE',
            headers: headers(coachAToken),
            body: JSON.stringify({ confirmation: 'DELETE', version: currentVersion }),
          },
        )
        expectStatus('test cleanup delete', deleted, 204)
      }
    }
  }
}

async function signIn(
  step: string,
  supabaseUrl: string,
  key: string,
  credentials: { email: string; password: string },
  fetchImplementation: typeof fetch,
): Promise<string> {
  const response = await request(
    step,
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    fetchImplementation,
    {
      method: 'POST',
      headers: { apikey: key, 'content-type': 'application/json' },
      body: JSON.stringify(credentials),
    },
  )
  expectOk(step, response)
  const payload = (await response.json()) as { access_token?: unknown }
  if (typeof payload.access_token !== 'string' || !payload.access_token)
    throw new M3LiveE2eError(step, 'response did not contain an access token')
  return payload.access_token
}

function request(step: string, url: string, fetchImplementation: typeof fetch, init?: RequestInit) {
  return fetchImplementation(url, init).catch(() => {
    throw new M3LiveE2eError(step, 'network request failed')
  })
}
function headers(accessToken: string) {
  return { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' }
}
function expectStatus(step: string, response: Response, expected: number) {
  if (response.status !== expected)
    throw new M3LiveE2eError(
      step,
      `expected HTTP ${expected}, received HTTP ${response.status}`,
      response.status,
    )
}
function expectOk(step: string, response: Response) {
  if (!response.ok)
    throw new M3LiveE2eError(step, `received HTTP ${response.status}`, response.status)
}
