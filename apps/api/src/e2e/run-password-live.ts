import { randomBytes } from 'node:crypto'

const url = process.env.SUPABASE_URL
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
const secretKey = process.env.SUPABASE_SECRET_KEY
const baseEmail = process.env.COACH_A_EMAIL

if (!url || !publishableKey || !secretKey || !baseEmail?.includes('@')) {
  throw new Error('Password live E2E requires development Supabase URL, keys, and Coach email.')
}

const [localPart, domain] = baseEmail.split('@')
if (!localPart || !domain) throw new Error('Invalid Coach email.')
const email = `${localPart}+password-e2e-${Date.now()}-${randomBytes(4).toString('hex')}@${domain}`
const oldPassword = randomBytes(24).toString('base64url')
const newPassword = randomBytes(24).toString('base64url')
const authUrl = `${url.replace(/\/$/, '')}/auth/v1`
let createdUserId: string | undefined

async function request(path: string, key: string, init: RequestInit): Promise<Response> {
  return fetch(`${authUrl}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
}

async function expectJson<T>(response: Response, step: string): Promise<T> {
  if (!response.ok) throw new Error(`${step} returned HTTP ${response.status}`)
  return (await response.json()) as T
}

async function signIn(password: string): Promise<string | null> {
  const response = await request('/token?grant_type=password', publishableKey!, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (response.status === 400) return null
  const body = await expectJson<{ access_token?: string }>(response, 'sign-in')
  if (!body.access_token) throw new Error('Sign-in returned no access token.')
  return body.access_token
}

try {
  const created = await expectJson<{ id?: string }>(
    await request('/admin/users', secretKey, {
      method: 'POST',
      body: JSON.stringify({ email, password: oldPassword, email_confirm: true }),
    }),
    'test account creation',
  )
  if (!created.id) throw new Error('Test account creation returned no user id.')
  createdUserId = created.id

  const originalToken = await signIn(oldPassword)
  if (!originalToken) throw new Error('Original password was rejected.')
  await expectJson(
    await request('/user', publishableKey, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${originalToken}` },
      body: JSON.stringify({ password: newPassword }),
    }),
    'password update',
  )
  const signOut = await request('/logout?scope=local', publishableKey, {
    method: 'POST',
    headers: { Authorization: `Bearer ${originalToken}` },
  })
  if (!signOut.ok) throw new Error(`Sign-out returned HTTP ${signOut.status}`)
  if (await signIn(oldPassword)) throw new Error('Original password still signs in.')
  if (!(await signIn(newPassword))) throw new Error('New password was rejected.')
  console.log(
    'Password live E2E passed: update, local sign-out, old-password rejection, new-password sign-in.',
  )
} finally {
  if (createdUserId) {
    const user = await expectJson<{ email?: string }>(
      await request(`/admin/users/${createdUserId}`, secretKey, { method: 'GET' }),
      'cleanup identity check',
    )
    if (user.email !== email)
      throw new Error('Cleanup identity mismatch; test user was not deleted.')
    const deletion = await request(`/admin/users/${createdUserId}`, secretKey, { method: 'DELETE' })
    if (!deletion.ok) throw new Error(`Test account cleanup returned HTTP ${deletion.status}`)
    const recheck = await request(`/admin/users/${createdUserId}`, secretKey, { method: 'GET' })
    if (recheck.status !== 404)
      throw new Error(`Test account cleanup recheck returned HTTP ${recheck.status}`)
    console.log('Isolated test account deleted.')
  }
}
