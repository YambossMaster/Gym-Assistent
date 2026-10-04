import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { lstatSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Pool } from 'pg'
import { codeDigest, newBetaCode } from '../beta-admission/beta-admission.js'

const { SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY, DATABASE_URL, COACH_A_EMAIL } =
  process.env
const origin = process.env.API_BASE_URL?.replace(/\/$/, '')
if (
  !SUPABASE_URL ||
  !SUPABASE_SECRET_KEY ||
  !SUPABASE_PUBLISHABLE_KEY ||
  !DATABASE_URL ||
  !COACH_A_EMAIL ||
  !origin
)
  throw new Error('Development Auth, database, E2E Email and API_BASE_URL are required')
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'local API required')
const pool = new Pool({ connectionString: DATABASE_URL })
type Fixture = {
  kind: 'beta-browser-acceptance-v1'
  origin: string
  email: string
  password: string
  userId: string
  workspaceId: string
  codeId: string
  studentIds: string[]
}
const fileFor = (id: string) => path.join(os.tmpdir(), `gym-beta-browser-${id}.json`)
const auth = (route: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL!.replace(/\/$/, '')}/auth/v1${route}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SECRET_KEY!,
      authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  })
const tokenFor = async (fixture: Fixture) => {
  const response = await fetch(
    `${SUPABASE_URL!.replace(/\/$/, '')}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY!, 'content-type': 'application/json' },
      body: JSON.stringify({ email: fixture.email, password: fixture.password }),
    },
  )
  assert.equal(response.status, 200, 'synthetic Coach sign-in')
  return String(((await response.json()) as { access_token: string }).access_token)
}
const request = (token: string, route: string, method = 'GET', body?: unknown) =>
  fetch(`${origin}${route}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
const readFixture = (file: string) => {
  const resolved = path.resolve(file)
  assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()))
  assert.match(path.basename(resolved), /^gym-beta-browser-[0-9a-f-]+\.json$/)
  assert.equal(lstatSync(resolved).isSymbolicLink(), false)
  const fixture = JSON.parse(readFileSync(resolved, 'utf8')) as Fixture
  assert.equal(fixture.kind, 'beta-browser-acceptance-v1')
  assert.equal(fixture.origin, origin)
  assert.match(fixture.email, /\+beta-browser-[0-9a-f-]+@/)
  return fixture
}

const [command, file] = process.argv.slice(2)
try {
  if (command === 'prepare') {
    const id = randomUUID()
    const [local, domain] = COACH_A_EMAIL.split('@')
    assert.ok(local && domain)
    const fixture: Fixture = {
      kind: 'beta-browser-acceptance-v1',
      origin,
      email: `${local}+beta-browser-${id}@${domain}`,
      password: randomBytes(24).toString('base64url'),
      userId: '',
      workspaceId: '',
      codeId: randomUUID(),
      studentIds: [],
    }
    const file = fileFor(id)
    const save = () => writeFileSync(file, JSON.stringify(fixture), { mode: 0o600 })
    const created = await auth('/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email: fixture.email,
        password: fixture.password,
        email_confirm: true,
      }),
    })
    assert.equal(created.status, 200, 'create synthetic Auth user')
    const user = (await created.json()) as { id: string; email: string }
    assert.equal(user.email, fixture.email)
    fixture.userId = user.id
    save()
    const token = await tokenFor(fixture)
    const first = await request(token, '/v1/students', 'POST', { name: `M8-B expiry ${id} 1` })
    assert.equal(first.status, 201, 'create Free Student')
    fixture.studentIds.push(((await first.json()) as { student: { id: string } }).student.id)
    const workspace = await pool.query<{ id: string }>(
      'select id from app_private.workspace where owner_user_id=$1',
      [fixture.userId],
    )
    fixture.workspaceId = workspace.rows[0]?.id ?? ''
    assert.ok(fixture.workspaceId)
    save()
    const code = newBetaCode()
    await pool.query(
      "insert into app_private.beta_code(id,code_digest,redemption_limit,closes_at) values ($1,$2,1,now()+interval '1 day')",
      [fixture.codeId, codeDigest(code)],
    )
    const redeemed = await request(token, '/v1/beta/redeem', 'POST', { code })
    assert.equal(redeemed.status, 200, 'redeem isolated promotional code')
    for (let index = 2; index <= 6; index += 1) {
      const response = await request(token, '/v1/students', 'POST', {
        name: `M8-B expiry ${id} ${index}`,
      })
      assert.equal(response.status, 201, `create promotional Student ${index}`)
      fixture.studentIds.push(((await response.json()) as { student: { id: string } }).student.id)
      save()
    }
    console.log(
      JSON.stringify({ manifest: file, email: fixture.email, studentIds: fixture.studentIds }),
    )
  } else if (command === 'expire') {
    assert.ok(file)
    const fixture = readFixture(file)
    const result = await pool.query(
      `update app_private.beta_grant set started_at=now()-interval '61 days',ends_at=now()-interval '1 day'
       where workspace_id=$1 and code_id=$2 and kind='promotional'`,
      [fixture.workspaceId, fixture.codeId],
    )
    assert.equal(result.rowCount, 1, 'only isolated promotional grant expires')
    console.log('Isolated promotional grant expired. Verify Free and capacity in the browser.')
  } else if (command === 'cleanup') {
    assert.ok(file)
    const fixture = readFixture(file)
    const user = await auth(`/admin/users/${fixture.userId}`)
    assert.equal(user.status, 200)
    assert.equal(((await user.json()) as { email: string }).email, fixture.email)
    const students = await pool.query<{ id: string; name: string }>(
      'select id,name from app_private.student where workspace_id=$1',
      [fixture.workspaceId],
    )
    assert.equal(students.rows.length, fixture.studentIds.length)
    for (const row of students.rows) {
      assert.ok(fixture.studentIds.includes(row.id))
      assert.ok(row.name.startsWith('M8-B expiry '))
    }
    const deleted = await auth(`/admin/users/${fixture.userId}`, { method: 'DELETE' })
    assert.ok(deleted.ok, 'delete exact synthetic Auth user')
    assert.equal((await auth(`/admin/users/${fixture.userId}`)).status, 404)
    assert.equal(
      (await pool.query('select 1 from app_private.workspace where id=$1', [fixture.workspaceId]))
        .rowCount,
      0,
    )
    await pool.query('delete from app_private.beta_redemption where code_id=$1', [fixture.codeId])
    await pool.query('delete from app_private.beta_code where id=$1', [fixture.codeId])
    assert.equal(
      (await pool.query('select 1 from app_private.beta_code where id=$1', [fixture.codeId]))
        .rowCount,
      0,
    )
    unlinkSync(file)
    console.log('Exact isolated Beta browser fixture removed.')
  } else throw new Error('Use prepare, expire <manifest>, or cleanup <manifest>.')
} finally {
  await pool.end()
}
