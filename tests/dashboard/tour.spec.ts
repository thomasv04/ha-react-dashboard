/**
 * Visite guidée + modale d'aide.
 *
 * Contrairement aux autres specs, ceux-ci **n'annulent pas** le drapeau
 * `ha-dashboard-tour-done` : ils vérifient justement le démarrage automatique.
 *
 * Run with: npm run test:e2e:dashboard
 */
import { test, expect, type Page } from '@playwright/test';

async function waitForDashboard(page: Page) {
  await page.waitForSelector('[data-widget-id]', { timeout: 15_000 });
}

/** Ancre mise en avant par l'étape courante, telle que le calque la cadre. */
async function spotlightCovers(page: Page, selector: string) {
  const target = await page.locator(selector).first().boundingBox();
  const card = await page.getByTestId('tour-card').boundingBox();
  expect(target, `ancre ${selector} absente`).not.toBeNull();
  expect(card, 'carte du tour absente').not.toBeNull();
  // La carte se pose sous ou au-dessus de la cible, jamais par-dessus.
  const overlaps = target!.y < card!.y + card!.height && card!.y < target!.y + target!.height;
  expect(overlaps, 'la carte du tour recouvre son ancre').toBeFalsy();
}

test.describe('Visite guidée', () => {
  test('démarre seule au premier chargement et retient sa complétion', async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);

    const card = page.getByTestId('tour-card');
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('tour-progress')).toHaveText('1/7');
    await spotlightCovers(page, '[data-tour="pages"]');

    // Passer termine le tour et pose le drapeau.
    await page.getByRole('button', { name: 'Passer' }).click();
    await expect(card).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('ha-dashboard-tour-done'))).toBe('true');

    // Rechargement : plus de démarrage automatique.
    await page.reload();
    await waitForDashboard(page);
    await page.waitForTimeout(2000);
    await expect(card).toHaveCount(0);
  });

  test('une étape ouvre le mode édition pour atteindre son ancre', async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);
    await expect(page.getByTestId('tour-card')).toBeVisible({ timeout: 10_000 });

    // 1/7 « Vos pages » → 2/7 « Mode édition » → 3/7 « Ajouter un widget »,
    // dont l'ancre n'existe que dans la barre d'actions du mode édition.
    await page.getByTestId('tour-next').click();
    await page.getByTestId('tour-next').click();

    await expect(page.getByTestId('tour-progress')).toHaveText('3/7');
    await expect(page.locator('.dashboard-editing')).toBeVisible();
    await spotlightCovers(page, '[data-tour="add"]');
  });

  test("la fin du tour ressort du mode édition qu'il a ouvert", async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);
    await expect(page.getByTestId('tour-card')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('tour-next').click();
    await page.getByTestId('tour-next').click();
    await expect(page.locator('.dashboard-editing')).toBeVisible();

    await page.getByRole('button', { name: 'Passer' }).click();
    await expect(page.locator('.dashboard-editing')).toHaveCount(0);
  });

  test('Échap ferme le tour', async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);
    await expect(page.getByTestId('tour-card')).toBeVisible({ timeout: 10_000 });

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('tour-card')).toHaveCount(0);
  });
});

test.describe("Modale d'aide", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ha-dashboard-tour-done', 'true'));
    await page.goto('/');
    await waitForDashboard(page);
  });

  test('le bouton « ? » du mode édition ouvre les quatre visites', async ({ page }) => {
    await page.getByRole('button', { name: 'Modifier le dashboard' }).click();
    await page.getByTestId('help-button').click();

    await expect(page.getByTestId('help-modal')).toBeVisible();
    for (const id of ['basics', 'widgets', 'panels', 'appearance']) {
      await expect(page.getByTestId(`help-launch-${id}`)).toBeVisible();
    }
  });

  test("lancer une visite depuis l'aide ferme la modale et cible le bon élément", async ({ page }) => {
    await page.getByRole('button', { name: 'Modifier le dashboard' }).click();
    await page.getByTestId('help-button').click();
    await page.getByTestId('help-launch-panels').click();

    await expect(page.getByTestId('help-modal')).toHaveCount(0);
    await expect(page.getByTestId('tour-card')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('tour-progress')).toHaveText('1/3');
    await spotlightCovers(page, '[data-tour="panels-button"]');
  });

  test("la barre d'édition ne recouvre pas les onglets de page", async ({ page }) => {
    // Régression : sous 1024 px la barre d'actions passait par-dessus le bouton
    // « Panneaux », que la visite guidée pointe.
    await page.setViewportSize({ width: 900, height: 900 });
    await page.getByRole('button', { name: 'Modifier le dashboard' }).click();

    const bar = await page.getByTestId('help-button').boundingBox();
    const tabs = await page.locator('[data-tour="pages"]').boundingBox();
    expect(bar).not.toBeNull();
    expect(tabs).not.toBeNull();
    expect(tabs!.y, "les onglets passent sous la barre d'actions").toBeGreaterThanOrEqual(bar!.y + bar!.height);
  });
});

test.describe('Nouveautés', () => {
  test('annonce la nouvelle version après une mise à jour, une seule fois', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ha-dashboard-tour-done', 'true');
      // Version antérieure déjà vue : c'est ce qui définit « mise à jour ».
      // Posée seulement si absente — `addInitScript` rejoue à chaque
      // navigation, et l'écraser au rechargement testerait l'inverse.
      if (!localStorage.getItem('ha-dashboard-seen-version')) {
        localStorage.setItem('ha-dashboard-seen-version', '0.0.1');
      }
    });
    await page.goto('/');
    await waitForDashboard(page);

    const modal = page.getByTestId('release-notes-modal');
    await expect(modal).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('release-notes-done').click();
    await expect(modal).toHaveCount(0);

    await page.reload();
    await waitForDashboard(page);
    await page.waitForTimeout(2000);
    await expect(modal).toHaveCount(0);
  });

  test('reste muette au tout premier lancement', async ({ page }) => {
    // Rien de vu : c'est une découverte, pas une mise à jour — la visite guidée
    // accueille, les « nouveautés » n'auraient aucun sens.
    await page.addInitScript(() => localStorage.setItem('ha-dashboard-tour-done', 'true'));
    await page.goto('/');
    await waitForDashboard(page);
    await page.waitForTimeout(2000);
    await expect(page.getByTestId('release-notes-modal')).toHaveCount(0);
  });

  test('une note peut lancer la visite correspondante', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ha-dashboard-tour-done', 'true');
      localStorage.setItem('ha-dashboard-seen-version', '0.0.1');
    });
    await page.goto('/');
    await waitForDashboard(page);
    await expect(page.getByTestId('release-notes-modal')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('release-tour-panels').click();
    await expect(page.getByTestId('release-notes-modal')).toHaveCount(0);
    await expect(page.getByTestId('tour-card')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('tour-progress')).toHaveText('1/3');
  });
});

test.describe('Documentation des événements HA', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ha-dashboard-tour-done', 'true');
      // Ne rien poser : au premier chargement l'application note la version
      // elle-meme sans rien annoncer. Y figer un numero le couplait a la
      // release en cours, et la fenetre « Nouveautes » surgissait par-dessus
      // des qu'elle avancait.
    });
    await page.goto('/');
    await waitForDashboard(page);
    await page.getByRole('button', { name: 'Modifier le dashboard' }).click();
    await page.getByTestId('help-button').click();
  });

  test('déplie les deux événements avec leur YAML', async ({ page }) => {
    await page.getByTestId('help-events-toggle').click();

    await expect(page.getByTestId('events-preview-modal')).toBeVisible();
    await expect(page.getByTestId('events-preview-toast')).toBeVisible();
    await expect(page.getByText('event: ha_dashboard_modal')).toBeVisible();
    await expect(page.getByText('event: ha_dashboard_toast')).toBeVisible();
  });

  test("l'aperçu affiche réellement le toast", async ({ page }) => {
    await page.getByTestId('help-events-toggle').click();
    await page.getByTestId('events-preview-toast').click();
    await expect(page.getByText('Aperçu du toast')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Gestes sur les cards', () => {
  test("régler la jauge d'un thermostat n'ouvre pas la fiche", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ha-dashboard-tour-done', 'true');
      // Ne rien poser : au premier chargement l'application note la version
      // elle-meme sans rien annoncer. Y figer un numero le couplait a la
      // release en cours, et la fenetre « Nouveautes » surgissait par-dessus
      // des qu'elle avancait.
    });
    await page.goto('/');
    await waitForDashboard(page);

    const gauge = page.locator('[data-widget-id="thermostat-seed"] svg.cursor-grab');
    await expect(gauge).toBeVisible();
    const box = (await gauge.boundingBox())!;

    // Glissement maintenu bien au-delà des 500 ms de l'appui long.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.2);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) {
      await page.mouse.move(box.x + box.width * (0.5 + i * 0.05), box.y + box.height * 0.4);
      await page.waitForTimeout(120);
    }
    await page.mouse.up();

    await page.waitForTimeout(500);
    await expect(page.getByTestId('more-info-modal')).toHaveCount(0);
  });

  test('un simple clic ouvre toujours la fiche', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ha-dashboard-tour-done', 'true');
      // Ne rien poser : au premier chargement l'application note la version
      // elle-meme sans rien annoncer. Y figer un numero le couplait a la
      // release en cours, et la fenetre « Nouveautes » surgissait par-dessus
      // des qu'elle avancait.
    });
    await page.goto('/');
    await waitForDashboard(page);

    await page.locator('[data-widget-id="sensor-seed"]').click();
    await expect(page.getByTestId('more-info-modal')).toBeVisible({ timeout: 5000 });
  });
});
