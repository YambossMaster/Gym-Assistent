// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { expect, it, vi } from 'vitest'
import { VenueManager } from './VenueManager'

const mutate = vi.hoisted(() => vi.fn())
const venueFixtureState = vi.hoisted(() => ({ restored: false }))
const creditFixtures = vi.hoisted(
  () =>
    [] as Array<{
      id: string
      venueId: string
      purchasedOn: string
      lessonCount: number
      remainingLessons: number
      amountMinor: number
      currency: string
      privateNote: string
      version: number
    }>
)
vi.mock('./finance-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./finance-api')>()),
  useVenues: () => ({
    data: {
      today: '2026-09-25',
      timeZone: 'Asia/Taipei',
      venues: [
        {
          id: 'venue-1',
          name: '舊場地',
          active: venueFixtureState.restored,
          canDelete: true,
          version: 3,
          currentRule: null,
          remaining: 0
        },
        {
          id: 'venue-2',
          name: '本月場地',
          active: true,
          canDelete: false,
          version: 1,
          currentRule: null,
          remaining: 0
        },
        {
          id: 'venue-3',
          name: '尚未使用',
          address: '台北市測試路',
          active: true,
          canDelete: true,
          version: 1,
          currentRule: null,
          remaining: 0
        },
        {
          id: 'venue-4',
          name: '預購場地',
          active: true,
          canDelete: false,
          version: 1,
          currentRule: { id: 'rule-4', kind: 'prepaid' },
          remaining: 32,
          pendingLessons: 2
        }
      ],
      rules: [],
      credits: creditFixtures,
      payouts: [],
      sessions: [],
      series: [],
      purchases: []
    },
    isPending: false,
    isError: false
  }),
  useFinanceMutation: () => ({ isPending: false, error: null, mutate, reset: vi.fn() })
}))

it('keeps both venue status choices after the last archived venue is restored', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = new QueryClient()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const render = () =>
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <VenueManager session={{ user: { id: 'coach' } } as Session} />
        </MemoryRouter>
      </QueryClientProvider>
    )
  try {
    await act(async () => render())
    await act(async () =>
      host.querySelectorAll<HTMLButtonElement>('[aria-label="場地狀態"] button')[1]!.click()
    )
    expect(host.querySelector('.venue-list')?.textContent).toContain('舊場地')
    venueFixtureState.restored = true
    await act(async () => render())
    const choices = host.querySelectorAll<HTMLButtonElement>('[aria-label="場地狀態"] button')
    expect(choices).toHaveLength(2)
    expect(choices[1]?.textContent).toContain('已封存 0')
    await act(async () => choices[0]!.click())
    expect(host.querySelector('.venue-list')?.textContent).toContain('舊場地')
  } finally {
    venueFixtureState.restored = false
    await act(async () => root.unmount())
    client.clear()
    host.remove()
    vi.unstubAllGlobals()
  }
})

it('shows prepaid balance on the card and keeps purchase entry in Venue details', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = new QueryClient()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <VenueManager session={{ user: { id: 'coach' } } as Session} />
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    const card = [...host.querySelectorAll('.venue-card')].find((item) =>
      item.textContent?.includes('預購場地')
    )!
    expect(card.querySelector('.venue-balance')).toBeNull()
    expect(card.querySelector('.venue-card-heading')?.textContent).toContain(
      '預購場地堂數（剩餘可用堂數 32 堂 · 未扣堂數 2 堂）'
    )
    expect(card.textContent).not.toContain('登錄預購')
    await act(async () => card.querySelector<HTMLButtonElement>('.venue-card-heading')!.click())
    expect(host.querySelector('#scheduling-dialog-title')?.textContent).toBe('預購場地')
    expect(host.querySelector('.scheduling-dialog > header p')?.textContent).toBe('\u00a0')
    expect(host.querySelector('.venue-prepaid-section')?.textContent).toContain('登錄預購')
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
    vi.unstubAllGlobals()
  }
})

it('orders Venue purchases newest first and closes nested record history one layer at a time', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  creditFixtures.push(
    {
      id: 'older',
      venueId: 'venue-4',
      purchasedOn: '2026-05-01',
      lessonCount: 4,
      remainingLessons: 1,
      amountMinor: 1600,
      currency: 'TWD',
      privateNote: '',
      version: 1
    },
    {
      id: 'newer',
      venueId: 'venue-4',
      purchasedOn: '2026-08-01',
      lessonCount: 6,
      remainingLessons: 3,
      amountMinor: 2400,
      currency: 'TWD',
      privateNote: '',
      version: 1
    }
  )
  const client = new QueryClient()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <VenueManager session={{ user: { id: 'coach' } } as Session} />
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    const click = async (label: string) =>
      act(async () =>
        [...host.querySelectorAll<HTMLButtonElement>('button')]
          .find((button) => button.textContent?.includes(label))!
          .click()
      )
    await click('預購場地')
    expect(
      [...host.querySelectorAll('.venue-credit-list .venue-record')].map((row) =>
        row.textContent?.slice(0, 10)
      )
    ).toEqual(['2026-08-01', '2026-05-01'])
    await click('場地課程紀錄')
    expect(host.querySelector('#scheduling-dialog-title')?.textContent).toBe(
      '場地課程紀錄 - 預購場地'
    )
    await click('過往支出類型')
    expect(host.querySelector('#scheduling-dialog-title')?.textContent).toBe('過往支出類型')
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="關閉"]')!.click()
    )
    expect(host.querySelector('#scheduling-dialog-title')?.textContent).toBe(
      '場地課程紀錄 - 預購場地'
    )
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="關閉"]')!.click()
    )
    expect(host.querySelector('#scheduling-dialog-title')?.textContent).toBe('預購場地')
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
    creditFixtures.length = 0
    vi.unstubAllGlobals()
  }
})

it('returns from a Finance course source through its record list before the ledger', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const scrollIntoView = HTMLElement.prototype.scrollIntoView
  HTMLElement.prototype.scrollIntoView = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
  client.setQueryData(['venues', 'coach', 'venue-2', 'course-records'], {
    pages: [
      {
        records: [
          {
            sessionId: 'session-1',
            startsAt: '2026-09-04T04:00:00Z',
            endsAt: '2026-09-04T05:00:00Z',
            studentName: '測試學生',
            status: 'free'
          }
        ],
        nextCursor: null
      }
    ],
    pageParams: ['']
  })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter
            initialEntries={[
              '/students/venues?venue=venue-2&course=session-1&from=finances&entry=session%3Asession-1&month=2026-09'
            ]}
          >
            <Routes>
              <Route
                path="/students/venues"
                element={<VenueManager session={{ user: { id: 'coach' } } as Session} />}
              />
              <Route path="/students/finances" element={<p>finance returned</p>} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    expect(host.querySelector('#scheduling-dialog-title')?.textContent).toContain('場地課程紀錄')
    await act(async () => host.querySelector<HTMLButtonElement>('.venue-record')!.click())
    expect(host.querySelector('.venue-course-detail')?.textContent).toContain('測試學生')
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="關閉"]')!.click()
    )
    expect(host.querySelector('.venue-course-detail')).toBeNull()
    expect(host.querySelector('.venue-record')).not.toBeNull()
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="關閉"]')!.click()
    )
    expect(host.textContent).toContain('finance returned')
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
    HTMLElement.prototype.scrollIntoView = scrollIntoView
    vi.unstubAllGlobals()
  }
})

it('returns from a Finance prepaid source when its editor closes', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  creditFixtures.push({
    id: 'credit-1',
    venueId: 'venue-4',
    purchasedOn: '2026-09-25',
    lessonCount: 4,
    remainingLessons: 4,
    amountMinor: 1600,
    currency: 'TWD',
    privateNote: '',
    version: 1
  })
  const client = new QueryClient()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter
            initialEntries={[
              '/students/venues?venue=venue-4&credit=credit-1&from=finances&entry=credit%3Acredit-1'
            ]}
          >
            <Routes>
              <Route
                path="/students/venues"
                element={<VenueManager session={{ user: { id: 'coach' } } as Session} />}
              />
              <Route path="/students/finances" element={<p>finance returned</p>} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    expect(host.querySelector('#scheduling-dialog-title')?.textContent).toBe('編輯場地預購')
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="關閉"]')!.click()
    )
    expect(host.textContent).toContain('finance returned')
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
    creditFixtures.length = 0
    vi.unstubAllGlobals()
  }
})

it('opens a delete confirmation from an existing prepaid purchase and returns to its Venue', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  creditFixtures.push({
    id: 'credit-1',
    venueId: 'venue-2',
    purchasedOn: '2026-09-25',
    lessonCount: 3,
    remainingLessons: 2,
    amountMinor: 90000,
    currency: 'TWD',
    privateNote: '',
    version: 2
  })
  const client = new QueryClient()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <VenueManager session={{ user: { id: 'coach' } } as Session} />
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    const click = async (label: string) =>
      act(async () =>
        [...host.querySelectorAll<HTMLButtonElement>('button')]
          .find((button) => button.textContent?.includes(label))!
          .click()
      )
    await click('本月場地')
    await click('2026-09-25 · 3 堂')
    expect(host.querySelector('#scheduling-dialog-title')?.textContent).toBe('編輯場地預購')
    await click('刪除預購紀錄')
    expect(host.querySelector('[role="alertdialog"]')?.textContent).toContain('已完成課程仍會保留')
    await click('刪除預購紀錄')
    expect(mutate).toHaveBeenCalledWith(
      { path: '/venues/venue-2/credit-purchases/credit-1', method: 'DELETE', body: { version: 2 } },
      expect.any(Object)
    )
    await act(async () => mutate.mock.lastCall?.[1]?.onSuccess({}))
    expect(host.querySelector('#scheduling-dialog-title')?.textContent).toBe('本月場地')
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
    creditFixtures.length = 0
    vi.unstubAllGlobals()
    mutate.mockClear()
  }
})

it('saves a new prepaid purchase directly from its form', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = new QueryClient()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <VenueManager session={{ user: { id: 'coach' } } as Session} />
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    const click = async (label: string) =>
      act(async () =>
        [...host.querySelectorAll<HTMLButtonElement>('button')]
          .find((button) => button.textContent?.includes(label))!
          .click()
      )
    await click('預購場地')
    await click('登錄預購')
    const count = host.querySelector<HTMLInputElement>('input[name="lessonCount"]')!
    const total = host.querySelector<HTMLInputElement>('input[aria-label="總金額"]')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(count, '6')
      count.dispatchEvent(new Event('input', { bubbles: true }))
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(total, '2400')
      total.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(host.textContent).not.toContain('確認預購與扣堂影響')
    await act(async () =>
      host
        .querySelector<HTMLFormElement>('.finance-editor form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    )
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/venues/venue-4/credit-purchases',
        method: 'POST',
        body: expect.objectContaining({ lessonCount: 6, amountMinor: 2400 })
      }),
      expect.any(Object)
    )
    await act(async () => mutate.mock.lastCall?.[1]?.onSuccess({}))
    expect(host.querySelector('#scheduling-dialog-title')?.textContent).toBe('預購場地')
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
    vi.unstubAllGlobals()
    mutate.mockClear()
  }
})

it('changes an existing prepaid purchase directly from its form', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  creditFixtures.push({
    id: 'credit-direct',
    venueId: 'venue-4',
    purchasedOn: '2026-05-17',
    lessonCount: 14,
    remainingLessons: 4,
    amountMinor: 5600,
    currency: 'TWD',
    privateNote: '',
    version: 2
  })
  const client = new QueryClient()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <VenueManager session={{ user: { id: 'coach' } } as Session} />
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    const click = async (label: string) =>
      act(async () =>
        [...host.querySelectorAll<HTMLButtonElement>('button')]
          .find((button) => button.textContent?.includes(label))!
          .click()
      )
    await click('預購場地')
    await click('2026-05-17 · 14 堂')
    expect(host.querySelector('#scheduling-dialog-title')?.textContent).toBe('編輯場地預購')
    await act(async () =>
      host
        .querySelector<HTMLFormElement>('.finance-editor form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    )
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/venues/venue-4/credit-purchases/credit-direct',
        method: 'PATCH',
        body: expect.objectContaining({ version: 2, lessonCount: 14, amountMinor: 5600 })
      }),
      expect.any(Object)
    )
    await act(async () => mutate.mock.lastCall?.[1]?.onSuccess({}))
    expect(host.querySelector('#scheduling-dialog-title')?.textContent).toBe('預購場地')
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
    creditFixtures.length = 0
    vi.unstubAllGlobals()
    mutate.mockClear()
  }
})

it('offers simple confirmation only for archived Venue deletion and keeps restore available', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = new QueryClient()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <VenueManager session={{ user: { id: 'coach' } } as Session} />
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    await act(async () =>
      host.querySelectorAll<HTMLButtonElement>('[aria-label="場地狀態"] button')[1]!.click()
    )
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.includes('舊場地'))!
        .click()
    )
    expect(host.textContent).toContain('恢復場地')
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.trim() === '刪除場地')!
        .click()
    )
    const confirmation = host.querySelector('[role="alertdialog"]')!
    expect(confirmation.textContent).toContain('永久刪除「舊場地」？')
    expect(confirmation.querySelector('input')).toBeNull()
    await act(async () =>
      [...confirmation.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.trim() === '刪除場地')!
        .click()
    )
    expect(mutate).toHaveBeenCalledWith(
      { path: '/venues/venue-1', method: 'DELETE', body: { version: 3 } },
      expect.any(Object)
    )
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
    vi.unstubAllGlobals()
    mutate.mockClear()
  }
})

it('keeps a name-only create fast and shows the detailed defaults in Venue management', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = new QueryClient()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <VenueManager session={{ user: { id: 'coach' } } as Session} />
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.includes('新增場地'))!
        .click()
    )
    expect(host.textContent).toContain('場地支出類型')
    expect(host.textContent).toContain('無底薪')
    const name = host.querySelector<HTMLInputElement>('input[type="text"]')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        name,
        '新場地'
      )
      name.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () =>
      host
        .querySelector<HTMLFormElement>('.finance-editor form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    )
    expect(mutate).toHaveBeenCalledWith(
      { path: '/venues', method: 'POST', body: { name: '新場地' } },
      expect.any(Object)
    )
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
    vi.unstubAllGlobals()
    mutate.mockClear()
  }
})

it('uses the Settings currency for a new rent rule without another currency selector', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  localStorage.setItem('gym-assistant.default-purchase-currency', 'USD')
  const client = new QueryClient()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <VenueManager session={{ user: { id: 'coach' } } as Session} />
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.includes('本月場地'))!
        .click()
    )
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.includes('場地支出類型'))!
        .click()
    )
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="場地支出類型"]')!.click()
    )
    await act(async () =>
      [...document.querySelectorAll<HTMLButtonElement>('[role="option"]')]
        .find((option) => option.textContent?.trim() === '單次計費')!
        .click()
    )
    expect(host.textContent).toContain('單次計費（USD）')
    expect(host.textContent).not.toContain('幣別')
    const input = host.querySelector<HTMLInputElement>('input[name="rent"]')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '12.5')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () =>
      host
        .querySelector<HTMLFormElement>('.finance-editor form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    )
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/venues/venue-2/fee-rules/preview',
        body: expect.objectContaining({ currency: 'USD', amountMinor: 1250 })
      }),
      expect.any(Object)
    )
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
    localStorage.removeItem('gym-assistant.default-purchase-currency')
    vi.unstubAllGlobals()
    mutate.mockClear()
  }
})

it('offers direct deletion for an unused active Venue and hides unrelated money actions', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = new QueryClient()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <VenueManager session={{ user: { id: 'coach' } } as Session} />
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.includes('尚未使用'))!
        .click()
    )
    const editor = host.querySelector('.finance-editor')!
    expect(host.querySelector('.scheduling-dialog > header')?.textContent).toContain('台北市測試路')
    expect(editor.textContent).toContain('場地支出類型')
    expect(editor.textContent).toContain('刪除場地')
    expect(editor.textContent).not.toContain('封存場地')
    expect(editor.textContent).not.toContain('登錄預購')
    expect(editor.textContent).not.toContain('登錄場地撥款')
    expect(editor.textContent).not.toContain('初始設定')
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
    vi.unstubAllGlobals()
  }
})

it('edits the optional address in the name dialog and returns to Venue detail', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = new QueryClient()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <VenueManager session={{ user: { id: 'coach' } } as Session} />
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.includes('尚未使用'))!
        .click()
    )
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.includes('編輯名稱'))!
        .click()
    )
    const address = [...host.querySelectorAll('label')]
      .find((label) => label.textContent?.includes('場地位置或地址'))!
      .querySelector('input')!
    expect(address.autocomplete).toBe('off')
    expect(address.value).toBe('台北市測試路')
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        address,
        '新北市測試街'
      )
      address.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () =>
      host
        .querySelector<HTMLFormElement>('.finance-editor form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    )
    expect(mutate).toHaveBeenCalledWith(
      {
        path: '/venues/venue-3',
        method: 'PATCH',
        body: { version: 1, name: '尚未使用', address: '新北市測試街', active: true }
      },
      expect.any(Object)
    )
    await act(async () => mutate.mock.lastCall?.[1]?.onSuccess({}))
    expect(host.querySelector('#scheduling-dialog-title')?.textContent).toBe('尚未使用')
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
    vi.unstubAllGlobals()
    mutate.mockClear()
  }
})

it('offers archive for a referenced active Venue and sends an unchanged name', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = new QueryClient()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <VenueManager session={{ user: { id: 'coach' } } as Session} />
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.includes('本月場地'))!
        .click()
    )
    const editor = host.querySelector('.finance-editor')!
    expect(editor.textContent).toContain('封存場地')
    expect(editor.textContent).not.toContain('刪除場地')
    await act(async () =>
      [...editor.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.trim() === '封存場地')!
        .click()
    )
    expect(mutate).toHaveBeenCalledWith(
      {
        path: '/venues/venue-2',
        method: 'PATCH',
        body: { version: 1, name: '本月場地', active: false }
      },
      expect.any(Object)
    )
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
    vi.unstubAllGlobals()
    mutate.mockClear()
  }
})

it('returns from Venue settings to the Venue detail on close, cancel, and save', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = new QueryClient()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const click = async (text: string) => {
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.includes(text))!
        .click()
    )
  }
  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <VenueManager session={{ user: { id: 'coach' } } as Session} />
          </MemoryRouter>
        </QueryClientProvider>
      )
    )
    await click('本月場地')
    await click('場地支出類型')
    expect(host.querySelector('#scheduling-dialog-title')?.textContent).toBe('設定場地費用')
    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="關閉"]')!.click()
    )
    expect(host.querySelector('#scheduling-dialog-title')?.textContent).toBe('本月場地')
    await click('底薪與否？')
    await click('取消')
    expect(host.querySelector('#scheduling-dialog-title')?.textContent).toBe('本月場地')
    await click('底薪與否？')
    await click('儲存')
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/venues/venue-2/salary-rules' }),
      expect.any(Object)
    )
    await act(async () => mutate.mock.lastCall?.[1]?.onSuccess({}))
    expect(host.querySelector('#scheduling-dialog-title')?.textContent).toBe('本月場地')
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
    vi.unstubAllGlobals()
    mutate.mockClear()
  }
})
