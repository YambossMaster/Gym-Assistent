// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { afterEach, expect, it, vi } from 'vitest'
import { FinanceExportPanel, type DataPanelProps } from './FinanceExportPanel'
import { CalendarIntegrationPanel } from './CalendarIntegrationPanel'
import { ExportDownloads } from './ExportDownloads'
vi.mock('../../supabase', () => ({ supabase: { auth: {} } }))
const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
  vi.unstubAllGlobals()
})
async function render(prime = false, active = false, expired = false) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const fetcher = vi.fn(
    async (_url: string, init?: RequestInit) =>
      new Response(
        JSON.stringify(
          init?.method === 'POST'
            ? {
                includeBlocks: false,
                showNames: false,
                showLocation: true,
                version: 2,
                active: true,
                token: 'synthetic-token'
              }
            : {
                includeBlocks: false,
                showNames: false,
                showLocation: true,
                version: active || expired ? 1 : 0,
                expired,
                active
              }
        ),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
  )
  vi.stubGlobal('fetch', fetcher)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const props: DataPanelProps = {
    session: { user: { id: 'coach' }, access_token: 'synthetic' } as Session,
    plan: {
      tier: prime ? 'advanced' : 'basic',
      source: 'tester',
      activeStudents: 0,
      activeVenues: 0,
      studentLimit: null,
      venueLimit: null,
      overCapacity: false,
      canChangePlan: true,
      version: 1
    },
    timeZone: 'Asia/Taipei',
    loadingError: false,
    onRetryLoading: () => {}
  }
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ExportDownloads session={props.session}>
            <FinanceExportPanel {...props} />
            <CalendarIntegrationPanel {...props} />
          </ExportDownloads>
        </MemoryRouter>
      </QueryClientProvider>
    )
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
  cleanups.push(async () => {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
  })
  return { fetcher, client }
}
async function click(label: string) {
  const button = [...document.querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === label
  )
  expect(button, label).toBeDefined()
  await act(async () => button!.click())
}
it('keeps Pro upsell quiet until either Settings action is selected', async () => {
  await render()
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  await click('設定匯出')
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('查看方案')
  expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain('下載 Excel')
})
it('sends only explicit sharing flags and never caches the one-time token', async () => {
  const { fetcher, client } = await render(true)
  await click('設定日曆')
  expect(document.querySelector('[data-dialog-scroll-region]')).not.toBeNull()
  await click('建立訂閱連結')
  const call = fetcher.mock.calls.find(([, init]) => init?.method === 'POST')!
  expect(JSON.parse(String(call[1]?.body))).toEqual({
    action: 'create',
    version: 0,
    sharing: { includeBlocks: false, showNames: false, showLocation: true }
  })
  expect(JSON.stringify(client.getQueryData(['calendar-integration', 'coach']))).not.toContain(
    'synthetic-token'
  )
  expect(document.querySelector<HTMLInputElement>('.data-tools-link input')?.value).toContain(
    '/api/v1/public/calendar/synthetic-token.ics'
  )
  await click('完成')
  await click('設定日曆')
  expect(document.querySelector('.data-tools-link')).toBeNull()
})
it('lets downgraded owners manage and disable an existing subscription', async () => {
  const { fetcher } = await render(false, true)
  await click('管理現有訂閱')
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Prime 已失效')
  await click('停用訂閱')
  await click('確認停用')
  const call = fetcher.mock.calls.find(([, init]) => init?.method === 'POST')!
  expect(JSON.parse(String(call[1]?.body))).toEqual({ action: 'disable', version: 1 })
})

it('keeps an expired notice-only link revocable without Prime', async () => {
  const { fetcher } = await render(false, false, true)
  await click('管理現有訂閱')
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
    '舊連結僅顯示方案到期提示'
  )
  await click('停用訂閱')
  await click('確認停用')
  const call = fetcher.mock.calls.find(([, init]) => init?.method === 'POST')!
  expect(JSON.parse(String(call[1]?.body))).toEqual({ action: 'disable', version: 1 })
})
