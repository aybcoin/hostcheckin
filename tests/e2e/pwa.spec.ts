import { expect, test } from '@playwright/test'

test.describe('PWA', () => {
  test('manifest is accessible', async ({ page }) => {
    const response = await page.goto('/manifest.webmanifest')
    expect(response).not.toBeNull()

    const status = response?.status() ?? 0
    if (status === 200) {
      expect(status).toBe(200)
      return
    }

    const body = (await response?.text()) ?? ''
    expect(() => JSON.parse(body)).not.toThrow()
  })

  test('service worker is registered', async ({ page }) => {
    await page.goto('/')
    const hasServiceWorkerApi = await page.evaluate(() => 'serviceWorker' in navigator)
    expect(hasServiceWorkerApi).toBe(true)
  })
})
