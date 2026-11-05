/**
 * Un bouton dans une card agit, et n'ouvre pas la fiche « plus d'infos » :
 * le clic remontait jusqu'à la case, qui ouvrait la fiche à chaque appui sur
 * une flèche de volet.
 *
 * Run with: npm run test:e2e:dashboard
 */
import { test, expect } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ha-dashboard-tour-done', 'true'));
  // Un volet en tête du panneau, assez grand pour montrer ses flèches.
  await page.route('**/api/config', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    const res = await route.fetch();
    const body = await res.json();
    body.layouts.home.panels[0].widgets.unshift({ id: 'cover-seed', type: 'cover', w: 3, h: 3 });
    body.widgetConfigs.home['cover-seed'] = { type: 'cover', entityId: 'cover.volet_cuisine', name: 'Volet Cuisine' };
    await route.fulfill({ response: res, json: body });
  });
  await page.goto('/');
  await page.waitForSelector('[data-widget-id="cover-seed"]', { timeout: 15_000 });
});

const cover = '[data-widget-id="cover-seed"]';

test('une flèche du volet n’ouvre pas la fiche', async ({ page }) => {
  for (const name of ['FERMER', 'ARRÊTER', 'OUVRIR']) {
    await page.locator(cover).getByRole('button', { name }).click();
    await page.waitForTimeout(400);
    await expect(page.getByTestId('more-info-modal'), name).toHaveCount(0);
  }
});

test('un appui ailleurs sur la card ouvre toujours la fiche', async ({ page }) => {
  await page.locator(cover).getByText('Volet Cuisine').click();
  await expect(page.getByTestId('more-info-modal')).toBeVisible({ timeout: 5000 });
});
