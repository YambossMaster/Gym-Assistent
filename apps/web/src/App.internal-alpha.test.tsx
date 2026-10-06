// @vitest-environment jsdom
import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn()
}))

vi.mock('./config', () => ({ isInternalAlpha: () => true }))
vi.mock('./supabase', () => ({
  supabase: { auth },
  initialRecoveryPending: false,
  setRecoveryPending: vi.fn(),
  initialAuthRedirectError: false
}))
vi.mock('./app-shell/CoachWorkspace', () => ({ CoachWorkspace: () => <div>coach-dashboard</div> }))
vi.mock('./beta-admission/BetaGate', () => ({
  BetaGate: ({ children }: { children: ReactNode }) => <>{children}</>
}))

import { App } from './App'

afterEach(() => {
  auth.getSession.mockReset()
  auth.onAuthStateChange.mockReset()
  document.body.innerHTML = ''
})

it('presents sign-in only while the production build is in internal Alpha', async () => {
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
    expect(host.textContent).toContain('目前僅開放內部測試帳號登入。')
    expect(host.querySelector('.auth-entry-signup')).toBeNull()
    expect(
      Array.from(host.querySelectorAll('button')).some(
        (button) => button.textContent === '建立帳號'
      )
    ).toBe(false)
    expect(host.textContent).not.toContain('使用 Google 繼續')
  } finally {
    await act(async () => root.unmount())
  }
})
