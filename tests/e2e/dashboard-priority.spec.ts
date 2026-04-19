import { expect, test } from '@playwright/test';

test.describe('Dashboard prioritaire', () => {
  test("le CTA de la zone 'À traiter maintenant' ouvre la bonne réservation", async ({ page }) => {
    // Pré-requis environnement:
    // 1) Un utilisateur test connecté doit disposer d'au moins une réservation actionable.
    // 2) La réservation doit apparaître dans la zone "À traiter maintenant".
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'À traiter maintenant' })).toBeVisible();

    const firstCta = page.locator('[data-testid^="dashboard-now-cta-"]').first();
    await expect(firstCta).toBeVisible();

    const ctaTestId = await firstCta.getAttribute('data-testid');
    expect(ctaTestId).toBeTruthy();
    const reservationId = (ctaTestId || '').replace('dashboard-now-cta-', '');

    await firstCta.click();

    await expect(page).toHaveURL(new RegExp(`/reservations\\?focus=${reservationId}$`));
    await expect(page.getByTestId(`reservation-panel-${reservationId}`)).toBeVisible();
  });
});
