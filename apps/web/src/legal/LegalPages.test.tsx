// @vitest-environment jsdom
import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PrivacyPage, TermsPage } from './LegalPages'

let scrollTo: ReturnType<typeof vi.spyOn>

function renderPage(page: ReactNode) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  act(() => {
    root.render(<MemoryRouter>{page}</MemoryRouter>)
  })
  return { host, root }
}

beforeEach(() => {
  scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

it.each([
  ['Terms', <TermsPage />],
  ['Privacy', <PrivacyPage />]
])('opens the %s page at the top of the document', async (_label, page) => {
  const { root } = renderPage(page)
  try {
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' })
  } finally {
    await act(async () => root.unmount())
  }
})

it('renders Chinese Terms before the English version and keeps refunds in Terms', async () => {
  const { host, root } = renderPage(<TermsPage />)
  try {
    const chinese = host.querySelector('#terms-zh')
    const english = host.querySelector('#terms-en')

    expect(chinese).not.toBeNull()
    expect(english).not.toBeNull()
    expect(
      chinese!.compareDocumentPosition(english!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(english!.closest('section')?.getAttribute('lang')).toBe('en')
    expect(host.textContent).toContain('方案、付款、取消與退款')
    expect(host.textContent).toContain('Plans, Payments, Cancellation, and Refunds')
    expect(host.textContent).toContain('Form Coach Desk Studio · Taipei, Taiwan')
    expect(host.textContent).not.toContain('The Developer of Form Coach Desk')
    expect(host.textContent).not.toMatch(/Alpha|合成資料/)
  } finally {
    await act(async () => root.unmount())
  }
})

it('renders bilingual Privacy details for product data and current providers', async () => {
  const { host, root } = renderPage(<PrivacyPage />)
  try {
    const chinese = host.querySelector('#privacy-zh')
    const english = host.querySelector('#privacy-en')

    expect(chinese).not.toBeNull()
    expect(english).not.toBeNull()
    expect(
      chinese!.compareDocumentPosition(english!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(english!.closest('section')?.getAttribute('lang')).toBe('en')
    expect(host.textContent).toContain('教練與學員資料')
    expect(host.textContent).toContain('Coach and Student data')
    for (const provider of ['Cloudflare', 'Fly.io', 'Supabase', 'Brevo']) {
      expect(host.textContent).toContain(provider)
    }
    expect(host.textContent).toContain('連續十二個月未登入的免費帳號')
    expect(host.textContent).toContain('after twelve consecutive months without a login')
    expect(host.textContent).toContain('但不保證另行通知')
    expect(host.textContent).toContain('we do not guarantee separate notice')
    expect(host.textContent).toContain('Form Coach Desk Studio · Taipei, Taiwan')
    expect(host.textContent).not.toMatch(/Alpha|合成資料/)
  } finally {
    await act(async () => root.unmount())
  }
})
