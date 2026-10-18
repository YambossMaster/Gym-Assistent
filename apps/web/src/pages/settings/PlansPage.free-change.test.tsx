// @vitest-environment jsdom
import type { Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { PlansPage } from './PlansPage'

const billing = vi.hoisted(() => {
  let cancelled = false
  let scheduledChange: { tier: 'basic'; interval: 'month'; effectiveAt: string } | undefined
  return {
    cancel: vi.fn(async () => {
      cancelled = true
    }),
    changeTrial: vi.fn(async () => {
      scheduledChange = {
        tier: 'basic',
        interval: 'month',
        effectiveAt: '2026-11-15T09:09:08.000Z'
      }
      return { status: 'confirmed' as const }
    }),
    read: vi.fn(async () => ({
      subscription: {
        tier: 'advanced' as const,
        interval: 'month' as const,
        status: cancelled ? ('cancelled' as const) : ('trial' as const),
        endsAt: '2026-11-15T09:09:08.000Z',
        renewal: { amount: scheduledChange ? 11500 : 14500, currency: 'TWD' },
        ...(scheduledChange ? { scheduledChange } : {})
      },
      invoices: []
    })),
    reset: () => {
      cancelled = false
      scheduledChange = undefined
    }
  }
})

vi.mock('../../config', () => ({ localBillingEnabled: true, localBillingServiceEnabled: true }))
vi.mock('../../supabase', () => ({ supabase: { auth: {} } }))
vi.mock('../../api', () => ({
  ApiError: class extends Error {},
  readBetaGrant: async () => ({ state: 'free' }),
  redeemBetaCode: vi.fn()
}))
vi.mock('../../beta-admission/BetaGate', () => ({ betaGrantKey: (id: string) => ['grant', id] }))
vi.mock('../../beta-admission/usePlanAccess', () => ({
  planAccessKey: (id: string) => ['plan', id],
  usePlanAccess: () => ({
    data: {
      tier: 'advanced',
      source: 'subscription',
      activeStudents: 0,
      activeVenues: 0,
      studentLimit: null,
      venueLimit: null,
      overCapacity: false
    },
    isPending: false,
    isError: false,
    refetch: vi.fn()
  })
}))
vi.mock('./billing/http-gateway', () => ({
  createHttpBillingGateway: () => ({
    billing: billing.read,
    cancel: billing.cancel,
    changeTrial: billing.changeTrial
  })
}))

afterEach(() => {
  document.body.innerHTML = ''
  billing.cancel.mockClear()
  billing.changeTrial.mockClear()
  billing.read.mockClear()
  billing.reset()
  vi.unstubAllGlobals()
})

it('blocks Prime-to-Pro downgrade during trial', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <PlansPage session={{ user: { id: 'coach' }, access_token: 'token' } as Session} />
          </MemoryRouter>
        </QueryClientProvider>
      )
    })
    await act(async () => {
      await vi.waitFor(() => expect(host.textContent).toContain('目前方案 · Prime 月繳'))
    })
    expect(host.textContent).toContain('目前方案 · Prime 月繳')
    expect(host.textContent).not.toContain('試用結束後改用 Pro 月繳')
    expect(host.textContent).not.toContain('確認變更')
    expect(billing.changeTrial).not.toHaveBeenCalled()
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
  }
})

it('uses the owned cancellation operation when changing to Free at trial end', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <PlansPage session={{ user: { id: 'coach' }, access_token: 'token' } as Session} />
          </MemoryRouter>
        </QueryClientProvider>
      )
    })
    await act(async () => {
      await vi.waitFor(() =>
        expect(host.querySelector('.settings-plan-card button')).not.toBeNull()
      )
    })
    const change = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
      button.textContent?.includes('期滿改用 Free')
    )
    expect(change).toBeDefined()
    await act(async () => change!.click())
    expect(host.textContent).toContain('期滿改用 Free？')
    expect(host.textContent).toContain('2026/11/15')
    expect(billing.cancel).not.toHaveBeenCalled()
    const confirm = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent === '確認期滿改用 Free'
    )
    await act(async () => confirm!.click())
    expect(billing.cancel).toHaveBeenCalledOnce()
    expect(host.querySelector('.settings-plan-card')?.textContent).not.toContain('期滿改用 Free')
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
  }
})
