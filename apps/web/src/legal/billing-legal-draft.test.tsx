import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { TermsPage, PrivacyPage } from './LegalPages'

it('keeps current public terms intact and exposes new policies only in the explicit review variant', () => {
  const current = renderToStaticMarkup(
    <MemoryRouter>
      <TermsPage />
      <PrivacyPage />
    </MemoryRouter>
  )
  expect(current).toContain('免費或免信用卡優惠到期後不會自動開始收費')
  expect(current).not.toContain('45 天')
  expect(current).not.toContain('尚未生效')
  const draft = renderToStaticMarkup(
    <MemoryRouter>
      <TermsPage billingDraft />
      <PrivacyPage billingDraft />
    </MemoryRouter>
  )
  expect(draft).toContain('付款上線修訂稿 · 尚未生效')
  expect(draft).toContain('45 天')
  expect(draft).toContain('45 days')
  expect(draft).toContain('Lemon Squeezy')
  expect(draft).toContain('1 個月免費體驗')
  expect(draft).toContain('結帳時須完成付款方式設定')
  expect(draft).not.toContain('內部退款')
})

it('publishes the paid terms in the explicit Live build without a draft label', () => {
  const live = renderToStaticMarkup(
    <MemoryRouter>
      <TermsPage billingLive />
      <PrivacyPage billingLive />
    </MemoryRouter>
  )
  expect(live).toContain('45 天')
  expect(live).toContain('45 days')
  expect(live).toContain('Lemon Squeezy')
  expect(live).toContain('最後更新 · Last updated · 2026-10-18')
  expect(live).not.toContain('尚未生效')
})
