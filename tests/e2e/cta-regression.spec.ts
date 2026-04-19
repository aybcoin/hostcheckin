import { expect, test } from '@playwright/test';

test.describe('Régression CTA', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('les CTA principaux et secondaires continuent de naviguer correctement', async ({ page }) => {
    // Pré-requis: utilisateur authentifié.
    await page.goto('/help');

    await page.getByTestId('help-cta-open-support').click();
    await expect(page).toHaveURL(/\/checkins$/);

    await page.goto('/help');
    await page.getByTestId('help-cta-back-dashboard').click();
    await expect(page).toHaveURL(/\/$/);
  });
});
