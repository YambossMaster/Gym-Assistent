import { expect, test, type Page } from '@playwright/test'

const coachId = '00000000-0000-4000-8000-000000000001'

async function mockFreePlanJourney(page: Page) {
  const now = Math.floor(Date.now() / 1000)
  const encoded = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const session = {
    access_token: `${encoded({ alg: 'HS256', typ: 'JWT' })}.${encoded({ sub: coachId, role: 'authenticated', aud: 'authenticated', exp: now + 3600 })}.fixture`,
    refresh_token: 'browser-test-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    user: {
      id: coachId,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'browser-fixture@example.test',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString()
    }
  }
  await page.route('**/auth/v1/**', async (route) => {
    const { hostname, pathname } = new URL(route.request().url())
    if (hostname !== 'e2e.supabase.co') {
      await route.abort()
      throw new Error(`Browser fixture reached unexpected Auth host: ${hostname}`)
    }
    if (pathname === '/auth/v1/token') await route.fulfill({ json: session })
    else if (pathname === '/auth/v1/user') await route.fulfill({ json: session.user })
    else await route.fulfill({ status: 501, json: { error: 'unhandled_auth_fixture_route' } })
  })
  const plan = {
    tier: 'free' as 'free' | 'basic',
    source: 'free' as 'free' | 'subscription',
    activeStudents: 0,
    activeVenues: 0,
    studentLimit: 5 as number | null,
    venueLimit: 1 as number | null,
    overCapacity: false
  }
  let planMutationCount = 0
  await page.route('**/api/v1/**', async (route) => {
    const { pathname } = new URL(route.request().url())
    if (pathname === '/api/v1/plan' && route.request().method() === 'GET') {
      await route.fulfill({ json: { plan } })
    } else if (pathname === '/api/v1/plan/subscription') {
      planMutationCount += 1
      await route.fulfill({ status: 404, json: { error: 'plan_mutation_unavailable' } })
    } else if (pathname === '/api/v1/beta/status') {
      await route.fulfill({ json: { grant: { state: 'free' } } })
    } else if (pathname === '/api/v1/workspace-settings') {
      // Keep unrelated route prefetch out of this isolated Plan Choice UI case.
      await route.fulfill({ json: { settings: null } })
    } else {
      await route.fulfill({ status: 501, json: { error: 'unhandled_browser_fixture_route' } })
    }
  })
  await page.route('**/health', async (route) => {
    await route.fulfill({ json: { status: 'ok' } })
  })
  return { getPlanMutationCount: () => planMutationCount }
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 }
]) {
  test(`Free-first plan visibility and reload at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const fixture = await mockFreePlanJourney(page)
    await page.goto('/plans')
    if (viewport.width <= 720) await page.getByRole('button', { name: '登入', exact: true }).click()
    await page.getByRole('textbox', { name: 'Email' }).fill('browser-fixture@example.test')
    await page.getByLabel('密碼').fill('fixture-password')
    await page.getByRole('button', { name: '繼續', exact: true }).click()
    await expect(page.getByRole('heading', { name: '比較方案與 Beta 權益' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Free' })).toBeVisible()
    await expect(page.getByText('目前方案', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '年費方案' })).toBeVisible()
    await page.getByRole('button', { name: '年費方案' }).click()
    await expect(page.getByText('1,990', { exact: true })).toBeVisible()
    await expect(page.getByText('支付功能上線後開放', { exact: true })).toHaveCount(2)
    await expect(page.getByRole('button', { name: /切換至 (Pro|Prime) 方案/ })).toHaveCount(0)
    expect(fixture.getPlanMutationCount()).toBe(0)
    await page.reload()
    await expect(page.getByText('目前方案', { exact: true })).toBeVisible()
    await expect(page.getByText('支付功能上線後開放', { exact: true })).toHaveCount(2)
    expect(fixture.getPlanMutationCount()).toBe(0)
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(documentWidth).toBeLessThanOrEqual(viewport.width)
  })
}
