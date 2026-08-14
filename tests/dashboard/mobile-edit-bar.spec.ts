/**
 * Mode édition sur mobile — la barre d'actions ne doit rien recouvrir.
 *
 * En 375 px, la barre partait vers la gauche sans limite : elle passait sous le
 * bouton Apparence (fixe en haut à gauche) et débordait de l'écran, si bien que
 * « Ajouter » sortait du champ.
 *
 * Run with: npm run test:e2e:dashboard
 */
import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

type Box = { x: number; y: number; width: number; height: number };

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

// La visite guidée démarre seule au premier chargement et recouvre l'interface :
// ces tests mesurent des positions, elle est neutralisée (spec dédié à part).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ha-dashboard-tour-done', 'true'));
});

async function enterEditMode(page: Page) {
  await page.goto('/');
  await page.waitForSelector('[data-widget-id]', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Modifier le dashboard' }).click();
  await expect(page.getByRole('button', { name: 'Quitter le mode édition' })).toBeVisible();
}

test.describe('Barre du mode édition en 375 px', () => {
  test('ne recouvre pas le bouton Apparence', async ({ page }) => {
    await enterEditMode(page);

    const appearance = await page.getByRole('button', { name: 'Paramètres' }).first().boundingBox();
    expect(appearance).not.toBeNull();

    for (const name of ['Ajouter', 'Sauvegarder', 'Quitter le mode édition']) {
      const box = await page.getByRole('button', { name }).first().boundingBox();
      expect(box, `bouton ${name} introuvable`).not.toBeNull();
      expect(overlaps(box!, appearance!), `« ${name} » recouvre le bouton Apparence`).toBe(false);
    }
  });

  test('tient entièrement dans l’écran', async ({ page }) => {
    await enterEditMode(page);

    for (const name of ['Ajouter', 'Sauvegarder', 'Quitter le mode édition']) {
      const box = (await page.getByRole('button', { name }).first().boundingBox())!;
      expect(box.x, `« ${name} » déborde à gauche`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `« ${name} » déborde à droite`).toBeLessThanOrEqual(375);
    }

    // Aucun défilement horizontal du document.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('ne recouvre pas les onglets de page', async ({ page }) => {
    await enterEditMode(page);

    const tab = await page
      .getByRole('button', { name: /accueil/i })
      .first()
      .boundingBox();
    expect(tab).not.toBeNull();

    for (const name of ['Ajouter', 'Sauvegarder']) {
      const box = (await page.getByRole('button', { name }).first().boundingBox())!;
      expect(overlaps(box, tab!), `« ${name} » recouvre les onglets`).toBe(false);
    }
  });

  test('les libellés reviennent en grand écran', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await enterEditMode(page);

    // Sous 640 px les boutons sont réduits à leur icône ; au-delà, le texte revient.
    await expect(page.getByRole('button', { name: 'Sauvegarder' })).toContainText('Sauvegarder');
  });
});
