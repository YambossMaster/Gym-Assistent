import { describe, expect, it, vi } from 'vitest'
import {
  changePassword,
  requestPasswordReset,
  resendEmailVerification,
  signInWithGoogle,
  signOutCurrentDevice,
  signOutEveryDevice,
  signUpCoach,
  updatePassword,
  verifySignupEmail,
  type CoachAuthClient
} from './account-auth'

function createAuth(overrides: Partial<CoachAuthClient> = {}): CoachAuthClient {
  return {
    signInWithPassword: vi
      .fn()
      .mockResolvedValue({ data: { session: null, user: null }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { session: null, user: null }, error: null }),
    verifyOtp: vi.fn().mockResolvedValue({ data: { session: null, user: null }, error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    resend: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    ...overrides
  }
}

describe('Coach account auth actions', () => {
  it('starts a public email signup with a trimmed email and verified redirect', async () => {
    const auth = createAuth()

    await signUpCoach(
      auth,
      ' coach@example.com ',
      'long-enough-password',
      'https://app.example.com'
    )

    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'coach@example.com',
      password: 'long-enough-password',
      options: { emailRedirectTo: 'https://app.example.com' }
    })
  })

  it('verifies only a six-digit signup email code', async () => {
    const auth = createAuth()

    await verifySignupEmail(auth, 'coach@example.com', '123 456')

    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: 'coach@example.com',
      token: '123456',
      type: 'email'
    })
    await expect(verifySignupEmail(auth, 'coach@example.com', 'wrong')).rejects.toThrow('6 位數')
  })

  it('starts Google sign-in with the current app origin as its return path', async () => {
    const auth = createAuth()

    await signInWithGoogle(auth, 'https://app.example.com')

    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://app.example.com' }
    })
  })

  it('sends password recovery only to the supplied, trimmed email and redirect', async () => {
    const auth = createAuth()

    await requestPasswordReset(
      auth,
      ' coach@example.com ',
      'https://app.example.com/account/recover'
    )

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('coach@example.com', {
      redirectTo: 'https://app.example.com/account/recover'
    })
  })

  it('resends signup verification', async () => {
    const auth = createAuth()

    await resendEmailVerification(auth, 'coach@example.com', 'https://app.example.com')

    expect(auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'coach@example.com',
      options: { emailRedirectTo: 'https://app.example.com' }
    })
  })

  it('uses local sign-out for ordinary device logout and global only when explicitly requested', async () => {
    const auth = createAuth()

    await signOutCurrentDevice(auth)
    await signOutEveryDevice(auth)

    expect(auth.signOut).toHaveBeenNthCalledWith(1, { scope: 'local' })
    expect(auth.signOut).toHaveBeenNthCalledWith(2, { scope: 'global' })
  })

  it('rejects a weak new password before calling Auth', async () => {
    const auth = createAuth()

    await expect(updatePassword(auth, 'short')).rejects.toThrow('至少需要 12 個字元')
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('verifies an existing email password immediately before updating it', async () => {
    const auth = createAuth()

    await changePassword(auth, ' coach@example.com ', 'existing-password', 'new-long-password')

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'coach@example.com',
      password: 'existing-password'
    })
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'new-long-password' })
  })
})
