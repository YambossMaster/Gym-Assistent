import { expect, test } from '@playwright/test'

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 }
]) {
  test(`Help guides remain ordered and usable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/e2e/help-review.html')

    const guideTitles = page.locator('.help-tutorial-copy strong')
    await expect(guideTitles).toHaveText([
      '如何開始使用 Form Coach Desk？',
      '把 Form Coach Desk 安裝到手機'
    ])
    await page.getByRole('button', { name: /如何開始使用 Form Coach Desk/ }).click()
    await expect(page.getByRole('heading', { name: '一切就緒，開啟您的第一堂課' })).toBeVisible()
    await expect(page.locator('.getting-started-steps > li')).toHaveCount(5)

    await page.getByRole('button', { name: '返回使用教學' }).click()
    await page.getByRole('button', { name: /把 Form Coach Desk 安裝到手機/ }).click()
    await expect(
      page.getByRole('heading', { name: '把 Form Coach Desk 加入手機主畫面' })
    ).toBeVisible()
    await expect(page.locator('.pwa-step-grid > li')).toHaveCount(6)
    await expect
      .poll(async () =>
        page
          .locator('.pwa-step-grid img')
          .evaluateAll((images) =>
            images.every(
              (image) =>
                image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0
            )
          )
      )
      .toBe(true)
    await page.getByRole('tab', { name: 'Android' }).click()
    await expect(page.locator('.pwa-step-grid > li')).toHaveCount(4)
    await expect
      .poll(async () =>
        page
          .locator('.pwa-step-grid img')
          .evaluateAll((images) =>
            images.every(
              (image) =>
                image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0
            )
          )
      )
      .toBe(true)

    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(documentWidth).toBeLessThanOrEqual(viewport.width)
  })
}
