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

/**
 * Enregistrements interceptés : la base de test est partagée par toute la
 * suite, une modale enregistrée ici apparaîtrait dans les autres specs.
 */
function captureSaves(page: Page) {
  const saved: Array<{ customPanels?: Array<{ id: string; name: string }>; dock?: { panels: string[] } }> = [];
  void page.route('**/api/config', async route => {
    if (route.request().method() !== 'PUT') return route.fallback();
    saved.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, json: {} });
  });
  return saved;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ha-dashboard-tour-done', 'true'));
});

test('on crée une modale depuis le lanceur et on l’affiche dans le menu de gauche', async ({ page }) => {
  const saved = captureSaves(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir les apps' }).click();
  await page.getByRole('button', { name: 'Modales' }).click();

  const editor = page.getByRole('dialog', { name: 'Modales' });
  await editor.getByRole('button', { name: 'Nouvelle modale' }).first().click();
  await editor.getByRole('textbox', { name: 'Nom de la modale' }).fill('Cuisine');
  await editor.getByRole('switch', { name: /Afficher dans le menu de gauche/ }).click();
  await editor.getByRole('button', { name: 'Sauvegarder et fermer' }).click();

  await expect(editor).toHaveCount(0);
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Cuisine' })).toBeVisible();
  const last = saved.at(-1)!;
  const created = last.customPanels!.find(p => p.name === 'Cuisine')!;
  expect(last.dock!.panels).toContain(created.id);
});

test('en mode édition, « Modales du menu » ajoute une modale au menu de gauche', async ({ page }) => {
  await withModal(page, { pinned: false });
  await page.goto('/');
  const rail = page.getByRole('navigation');
  await expect(rail.getByRole('button', { name: MODAL.name })).toHaveCount(0);

  await page.getByRole('button', { name: 'Modifier le dashboard' }).click();
  await rail.getByRole('button', { name: 'Modales du menu' }).click();
  await page.getByRole('menuitemcheckbox', { name: MODAL.name }).click();

  await expect(page.getByRole('menuitemcheckbox', { name: MODAL.name })).toHaveAttribute('aria-checked', 'true');
  await expect(rail.getByRole('button', { name: MODAL.name })).toBeVisible();
});

test('en vue invité, le lanceur ne propose pas de créer de modale', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: "Voir comme un invité (sans les outils d'édition)" }).click();
  await page.getByRole('button', { name: 'Ouvrir les apps' }).click();
  await expect(page.getByRole('button', { name: 'Paramètres' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Modales' })).toHaveCount(0);
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
