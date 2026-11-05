/**
 * Les modales (panneaux personnalisés) : ouverture depuis le menu de gauche,
 * feuille plein écran façon Echo, fermeture.
 *
 * Run with: npm run test:e2e:dashboard
 */
import { test, expect, type Page } from '@playwright/test';

const MODAL = {
  id: 'modal-volets',
  name: 'Volets du salon',
  icon: 'Blinds',
  blocks: [
    { id: 's1', type: 'section-header', title: 'Volets' },
    { id: 'c1', type: 'cover-row', entityId: 'cover.volet_cuisine' },
    { id: 'b1', type: 'button', label: 'Tout fermer', variant: 'primary', domain: 'cover', service: 'close_cover', targetEntityIds: [] },
  ],
};

/** La configuration servie porte une modale, épinglée — ou non — au menu de gauche. */
async function withModal(page: Page, { pinned }: { pinned: boolean }) {
  await page.route('**/api/config', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    const res = await route.fetch();
    const body = await res.json();
    body.customPanels = [MODAL];
    body.dock = { panels: pinned ? [MODAL.id] : [], labels: true };
    await route.fulfill({ response: res, json: body });
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ha-dashboard-tour-done', 'true'));
});

test('une modale épinglée s’ouvre depuis le menu de gauche, en plein écran', async ({ page }) => {
  await withModal(page, { pinned: true });
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: MODAL.name }).click();

  const sheet = page.getByRole('dialog', { name: MODAL.name });
  await expect(sheet).toBeVisible();
  const box = (await sheet.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.width).toBe(viewport.width);
  expect(box.height).toBe(viewport.height);
  await expect(sheet.getByRole('button', { name: 'Tout fermer' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
});

test('Échap ferme d’abord la fiche d’un volet ouverte depuis la modale, puis la modale', async ({ page }) => {
  await withModal(page, { pinned: true });
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: MODAL.name }).click();
  const sheet = page.getByRole('dialog', { name: MODAL.name });
  await expect(sheet).toBeVisible();

  await sheet.getByText('Cuisine', { exact: true }).click();
  await expect(page.getByTestId('more-info-modal')).toBeVisible({ timeout: 5000 });

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('more-info-modal')).toHaveCount(0);
  await expect(sheet).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
});
