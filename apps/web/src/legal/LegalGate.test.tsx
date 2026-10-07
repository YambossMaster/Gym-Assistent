// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  accept: vi.fn()
}))

vi.mock('../api', () => ({
  readLegalAcceptance: mocks.read,
  acceptLegalTerms: mocks.accept
}))

import { LegalGate } from './LegalGate'

const session = { user: { id: 'alpha-coach' }, access_token: 'test-token' } as Session
const pending = {
  accepted: false,
  termsVersion: '2026-10-06-alpha',
  privacyVersion: '2026-10-06-alpha',
  acceptedAt: null
}

afterEach(() => {
  mocks.read.mockReset()
  mocks.accept.mockReset()
  document.body.innerHTML = ''
})

it('keeps the Workspace closed until both explicit confirmations are stored', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  mocks.read.mockResolvedValue(pending)
  mocks.accept.mockResolvedValue({
    ...pending,
    accepted: true,
    acceptedAt: '2026-10-06T15:00:00.000Z'
  })
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
    const submit = host.querySelector('button[type="submit"]') as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    const checks = host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    await act(async () => checks[0]!.click())
    expect(submit.disabled).toBe(true)
    await act(async () => checks[1]!.click())
    expect(submit.disabled).toBe(false)
    await act(async () => {
      submit.click()
      await vi.waitFor(() => expect(host.textContent).toContain('private workspace'))
    })
    expect(mocks.accept).toHaveBeenCalledWith('test-token', {
      termsVersion: '2026-10-06-alpha',
      privacyVersion: '2026-10-06-alpha'
    })
  } finally {
    await act(async () => root.unmount())
    client.clear()
  }
})
