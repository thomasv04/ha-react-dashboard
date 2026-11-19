/**
 * L'appli téléphone (maquettes « Téléphone ») : barre d'onglets, grille fluide,
 * menu, Paramètres, et l'écran d'une caméra — plein écran et zoom aux doigts.
 *
 * Run with: npm run test:e2e:dashboard
 */
import { test, expect, type Page } from './fixtures';

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ha-dashboard-tour-done', 'true'));
});

async function open(page: Page) {
  await page.goto('/');
  await page.waitForSelector('[data-widget-id]', { timeout: 15_000 });
  return page.getByRole('navigation', { name: 'Navigation principale' });
}

test.describe('Appli téléphone', () => {
  test('les onglets remplacent la barre et le rail de la tablette, sans édition', async ({ page }) => {
    const tabs = await open(page);
    await expect(tabs.getByRole('button', { name: 'Maison' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('button', { name: 'Modifier le dashboard' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ouvrir les apps' })).toHaveCount(0);

    // Rien ne déborde : ni le document, ni une tuile.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    for (const tile of await page.locator('[data-widget-id]').all()) {
      const box = (await tile.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
    }

    await tabs.getByRole('button', { name: 'Pièces' }).click();
    await expect(page.getByRole('heading', { name: 'Pièces' })).toBeVisible();
    await expect(tabs.getByRole('button', { name: 'Pièces' })).toHaveAttribute('aria-current', 'page');
  });

  test('couché, le téléphone reste en appli téléphone', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const tabs = await open(page);
    await expect(tabs).toBeVisible();
    await expect(page.getByRole('button', { name: 'Modifier le dashboard' })).toHaveCount(0);
  });

  test('le menu et les Paramètres, en liste puis détail', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: 'Paramètres' }).click();
    // Le menu s'efface avant que les Paramètres ne prennent l'écran.
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
    await page.getByRole('button', { name: /Apparence/ }).click();
    await expect(page.getByRole('heading', { name: 'Apparence' })).toBeVisible();
    await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
    await expect(page.getByRole('button', { name: /Système/ })).toBeVisible();
  });
});

test.describe('Caméra au téléphone', () => {
  async function openCamera(page: Page) {
    const tabs = await open(page);
    await tabs.getByRole('button', { name: 'Caméras' }).click();
    await page.getByRole('heading', { name: 'Caméras' }).waitFor();
    // La première caméra, en direct en tête de l'onglet.
    await page.getByRole('button', { name: /couloir_frigate/ }).click();
    const view = page.getByTestId('phone-camera-view');
    await expect(view).toBeVisible();
    return view;
  }

  test('le plein écran couvre l’écran, tourné d’un quart de tour en portrait', async ({ page }) => {
    const view = await openCamera(page);
    await page.getByRole('button', { name: 'Plein écran' }).click();
    // La vue tournée occupe exactement l'écran du téléphone.
    await expect.poll(async () => (await view.boundingBox())!.height).toBeGreaterThan(830);
    const box = (await view.boundingBox())!;
    expect(Math.round(box.x)).toBe(0);
    expect(Math.round(box.width)).toBe(390);
    await page.getByRole('button', { name: 'Quitter le plein écran' }).click();
    await expect.poll(async () => (await view.boundingBox())!.height).toBeLessThan(300);
  });

  test('zoom à deux doigts, borné au cadre, et double appui pour revenir', async ({ page }) => {
    const view = await openCamera(page);
    const zoom = view.locator('> div').first();
    const image = zoom.locator('> div');
    const box = (await view.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    // Deux doigts qui s'écartent, puis un qui glisse très loin.
    await zoom.evaluate(
      async (el, { cx, cy }) => {
        const fire = (type: string, id: number, x: number, y: number) =>
          el.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, pointerType: 'touch' }));
        const frame = () => new Promise(r => requestAnimationFrame(r));
        fire('pointerdown', 1, cx - 20, cy);
        fire('pointerdown', 2, cx + 20, cy);
        await frame();
        for (let d = 25; d <= 40; d += 5) {
          fire('pointermove', 1, cx - d, cy);
          fire('pointermove', 2, cx + d, cy);
          await frame();
        }
        fire('pointerup', 2, cx + 40, cy);
        for (let d = 100; d <= 1000; d += 100) {
          fire('pointermove', 1, cx - 40 + d, cy + d);
          await frame();
        }
        fire('pointerup', 1, cx, cy);
      },
      { cx, cy }
    );
    // ×2, et l'image ne dépasse pas le bord du cadre : décalage au plus (2 - 1) × largeur / 4.
    await expect(image).toHaveCSS('transform', /matrix\(2, 0, 0, 2/);
    const [, , , , tx] = (await image.evaluate(el => getComputedStyle(el).transform)).match(/-?[\d.]+/g)!.map(Number);
    expect(tx).toBeLessThanOrEqual(box.width / 2 + 1);

    await zoom.evaluate(el => {
      for (const id of [3, 4]) {
        el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: id, bubbles: true, pointerType: 'touch' }));
        el.dispatchEvent(new PointerEvent('pointerup', { pointerId: id, bubbles: true, pointerType: 'touch' }));
      }
    });
    await expect(image).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  });
});
