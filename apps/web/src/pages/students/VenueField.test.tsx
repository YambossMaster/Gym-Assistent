// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { expect, it, vi } from 'vitest'
import { request } from '../../api'
import { VenueField } from './VenueField'

vi.mock('../../api', () => ({ request: vi.fn() }))

it('creates a name-only venue inside scheduling and selects it without losing the surrounding draft', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const created = {
    id: 'fixture-venue',
    name: '測試場地',
    active: true,
    version: 1,
    currentRule: null,
    remaining: 0
  }
  let saved = false
  vi.mocked(request).mockImplementation(async (_path, _token, options) => {
    if (options?.method === 'POST') {
      saved = true
      return { entity: created }
    }
    return { venues: saved ? [created] : [], rules: [] }
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const changed = vi.fn()
  function Schedule() {
    const [draft, setDraft] = useState<{
      venueId: string | null
      location: string
      customerSource: 'coach' | 'venue' | null
    }>({ venueId: null, location: '既有地點', customerSource: null })
    return (
      <QueryClientProvider client={client}>
        <form>
          <input aria-label="其他排程內容" defaultValue="09:00" />
          <VenueField
            session={{ user: { id: 'coach' }, access_token: 'fixture-token' } as Session}
            {...draft}
            onChange={(value) => {
              changed(value)
              setDraft(value)
            }}
          />
        </form>
      </QueryClientProvider>
    )
  }
  try {
    await act(async () => root.render(<Schedule />))
    expect(host.textContent).not.toContain('僅記錄地點')
    expect(host.querySelector('[name="location"]')).toBeNull()
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="場地"]')!.click())
    await act(async () =>
      [...document.querySelectorAll<HTMLElement>('[role="option"]')]
        .find((e) => e.textContent?.includes('＋ 新增場地'))!
        .click()
    )
    const input = host.querySelector<HTMLInputElement>('[aria-label="新場地名稱"]')!
    expect(host.querySelector('.venue-name-entry')).not.toBeNull()
    expect(host.querySelector('[aria-label="場地"]')).toBeNull()
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        input,
        '測試場地'
      )
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="建立場地"]')!.click())
    await act(async () => {
      await vi.waitFor(() =>
        expect(changed).toHaveBeenCalledWith({
          venueId: 'fixture-venue',
          location: '測試場地',
          customerSource: null
        })
      )
    })
    expect(request).toHaveBeenCalledWith(
      '/api/v1/venues',
      'fixture-token',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: '測試場地' }) })
    )
    expect(host.querySelector('[aria-label="新場地名稱"]')).toBeNull()
    expect(host.querySelector<HTMLInputElement>('[aria-label="其他排程內容"]')!.value).toBe('09:00')
    expect(host.querySelector<HTMLInputElement>('[name="venueId"]')!.value).toBe('fixture-venue')
    expect(host.textContent).not.toContain('費用方式')
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  }
})

it('selects a same-name Venue entered in scheduling without creating another record', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const existing = {
    id: 'existing-venue',
    name: 'FORM Studio',
    active: true,
    version: 1,
    currentRule: null,
    remaining: 0
  }
  vi.mocked(request).mockResolvedValue({ venues: [existing], rules: [] })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const changed = vi.fn()
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <VenueField
            session={{ user: { id: 'coach' }, access_token: 'fixture-token' } as Session}
            venueId={null}
            location=""
            onChange={changed}
          />
        </QueryClientProvider>
      )
    )
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="場地"]')!.click())
    await act(async () =>
      [...document.querySelectorAll<HTMLElement>('[role="option"]')]
        .find((e) => e.textContent?.includes('＋ 新增場地'))!
        .click()
    )
    const input = host.querySelector<HTMLInputElement>('[aria-label="新場地名稱"]')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        input,
        ' form studio '
      )
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="建立場地"]')!.click())
    expect(changed).toHaveBeenCalledWith({
      venueId: 'existing-venue',
      location: 'FORM Studio',
      customerSource: null
    })
    expect(vi.mocked(request).mock.calls.every(([, , options]) => options?.method !== 'POST')).toBe(
      true
    )
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  }
})

it('shows a duplicated legacy Venue name only once in the scheduling list', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const first = {
    id: 'first',
    name: '比利時',
    active: true,
    version: 1,
    currentRule: null,
    remaining: 0
  }
  const second = { ...first, id: 'second' }
  vi.mocked(request).mockResolvedValue({ venues: [first, second], rules: [] })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <VenueField
            session={{ user: { id: 'coach' }, access_token: 'fixture-token' } as Session}
            venueId={null}
            location=""
            onChange={vi.fn()}
          />
        </QueryClientProvider>
      )
    )
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="場地"]')!.click())
    expect(
      [...document.querySelectorAll<HTMLElement>('[role="option"]')].filter(
        (option) => option.textContent?.trim() === '比利時'
      )
    ).toHaveLength(1)
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  }
})
