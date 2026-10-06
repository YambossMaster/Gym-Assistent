// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { ApiError } from '../api'

const mocks = vi.hoisted(() => ({
  readBetaGrant: vi.fn(),
  signOut: vi.fn(async () => undefined)
}))

vi.mock('../config', () => ({ isInternalAlpha: () => true }))
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  readBetaGrant: mocks.readBetaGrant
}))
vi.mock('../account-auth', () => ({ signOutCurrentDevice: mocks.signOut }))
vi.mock('../supabase', () => ({ supabase: { auth: {} } }))
vi.mock('./usePlanAccess', () => ({
  planAccessKey: (coachId: string) => ['coach', coachId, 'plan-access'],
  usePlanAccess: () => ({ data: { tier: 'free', overCapacity: false } })
}))

import { BetaGate } from './BetaGate'

const session = { user: { id: 'excluded-coach' }, access_token: 'test-token' } as Session

afterEach(() => {
  mocks.readBetaGrant.mockReset()
  mocks.signOut.mockClear()
  document.body.innerHTML = ''
})

it('shows an excluded Alpha account a clear sign-out path', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  mocks.readBetaGrant.mockRejectedValue(new ApiError(403, 'Forbidden', { error: 'alpha_closed' }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <BetaGate session={session}>private workspace</BetaGate>
          </MemoryRouter>
        </QueryClientProvider>
      )
    })
    await vi.waitFor(() => expect(host.textContent).toContain('此帳號尚未列入測試名單。'), {
      timeout: 3_000
    })
    expect(host.textContent).not.toContain('private workspace')
    await act(async () => (host.querySelector('.primary-button') as HTMLButtonElement).click())
    expect(mocks.signOut).toHaveBeenCalledOnce()
  } finally {
    await act(async () => root.unmount())
    client.clear()
  }
})
