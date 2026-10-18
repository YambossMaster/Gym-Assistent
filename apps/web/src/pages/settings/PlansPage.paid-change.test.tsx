// @vitest-environment jsdom
import type { Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { PlansPage } from './PlansPage'

const billing = vi.hoisted(() => ({
  read: vi.fn(async () => ({
    subscription: {
      tier: 'advanced' as const,
      interval: 'month' as const,
      status: 'active' as const,
      endsAt: '2026-11-17T00:00:00Z',
      renewal: { amount: 14500, currency: 'TWD' }
    },
    invoices: []
  })),
  preview: vi.fn(async () => ({
    id: '00000000-0000-4000-8000-000000000001',
    tier: 'advanced' as const,
    interval: 'year' as const,
    estimate: { amount: 130517, currency: 'TWD' },
    expiresAt: '2099-01-01T00:00:00Z'
  })),
  confirm: vi.fn(async () => ({ status: 'pending' as const }))
}))
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
    previewPaid: billing.preview,
    confirmPaid: billing.confirm,
    cancel: vi.fn(),
    changeTrial: vi.fn()
  })
}))

it('shows the requested charge warning and sends only one confirmation on rapid clicks', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const button = (label: string) =>
    Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find(
      (item) => item.textContent?.trim() === label
    )
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <PlansPage session={{ user: { id: 'owner' }, access_token: 'token' } as Session} />
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    await act(async () => {
      await vi.waitFor(() => expect(billing.read).toHaveBeenCalled())
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    const annual = host.querySelector<HTMLButtonElement>(
      '.settings-plan-interval button:last-child'
    )
    expect(annual).toBeTruthy()
    await act(async () => annual!.click())
    await act(async () => {
      await vi.waitFor(() => expect(button('改為年繳')).toBeTruthy())
    })
    await act(async () => button('改為年繳')!.click())
    await act(async () => {
      await vi.waitFor(() => expect(host.textContent).toContain('預估升級費用約 NT$1,305。'))
    })
    expect(host.textContent).toContain(
      '實際金額、稅額及續訂日期以 Lemon Squeezy 完成後的帳單為準。'
    )
    expect(host.textContent).toContain('此方案變更尚未開放')
    await act(async () => {
      button('確認變更並付款')!.click()
      button('確認變更並付款')?.click()
    })
    expect(billing.confirm).toHaveBeenCalledTimes(1)
    expect(billing.confirm).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001')
  } finally {
    await act(async () => root.unmount())
    host.remove()
    client.clear()
    vi.unstubAllGlobals()
    billing.read.mockClear()
    billing.preview.mockClear()
    billing.confirm.mockClear()
  }
})
