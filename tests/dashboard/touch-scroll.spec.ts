/**
 * Glisser le plateau au doigt, en partant d'une card.
 *
 * Le conteneur interne d'un panneau défile en vertical : avec
 * `overscroll-behavior: contain` sur les deux axes, un geste horizontal qui
 * commençait sur une card n'était pas transmis au plateau, qui ne bougeait plus.
 * Seul le glissement parti d'un espace vide entre les panneaux fonctionnait.
 *
 * Run with: npm run test:e2e:dashboard
 */
import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 800, height: 600 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ha-dashboard-tour-done', 'true'));
});

/**
 * Un panneau est toujours ramené à la largeur de l'écran : le plateau ne
 * déborde qu'avec une seconde colonne, que la graine n'a pas.
 */
async function withSecondPanel(page: Page) {
  await page.route('**/api/config', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    const res = await route.fetch();
    const body = await res.json();
    body.layouts.home.panels.push({ id: 'touch-panel-2', cols: 9, widgets: [{ id: 'greeting-2', type: 'greeting', w: 3, h: 1 }] });
    await route.fulfill({ response: res, json: body });
  });
}

/** Un doigt qui se pose sur le premier point, attend `holdMs`, puis passe par les suivants. */
async function touchDrag(page: Page, path: { x: number; y: number }[], holdMs = 0) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [path[0]] });
  if (holdMs) await page.waitForTimeout(holdMs);
  for (let leg = 1; leg < path.length; leg++) {
    const from = path[leg - 1];
    const to = path[leg];
    for (let step = 1; step <= 8; step++) {
      const x = Math.round(from.x + ((to.x - from.x) * step) / 8);
      const y = Math.round(from.y + ((to.y - from.y) * step) / 8);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      await page.waitForTimeout(16);
    }
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test('un glissement horizontal parti d’une card fait défiler le plateau', async ({ page }) => {
  await withSecondPanel(page);

  await page.goto('/');
  await page.waitForSelector('[data-widget-id]', { timeout: 15_000 });

  const board = page.locator('[data-panel-scroll]').first().locator('xpath=ancestor::div[contains(@class,"overflow-x-auto")][1]');
  const overflow = await board.evaluate(el => el.scrollWidth - el.clientWidth);
  // Le plateau doit déborder, sinon il n'y a rien à faire défiler.
  expect(overflow).toBeGreaterThan(100);
  expect(await board.evaluate(el => el.scrollLeft)).toBe(0);

  const card = await page.locator('[data-widget-id]').first().boundingBox();
  expect(card).not.toBeNull();

  // Un doigt qui part du centre de la card et glisse vers la gauche. Des
  // évènements tactiles posés à la main : `synthesizeScrollGesture` ne fait
  // défiler aucun élément en mode sans écran.
  const x = Math.round(card!.x + card!.width / 2);
  const y = Math.round(card!.y + card!.height / 2);
  await touchDrag(page, [
    { x, y },
    { x: x - 300, y },
  ]);

  await expect.poll(() => board.evaluate(el => el.scrollLeft)).toBeGreaterThan(50);
});

test('en édition, tirer une tuile de côté la déplace au lieu de faire glisser le plateau', async ({ page }) => {
  await withSecondPanel(page);
  await page.goto('/');
  await page.waitForSelector('[data-widget-id]', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Modifier ce panneau' }).first().click();
  await expect(page.getByRole('button', { name: 'Abandonner les modifications' })).toBeVisible();

  const tiles = page.locator('[data-panel-id="seed-panel"] [data-panel-grid] > [data-widget-id]');
  const order = () => tiles.evaluateAll(els => els.map(el => (el as HTMLElement).dataset.widgetId));
  const [first, second, ...rest] = (await order()) as string[];
  const a = (await tiles.nth(0).boundingBox())!;
  const b = (await tiles.nth(1).boundingBox())!;

  // Le doigt se pose au centre de la première tuile et la tire aussitôt de côté, sans la tenir,
  // puis rejoint la moitié droite de la deuxième.
  // Par le nom, à gauche : sur une tuile d'une rangée, le centre est un bouton.
  const from = { x: Math.round(a.x + a.width * 0.1), y: Math.round(a.y + a.height / 2) };
  await touchDrag(page, [from, { x: from.x + 60, y: from.y }, { x: Math.round(b.x + b.width * 0.75), y: Math.round(b.y + b.height / 2) }]);

  await expect.poll(order).toEqual([second, first, ...rest]);
});

test.describe('en édition, au doigt', () => {
  const tiles = (page: Page) => page.locator('[data-panel-id="seed-panel"] [data-panel-grid] > [data-widget-id]');
  const order = (page: Page) => tiles(page).evaluateAll(els => els.map(el => (el as HTMLElement).dataset.widgetId));
  const center = (r: { x: number; y: number; width: number; height: number }, fx = 0.5) => ({
    x: Math.round(r.x + r.width * fx),
    y: Math.round(r.y + r.height / 2),
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-widget-id]', { timeout: 15_000 });
    await page.getByRole('button', { name: 'Modifier ce panneau' }).first().click();
    await expect(page.getByRole('button', { name: 'Abandonner les modifications' })).toBeVisible();
  });

  test('une tuile tenue un instant se déplace', async ({ page }) => {
    const [first, second, ...rest] = (await order(page)) as string[];
    const a = (await tiles(page).nth(0).boundingBox())!;
    const b = (await tiles(page).nth(1).boundingBox())!;

    // Saisie par le nom, à gauche : sur une tuile d'une rangée, le centre est un bouton.
    await touchDrag(page, [center(a, 0.1), center(b, 0.75)], 400);

    await expect.poll(() => order(page)).toEqual([second, first, ...rest]);
  });

  test('un balayage vertical sans tenir ne déplace pas la tuile', async ({ page }) => {
    const before = await order(page);
    const a = center((await tiles(page).nth(0).boundingBox())!, 0.1);

    await touchDrag(page, [a, { x: a.x, y: a.y + 200 }]);

    await page.waitForTimeout(200);
    expect(await order(page)).toEqual(before);
  });
});
