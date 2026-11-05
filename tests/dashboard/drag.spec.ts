/**
 * Déplacer une tuile à la souris — dans la page, et dans une shadow root comme
 * en mode carte Home Assistant, où `npm run dev` ne place jamais l'application.
 *
 * Run with: npm run test:e2e:dashboard
 */
import { test, expect, type Page } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ha-dashboard-tour-done', 'true'));
});

/**
 * Range `#root` dans la shadow root d'un hôte, avec une copie des feuilles de
 * style : le contexte de `ha-card.ts`. React suit, ses écouteurs sont sur `#root`.
 */
async function moveIntoShadowRoot(page: Page) {
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;inset:0;';
    document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' });
    document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach(s => shadow.append(s.cloneNode(true)));
    shadow.append(document.getElementById('root')!);
  });
}

async function openPanelEditor(page: Page) {
  await page.getByRole('button', { name: 'Modifier ce panneau' }).first().click();
  await expect(page.getByRole('button', { name: 'Abandonner les modifications' })).toBeVisible();
}

const tiles = (page: Page) => page.locator('[data-panel-id="seed-panel"] [data-panel-grid] > [data-widget-id]');
const order = (page: Page) => tiles(page).evaluateAll(els => els.map(el => (el as HTMLElement).dataset.widgetId));

/** Saisit la première tuile et l'amène sur la moitié droite de la deuxième, sans la lâcher. */
async function dragFirstOverSecond(page: Page) {
  const a = (await tiles(page).nth(0).boundingBox())!;
  const b = (await tiles(page).nth(1).boundingBox())!;
  // Par le nom, à gauche : sur une tuile d'une rangée, le centre est un bouton.
  await page.mouse.move(a.x + a.width * 0.1, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.75, b.y + b.height / 2, { steps: 10 });
  // La cible se relit à chaque image : en laisser passer quelques-unes.
  await page.waitForTimeout(100);
}

for (const shadow of [false, true]) {
  test(`une tuile se déplace à la souris${shadow ? ', dans une shadow root' : ''}`, async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-widget-id]', { timeout: 15_000 });
    if (shadow) await moveIntoShadowRoot(page);
    await openPanelEditor(page);

    const [first, second, ...rest] = (await order(page)) as string[];
    await dragFirstOverSecond(page);
    await page.mouse.up();

    await expect.poll(() => order(page)).toEqual([second, first, ...rest]);
  });
}

test('Échap annule le déplacement en cours', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-widget-id]', { timeout: 15_000 });
  await openPanelEditor(page);

  const before = await order(page);
  await dragFirstOverSecond(page);
  await page.keyboard.press('Escape');
  await page.mouse.up();

  await page.waitForTimeout(200);
  expect(await order(page)).toEqual(before);
  // Le mode édition reste ouvert : Échap n'annule que le geste.
  await expect(page.getByRole('button', { name: 'Abandonner les modifications' })).toBeVisible();
});
