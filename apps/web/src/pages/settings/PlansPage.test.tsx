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

async function renderPanel(
  _grant: BetaGrant,
  plan: PlanAccess,
  onChoosePlan?: (selection: { tier: 'basic' | 'advanced'; interval: 'month' | 'year' }) => void
) {
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
            plan={plan}
            loading={false}
            error={false}
            onRetry={() => undefined}
            onChoosePlan={onChoosePlan}
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
    expect(view.host.textContent).toContain('NT$115／月')
    expect(view.host.textContent).toContain('NT$145／月')
    await act(async () => {
      view.host
        .querySelectorAll<HTMLButtonElement>('.settings-plan-interval button')[1]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(view.host.textContent).toContain('NT$1,150／年')
    expect(view.host.textContent).toContain('NT$1,450／年')
    expect(view.host.textContent).toContain('約 NT$96／月')
    expect(view.host.textContent).toContain('約 NT$121／月')
    expect(view.host.textContent).toContain('支付功能上線後開放')
    expect(view.host.textContent).not.toContain('切換至 Pro 方案')
    expect(view.host.textContent).not.toContain('切換至 Prime 方案')
  } finally {
    await view.cleanup()
  }
})

it('shows permanent Prime without self-service switching', async () => {
  const onChoosePlan = vi.fn()
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
    },
    onChoosePlan
  )
  try {
    expect(view.host.textContent).toContain('目前方案 · 永久')
    expect(view.host.textContent).toContain('你目前享有永久 Prime 資格，無須變更方案。')
    expect(view.host.querySelectorAll('.settings-plan-card')).toHaveLength(3)
    expect(view.host.textContent).toContain('Free')
    expect(view.host.textContent).toContain('Pro')
    expect(view.host.textContent).toContain('收支報表')
    expect(view.host.textContent).not.toContain('收支明細匯出')
    expect(view.host.querySelectorAll('.settings-plan-interval button')).toHaveLength(2)
    expect(view.host.querySelectorAll('.settings-plan-card button')).toHaveLength(0)
    await act(async () => {
      view.host
        .querySelectorAll<HTMLButtonElement>('.settings-plan-interval button')[1]
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(view.host.textContent).toContain('NT$1,150／年')
    expect(view.host.textContent).toContain('NT$1,450／年')
    expect(onChoosePlan).not.toHaveBeenCalled()
  } finally {
    await view.cleanup()
  }
})
