import { expect, test } from '@playwright/test';

test.describe('Dashboard V2 flow', () => {
  test('affiche TrustBar + 3 zones et ouvre un dossier depuis Aujourd’hui', async ({ page }) => {
    // Pré-requis environnement :
    // 1) utilisateur test authentifié
    // 2) au moins une réservation actionable aujourd'hui
    await page.goto('/');

    await expect(page.getByRole('region', { name: 'Indicateurs de confiance' })).toBeVisible();
    await expect(page.getByRole('region', { name: "Actions d'aujourd'hui" })).toBeVisible();
    await expect(page.getByRole('region', { name: 'À surveiller cette semaine' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Activité récente' })).toBeVisible();

    const cta = page.locator('[data-testid^="dashboard-now-cta-"]').first();
    if ((await cta.count()) > 0) {
      const testId = await cta.getAttribute('data-testid');
      const reservationId = (testId || '').replace('dashboard-now-cta-', '');
      await cta.click();
      await expect(page).toHaveURL(new RegExp(`/reservations\\?focus=${reservationId}$`));
    }
  });

  test('rend le dashboard correctement en mobile 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    await expect(page.getByRole('region', { name: "Actions d'aujourd'hui" })).toBeVisible();
    await expect(page.getByRole('region', { name: 'À surveiller cette semaine' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Activité récente' })).toBeVisible();
  });
});
