// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import type { BetaGrant, PlanAccess } from '../../api'
import { PlanPanel } from './PlansPage'

vi.mock('../../supabase', () => ({ supabase: { auth: {} } }))

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

async function renderPanel(grant: BetaGrant, plan: PlanAccess) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <PlanPanel
            grant={grant}
            plan={plan}
            loading={false}
            error={false}
            onRetry={() => undefined}
            offerCode=""
            onOfferCodeChange={() => undefined}
            onRedeem={(event) => event.preventDefault()}
            redeeming={false}
            offerError=""
            offerSuccess=""
          />
        </MemoryRouter>
      </QueryClientProvider>
    )
  })
  return {
    host,
    cleanup: async () => {
      await act(async () => root.unmount())
      client.clear()
      host.remove()
    }
  }
}

it('keeps ordinary Beta Coaches on Free without rendering paid selection actions', async () => {
  const view = await renderPanel(
    { state: 'free' },
    {
      tier: 'free',
      source: 'free',
      activeStudents: 0,
      activeVenues: 0,
      studentLimit: 5,
      venueLimit: 1,
      overCapacity: false
    }
  )
  try {
    expect(view.host.textContent).toContain('支付功能上線後開放')
    expect(view.host.textContent).not.toContain('切換至 Pro 方案')
    expect(view.host.textContent).not.toContain('切換至 Prime 方案')
  } finally {
    await view.cleanup()
  }
})

it('shows permanent Prime without self-service switching', async () => {
  const view = await renderPanel(
    { state: 'permanent', startedAt: '2026-10-08T00:00:00.000Z' },
    {
      tier: 'advanced',
      source: 'permanent',
      activeStudents: 0,
      activeVenues: 0,
      studentLimit: null,
      venueLimit: null,
      overCapacity: false
    }
  )
  try {
    expect(view.host.textContent).toContain('目前方案 · 永久')
    expect(view.host.textContent).toContain('你已具有永久 Prime 方案權限')
    expect(view.host.textContent).not.toContain('切換至 Pro 方案')
    expect(view.host.textContent).not.toContain('切換至 Prime 方案')
  } finally {
    await view.cleanup()
  }
})
