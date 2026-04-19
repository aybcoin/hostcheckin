import { expect, test } from '@playwright/test';

test.describe('Navigation desktop', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('l’état actif suit la route', async ({ page }) => {
    // Pré-requis environnement:
    // 1) Utilisateur authentifié sur l’environnement Playwright.
    await page.goto('/reservations');

    const reservationsLink = page.getByTestId('nav-link-reservations-desktop');
    await expect(reservationsLink).toHaveAttribute('aria-current', 'page');

    await page.getByTestId('nav-link-properties-desktop').click();
    await expect(page).toHaveURL(/\/properties$/);
    await expect(page.getByTestId('nav-link-properties-desktop')).toHaveAttribute('aria-current', 'page');
  });
});
