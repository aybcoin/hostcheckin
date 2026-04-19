import { expect, test } from '@playwright/test';

test.describe('Navigation mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('le menu hamburger s’ouvre, se ferme et les liens naviguent', async ({ page }) => {
    // Pré-requis environnement:
    // 1) Utilisateur authentifié sur l’environnement Playwright.
    // 2) Données de base disponibles (au moins une réservation/logement).
    await page.goto('/');

    await page.getByTestId('topnav-mobile-open').click();
    await expect(page.getByTestId('topnav-mobile-panel')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('topnav-mobile-panel')).toBeHidden();

    await page.getByTestId('topnav-mobile-open').click();
    await page.getByTestId('nav-link-reservations-mobile').click();
    await expect(page).toHaveURL(/\/reservations$/);
  });
});
