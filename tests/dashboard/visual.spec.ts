/**
 * Régression visuelle : chaque écran et chaque card du mode démo, comparés à
 * une capture de référence, aux dimensions d'un Echo Show 8 (1280 × 800).
 *
 * Toujours dans le conteneur Playwright officiel, en local comme en CI (job
 * `visual`) : le rendu des polices change d'un système — et même d'une image
 * Linux — à l'autre, et une référence prise ailleurs échouerait pour quelques
 * pixels. D'où `VISUAL=1`, que seuls le conteneur et ce job posent.
 *
 *   npm run test:visual           compare aux références
 *   npm run test:visual:update    régénère les références, à relire avant commit
 */
import { test, expect, type Page } from './fixtures';

test.skip(!process.env.VISUAL, 'Dans le conteneur Playwright seulement : `npm run test:visual`');

test.use({ viewport: { width: 1280, height: 800 }, timezoneId: 'Europe/Paris' });

/** Les cards du mode démo, dans l'ordre de la graine. */
const WIDGETS = ['greeting', 'weather-seed', 'sensor-seed', 'light-seed', 'thermostat-seed', 'camera-seed', 'calendar-seed'];

const MODAL = {
  id: 'visual-modal',
  name: 'Volets du salon',
  icon: 'Blinds',
  blocks: [
    { id: 's1', type: 'section-header', title: 'Volets' },
    { id: 'c1', type: 'cover-row', entityId: 'cover.volet_cellier' },
    { id: 'c2', type: 'cover-row', entityId: 'cover.volet_cuisine' },
    { id: 's2', type: 'section-header', title: 'Scènes' },
    {
      id: 'b1',
      type: 'button',
      label: 'Tout fermer',
      icon: 'ChevronsDown',
      variant: 'primary',
      domain: 'cover',
      service: 'close_cover',
      targetEntityIds: [],
    },
    {
      id: 'r1',
      type: 'button-row',
      buttons: [{ id: 'r1a', label: 'Cinéma', icon: 'Tv', variant: 'secondary', domain: 'scene', service: 'turn_on', targetEntityIds: [] }],
    },
  ],
};

async function open(page: Page, theme: 'dark' | 'light' = 'dark') {
  // Heure figée : horloge, agenda et historiques en dépendent. Les minuteurs,
  // eux, continuent de tourner — l'application en a besoin pour se charger.
  await page.clock.setFixedTime(new Date('2026-11-05T09:30:00+01:00'));
  await page.addInitScript(t => {
    localStorage.setItem('ha-dashboard-tour-done', 'true');
    localStorage.setItem('ha-dashboard-theme', JSON.stringify({ themeId: t }));
  }, theme);
  // Une modale dans la configuration servie, pour les écrans qui la montrent.
  await page.route('**/api/config', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    const res = await route.fetch();
    const body = await res.json();
    body.customPanels = [MODAL];
    body.dock = { panels: [MODAL.id], labels: true };
    await route.fulfill({ response: res, json: body });
  });
  await page.goto('/');
  await page.waitForSelector('[data-widget-id]', { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  // Le contenu de chaque card arrive dans son propre module.
  await expect(page.locator('[data-widget-id="weather-seed"]').getByText('km/h')).toBeVisible();
  await page.waitForTimeout(800);
}

/** Le flux de la caméra de démo n'est pas une image fixe. */
const cameraFeed = (page: Page) => [page.locator('[data-widget-id="camera-seed"] video, [data-widget-id="camera-seed"] img')];

for (const theme of ['dark', 'light'] as const) {
  test.describe(`thème ${theme}`, () => {
    test('accueil', async ({ page }) => {
      await open(page, theme);
      await expect(page).toHaveScreenshot(`accueil-${theme}.png`, { mask: cameraFeed(page) });
    });

    for (const id of WIDGETS) {
      test(`card ${id}`, async ({ page }) => {
        await open(page, theme);
        await expect(page.locator(`[data-widget-id="${id}"]`)).toHaveScreenshot(`card-${id}-${theme}.png`, { mask: cameraFeed(page) });
      });
    }
  });
}

test('lanceur', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Ouvrir les apps' }).click();
  await page.waitForTimeout(400);
  await expect(page).toHaveScreenshot('lanceur.png', { mask: cameraFeed(page) });
});

test('mode édition', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Modifier le dashboard' }).click();
  await page.waitForTimeout(600);
  await expect(page).toHaveScreenshot('mode-edition.png', { mask: cameraFeed(page) });
});

test('modale ouverte', async ({ page }) => {
  await open(page);
  await page.getByRole('navigation').getByRole('button', { name: MODAL.name }).click();
  await expect(page.getByRole('dialog', { name: MODAL.name })).toBeVisible();
  await page.waitForTimeout(600);
  await expect(page).toHaveScreenshot('modale.png');
});

test('éditeur des modales', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Ouvrir les apps' }).click();
  await page.getByRole('button', { name: 'Modales' }).click();
  await expect(page.getByRole('dialog', { name: 'Modales' })).toBeVisible();
  await page.waitForTimeout(600);
  await expect(page).toHaveScreenshot('editeur-modales.png');
});

test('fiche plus d’infos', async ({ page }) => {
  await open(page);
  await page.locator('[data-widget-id="thermostat-seed"]').click();
  await expect(page.getByTestId('more-info-modal')).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot('fiche-thermostat.png', { mask: cameraFeed(page) });
});
