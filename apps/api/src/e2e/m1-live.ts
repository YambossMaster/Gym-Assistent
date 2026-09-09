export interface M1LiveE2eConfig {
  supabaseUrl: string
  supabasePublishableKey: string
  apiBaseUrl: string
  coachA: CoachCredentials
  coachB: CoachCredentials
}

interface CoachCredentials {
  email: string
  password: string
}

interface AuthResponse {
  access_token?: unknown
}

interface StudentResponse {
  student?: StudentProjection
}

interface StudentsResponse {
  students?: StudentProjection[]
}

interface StudentProjection {
  id?: unknown
  privateNote?: unknown
}

export interface M1LiveE2eResult {
  studentId: string
  checks: string[]
}

export class M1LiveE2eError extends Error {
  readonly step: string
  readonly status: number | undefined

  constructor(step: string, message: string, status?: number) {
    super(`${step}: ${message}`)
    this.name = 'M1LiveE2eError'
    this.step = step
    this.status = status
  }
}

export async function runM1LiveE2e(
  config: M1LiveE2eConfig,
  fetchImplementation: typeof fetch = fetch,
): Promise<M1LiveE2eResult> {
  const authBaseUrl = trimTrailingSlash(config.supabaseUrl)
  const apiBaseUrl = trimTrailingSlash(config.apiBaseUrl)
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

  await expectStatus(
    'unauthenticated request',
    fetchImplementation(`${apiBaseUrl}/v1/students`),
    401,
  )

  await expectStatus(
    'client workspace rejection',
    fetchImplementation(`${apiBaseUrl}/v1/students`, {
      method: 'POST',
      headers: apiHeaders(coachAToken),
      body: JSON.stringify({
        name: 'M1 rejected workspace probe',
        workspaceId: '00000000-0000-4000-8000-000000000000',
      }),
    }),
    400,
  )

  const marker = `m1-e2e-${Date.now()}`
  const createResponse = await fetchImplementation(`${apiBaseUrl}/v1/students`, {
    method: 'POST',
    headers: apiHeaders(coachAToken),
    body: JSON.stringify({ name: `M1 E2E ${marker}`, privateNote: marker }),
  })
  expectOk('student creation', createResponse)
  const created = (await createResponse.json()) as StudentResponse
  const studentId = created.student?.id
  if (typeof studentId !== 'string' || studentId.length === 0) {
    throw new M1LiveE2eError('student creation', 'response did not contain a student id')
  }

  const ownerStudents = await listStudents(
    'coach-a student reload',
    apiBaseUrl,
    coachAToken,
    fetchImplementation,
  )
  const ownerStudent = ownerStudents.find((student) => student.id === studentId)
  if (!ownerStudent || ownerStudent.privateNote !== marker) {
    throw new M1LiveE2eError(
      'coach-a student reload',
      'created student was not returned with its private projection',
    )
  }

  const otherStudents = await listStudents(
    'coach-b tenant isolation',
    apiBaseUrl,
    coachBToken,
    fetchImplementation,
  )
  if (otherStudents.some((student) => student.id === studentId)) {
    throw new M1LiveE2eError('coach-b tenant isolation', 'coach B received coach A student data')
  }

  return {
    studentId,
    checks: [
      'two real coach tokens accepted',
      'unauthenticated request rejected',
      'client workspace id rejected',
      'student created and reloaded by owner',
      'second coach isolated from created student',
    ],
  }
}

async function signIn(
  step: string,
  supabaseUrl: string,
  publishableKey: string,
  credentials: CoachCredentials,
  fetchImplementation: typeof fetch,
): Promise<string> {
  const response = await fetchImplementation(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'content-type': 'application/json' },
    body: JSON.stringify(credentials),
  })
  expectOk(step, response)
  const auth = (await response.json()) as AuthResponse
  if (typeof auth.access_token !== 'string' || auth.access_token.length === 0) {
    throw new M1LiveE2eError(step, 'response did not contain an access token')
  }
  return auth.access_token
}

async function listStudents(
  step: string,
  apiBaseUrl: string,
  accessToken: string,
  fetchImplementation: typeof fetch,
): Promise<StudentProjection[]> {
  const response = await fetchImplementation(`${apiBaseUrl}/v1/students`, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  expectOk(step, response)
  const payload = (await response.json()) as StudentsResponse
  if (!Array.isArray(payload.students)) {
    throw new M1LiveE2eError(step, 'response did not contain a student list')
  }
  return payload.students
}

async function expectStatus(
  step: string,
  responsePromise: Promise<Response>,
  expected: number,
): Promise<void> {
  const response = await responsePromise
  if (response.status !== expected) {
    throw new M1LiveE2eError(
      step,
      `expected HTTP ${expected}, received HTTP ${response.status}`,
      response.status,
    )
  }
}

function expectOk(step: string, response: Response): void {
  if (!response.ok) {
    throw new M1LiveE2eError(step, `received HTTP ${response.status}`, response.status)
  }
}

function apiHeaders(accessToken: string): Record<string, string> {
  return { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '')
}
