import { expect, test } from '@playwright/test';

test.describe('Onboarding checklist', () => {
  test('un nouvel utilisateur voit la checklist et peut lancer une étape active', async ({ page }) => {
    // Pré-requis environnement:
    // 1) Créer un utilisateur de test "nouveau" en base.
    // 2) Exposer ses identifiants via variables d’environnement E2E.
    // 3) Lancer l’app en local/staging et pointer PLAYWRIGHT_BASE_URL vers le dashboard.
    await page.goto('/');

    // Exemple de sélecteurs stables ajoutés au composant.
    await expect(page.getByTestId('onboarding-checklist')).toBeVisible();

    const activeStepCta = page.getByTestId('onboarding-step-cta-connect_property');
    await expect(activeStepCta).toBeVisible();
    await activeStepCta.click();

    // Le CTA actif "Ajouter un logement" redirige vers la page propriétés.
    await expect(page).toHaveURL(/\/properties$/);
  });
});
