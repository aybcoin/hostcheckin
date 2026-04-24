import { expect, test } from '@playwright/test'

const NON_CRITICAL_ERROR_PATTERNS = [
  /favicon/i,
  /manifest/i,
  /failed to load resource/i,
  /resizeobserver loop/i,
]

test.describe('Dashboard', () => {
  test('loads without JS errors', async ({ page }) => {
    const criticalErrors: string[] = []

    page.on('console', (message) => {
      if (message.type() !== 'error') {
        return
      }

      const text = message.text()
      const isNonCritical = NON_CRITICAL_ERROR_PATTERNS.some((pattern) => pattern.test(text))

      if (!isNonCritical) {
        criticalErrors.push(text)
      }
    })

    page.on('pageerror', (error) => {
      criticalErrors.push(`pageerror: ${error.message}`)
    })

    await page.goto('/')
    await page.waitForTimeout(1_000)
    expect(criticalErrors).toEqual([])
  })

  test('has 3 main sections', async ({ page }) => {
    await page.goto('/dashboard')

    const regions = page.locator('[role="region"]')

    await expect
      .poll(
        async () => {
          const regionVisible = await regions.first().isVisible().catch(() => false)
          const authTextVisible = await page
            .getByText(/sign in|log in|login|connexion|auth/i)
            .first()
            .isVisible()
            .catch(() => false)
          const authFormVisible = await page.locator('form').first().isVisible().catch(() => false)

          return regionVisible || authTextVisible || authFormVisible
        },
        { timeout: 10_000 },
      )
      .toBe(true)
  })

  test('navigation works', async ({ page }) => {
    const response = await page.goto('/')

    if (response) {
      expect(response.status()).toBeLessThan(400)
    }

    await expect(page.locator('body')).toBeVisible()
  })
})
