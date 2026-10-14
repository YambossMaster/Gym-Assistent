// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { HelpPanel } from './HelpPanel'

const cleanups: (() => Promise<void>)[] = []

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
  vi.unstubAllGlobals()
})

async function renderHelp(initialEntry = '/settings?category=feedback') {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('scrollTo', vi.fn())
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)

  function LocationProbe() {
    const location = useLocation()
    return <output data-location>{location.pathname + location.search}</output>
  }

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <HelpPanel />
        <LocationProbe />
      </MemoryRouter>
    )
  })
  cleanups.push(async () => {
    await act(async () => root.unmount())
    host.remove()
  })
  return host
}

async function click(label: string) {
  const button = [...document.querySelectorAll('button')].find((item) =>
    item.textContent?.includes(label)
  )
  expect(button, label).toBeDefined()
  await act(async () => button!.click())
}

it('opens the PWA guide from Help and keeps the guide state in the URL', async () => {
  const host = await renderHelp()
  expect(host.textContent).toContain('使用教學')
  expect(host.textContent).toContain('把 Form Coach Desk 安裝到手機')
  expect(host.textContent).toContain('如何開始使用 Form Coach Desk？')
  expect(host.textContent).not.toContain('需要時再查看')
  expect(host.textContent).not.toContain('先了解 PWA')
  expect(
    [...host.querySelectorAll('.help-tutorial-copy strong')].map((title) => title.textContent)
  ).toEqual(['如何開始使用 Form Coach Desk？', '把 Form Coach Desk 安裝到手機'])

  await click('把 Form Coach Desk 安裝到手機')

  expect(host.querySelector('[data-location]')?.textContent).toBe(
    '/settings?category=feedback&guide=pwa'
  )
  expect(host.textContent).toContain('為什麼使用 PWA？')
  expect(host.textContent).toContain('把 Form Coach Desk 加入手機主畫面')
  expect(host.textContent).not.toContain('把 Form Coach Desk 放到手機主畫面')
  expect(host.textContent).toContain('用 Safari 開啟網站')
  expect(host.textContent).toContain('打開為網頁 App')
  expect(host.textContent).toContain('「顯示更多」（View More）')
  expect(host.textContent).not.toContain('加入清單')
  expect(host.textContent).not.toContain('完整離線')
  expect(host.querySelectorAll('.pwa-step-grid li')).toHaveLength(6)
})

it('switches to the current Android install flow and returns to Help', async () => {
  const host = await renderHelp('/settings?category=feedback&guide=pwa')

  await click('Android')

  expect(host.textContent).toContain('打開 Chrome 選單')
  expect(host.textContent).toContain('安裝應用程式')
  expect(host.querySelectorAll('.pwa-step-grid li')).toHaveLength(4)

  await click('返回使用教學')
  expect(host.querySelector('[data-location]')?.textContent).toBe('/settings?category=feedback')
  expect(host.textContent).toContain('需要協助？')
  expect(host.textContent).toContain('support@formcoachdesk.com')
  expect(host.querySelector('a[href^="mailto:support@formcoachdesk.com"]')).not.toBeNull()
})

it('guides a new Coach from the first Student to the first scheduled Course Session', async () => {
  const host = await renderHelp()

  await click('如何開始使用 Form Coach Desk？')

  expect(host.querySelector('[data-location]')?.textContent).toBe(
    '/settings?category=feedback&guide=getting-started'
  )
  expect(host.textContent).toContain('依序完成學生、購課、場地與排課')
  expect(
    [...host.querySelectorAll('.getting-started-copy h4')].map((heading) => heading.textContent)
  ).toEqual(['新增學生', '新增學生購課', '新增場地', '安排第一堂課', '一切就緒，開啟您的第一堂課'])
  expect(host.querySelectorAll('.getting-started-steps li')).toHaveLength(5)
  expect(host.querySelectorAll('.getting-started-action.secondary-button')).toHaveLength(5)
  expect(host.querySelector('a[href="/students/venues"]')?.textContent).toContain('前往場地管理')
  expect(host.querySelector('a[href="/calendar"]')?.textContent).toContain('前往行事曆')
  expect(host.querySelector('a[href="/today"]')?.textContent).toContain('前往今日')
  expect(host.textContent).toContain('恭喜完成前置準備！')

  await click('返回使用教學')
  expect(host.querySelector('[data-location]')?.textContent).toBe('/settings?category=feedback')
})
