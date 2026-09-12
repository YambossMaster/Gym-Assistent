export type SignOutScope = 'local' | 'others' | 'global'

interface AuthResponse {
  error: { message: string } | null
}

interface AuthSessionResponse extends AuthResponse {
  data: { session: unknown | null; user: unknown | null }
}

export interface CoachAuthClient {
  signInWithPassword(params: { email: string; password: string }): Promise<AuthSessionResponse>
  signUp(params: {
    email: string
    password: string
    options: { emailRedirectTo: string }
  }): Promise<AuthSessionResponse>
  verifyOtp(params: { email: string; token: string; type: 'email' }): Promise<AuthSessionResponse>
  signInWithOAuth(params: {
    provider: 'google'
    options: { redirectTo: string }
  }): Promise<AuthResponse>
  resetPasswordForEmail(email: string, options: { redirectTo: string }): Promise<AuthResponse>
  resend(params: {
    type: 'signup'
    email: string
    options: { emailRedirectTo: string }
  }): Promise<AuthResponse>
  updateUser(attributes: { password: string }): Promise<AuthResponse>
  signOut(options: { scope: SignOutScope }): Promise<AuthResponse>
}

export async function signUpCoach(
  auth: CoachAuthClient,
  email: string,
  password: string,
  redirectTo: string
): Promise<void> {
  assertPassword(password)
  await requireSuccess(
    withTimeout(
      auth.signUp({
        email: normalizeEmail(email),
        password,
        options: { emailRedirectTo: redirectTo }
      }),
      '註冊服務回應逾時，請稍後再試。'
    )
  )
}

export async function verifySignupEmail(
  auth: CoachAuthClient,
  email: string,
  token: string
): Promise<void> {
  const normalizedToken = token.replace(/\s/g, '')
  if (!/^\d{6}$/.test(normalizedToken)) throw new Error('請輸入 6 位數驗證碼。')
  await requireSuccess(
    auth.verifyOtp({ email: normalizeEmail(email), token: normalizedToken, type: 'email' })
  )
}

export async function signInWithGoogle(auth: CoachAuthClient, redirectTo: string): Promise<void> {
  await requireSuccess(auth.signInWithOAuth({ provider: 'google', options: { redirectTo } }))
}

export async function requestPasswordReset(
  auth: CoachAuthClient,
  email: string,
  redirectTo: string
): Promise<void> {
  await requireSuccess(auth.resetPasswordForEmail(normalizeEmail(email), { redirectTo }))
}

export async function resendEmailVerification(
  auth: CoachAuthClient,
  email: string,
  redirectTo: string
): Promise<void> {
  await requireSuccess(
    auth.resend({
      type: 'signup',
      email: normalizeEmail(email),
      options: { emailRedirectTo: redirectTo }
    })
  )
}

export async function updatePassword(auth: CoachAuthClient, password: string): Promise<void> {
  assertPassword(password)
  await requireSuccess(auth.updateUser({ password }))
}

export async function changePassword(
  auth: CoachAuthClient,
  email: string,
  currentPassword: string,
  nextPassword: string
): Promise<void> {
  if (!currentPassword) throw new Error('請先輸入目前密碼。')
  assertPassword(nextPassword)
  await requireSuccess(
    auth.signInWithPassword({ email: normalizeEmail(email), password: currentPassword })
  )
  await requireSuccess(auth.updateUser({ password: nextPassword }))
}

export async function signOutCurrentDevice(auth: CoachAuthClient): Promise<void> {
  await requireSuccess(auth.signOut({ scope: 'local' }))
}

export async function signOutEveryDevice(auth: CoachAuthClient): Promise<void> {
  await requireSuccess(auth.signOut({ scope: 'global' }))
}

function normalizeEmail(email: string): string {
  const normalized = email.trim()
  if (!normalized) throw new Error('請輸入 Email。')
  return normalized
}

function assertPassword(password: string): void {
  if (password.length < 12) throw new Error('新密碼至少需要 12 個字元。')
}

async function requireSuccess(response: Promise<AuthResponse>): Promise<void> {
  const { error } = await response
  if (error) throw new Error(error.message)
}

async function withTimeout<T>(
  operation: Promise<T>,
  message: string,
  timeoutMs = 12_000
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs)
      })
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}
