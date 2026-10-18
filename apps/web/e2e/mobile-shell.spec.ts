import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')

for (const route of ['/today', '/students', '/calendar']) {
  test(`mobile navigation stays attached to the viewport on ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const pinned = route !== '/students'
    await page.setContent(`
      <div id="root">
        <div class="app-shell" data-route="${route}" data-mobile-chrome="${pinned ? 'pinned' : 'visible'}">
          <main class="main-content">
            <header class="mobile-header">Header</header>
            <div style="height: 2200px">Scrollable content</div>
          </main>
          <nav class="bottom-nav" aria-label="主要導覽"><a href="#">今日</a></nav>
        </div>
      </div>
    `)
    await page.addStyleTag({ content: styles })
    const dock = page.getByRole('navigation', { name: '主要導覽' })
    const layout = () =>
      dock.evaluate((element) => {
        const computed = getComputedStyle(element)
        return {
          position: computed.position,
          willChange: computed.willChange,
          transitionDuration: computed.transitionDuration,
          bottom: element.getBoundingClientRect().bottom,
          viewport: window.innerHeight
        }
      })

    expect(await layout()).toMatchObject({
      position: 'fixed',
      willChange: 'auto',
      ...(pinned ? { transitionDuration: '0s' } : {})
    })
    expect((await layout()).bottom).toBe((await layout()).viewport)

    if (route !== '/calendar') {
      await page.evaluate(() => window.scrollTo(0, 500))
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(500)
      expect((await layout()).bottom).toBe((await layout()).viewport)
    }
  })
}
