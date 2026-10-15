// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'

const entry = vi.hoisted(() => ({ alpha: false }))
vi.mock('../config', () => ({ isInternalAlpha: () => entry.alpha }))

import { LandingPage } from './LandingPage'

afterEach(() => {
  entry.alpha = false
  document.body.innerHTML = ''
})

it('shows product purpose, public prices, support and legal links without authentication', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      )
    )
    expect(host.textContent).toContain('自由教練的')
    expect(host.textContent).toContain('一站式管理工具')
    expect(host.textContent).toContain('課前找資料手忙腳亂')
    expect(host.textContent).toContain('跨裝置同步，課前課中都能用')
    expect(host.textContent).toContain('建立你的第一位學員')
    expect(host.querySelector('#faq-title')?.textContent).toBe('FAQ')
    expect(host.textContent).toContain('收支明細匯出需 Prime')
    expect(host.textContent).not.toContain('剩餘堂數')
    expect(host.textContent).toContain('最多 5 名學員、1 個場地')
    expect(host.textContent).toContain('NT$119')
    expect(host.textContent).toContain('NT$149')
    expect(host.textContent).toContain('NT$1,190／年')
    expect(host.textContent).toContain('NT$1,490／年')
    expect(host.textContent).toContain('© 2026 Form Coach Desk Studio · Taipei, Taiwan')
    expect(host.textContent).not.toContain('The Developer of Form Coach Desk')
    expect(host.textContent).not.toContain('Beta')
    expect(host.textContent).not.toContain('目前開放 Free')
    expect(host.textContent).not.toContain('尚未開放結帳')
    expect(host.textContent).not.toContain('最受歡迎')
    expect(host.querySelector('a[href="mailto:support@formcoachdesk.com"]')).not.toBeNull()
    expect(host.querySelector('a[href="/terms"]')).not.toBeNull()
    expect(host.querySelector('a[href="/privacy"]')).not.toBeNull()
    expect(host.querySelector('a[href="/login?mode=signup"]')).not.toBeNull()
    expect(host.querySelector('a[href="#features"]')).not.toBeNull()
    expect(host.querySelectorAll('.landing-plan-grid .landing-plan')).toHaveLength(3)
    expect(
      host.querySelector('.landing-plan:nth-child(1)')?.classList.contains('is-featured')
    ).toBe(false)
    expect(
      host.querySelector('.landing-plan:nth-child(2)')?.classList.contains('is-featured')
    ).toBe(true)
    expect(host.querySelector('.landing-plan:nth-child(3)')?.classList.contains('is-prime')).toBe(
      true
    )
    expect(host.querySelector('.landing-plan:nth-child(1) .landing-plan-label')?.textContent).toBe(
      '入門'
    )
    expect(host.querySelector('.landing-plan:nth-child(2) .landing-plan-label')?.textContent).toBe(
      '進階'
    )
    expect(host.querySelector('.landing-plan:nth-child(3) .landing-plan-label')?.textContent).toBe(
      '完整功能'
    )
  } finally {
    await act(async () => root.unmount())
  }
})

it('offers a return to top after scrolling and respects reduced motion', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('scrollY', 0)
  const scrollTo = vi.fn()
  const matchMedia = vi.fn(() => ({ matches: true }))
  vi.stubGlobal('scrollTo', scrollTo)
  vi.stubGlobal('matchMedia', matchMedia)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      )
    )
    expect(host.querySelector('[aria-label="回到頂部"]')).toBeNull()

    vi.stubGlobal('scrollY', 121)
    await act(async () => window.dispatchEvent(new Event('scroll')))
    const button = host.querySelector<HTMLButtonElement>('[aria-label="回到頂部"]')
    expect(button).not.toBeNull()
    await act(async () => button?.click())
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' })

    vi.stubGlobal('scrollY', 0)
    await act(async () => window.dispatchEvent(new Event('scroll')))
    expect(host.querySelector('[aria-label="回到頂部"]')).toBeNull()
  } finally {
    await act(async () => root.unmount())
    vi.unstubAllGlobals()
  }
})

it('keeps internal Alpha honest by offering sign-in without public registration', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  entry.alpha = true
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      )
    )
    expect(host.textContent).toContain('登入工作台')
    expect(host.textContent).not.toContain('免費開始使用')
    expect(host.querySelector('a[href="/login?mode=signup"]')).toBeNull()
  } finally {
    await act(async () => root.unmount())
  }
})
