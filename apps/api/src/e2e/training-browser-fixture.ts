import assert from 'node:assert/strict'
import { lstatSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { z } from 'zod'

const env = z
  .object({
    SUPABASE_URL: z.string().url(),
    SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    API_BASE_URL: z.string().url(),
    COACH_A_EMAIL: z.string().email(),
    COACH_A_PASSWORD: z.string().min(1),
  })
  .parse(process.env)
const api = env.API_BASE_URL.replace(/\/$/, '')
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(api).hostname), 'local API required')

type Fixture = {
  kind: 'training-browser-acceptance-v1'
  api: string
  studentId: string
  studentName: string
}

const signIn = async () => {
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ email: env.COACH_A_EMAIL, password: env.COACH_A_PASSWORD }),
  })
  assert.equal(response.status, 200, 'isolated development Coach sign-in')
  return String(((await response.json()) as { access_token: string }).access_token)
}

const request = async (token: string, route: string, method = 'GET', body?: unknown) =>
  fetch(api + route, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

const expectStatus = async (response: Response, status: number, action: string) => {
  assert.equal(response.status, status, `${action}: HTTP ${response.status}`)
  return response
}

const fixturePath = (id: string) => path.join(os.tmpdir(), `gym-training-browser-${id}.json`)

const readFixture = (file: string): Fixture => {
  const resolved = path.resolve(file)
  assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()), 'fixture must be in temp folder')
  assert.match(path.basename(resolved), /^gym-training-browser-[0-9a-f-]+\.json$/)
  assert.equal(lstatSync(resolved).isSymbolicLink(), false, 'fixture cannot be a symlink')
  const fixture = JSON.parse(readFileSync(resolved, 'utf8')) as Fixture
  assert.equal(fixture.kind, 'training-browser-acceptance-v1')
  assert.equal(fixture.api, api, 'cleanup must target the original local API')
  assert.match(fixture.studentId, /^[0-9a-f-]{36}$/)
  assert.match(fixture.studentName, /^M8-B browser acceptance [0-9a-f-]{36}$/)
  return fixture
}

const cleanup = async (file: string, token: string) => {
  const fixture = readFixture(file)
  const response = await request(token, `/v1/students/${fixture.studentId}`)
  if (response.status === 404) {
    unlinkSync(file)
    console.log('Fixture Student was already removed.')
    return
  }
  const detail = (
    (await (await expectStatus(response, 200, 'read fixture Student')).json()) as {
      detail: { student: { name: string; version: number } }
    }
  ).detail
  assert.equal(detail.student.name, fixture.studentName, 'cleanup owns only this Student')
  await expectStatus(
    await request(token, `/v1/students/${fixture.studentId}`, 'DELETE', {
      confirmation: 'DELETE',
      version: detail.student.version,
    }),
    204,
    'delete exact fixture Student',
  )
  await expectStatus(
    await request(token, `/v1/students/${fixture.studentId}`),
    404,
    'verify cleanup',
  )
  unlinkSync(file)
  console.log('Exact isolated Training browser fixture removed.')
}

const [command, file] = process.argv.slice(2)
if (command !== 'prepare' && command !== 'cleanup')
  throw new Error('Use prepare, or cleanup <manifest path>.')
const token = await signIn()
if (command === 'cleanup') {
  assert.ok(file, 'cleanup requires the manifest path printed by prepare')
  await cleanup(file, token)
} else {
  const id = crypto.randomUUID()
  const studentName = `M8-B browser acceptance ${id}`
  const studentResponse = await expectStatus(
    await request(token, '/v1/students', 'POST', { name: studentName }),
    201,
    'create isolated Student',
  )
  const studentId = ((await studentResponse.json()) as { student: { id: string } }).student.id
  const manifest = fixturePath(id)
  const fixture: Fixture = {
    kind: 'training-browser-acceptance-v1',
    api,
    studentId,
    studentName,
  }
  writeFileSync(manifest, JSON.stringify(fixture), { flag: 'wx', mode: 0o600 })
  try {
    const start = Math.ceil((Date.now() + 3_600_000) / 900_000) * 900_000
    const sessionResponse = await expectStatus(
      await request(token, '/v1/sessions', 'POST', {
        studentId,
        startsAt: new Date(start).toISOString(),
        endsAt: new Date(start + 3_600_000).toISOString(),
        location: 'Isolated browser acceptance',
      }),
      201,
      'create isolated Session',
    )
    const sessionId = ((await sessionResponse.json()) as { session: { id: string } }).session.id
    console.log(JSON.stringify({ studentId, sessionId, manifest }))
  } catch (error) {
    await cleanup(manifest, token)
    throw error
  }
}
