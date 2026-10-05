import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { Pool } from 'pg'

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
const [local, domain] = COACH_A_EMAIL.split('@')
assert.ok(local && domain)
const marker = randomUUID()
const email = `${local}+plan-choice-${marker}@${domain}`
const password = randomBytes(24).toString('base64url')
let userId: string | undefined
let workspaceId: string | undefined
const auth = (route: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1${route}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  })

try {
  const created = await auth('/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  assert.equal(created.status, 200, 'create isolated Coach')
  const user = (await created.json()) as { id: string; email: string }
  assert.equal(user.email, email)
  userId = user.id
  const signedIn = await fetch(
    `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
  )
  assert.equal(signedIn.status, 200, 'sign in isolated Coach')
  const token = String(((await signedIn.json()) as { access_token: string }).access_token)
  const request = (route: string, method = 'GET', body?: unknown) =>
    fetch(`${origin}${route}`, {
      method,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  const plan = async () => {
    const response = await request('/v1/plan')
    assert.equal(response.status, 200)
    return (
      (await response.json()) as {
        plan: {
          tier: string
          version: number
          subscription?: { pendingTier: string | null; interval: string }
        }
      }
    ).plan
  }
  const change = async (body: unknown, expected = 200) => {
    const response = await request('/v1/plan/subscription', 'POST', body)
    assert.equal(response.status, expected, `plan change: ${await response.clone().text()}`)
    return expected === 200
      ? (
          (await response.json()) as {
            plan: {
              tier: string
              version: number
              subscription?: { pendingTier: string | null; interval: string }
            }
          }
        ).plan
      : null
  }
  assert.equal((await plan()).tier, 'free')
  const pro = await change({ kind: 'select', tier: 'basic', interval: 'month', version: 0 })
  assert.equal(pro?.tier, 'basic')
  assert.equal((await plan()).tier, 'basic', 'selection persists on reload')
  await change({ kind: 'select', tier: 'advanced', interval: 'year', version: 0 }, 409)
  const prime = await change({
    kind: 'select',
    tier: 'advanced',
    interval: 'year',
    version: pro!.version,
  })
  assert.equal(prime?.tier, 'advanced')
  assert.equal(prime?.subscription?.interval, 'year')
  const downgrade = await change({
    kind: 'select',
    tier: 'basic',
    interval: 'month',
    version: prime!.version,
  })
  assert.equal(downgrade?.tier, 'advanced')
  assert.equal(downgrade?.subscription?.pendingTier, 'basic')
  const cancel = await change({ kind: 'cancel', version: downgrade!.version })
  assert.equal(cancel?.subscription?.pendingTier, 'free')
  const resumed = await change({
    kind: 'select',
    tier: 'advanced',
    interval: 'year',
    version: cancel!.version,
  })
  assert.equal(resumed?.subscription?.pendingTier, null)
  assert.equal((await plan()).tier, 'advanced')
  const workspace = await pool.query<{ id: string }>(
    'select id from app_private.workspace where owner_user_id=$1',
    [userId],
  )
  workspaceId = workspace.rows[0]?.id
  assert.ok(workspaceId)
  const stored = await pool.query<{ amount_due_minor: number; amount_paid_minor: number }>(
    'select amount_due_minor,amount_paid_minor from app_private.plan_subscription where workspace_id=$1',
    [workspaceId],
  )
  assert.equal(stored.rows.length, 1)
  assert.equal(stored.rows[0]?.amount_due_minor, 0)
  assert.equal(stored.rows[0]?.amount_paid_minor, 0)
  console.log(
    'PASS: isolated Coach selected Pro, upgraded Prime, scheduled downgrade/cancel, resumed, reloaded and paid 0.',
  )
} finally {
  if (userId) {
    const read = await auth(`/admin/users/${userId}`)
    assert.equal(read.status, 200, 'verify exact isolated Coach before cleanup')
    assert.equal(((await read.json()) as { email: string }).email, email)
    const deleted = await auth(`/admin/users/${userId}`, { method: 'DELETE' })
    assert.ok(deleted.ok, `delete exact isolated Coach: ${deleted.status}`)
    assert.equal((await auth(`/admin/users/${userId}`)).status, 404)
    if (workspaceId)
      assert.equal(
        (await pool.query('select 1 from app_private.workspace where id=$1', [workspaceId]))
          .rowCount,
        0,
      )
  }
  await pool.end()
}
