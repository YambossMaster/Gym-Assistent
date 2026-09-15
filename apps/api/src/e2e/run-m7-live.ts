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
const request = (path: string, token: string, method = 'GET', body?: unknown) =>
  fetch(`${api}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
const expectStatus = async (label: string, response: Response, status: number) => {
  if (response.status !== status)
    throw new Error(
      `${label}: expected ${status}, got ${response.status}: ${await response.text()}`,
    )
  return response
}

const [coachA, coachB] = await Promise.all([
  authToken(environment.COACH_A_EMAIL, environment.COACH_A_PASSWORD),
  authToken(environment.COACH_B_EMAIL, environment.COACH_B_PASSWORD),
])
const marker = `M7 E2E ${Date.now()}`
const startsAt = new Date(Date.now() + 5 * 86_400_000)
startsAt.setUTCMinutes(0, 0, 0)
const endsAt = new Date(startsAt.getTime() + 3_600_000)
const source = {
  settings: {
    displayName: marker,
    timezone: 'Asia/Taipei',
    defaultWeightUnit: 'kg',
    calendarStartHour: 7,
  },
  students: [
    {
      id: 'student',
      name: marker,
      phone: '',
      goal: '',
      privateNote: 'M7 private',
      active: true,
      lineLinked: true,
      createdAt: new Date().toISOString(),
    },
  ],
  purchases: [
    {
      id: 'purchase',
      studentId: 'student',
      purchasedAt: new Date().toISOString(),
      amount: 1000,
      lessonCount: 2,
      note: 'M7 purchase',
    },
  ],
  exercises: [
    {
      id: 'exercise',
      name: marker,
      equipment: '其他',
      bodyParts: ['核心'],
      movementType: '局部動作',
      performanceMetric: 'reps',
      isSystem: false,
      favorite: true,
    },
  ],
  sessions: [
    {
      id: 'session',
      studentId: 'student',
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      status: 'scheduled',
      location: 'M7 Studio',
    },
  ],
  records: [],
  series: [],
  blocks: [],
  availability: [],
  availabilityOverrides: [],
  links: [
    {
      token: 'M7-RAW-SECRET-MUST-NOT-ECHO',
      sessionId: 'session',
      capability: 'reschedule_session',
      expiresAt: endsAt.toISOString(),
    },
  ],
}

let runId = ''
try {
  const [settingsResponse, preferenceResponse] = await Promise.all([
    expectStatus('settings', await request('/v1/workspace-settings', coachA), 200),
    expectStatus('preference', await request('/v1/training/preferences', coachA), 200),
  ])
  const settings = ((await settingsResponse.json()) as any).settings
  const preference = ((await preferenceResponse.json()) as any).preference
  const previewResponse = await expectStatus(
    'preview A',
    await request('/v1/demo-imports/previews', coachA, 'POST', source),
    201,
  )
  if (previewResponse.headers.get('cache-control') !== 'no-store, private')
    throw new Error('preview cache header missing')
  const previewText = await previewResponse.text()
  if (previewText.includes('M7-RAW-SECRET-MUST-NOT-ECHO') || previewText.includes('M7 private'))
    throw new Error('preview leaked source secret/private note')
  const preview = JSON.parse(previewText).preview
  if (!preview.rejections.some((item: any) => item.reason === 'legacy_secret_not_transferable'))
    throw new Error('legacy link was not rejected')
  const previewB = (
    (await (
      await expectStatus(
        'preview B',
        await request('/v1/demo-imports/previews', coachB, 'POST', source),
        201,
      )
    ).json()) as any
  ).preview
  if (preview.manifestChecksum === previewB.manifestChecksum)
    throw new Error('Workspace mappings were not isolated')
  const created = (
    (await (
      await expectStatus(
        'create run',
        await request('/v1/demo-imports', coachA, 'POST', {
          previewId: preview.id,
          manifestChecksum: preview.manifestChecksum,
          workspaceVersion: settings.version,
          preferenceVersion: preference.version,
          confirmation: 'IMPORT',
        }),
        202,
      )
    ).json()) as any
  ).importRun
  runId = created.id
  await expectStatus(
    'cross-Coach run hidden',
    await request(`/v1/demo-imports/${runId}`, coachB),
    404,
  )
  let run = created
  while (run.status !== 'completed') {
    run = (
      (await (
        await expectStatus(
          'continue phase',
          await request(`/v1/demo-imports/${runId}/continue`, coachA, 'POST', {}),
          200,
        )
      ).json()) as any
    ).importRun
  }
  if (run.completedPhases.join(',') !== 'foundation,purchases,training,scheduling,capability_links')
    throw new Error('phase order changed')
  const students = (
    (await (
      await expectStatus('student list', await request('/v1/students', coachA), 200)
    ).json()) as any
  ).students
  if (students.filter((item: any) => item.name === marker).length !== 1)
    throw new Error('import did not create exactly one Student')
  const rolledBack = (
    (await (
      await expectStatus(
        'rollback',
        await request(`/v1/demo-imports/${runId}/rollback`, coachA, 'POST', {
          confirmation: 'ROLLBACK',
        }),
        200,
      )
    ).json()) as any
  ).importRun
  if (rolledBack.status !== 'rolled_back')
    throw new Error(`rollback ended as ${rolledBack.status}: ${JSON.stringify(rolledBack.failure)}`)
  const after = (
    (await (
      await expectStatus('post-rollback list', await request('/v1/students', coachA), 200)
    ).json()) as any
  ).students
  if (after.some((item: any) => item.name === marker))
    throw new Error('rollback left imported Student')
  console.log(`M7 live E2E passed for import ${runId}.`)
  console.log('- safe preview redaction and legacy-token rejection')
  console.log('- Workspace-salted mapping and two-Coach run isolation')
  console.log('- ordered five-phase import and exact created-row rollback')
} catch (error) {
  if (runId)
    await request(`/v1/demo-imports/${runId}/rollback`, coachA, 'POST', {
      confirmation: 'ROLLBACK',
    }).catch(() => undefined)
  console.error(
    error instanceof Error ? `M7 live E2E failed: ${error.message}` : 'M7 live E2E failed',
  )
  process.exitCode = 1
}
