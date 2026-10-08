// @vitest-environment jsdom
import type { Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import type { BetaGrant, PlanAccess } from '../../api'
import { PlanPanel } from './PlansPage'

vi.mock('../../supabase', () => ({ supabase: { auth: {} } }))

const session = { user: { id: 'coach-a' }, access_token: 'test-token' } as Session

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
            session={session}
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
      overCapacity: false,
      canChangePlan: false,
      version: 0
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

it('shows self-service plan switching only for the plan tester', async () => {
  const view = await renderPanel(
    { state: 'tester', startedAt: '2026-10-08T00:00:00.000Z' },
    {
      tier: 'free',
      source: 'tester',
      activeStudents: 0,
      activeVenues: 0,
      studentLimit: 5,
      venueLimit: 1,
      overCapacity: false,
      canChangePlan: true,
      version: 0
    }
  )
  try {
    expect(view.host.textContent).toContain('切換至 Pro 方案')
    expect(view.host.textContent).toContain('切換至 Prime 方案')
    expect(view.host.textContent).toContain('此帳號可切換 Free、Pro 與 Prime 方案進行測試。')
  } finally {
    await view.cleanup()
  }
})
