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
  let calendarActive = active
  let calendarVersion = active || expired ? 1 : 0
  let calendarToken = active ? 'abcdefghijklmnopqrstuvwxyzABCDEFGH123456789' : undefined
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    let result: Record<string, unknown>
    if (url.includes('/venues')) result = { venues: [{ id: 'venue-1', name: '信義館' }] }
    else if (init?.method === 'POST') {
      const input = JSON.parse(String(init.body)) as {
        action: string
        sharing?: Record<string, boolean>
      }
      calendarVersion += 1
      calendarActive = input.action !== 'disable'
      calendarToken = calendarActive ? 'synthetic-token' : undefined
      result = {
        includeBlocks: input.sharing?.includeBlocks ?? false,
        showNames: input.sharing?.showNames ?? false,
        showLocation: input.sharing?.showLocation ?? true,
        version: calendarVersion,
        active: calendarActive,
        ...(calendarToken ? { token: calendarToken } : {})
      }
    } else
      result = {
        includeBlocks: false,
        showNames: false,
        showLocation: true,
        version: calendarVersion,
        expired,
        active: calendarActive,
        ...(calendarToken ? { token: calendarToken } : {})
      }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })
  })
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
async function choose(label: string, option: string) {
  const trigger = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
  expect(trigger, label).not.toBeNull()
  await act(async () => trigger!.click())
  const listbox = document.querySelector(`[role="listbox"][aria-label="${label}"]`)
  expect(listbox, `${label} listbox`).not.toBeNull()
  const choice = [...listbox!.querySelectorAll<HTMLButtonElement>('[role="option"]')].find(
    (item) => item.textContent?.trim() === option
  )
  expect(choice, option).toBeDefined()
  await act(async () => choice!.click())
  expect(trigger!.textContent).toContain(option)
}
it('keeps Pro upsell quiet until either Settings action is selected', async () => {
  await render()
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  await click('設定匯出')
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('查看方案')
  expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain('下載 Excel')
})
it('groups finance choices with visible labels and keeps every select interactive', async () => {
  await render(true)
  await click('設定匯出')
  const dialog = document.querySelector('[role="dialog"]')!
  expect(dialog.textContent).toContain('時間區間')
  expect(dialog.textContent).toContain('快速選擇區間')
  expect(dialog.textContent).toContain('資料篩選')
  expect(dialog.textContent).toContain('場地篩選')
  expect(dialog.textContent).toContain('匯出設定')
  expect(dialog.textContent).toContain('匯出格式')
  expect(dialog.textContent).not.toContain('其他選項')
  expect(dialog.querySelector('details')).toBeNull()

  await choose('快速選擇區間', '本月')
  await choose('場地篩選', '未指定場地')
  await choose('匯出格式', 'CSV · 收支明細')
})
it('keeps subscription controls interactive and the private URL available after reopening', async () => {
  const { fetcher, client } = await render(true)
  await click('設定日曆')
  expect(document.querySelector('[data-dialog-scroll-region]')).not.toBeNull()
  expect(document.querySelectorAll('[role="tab"]')).toHaveLength(2)
  const guide = document.querySelector('.calendar-guide-grid')!
  expect(guide.textContent).toContain('電腦瀏覽器開啟 Google 日曆')
  expect(guide.textContent).toContain('Google 手機 App 不能直接加入網址')
  expect(guide.textContent).toContain('加入訂閱行事曆')
  expect(document.querySelector('.calendar-guide-footnote')?.textContent).toContain('不會立即完成')
  const guideDisclosure = document.querySelector<HTMLDetailsElement>('.calendar-guide-disclosure')!
  expect(guideDisclosure.open).toBe(false)
  const urlHeading = [...document.querySelectorAll('h3')].find(
    (heading) => heading.textContent === '專屬訂閱網址'
  )!
  const guideSummary = guideDisclosure.querySelector('summary')!
  expect(
    Boolean(urlHeading.compareDocumentPosition(guideSummary) & Node.DOCUMENT_POSITION_FOLLOWING)
  ).toBe(true)
  const location = [...document.querySelectorAll('label')]
    .find((label) => label.textContent?.includes('顯示地點'))
    ?.querySelector<HTMLInputElement>('input')
  expect(location?.checked).toBe(true)
  await act(async () => location!.click())
  expect(location?.checked).toBe(false)
  await click('啟用日曆訂閱')
  const call = fetcher.mock.calls.find(([, init]) => init?.method === 'POST')!
  expect(JSON.parse(String(call[1]?.body))).toEqual({
    action: 'create',
    version: 0,
    sharing: { includeBlocks: false, showNames: false, showLocation: false }
  })
  expect(JSON.stringify(client.getQueryData(['calendar-integration', 'coach']))).toContain(
    'synthetic-token'
  )
  expect(document.querySelector<HTMLInputElement>('[aria-label="專屬訂閱網址"]')?.value).toContain(
    '/api/v1/public/calendar/synthetic-token.ics'
  )
  await click('關閉')
  await click('設定日曆')
  expect(document.querySelector<HTMLInputElement>('[aria-label="專屬訂閱網址"]')?.value).toContain(
    '/api/v1/public/calendar/synthetic-token.ics'
  )
})
it('keeps subscription choices user-facing and silently persists active changes', async () => {
  const { fetcher } = await render(true, true)
  await click('設定日曆')
  const dialog = document.querySelector('[role="dialog"]')!
  expect(dialog.textContent).not.toContain('已保留時段')
  expect(dialog.textContent).not.toContain('不可排課的時間')
  expect(dialog.textContent).not.toContain('自動儲存')
  expect(dialog.textContent).not.toContain('儲存內容設定')
  expect(dialog.textContent).not.toContain('學員姓名會傳送到你使用的日曆服務')
  const copyButton = dialog.querySelector<HTMLButtonElement>('[aria-label="複製訂閱網址"]')
  expect(copyButton).not.toBeNull()
  expect(copyButton?.textContent).toBe('')
  expect(copyButton?.querySelector('svg')).not.toBeNull()
  const names = [...document.querySelectorAll('label')]
    .find((label) => label.textContent?.includes('顯示學員姓名'))
    ?.querySelector<HTMLInputElement>('input')
  await act(async () => names!.click())
  expect(document.querySelector('[aria-label="日曆內容範例"]')?.textContent).toContain('範例學員')
  expect(dialog.textContent).not.toContain('學員姓名會傳送到你使用的日曆服務')
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
  const updateCall = fetcher.mock.calls.find(
    ([, init]) => init?.method === 'POST' && String(init.body).includes('"action":"update"')
  )!
  expect(JSON.parse(String(updateCall[1]?.body))).toMatchObject({
    action: 'update',
    sharing: { includeBlocks: false, showNames: true, showLocation: true }
  })
})
it('separates one-time export and keeps its select and options interactive', async () => {
  await render(true, true)
  await click('設定日曆')
  const scrollRegion = document.querySelector<HTMLElement>('[data-dialog-scroll-region]')!
  scrollRegion.scrollTop = 180
  await click('單次匯出下載 ICS')
  expect(scrollRegion.scrollTop).toBe(0)
  const panel = document.querySelector('[role="tabpanel"]')!
  expect(panel.textContent).toContain('快速選擇區間')
  expect(panel.textContent).toContain('開始日期')
  expect(panel.textContent).toContain('結束日期')
  expect(panel.textContent).not.toContain('已保留時段')
  expect(panel.textContent).not.toContain('不可排課的時間')
  expect(panel.textContent).not.toContain('學員姓名會傳送到你使用的日曆服務')
  expect(panel.querySelector('details')).toBeNull()
  await choose('快速選擇區間', '本月')
  const names = [...panel.querySelectorAll('label')]
    .find((label) => label.textContent?.includes('顯示學員姓名'))
    ?.querySelector<HTMLInputElement>('input')
  await act(async () => names!.click())
  expect(names?.checked).toBe(true)
  expect(panel.textContent).not.toContain('學員姓名會傳送到你使用的日曆服務')
  scrollRegion.scrollTop = 140
  await click('日曆訂閱持續同步')
  expect(scrollRegion.scrollTop).toBe(0)
})
it('warns that resetting disconnects existing devices before changing the URL', async () => {
  const { fetcher } = await render(true, true)
  await click('設定日曆')
  await click('重設訂閱連結')
  const confirmation = document.querySelector('[role="alertdialog"]')!
  expect(confirmation.textContent).toContain('既有裝置將停止同步')
  expect(confirmation.textContent).toContain('重新貼上新網址')
  await click('確認重設')
  const call = fetcher.mock.calls.find(
    ([, init]) => init?.method === 'POST' && String(init.body).includes('"action":"reset"')
  )!
  expect(call).toBeDefined()
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
