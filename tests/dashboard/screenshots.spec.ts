/**
 * Génère les captures du README.
 *
 * Tourne sur l'environnement simulé (`VITE_MOCK_HA=true`) : les entités sont
 * factices, donc **aucune donnée d'une vraie maison** ne peut se retrouver dans
 * un dépôt public. C'est la seule façon sûre d'illustrer le projet.
 *
 *   npx playwright test --config playwright.dashboard.config.ts screenshots --update-snapshots
 *
 * Ignoré par défaut : ce n'est pas un test, il ne vérifie rien. On le lance
 * quand l'interface a changé.
 */
import { test, expect, type Page } from '@playwright/test';
import path from 'path';

const OUT = path.join('docs', 'images');

test.describe('Captures du README', () => {
  // Ne s'exécute que sur demande explicite.
  test.skip(!process.env.SCREENSHOTS, 'Passer SCREENSHOTS=1 pour régénérer');

  test.beforeEach(async ({ page }) => {
    // Pas de `seen-version` : au premier lancement l'application la note
    // elle-même sans rien annoncer. Y mettre une autre valeur ferait au
    // contraire surgir la fenêtre « Nouveautés » par-dessus les captures.
    await page.addInitScript(() => localStorage.setItem('ha-dashboard-tour-done', 'true'));
  });

  const settle = async (page: Page) => {
    await page.waitForSelector('[data-widget-id]', { timeout: 15_000 });
    // Laisser les animations d'entrée se poser.
    await page.waitForTimeout(1200);
  };

  test('dashboard', async ({ page }) => {
    await page.goto('/');
    await settle(page);
    await page.screenshot({ path: path.join(OUT, 'dashboard.png') });
  });

  test('mode édition', async ({ page }) => {
    await page.goto('/');
    await settle(page);
    await page.getByRole('button', { name: 'Modifier le dashboard' }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, 'edit-mode.png') });
  });

  test('catalogue de widgets', async ({ page }) => {
    await page.goto('/');
    await settle(page);
    await page.getByRole('button', { name: 'Modifier le dashboard' }).click();
    await page.getByRole('button', { name: /Ajouter/ }).first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, 'widget-catalog.png') });
  });

  test('réglages', async ({ page }) => {
    await page.goto('/');
    await settle(page);
    await page.getByRole('button', { name: 'Paramètres' }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, 'settings.png') });
  });

  test('visite guidée', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('ha-dashboard-tour-done'));
    await page.goto('/');
    await settle(page);
    await expect(page.getByTestId('tour-card')).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: path.join(OUT, 'tour.png') });
  });

  test('fiche plus d’infos', async ({ page }) => {
    await page.goto('/');
    await settle(page);
    await page.locator('[data-widget-id="thermostat-seed"]').click();
    await expect(page.getByTestId('more-info-modal')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT, 'more-info.png') });
  });
});
