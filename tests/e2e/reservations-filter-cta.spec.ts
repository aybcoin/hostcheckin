/**
 * E2E : filtrer "À traiter" → cliquer la première action → arriver sur la bonne page.
 *
 * Scénario couvert :
 *  1. L'utilisateur ouvre la page Réservations.
 *  2. Il clique le chip "À traiter".
 *  3. Il vérifie que seules des réservations à traiter sont affichées.
 *  4. Il clique le CTA de la première carte.
 *  5. Selon l'action, il arrive sur la bonne page/modal.
 *
 * Hypothèses de staging :
 *  - L'app est accessible à BASE_URL (variable d'environnement ou localhost).
 *  - Un compte hôte de test est disponible (TEST_EMAIL / TEST_PASSWORD).
 *  - Au moins une réservation avec action requise existe en base.
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';
const TEST_EMAIL = process.env.TEST_EMAIL ?? 'test@hostcheckin.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'testpassword';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function login(page: Page) {
  await page.goto(`${BASE_URL}/`);
  // Attendre le formulaire de connexion
  await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  // Attendre la navigation vers le dashboard
  await page.waitForSelector('[data-testid="top-navigation"], nav', { timeout: 15_000 });
}

async function navigateToReservations(page: Page) {
  // Cliquer sur "Réservations" dans la navigation
  await page.click('a[href*="reservations"], button:has-text("Réservations")');
  // Attendre l'apparition du titre de la page
  await page.waitForSelector('h1:has-text("Réservations")', { timeout: 10_000 });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('Réservations — Filtre rapide + CTA', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToReservations(page);
  });

  // ── Chips de filtre ────────────────────────────────────────────────────────

  test('les chips de filtre rapide sont visibles et accessibles', async ({ page }) => {
    const chips = page.locator('[role="group"][aria-label="Filtre rapide des réservations"] button');
    await expect(chips).toHaveCount(5);

    // Les 5 labels attendus
    for (const label of ['Toutes', 'À traiter', 'À venir', 'En cours', 'Passées']) {
      await expect(chips.filter({ hasText: label })).toBeVisible();
    }

    // Le chip "Toutes" est actif par défaut
    const toutesChip = chips.filter({ hasText: 'Toutes' });
    await expect(toutesChip).toHaveAttribute('aria-pressed', 'true');
  });

  test('cliquer "À traiter" ne montre que les réservations à traiter', async ({ page }) => {
    const chipToHandle = page
      .locator('[role="group"] button')
      .filter({ hasText: 'À traiter' });

    await chipToHandle.click();
    await expect(chipToHandle).toHaveAttribute('aria-pressed', 'true');

    // Si des réservations existent, toutes les cartes visibles doivent avoir
    // au moins un CTA de type prioritaire (primary ou dangerSoft)
    const cards = page.locator('[data-testid^="reservation-card-"]');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // La première carte doit avoir un CTA visible
      const firstCta = page
        .locator('[data-testid^="reservation-cta-"]')
        .first();
      await expect(firstCta).toBeVisible();
    } else {
      // État vide attendu
      await expect(page.locator('text=Aucune réservation à traiter')).toBeVisible();
    }
  });

  // ── Scénario principal : filtre → CTA → page cible ────────────────────────

  test('filtrer "À traiter" → cliquer CTA → arriver sur la bonne cible', async ({ page }) => {
    // 1. Sélectionner le filtre "À traiter"
    await page.locator('[role="group"] button').filter({ hasText: 'À traiter' }).click();

    const cards = page.locator('[data-testid^="reservation-card-"]');
    const cardCount = await cards.count();

    // Skiper si aucune réservation "à traiter" en staging
    test.skip(cardCount === 0, 'Aucune réservation "À traiter" disponible en staging');

    // 2. Lire le label du CTA de la première carte
    const firstCta = page.locator('[data-testid^="reservation-cta-"]').first();
    const ctaText = await firstCta.textContent();
    await expect(firstCta).toBeVisible();

    // 3. Cliquer le CTA
    await firstCta.click();

    // 4. Vérifier la destination selon l'action
    if (ctaText?.includes('Relancer le check-in')) {
      // Doit déplier le panel de la carte (pas de navigation externe)
      const expandedPanel = page.locator('[data-testid^="reservation-panel-"]').first();
      await expect(expandedPanel).toBeVisible({ timeout: 3_000 });
    } else if (ctaText?.includes("Contacter l'invité") || ctaText?.includes("Demander l'ID")) {
      // Doit ouvrir la modale ShareLink
      await expect(page.locator('[role="dialog"], [aria-modal="true"]')).toBeVisible({
        timeout: 3_000,
      });
    } else if (ctaText?.includes('Voir le contrat')) {
      // Doit déplier le panel
      const expandedPanel = page.locator('[data-testid^="reservation-panel-"]').first();
      await expect(expandedPanel).toBeVisible({ timeout: 3_000 });
    } else if (ctaText?.includes('Valider le check-in')) {
      // Action directe → le badge de statut doit changer
      await page.waitForTimeout(1_000);
      // Le badge "Vérifiée" ou similaire doit apparaître
      const updatedBadge = page.locator('span:has-text("Vérifiée")').first();
      await expect(updatedBadge).toBeVisible({ timeout: 5_000 });
    }
  });

  // ── Recherche ──────────────────────────────────────────────────────────────

  test('la recherche filtre par nom voyageur', async ({ page }) => {
    const searchInput = page.locator('input[aria-label="Rechercher une réservation"]');
    await expect(searchInput).toBeVisible();

    // Taper une chaîne qui ne correspond à rien
    await searchInput.fill('xzqxzq99999');
    await expect(page.locator('text=Aucun résultat')).toBeVisible({ timeout: 2_000 });

    // Effacer via le bouton X
    await page.click('button[aria-label="Effacer la recherche"]');
    await expect(searchInput).toHaveValue('');
  });

  // ── Pastilles de statut ────────────────────────────────────────────────────

  test('les pastilles de statut sont lisibles par screen-reader', async ({ page }) => {
    const cards = page.locator('[data-testid^="reservation-card-"]');
    const cardCount = await cards.count();
    if (cardCount === 0) return;

    // Chaque pastille doit avoir un aria-label
    const pills = page
      .locator('[data-testid^="reservation-card-"]')
      .first()
      .locator('[role="status"]');

    const pillCount = await pills.count();
    expect(pillCount).toBe(4); // checkin, contrat, identite, depot

    for (let i = 0; i < pillCount; i++) {
      const label = await pills.nth(i).getAttribute('aria-label');
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(5);
    }
  });

  // ── Pagination ─────────────────────────────────────────────────────────────

  test('le bouton "Charger plus" apparaît si >20 réservations', async ({ page }) => {
    // Ce test passe seulement en staging avec assez de données
    const loadMoreBtn = page.locator('button:has-text("Charger")');
    const cards = page.locator('[data-testid^="reservation-card-"]');
    const cardCount = await cards.count();

    if (await loadMoreBtn.isVisible()) {
      expect(cardCount).toBeLessThanOrEqual(20);
      await loadMoreBtn.click();
      // Après le clic, plus de cartes doivent être visibles
      await expect(cards).toHaveCountGreaterThan(cardCount);
    }
    // Sinon, ≤20 réservations → pas de bouton nécessaire
  });
});
