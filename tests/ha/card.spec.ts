/**
 * La carte dans un vrai Home Assistant : rendue par Lovelace dans la shadow root
 * de `hui-panel-view`, configurée par l'intégration, branchée sur le WebSocket.
 *
 * Run with: npm run test:ha
 */
import { test, expect, type Page } from '@playwright/test';
import { accessToken, ALARM, CONFIG_API, DASHBOARD, LIGHT, SEED } from './seed';

const headers = () => ({ Authorization: `Bearer ${accessToken()}` });

// Les locators de Playwright traversent les shadow roots ouvertes de HA.
const tiles = (page: Page) => page.locator('ha-react-dashboard-panel [data-panel-grid] > [data-widget-id]');
const order = (page: Page) => tiles(page).evaluateAll(els => els.map(el => (el as HTMLElement).dataset.widgetId));
const seedOrder = SEED.layouts.home.panels[0].widgets.map(w => w.id);

test.beforeEach(async ({ page, request }) => {
  // Chaque test repart de la configuration amorcée.
  expect((await request.put(CONFIG_API, { headers: headers(), data: SEED })).ok()).toBeTruthy();
  await page.goto(DASHBOARD);
  await expect(tiles(page)).toHaveCount(seedOrder.length, { timeout: 30_000 });
});

test('la carte affiche les tuiles de la configuration', async ({ page }) => {
  expect(await order(page)).toEqual(seedOrder);
  await expect(page.getByText("Custom element doesn't exist")).toHaveCount(0);
});

test('l’état du thème posé sur <html> est recopié dans la shadow root', async ({ page }) => {
  // Le conteneur de l'app, enfant de la carte, vit dans la shadow root de la vue.
  const container = page.locator('ha-react-dashboard-panel > div');
  const html = page.locator('html');
  await expect(container).toHaveAttribute('data-theme', (await html.getAttribute('data-theme'))!);

  // Thème sombre et réglages par défaut : `<html>` n'a encore aucune classe à
  // recopier. Une classe `perf-*` posée comme le fait `ThemeContext` doit suivre.
  await page.evaluate(() => document.documentElement.classList.add('perf-no-shadows'));
  await expect(container).toHaveClass(/\bperf-no-shadows\b/);
});

test('la tuile d’une lampe suit et pilote la vraie entité', async ({ page, request }) => {
  const state = async () => (await (await request.get(`/api/states/${LIGHT}`, { headers: headers() })).json()).state;
  const toggle = page.locator('ha-react-dashboard-panel [data-widget-id="light-bed"] button[aria-pressed]');

  // HA → carte : un service appelé ailleurs se voit sur la tuile.
  await request.post('/api/services/light/turn_off', { headers: headers(), data: { entity_id: LIGHT } });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await request.post('/api/services/light/turn_on', { headers: headers(), data: { entity_id: LIGHT } });
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  // Carte → HA.
  await toggle.click();
  await expect.poll(state).toBe('off');
});

test('une tuile dont l’entité est indisponible le dit, puis revient', async ({ page, request }) => {
  const tile = page.locator('ha-react-dashboard-panel [data-widget-id="light-bed"]');
  const setState = (state: string) => request.post(`/api/states/${LIGHT}`, { headers: headers(), data: { state } });

  await setState('unavailable');
  await expect(tile.locator('[data-unavailable]')).toBeVisible();
  await expect(tile).toContainText('Indisponible');

  await setState('off');
  await expect(tile.locator('[data-unavailable]')).toHaveCount(0);
});

test('une alarme déclenchée se désarme au pavé de la card', async ({ page, request }) => {
  const state = async () => (await (await request.get(`/api/states/${ALARM}`, { headers: headers() })).json()).state;
  const tile = page.locator('ha-react-dashboard-panel [data-widget-id="alarm-security"]');

  // L'état seul est forcé : l'alarme de `demo`, elle, reste désarmée et
  // réécrira le sien en traitant le code.
  await request.post(`/api/states/${ALARM}`, {
    headers: headers(),
    data: { state: 'triggered', attributes: { friendly_name: 'Security' } },
  });
  await expect(tile.getByText('Intrusion')).toBeVisible();
  await expect(tile).toContainText('à l’instant');
  await page.screenshot({ path: 'test-results/alarm-triggered.png' });

  for (const k of ['1', '2', '3', '4']) await tile.getByRole('button', { name: k, exact: true }).click();
  await tile.getByRole('button', { name: 'Désarmer' }).click();
  await expect.poll(state).toBe('disarmed');
});

test('une tuile déplacée en édition est enregistrée dans l’intégration', async ({ page, request }) => {
  await page.getByRole('button', { name: 'Modifier ce panneau' }).first().click();
  await expect(page.getByRole('button', { name: 'Abandonner les modifications' })).toBeVisible();

  const a = (await tiles(page).nth(0).boundingBox())!;
  const b = (await tiles(page).nth(1).boundingBox())!;
  await page.mouse.move(a.x + a.width * 0.1, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.75, b.y + b.height / 2, { steps: 10 });
  await page.waitForTimeout(100);
  await page.mouse.up();

  const [first, second, ...rest] = seedOrder;
  await expect.poll(() => order(page)).toEqual([second, first, ...rest]);
  await page.getByRole('button', { name: 'Enregistrer et terminer' }).click();

  const saved = async () => {
    const config = await (await request.get(CONFIG_API, { headers: headers() })).json();
    return config.layouts.home.panels[0].widgets.map((w: { id: string }) => w.id);
  };
  await expect.poll(saved).toEqual([second, first, ...rest]);

  await page.reload();
  await expect.poll(() => order(page), { timeout: 30_000 }).toEqual([second, first, ...rest]);
});

test('une configuration changée ailleurs s’affiche au rechargement', async ({ page, request }) => {
  // Un autre appareil enregistre : ici, l'API directement.
  const reversed = structuredClone(SEED);
  reversed.layouts.home.panels[0].widgets.reverse();
  expect((await request.put(CONFIG_API, { headers: headers(), data: reversed })).ok()).toBeTruthy();

  await page.reload();
  await expect.poll(() => order(page), { timeout: 30_000 }).toEqual([...seedOrder].reverse());
});
