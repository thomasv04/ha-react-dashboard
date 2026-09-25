/**
 * Page plan (`floorplan`) — pastilles et cards posées sur une image, en mode
 * mock (aucun Home Assistant réel).
 *
 * La page est ajoutée à la configuration amorcée par `seed.setup.ts`, puis
 * retirée : les specs suivantes dépendent de cette configuration.
 *
 * L'image est un SVG en `data:` : téléverser un fichier l'aurait déposé dans
 * `data/uploads`, partagé avec le serveur de développement. Le téléversement
 * lui-même est couvert par les tests du serveur.
 */
import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:8098';

/** Un plan d'appartement : six pièces, quelques meubles, la droite laissée libre pour les cards. */
const PLAN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <rect width="1600" height="900" fill="#e9edf2"/>
  <g stroke="#343b46" stroke-width="10" stroke-linejoin="round">
    <rect x="80" y="80" width="420" height="320" fill="#dde4ea"/>
    <rect x="500" y="80" width="200" height="320" fill="#d3e2ea"/>
    <rect x="700" y="80" width="460" height="320" fill="#ecdfc8"/>
    <rect x="80" y="400" width="560" height="420" fill="#eee1ca"/>
    <rect x="640" y="400" width="220" height="420" fill="#e3e1da"/>
    <rect x="860" y="400" width="300" height="420" fill="#e8dccb"/>
  </g>
  <g fill="#eee1ca">
    <rect x="250" y="394" width="80" height="12"/>
    <rect x="634" y="560" width="12" height="80"/>
    <rect x="854" y="560" width="12" height="80"/>
    <rect x="720" y="394" width="80" height="12"/>
    <rect x="710" y="814" width="80" height="12"/>
  </g>
  <g fill="#c7b392">
    <rect x="95" y="95" width="390" height="45" rx="6"/>
    <rect x="515" y="95" width="170" height="80" rx="30" fill="#b9cdd8"/>
    <rect x="860" y="100" width="220" height="200" rx="12"/>
    <rect x="95" y="470" width="70" height="240" rx="18"/>
    <circle cx="380" cy="620" r="70"/>
    <rect x="900" y="740" width="220" height="60" rx="6"/>
  </g>
  <g font-family="sans-serif" font-size="20" letter-spacing="4" fill="#8a93a0" text-anchor="middle">
    <text x="290" y="380">CUISINE</text>
    <text x="600" y="380">BAIN</text>
    <text x="930" y="380">CHAMBRE</text>
    <text x="360" y="800">SALON</text>
    <text x="750" y="800">ENTRÉE</text>
    <text x="1010" y="720">BUREAU</text>
  </g>
</svg>`;

const PLAN_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(PLAN_SVG)}`;

const at = (id: string, type: string, x: number, y: number, w?: number, h?: number) => ({
  id,
  type,
  x: 0,
  y: 0,
  w: 2,
  h: 1,
  pos: w ? { x, y, w, h } : { x, y },
});

const WIDGETS = [
  at('chip-cuisine', 'chip', 18, 21),
  at('chip-chambre', 'chip', 58, 21),
  at('chip-temp', 'chip', 53, 33),
  at('chip-hum', 'chip', 63, 33),
  at('chip-salon', 'chip', 22, 60),
  at('chip-couloir', 'chip', 47, 62),
  at('chip-porte', 'chip', 47, 85),
  at('weather-plan', 'weather', 86, 30, 22, 40),
];

const CONFIGS = {
  'chip-cuisine': { type: 'chip', entityId: 'light.bandeau_led_cuisine', glow: true, glowSize: 22 },
  'chip-chambre': { type: 'chip', entityId: 'light.chambre', glow: true, glowSize: 24 },
  'chip-temp': { type: 'chip', entityId: 'sensor.temperature_chambre_temperature' },
  'chip-hum': { type: 'chip', entityId: 'sensor.temperature_chambre_humidity' },
  'chip-salon': { type: 'chip', entityId: 'light.salon', name: 'Salon' },
  'chip-couloir': { type: 'chip', entityId: 'binary_sensor.couloir_mouvement' },
  'chip-porte': { type: 'chip', entityId: 'binary_sensor.porte_entree' },
  'weather-plan': { type: 'weather', entityId: 'weather.home' },
};

let original: Record<string, unknown>;

test.beforeAll(async ({ request }) => {
  original = await (await request.get(`${API}/api/config`)).json();
  const config = structuredClone(original) as {
    pages: unknown[];
    layouts: Record<string, unknown>;
    widgetConfigs: Record<string, unknown>;
  };
  config.pages.push({ id: 'plan', label: 'Plan', icon: 'Home', type: 'floorplan', order: 99, floorplan: { image: PLAN_IMAGE } });
  config.layouts.plan = { widgets: { lg: WIDGETS, md: WIDGETS, sm: WIDGETS }, cols: { lg: 12, md: 8, sm: 4 } };
  config.widgetConfigs.plan = CONFIGS;
  expect((await request.put(`${API}/api/config`, { data: config })).ok()).toBeTruthy();
});

test.afterAll(async ({ request }) => {
  await request.put(`${API}/api/config`, { data: original });
});

test.beforeEach(async ({ page }) => {
  // La visite guidée recouvrirait l'interface (elle a son propre spec).
  await page.addInitScript(() => localStorage.setItem('ha-dashboard-tour-done', 'true'));
});

async function openPlan(page: Page) {
  await page.goto('/#plan');
  await expect(page.locator('[data-floorplan-item]')).toHaveCount(WIDGETS.length, { timeout: 30_000 });
}

test('renders the plan with its chips and cards', async ({ page }, testInfo) => {
  await openPlan(page);

  await expect(page.getByText('20.4 °C')).toBeVisible();
  await expect(page.getByRole('button', { name: /Salon/ })).toBeVisible();
  // La card météo garde son rendu de grille, positionnée sur le plan. Son
  // contenu, pas seulement sa case : chaque card arrive dans son propre module.
  // (Pas la température : elle s'écrit chiffre par chiffre, en compteur animé.)
  await expect(page.locator('[data-widget-id="weather-plan"]').getByText('km/h')).toBeVisible();
  // `animations: 'disabled'` : amène les entrées en fondu à leur fin, sans quoi
  // la capture saisit des éléments à demi transparents.
  await page.screenshot({ path: testInfo.outputPath('floorplan-view.png'), animations: 'disabled' });

  // « Réorganiser » range une grille : il n'a rien à faire sur un plan.
  await page.getByRole('button', { name: 'Modifier le dashboard' }).click();
  await expect(page.getByRole('button', { name: /Réorganiser/ })).toHaveCount(0);
});

test('tapping a sensor chip opens its details', async ({ page }) => {
  await openPlan(page);
  await page.getByRole('button', { name: /55 %/ }).click();
  await expect(page.getByTestId('more-info-modal')).toBeVisible();
});

test('in edit mode, a click on the plan places a chip, and dragging moves it', async ({ page }, testInfo) => {
  await openPlan(page);
  await page.getByRole('button', { name: 'Modifier le dashboard' }).click();

  // Un point libre du salon.
  const box = (await page.locator('[data-floorplan-plan]').boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.75);

  // La liste des entités s'ouvre d'elle-même ; son champ de recherche arrive
  // une image plus tard : taper avant, c'était écrire dans le vide.
  await page.getByPlaceholder('Rechercher...').fill('light.living_room');
  await page.getByRole('button', { name: 'light.living_room', exact: true }).click();
  const items = page.locator('[data-floorplan-item]');
  await expect(items).toHaveCount(WIDGETS.length + 1);

  const added = items.last();
  const before = await added.evaluate(el => (el as HTMLElement).style.left);
  const handle = added.locator('[data-drag-handle]');
  const hb = (await handle.boundingBox())!;
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + hb.width / 2 + 120, hb.y + hb.height / 2 - 40, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => added.evaluate(el => (el as HTMLElement).style.left)).not.toBe(before);

  // Les cards arrivent en différé (un module par card) : attendre leur contenu.
  await expect(page.getByText('20.4 °C')).toBeVisible();
  await expect(page.locator('[data-floorplan-item="weather-plan"]').getByText('km/h')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('floorplan-edit.png'), animations: 'disabled' });
});

test('the tab arrows move the plan before the home page', async ({ page }) => {
  await openPlan(page);
  await page.getByRole('button', { name: 'Modifier le dashboard' }).click();

  // Les libellés d'onglet (en capitales) — pas le bouton « + Plan », qui dit la même chose.
  const labels = () =>
    page
      .locator('[data-tour="pages"] > button span.uppercase')
      .allInnerTexts()
      .then(t => t.map(s => s.trim().toUpperCase()).filter(s => s === 'ACCUEIL' || s === 'PLAN'));
  expect(await labels()).toEqual(['ACCUEIL', 'PLAN']);

  // `exact` : le nom accessible de l'onglet lui-même contient celui de la flèche.
  await page.getByRole('button', { name: 'Déplacer à gauche', exact: true }).click();
  expect(await labels()).toEqual(['PLAN', 'ACCUEIL']);
});
