/**
 * Page plan en 3D — la maquette de `fixtures/` (cf. ATTRIBUTION.md), en mode
 * mock. WebGL tourne dans Chromium sans écran (rendu logiciel) : lent, mais
 * c'est bien le vrai rendu.
 *
 * Même principe que `floorplan.spec.ts` : la page est ajoutée à la
 * configuration amorcée, puis retirée.
 */
import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:8098';
// Adresse relative : le serveur de dev sert tout sous sa `base` (`/local/…/`).
const MODEL = 'tests/dashboard/fixtures/smart-home-floor-plan.glb';

/** Pastille accrochée à un point de la maquette, dans ses propres coordonnées. */
const chip = (id: string, anchor: [number, number, number]) => ({
  id,
  type: 'chip',
  x: 0,
  y: 0,
  w: 2,
  h: 1,
  pos: { x: 50, y: 50, anchor },
});

const WIDGETS = [
  chip('lamp-kitchen', [-12.37, 0, -1.74]),
  chip('lamp-living', [-4.34, 0.39, -0.64]),
  chip('lamp-bedroom', [-2.88, 0.63, -6.58]),
  chip('motion', [-6.02, 1.63, -6.71]),
  chip('temp', [-1.01, 3.05, -2.54]),
  // Une card n'est pas accrochée : elle reste posée en % de l'écran.
  { id: 'weather-3d', type: 'weather', x: 0, y: 0, w: 2, h: 1, pos: { x: 88, y: 22, w: 20, h: 32 } },
];

const CONFIGS = {
  'lamp-kitchen': { type: 'chip', entityId: 'light.bandeau_led_cuisine', glow: true, glowSize: 12 },
  'lamp-living': { type: 'chip', entityId: 'light.living_room', glow: true, glowSize: 12 },
  'lamp-bedroom': { type: 'chip', entityId: 'light.chambre', glow: true, glowSize: 12 },
  motion: { type: 'chip', entityId: 'binary_sensor.couloir_mouvement' },
  temp: { type: 'chip', entityId: 'sensor.temperature_chambre_temperature' },
  'weather-3d': { type: 'weather', entityId: 'weather.home' },
};

let original: Record<string, unknown>;

test.beforeAll(async ({ request }) => {
  original = await (await request.get(`${API}/api/config`)).json();
  const config = structuredClone(original) as {
    pages: unknown[];
    layouts: Record<string, unknown>;
    widgetConfigs: Record<string, unknown>;
  };
  config.pages.push({ id: 'maison', label: 'Maison', icon: 'Home', type: 'floorplan', order: 99, floorplan: { image: '', model: MODEL } });
  config.layouts.maison = { widgets: { lg: WIDGETS, md: WIDGETS, sm: WIDGETS }, cols: { lg: 12, md: 8, sm: 4 } };
  config.widgetConfigs.maison = CONFIGS;
  expect((await request.put(`${API}/api/config`, { data: config })).ok()).toBeTruthy();
});

test.afterAll(async ({ request }) => {
  await request.put(`${API}/api/config`, { data: original });
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ha-dashboard-tour-done', 'true'));
});

/** Ouvre la page et attend la maquette : les pastilles accrochées n'apparaissent qu'une fois projetées. */
async function openModel(page: Page) {
  await page.goto('/#maison');
  await expect(page.getByText('20.4 °C')).toBeVisible({ timeout: 60_000 });
}

/** Position à l'écran d'un élément du plan, en % (style `left` / `top`). */
const at = (page: Page, id: string) =>
  page.locator(`[data-floorplan-item="${id}"]`).evaluate(el => [(el as HTMLElement).style.left, (el as HTMLElement).style.top].join(' '));

/**
 * Glisser sur le canevas : la caméra tourne. En bas à gauche, loin de ce qui
 * le recouvre — la barre d'édition en haut, le dock au centre en bas, la card.
 */
async function orbit(page: Page, dx: number) {
  const box = (await page.locator('[data-floorplan-3d] canvas').boundingBox())!;
  const x = box.x + box.width * 0.15;
  const y = box.y + box.height * 0.85;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 8 });
  await page.mouse.up();
}

test('renders the model, with chips anchored on it and cards over it', async ({ page }, testInfo) => {
  await openModel(page);
  await expect(page.locator('[data-floorplan-3d] canvas')).toBeVisible();
  await expect(page.locator('[data-floorplan-item]')).toHaveCount(WIDGETS.length);
  await expect(page.locator('[data-floorplan-item="weather-3d"]').getByText('km/h')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('floorplan3d-view.png'), animations: 'disabled' });
});

test('anchored chips follow the camera, and the reset button brings it back', async ({ page }) => {
  await openModel(page);
  const home = await at(page, 'temp');
  const card = await at(page, 'weather-3d');

  await orbit(page, 160);
  await expect.poll(() => at(page, 'temp')).not.toBe(home);
  // La card, elle, ne bouge pas avec la maquette.
  expect(await at(page, 'weather-3d')).toBe(card);

  await page.getByRole('button', { name: 'Recentrer' }).click();
  await expect.poll(() => at(page, 'temp')).toBe(home);
});

test('in edit mode, a click on the model places a chip anchored where it landed', async ({ page }, testInfo) => {
  await openModel(page);
  await page.getByRole('button', { name: 'Modifier le dashboard' }).click();

  // Le mode édition redimensionne le canevas : attendre que la maquette et
  // les pastilles aient été redessinées, sans quoi le clic peut tomber sur une
  // pastille encore à son ancienne place — et la sélectionner au lieu de poser.
  await expect(page.getByText(/Cliquez sur la maquette/)).toBeVisible();
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));

  // Le sol de la salle à manger, à l'écart des pastilles.
  const box = (await page.locator('[data-floorplan-3d] canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.58);
  // Le champ de recherche arrive avec la liste, une image plus tard : taper
  // avant, c'était écrire dans le vide.
  await page.getByPlaceholder('Rechercher...').fill('light.salon');
  await page.getByRole('button', { name: 'light.salon', exact: true }).click();
  const items = page.locator('[data-floorplan-item]');
  await expect(items).toHaveCount(WIDGETS.length + 1);

  // Accrochée à la maquette : elle tourne avec elle.
  const added = await items.last().getAttribute('data-floorplan-item');
  const before = await at(page, added!);
  await orbit(page, 160);
  await expect.poll(() => at(page, added!)).not.toBe(before);

  await page.screenshot({ path: testInfo.outputPath('floorplan3d-edit.png'), animations: 'disabled' });
});
