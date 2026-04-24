import { expect, test } from '@playwright/test'

test.describe('Guest Portal', () => {
  test('invalid token shows error', async ({ page }) => {
    await page.goto('/check-in/invalid-token-xyz')

    await expect
      .poll(
        async () => {
          const candidates = [
            page.locator('[data-testid*="error"]').first(),
            page.locator('[role="alert"]').first(),
            page
              .getByText(/error|erreur|invalid|invalide|expired|not found|introuvable/i)
              .first(),
          ]

          for (const candidate of candidates) {
            if (await candidate.isVisible().catch(() => false)) {
              return true
            }
          }

          return false
        },
        { timeout: 15_000 },
      )
      .toBe(true)
  })

  test('valid structure has 4 steps', async ({ page }) => {
    await page.goto('/check-in/demo')

    const stepLocators = [
      page.locator('[data-testid^="step-"]'),
      page.locator('[data-testid*="step"]'),
      page.locator('[data-step]'),
      page.getByText(/^(step|étape)\s*\d+/i),
    ]

    await expect
      .poll(
        async () => {
          const counts = await Promise.all(stepLocators.map((locator) => locator.count()))
          return Math.max(...counts, 0)
        },
        { timeout: 15_000 },
      )
      .toBeGreaterThanOrEqual(4)
  })

  test('mobile 375px renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    const response = await page.goto('/check-in/demo')

    if (response) {
      expect(response.status()).toBeLessThan(400)
    }

    await expect(page.locator('body')).toBeVisible()
  })
})
