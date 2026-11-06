/**
 * Le lanceur sur l'écran de veille, comme sur l'Echo Show — et son réglage.
 *
 * Run with: npm run test:e2e:dashboard
 */
import { test, expect, type Page } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ha-dashboard-tour-done', 'true'));
});

/** La veille telle que la configuration la décrit, `show_top_bar` en plus. */
async function withScreensaver(page: Page, showTopBar?: boolean) {
  await page.route('**/api/config', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    const res = await route.fetch();
    const body = await res.json();
    body.wallPanel = {
      config: {
        enabled: true,
        idle_time: 600,
        image_urls: [],
        image_fit: 'cover',
        media_order: 'random',
        media_list_update_interval: 3600,
        image_duration: 10,
        clock_layout: 'photo',
        style: {},
        ...(showTopBar === undefined ? {} : { show_top_bar: showTopBar }),
      },
    };
    await route.fulfill({ response: res, json: body });
  });
}

const openApps = (page: Page) => page.getByRole('button', { name: 'Ouvrir les apps' });

test('sur la veille, le bouton des apps la quitte et ouvre le lanceur', async ({ page }) => {
  await withScreensaver(page);
  await page.goto('/?hrd_screensaver=true');
  const dismiss = page.getByRole('button', { name: "Fermer l'écran de veille" });
  await expect(dismiss).toBeVisible({ timeout: 15_000 });

  // Celui de la veille, par-dessus la barre du haut de l'accueil.
  const launcher = openApps(page).last();
  await expect(launcher).toBeVisible();
  await launcher.click();

  await expect(page.getByRole('button', { name: 'Galerie de widgets' })).toBeVisible();
  await expect(dismiss).toHaveCount(0);
});

test('le réglage « Lanceur et barre du haut » le retire de la veille', async ({ page }) => {
  await withScreensaver(page, false);
  await page.goto('/?hrd_screensaver=true');
  // La veille d'abord, et son heure : sans elle, compter les boutons ne prouverait rien.
  await expect(page.getByRole('button', { name: "Fermer l'écran de veille" })).toBeVisible({ timeout: 15_000 });

  // Seul reste celui de l'accueil, sous la veille.
  await expect(openApps(page)).toHaveCount(1);
});
