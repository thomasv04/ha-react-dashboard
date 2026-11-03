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
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 800, height: 600 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ha-dashboard-tour-done', 'true'));
});

test('un glissement horizontal parti d’une card fait défiler le plateau', async ({ page }) => {
  // Un panneau est toujours ramené à la largeur de l'écran : le plateau ne
  // déborde qu'avec une seconde colonne, que la graine n'a pas.
  await page.route('**/api/config', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    const res = await route.fetch();
    const body = await res.json();
    body.layouts.home.panels.push({ id: 'touch-panel-2', cols: 9, widgets: [{ id: 'greeting-2', type: 'greeting', w: 3, h: 1 }] });
    await route.fulfill({ response: res, json: body });
  });

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
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 12; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - step * 25, y }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  await expect.poll(() => board.evaluate(el => el.scrollLeft)).toBeGreaterThan(50);
});
