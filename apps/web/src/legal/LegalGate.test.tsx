// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  accept: vi.fn(),
  signOut: vi.fn()
}))

vi.mock('../api', () => ({
  readLegalAcceptance: mocks.read,
  acceptLegalTerms: mocks.accept
}))

vi.mock('../account-auth', () => ({ signOutCurrentDevice: mocks.signOut }))
vi.mock('../supabase', () => ({ supabase: { auth: {} } }))

import { LegalGate } from './LegalGate'

const session = { user: { id: 'alpha-coach' }, access_token: 'test-token' } as Session
const pending = {
  accepted: false,
  termsVersion: '2026-10-07-alpha',
  privacyVersion: '2026-10-07-alpha',
  acceptedAt: null
}

afterEach(() => {
  mocks.read.mockReset()
  mocks.accept.mockReset()
  mocks.signOut.mockReset()
  document.body.innerHTML = ''
})

it('keeps the Workspace closed until the document acceptance is stored', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  mocks.read.mockResolvedValue(pending)
  mocks.accept.mockResolvedValue({
    ...pending,
    accepted: true,
    acceptedAt: '2026-10-06T15:00:00.000Z'
  })
  mocks.signOut.mockResolvedValue(undefined)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <LegalGate session={session}>private workspace</LegalGate>
          </MemoryRouter>
        </QueryClientProvider>
      )
    })
    await act(async () => {
      await vi.waitFor(() => expect(host.textContent).toContain('請確認使用條款與隱私聲明'))
    })
    expect(host.textContent).not.toContain('private workspace')
    expect(host.textContent).toContain('始於有跡可循。')
    const back = host.querySelector('.legal-gate-return button') as HTMLButtonElement
    expect(back.textContent).toContain('返回登入')
    await act(async () => back.click())
    expect(mocks.signOut).toHaveBeenCalledWith({})
    const submit = host.querySelector('button[type="submit"]') as HTMLButtonElement
    expect(submit.querySelector('svg')).not.toBeNull()
    expect(submit.disabled).toBe(true)
    const checks = host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    expect(checks).toHaveLength(1)
    expect(host.textContent).not.toContain('我知道目前沒有定期資料庫備份')
    await act(async () => checks[0]!.click())
    expect(submit.disabled).toBe(false)
    await act(async () => {
      submit.click()
      await vi.waitFor(() => expect(host.textContent).toContain('private workspace'))
    })
    expect(mocks.accept).toHaveBeenCalledWith('test-token', {
      termsVersion: '2026-10-07-alpha',
      privacyVersion: '2026-10-07-alpha'
    })
  } finally {
    await act(async () => root.unmount())
    client.clear()
  }
})
