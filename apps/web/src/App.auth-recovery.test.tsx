// @vitest-environment jsdom
import type { Session } from '@supabase/supabase-js'
import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  listener: null as null | ((event: string, session: Session | null) => void),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn()
}))
vi.mock('./supabase', () => ({
  supabase: { auth },
  initialRecoveryPending: false,
  setRecoveryPending: vi.fn(),
  initialAuthRedirectError: false
}))
vi.mock('./app-shell/CoachWorkspace', () => ({
  CoachWorkspace: () => <div>coach-dashboard</div>
}))
vi.mock('./beta-admission/BetaGate', () => ({
  BetaGate: ({ children }: { children: ReactNode }) => <>{children}</>
}))

import { App } from './App'

afterEach(() => {
  auth.listener = null
  auth.getSession.mockReset()
  auth.onAuthStateChange.mockReset()
  document.body.innerHTML = ''
  window.history.replaceState(null, '', '/')
})

it('opens the selected mobile entry form and returns to the welcome view', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  auth.getSession.mockResolvedValue({ data: { session: null } })
  auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } }
  })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () => root.render(<App />))
    const layout = host.querySelector('main.auth-layout')
    expect(layout?.classList.contains('auth-entry-welcome')).toBe(true)
    await act(async () => (host.querySelector('.auth-entry-signup') as HTMLButtonElement).click())
    expect(layout?.classList.contains('auth-entry-form')).toBe(true)
    expect(host.querySelector('.auth-card h2')?.textContent).toBe('建立教練帳號')
    await act(async () => (host.querySelector('.auth-mobile-back') as HTMLButtonElement).click())
    expect(layout?.classList.contains('auth-entry-welcome')).toBe(true)
    await act(async () => (host.querySelector('.auth-entry-signin') as HTMLButtonElement).click())
    expect(layout?.classList.contains('auth-entry-form')).toBe(true)
    expect(host.querySelector('.auth-card h2')?.textContent).toBe('回到工作台')
  } finally {
    await act(async () => root.unmount())
  }
})

it('keeps the reset form open after the recovery session refreshes, until a new password is set', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const session = {
    access_token: 'test-token',
    user: { id: 'coach', email: 'coach@example.com' }
  } as Session
  auth.getSession.mockResolvedValue({ data: { session } })
  auth.onAuthStateChange.mockImplementation((listener) => {
    auth.listener = listener
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () => root.render(<App />))
    expect(host.textContent).toContain('coach-dashboard')
    await act(async () => auth.listener?.('PASSWORD_RECOVERY', session))
    expect(host.textContent).toContain('設定新密碼')
    await act(async () => auth.listener?.('TOKEN_REFRESHED', session))
    expect(host.textContent).toContain('設定新密碼')
    expect(host.textContent).not.toContain('coach-dashboard')
  } finally {
    await act(async () => root.unmount())
  }
})

it('does not expose the reset form or dashboard on a recovery path without a recovery event', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  window.history.replaceState(null, '', '/account/recover')
  const session = {
    access_token: 'test-token',
    user: { id: 'coach', email: 'coach@example.com' }
  } as Session
  auth.getSession.mockResolvedValue({ data: { session } })
  auth.onAuthStateChange.mockImplementation((listener) => {
    auth.listener = listener
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () => root.render(<App />))
    expect(host.textContent).toContain('重設連結已失效')
    expect(host.textContent).not.toContain('coach-dashboard')
    expect(host.textContent).not.toContain('設定新密碼')
    await act(async () => auth.listener?.('PASSWORD_RECOVERY', session))
    expect(host.textContent).toContain('設定新密碼')
  } finally {
    await act(async () => root.unmount())
  }
})
