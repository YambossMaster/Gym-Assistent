import { createHmac, randomBytes, randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { Pool } from 'pg'
import {
  BetaAdmissionModule,
  BetaRedemptionRateError,
  codeDigest,
  DISCLOSURE_VERSION,
  newBetaCode,
} from '../beta-admission/beta-admission.js'
import { PostgresBetaAdmissionRepository } from '../beta-admission/postgres-beta-admission-repository.js'
import { SupabaseVerifiedCoachEmail } from '../beta-admission/supabase-verified-coach-email.js'

const url = process.env.SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
const betaSecret = process.env.BETA_ADMISSION_SECRET
const databaseUrl = process.env.DATABASE_URL
const baseEmail = process.env.COACH_A_EMAIL
const siteOrigin = process.env.LOCAL_SITE_ORIGIN
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
if (!url || !secretKey || !betaSecret || !databaseUrl || !baseEmail?.includes('@'))
  throw new Error('Beta live E2E requires development Auth, database and E2E Email configuration')

const [local, domain] = baseEmail.split('@')
if (!local || !domain) throw new Error('Invalid E2E base Email')
const marker = `beta-e2e-${Date.now()}-${randomBytes(4).toString('hex')}`
const emailA = `${local}+${marker}-a@${domain}`
const emailB = `${local}+${marker}-b@${domain}`
const emailC = `${local}+${marker}-c@${domain}`
const emailD = `${local}+${marker}-d@${domain}`
const emailE = `${local}+${marker}-e@${domain}`
const pool = new Pool({ connectionString: databaseUrl })
const execFileAsync = promisify(execFile)
const repository = new PostgresBetaAdmissionRepository(pool, betaSecret)
const beta = new BetaAdmissionModule(
  repository,
  new SupabaseVerifiedCoachEmail(url, secretKey),
  betaSecret,
)
const code = newBetaCode()
const codeId = randomUUID()
const raceCodeId = randomUUID()
const created = new Map<string, string>()
const passwords = new Map<string, string>()
const allCreatedIds = new Set<string>()
let codeInserted = false
let raceCodeInserted = false
let siteToken: string | undefined

async function auth(path: string, init: RequestInit = {}) {
  return fetch(`${url!.replace(/\/$/, '')}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: secretKey!,
      authorization: `Bearer ${secretKey}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  })
}

async function create(email: string) {
  const password = randomBytes(24).toString('base64url')
  const response = await auth('/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  })
  if (!response.ok) throw new Error(`Synthetic Auth creation returned ${response.status}`)
  const user = (await response.json()) as { id?: string; email?: string }
  if (!user.id || user.email !== email) throw new Error('Synthetic Auth identity mismatch')
  created.set(user.id, email)
  passwords.set(user.id, password)
  allCreatedIds.add(user.id)
  return { userId: user.id }
}

async function remove(userId: string) {
  const email = created.get(userId)
  if (!email) throw new Error('Cleanup refused unknown Auth identity')
  const check = await auth(`/admin/users/${userId}`)
  if (!check.ok || ((await check.json()) as { email?: string }).email !== email)
    throw new Error('Cleanup refused Auth identity mismatch')
  const deleted = await auth(`/admin/users/${userId}`, { method: 'DELETE' })
  if (!deleted.ok) throw new Error(`Synthetic Auth deletion returned ${deleted.status}`)
  const recheck = await auth(`/admin/users/${userId}`)
  if (recheck.status !== 404) throw new Error('Synthetic Auth deletion was not confirmed')
  created.delete(userId)
  passwords.delete(userId)
}

async function siteRequest(path: string, token: string, init: RequestInit = {}) {
  return fetch(`${siteOrigin}/api${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  })
}

try {
  const first = await create(emailA)
  const second = await create(emailB)
  if ((await beta.status(first)).state !== 'unactivated') throw new Error('New Coach was active')
  await pool.query(
    `insert into app_private.beta_code
      (id,code_digest,redemption_limit,closes_at) values ($1,$2,3,$3)`,
    [codeId, codeDigest(code), new Date(Date.now() + 60 * 60 * 1000)],
  )
  codeInserted = true
  if (siteOrigin) {
    if (!publishableKey) throw new Error('HTTP smoke requires development publishable key')
    const signIn = await fetch(`${url.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: publishableKey, 'content-type': 'application/json' },
      body: JSON.stringify({ email: emailA, password: passwords.get(first.userId) }),
    })
    if (!signIn.ok) throw new Error(`Synthetic sign-in returned ${signIn.status}`)
    const token = ((await signIn.json()) as { access_token?: string }).access_token
    if (!token) throw new Error('Synthetic sign-in returned no token')
    siteToken = token
    const before = await siteRequest('/v1/students', token)
    if (before.status !== 403) throw new Error('Unactivated identity read private Students')
    const activated = await siteRequest('/v1/beta/redeem', token, {
      method: 'POST',
      body: JSON.stringify({ code, acknowledged: true }),
    })
    if (!activated.ok) throw new Error(`HTTP activation returned ${activated.status}`)
    const createdStudent = await siteRequest('/v1/students', token, {
      method: 'POST',
      body: JSON.stringify({ name: 'Isolated Beta HTTP smoke' }),
    })
    if (createdStudent.status !== 201) throw new Error('Activated Coach could not create Student')
    const listed = await siteRequest('/v1/students', token)
    if (!listed.ok || !(await listed.text()).includes('Isolated Beta HTTP smoke'))
      throw new Error('Activated Coach could not reload Student')
  }
  const grantA = await beta.redeem(first, '192.0.2.11', { code, acknowledged: true })
  if (grantA.state !== 'promotional') throw new Error('First redemption did not activate')
  await beta.redeem(first, '192.0.2.11', { code, acknowledged: true })
  const grantB = await beta.redeem(second, '192.0.2.12', { code, acknowledged: true })
  if (grantB.state !== 'promotional') throw new Error('Second redemption did not activate')
  await execFileAsync(process.execPath, [
    '--import',
    'tsx',
    'src/beta-admission/operator.ts',
    'grant-permanent',
    second.userId,
    marker,
    'isolated grant check',
  ])
  if ((await beta.status(second)).state !== 'permanent')
    throw new Error('Operator permanent grant was not visible')
  await execFileAsync(process.execPath, [
    '--import',
    'tsx',
    'src/beta-admission/operator.ts',
    'revoke-permanent',
    second.userId,
    marker,
    'isolated reversal check',
  ])
  if ((await beta.status(second)).state !== 'promotional')
    throw new Error('Operator permanent revocation did not restore the prior grant')
  const audit = await pool.query<{
    redemption_count: number
    disclosure_version: string
    disclosure_accepted_at: Date
  }>(
    `select c.redemption_count,g.disclosure_version,g.disclosure_accepted_at
     from app_private.beta_code c
     join app_private.beta_grant g on g.code_id=c.id
     join app_private.workspace w on w.id=g.workspace_id
     where c.id=$1 and w.owner_user_id=$2`,
    [codeId, first.userId],
  )
  const row = audit.rows[0]
  if (
    !row ||
    row.redemption_count !== 2 ||
    row.disclosure_version !== DISCLOSURE_VERSION ||
    !row.disclosure_accepted_at
  )
    throw new Error('Activation transaction or disclosure audit did not persist')
  if (siteToken) {
    await pool.query(
      `update app_private.beta_grant
       set started_at=now()-interval '91 days',ends_at=now()-interval '1 day'
       where workspace_id=(select id from app_private.workspace where owner_user_id=$1)`,
      [first.userId],
    )
    const freeStatus = await siteRequest('/v1/beta/status', siteToken)
    if (!freeStatus.ok || !(await freeStatus.text()).includes('"state":"free"'))
      throw new Error('Expired promotion did not become free')
    const continuedWrite = await siteRequest('/v1/students', siteToken, {
      method: 'POST',
      body: JSON.stringify({ name: 'Isolated Beta free-plan write' }),
    })
    if (continuedWrite.status !== 201) throw new Error('Free-plan Coach could not write Student')
    const reloaded = await siteRequest('/v1/students', siteToken)
    if (!reloaded.ok || !(await reloaded.text()).includes('Isolated Beta free-plan write'))
      throw new Error('Free-plan write did not persist')
  }
  await remove(first.userId)
  const replacement = await create(emailA)
  let blocked = false
  try {
    await beta.redeem(replacement, '192.0.2.13', { code, acknowledged: true })
  } catch (error) {
    blocked = error instanceof Error && error.message === 'already_used'
  }
  if (!blocked) throw new Error('Deleted Coach reused the same code')
  for (let attempt = 0; attempt < 4; attempt += 1) await beta.throttle(replacement, '192.0.2.13')
  let limitedAfterRestart = false
  try {
    await new BetaAdmissionModule(
      new PostgresBetaAdmissionRepository(pool, betaSecret),
      new SupabaseVerifiedCoachEmail(url, secretKey),
      betaSecret,
    ).throttle(replacement, '192.0.2.13')
  } catch (error) {
    limitedAfterRestart = error instanceof BetaRedemptionRateError
  }
  if (!limitedAfterRestart)
    throw new Error('Durable identity rate limit did not survive Module restart')
  const third = await create(emailC)
  if (
    (await beta.redeem(third, '192.0.2.14', { code, acknowledged: true })).state !== 'promotional'
  )
    throw new Error('Remaining shareable seat was unavailable to another Coach')
  const count = await pool.query<{ redemption_count: number }>(
    'select redemption_count from app_private.beta_code where id=$1',
    [codeId],
  )
  if (count.rows[0]?.redemption_count !== 3)
    throw new Error('Code count changed after account deletion')
  const raceCode = newBetaCode()
  await pool.query(
    `insert into app_private.beta_code
      (id,code_digest,redemption_limit,closes_at) values ($1,$2,1,$3)`,
    [raceCodeId, codeDigest(raceCode), new Date(Date.now() + 60 * 60 * 1000)],
  )
  raceCodeInserted = true
  const fourth = await create(emailD)
  const fifth = await create(emailE)
  const outcomes = await Promise.allSettled([
    beta.redeem(fourth, '192.0.2.15', { code: raceCode, acknowledged: true }),
    beta.redeem(fifth, '192.0.2.16', { code: raceCode, acknowledged: true }),
  ])
  if (outcomes.filter((outcome) => outcome.status === 'fulfilled').length !== 1)
    throw new Error('Parallel redemption did not enforce the one-seat limit')
  const raceCount = await pool.query<{ redemption_count: number }>(
    'select redemption_count from app_private.beta_code where id=$1',
    [raceCodeId],
  )
  if (raceCount.rows[0]?.redemption_count !== 1)
    throw new Error('Parallel redemption count exceeded capacity')
  console.log(
    'Beta live E2E passed: activation, disclosure audit, deletion, durable throttling, operator grant reversal, parallel capacity and optional free-plan HTTP write.',
  )
} finally {
  await pool.query('delete from app_private.beta_operator_event where actor=$1', [marker])
  for (const userId of [...created.keys()]) await remove(userId)
  for (const id of [codeInserted ? codeId : null, raceCodeInserted ? raceCodeId : null]) {
    if (!id) continue
    await pool.query('delete from app_private.beta_redemption where code_id=$1', [id])
    await pool.query('delete from app_private.beta_code where id=$1', [id])
    const remaining = await pool.query('select 1 from app_private.beta_code where id=$1', [id])
    if (remaining.rowCount) throw new Error('Synthetic Beta code cleanup failed')
  }
  const subjects = [...allCreatedIds, ...[11, 12, 13, 14, 15, 16].map((last) => `192.0.2.${last}`)]
  const digests = subjects.map((subject) =>
    createHmac('sha256', betaSecret)
      .update(`${subject.includes('.') ? 'ip' : 'identity'}:${subject}`)
      .digest('hex'),
  )
  await pool.query('delete from app_private.beta_rate_limit_bucket where subject_digest=any($1)', [
    digests,
  ])
  await pool.end()
}
