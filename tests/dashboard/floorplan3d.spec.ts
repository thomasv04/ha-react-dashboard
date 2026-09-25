/**
 * Page plan en 3D — la maquette de `fixtures/` (cf. ATTRIBUTION.md), en mode
 * mock. WebGL tourne dans Chromium sans écran (rendu logiciel) : lent, mais
 * c'est bien le vrai rendu.
 *
 * Même principe que `floorplan.spec.ts` : la page est ajoutée à la
 * configuration amorcée, puis retirée.
 */
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const API = 'http://localhost:8098';
// Adresse relative : le serveur de dev sert tout sous sa `base` (`/local/…/`).
const MODEL = 'tests/dashboard/fixtures/smart-home-floor-plan.glb';
/** Une maquette façon ExportToHASS, aux portes et fenêtres séparées (`scripts/make-openings-glb.ts`). */
const OPENINGS_MODEL = 'tests/dashboard/fixtures/openings.glb';

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
  // Une pièce autour du capteur de température, pour la vue thermique.
  const rooms = [
    {
      id: 'chambre',
      name: 'Chambre',
      y: 0,
      points: [
        [-3, -4],
        [0, -4],
        [0, -1],
        [-3, -1],
      ],
    },
  ];
  config.pages.push({
    id: 'maison',
    label: 'Maison',
    icon: 'Home',
    type: 'floorplan',
    order: 99,
    floorplan: { image: '', model: MODEL, rooms },
  });
  // Un plan encore vide, où téléverser une maquette.
  config.pages.push({ id: 'vierge', label: 'Vierge', icon: 'Home', type: 'floorplan', order: 100, floorplan: { image: '' } });
  // Une maquette aux vraies portes : celle de la chambre est liée à une entité ouverte.
  config.pages.push({
    id: 'ouvertures',
    label: 'Ouvertures',
    icon: 'Home',
    type: 'floorplan',
    order: 101,
    floorplan: {
      image: '',
      model: OPENINGS_MODEL,
      openings: { links: [{ node: 'Porte_Chambre_1', entityId: 'binary_sensor.porte_cellier' }] },
    },
  });
  config.layouts.ouvertures = { widgets: { lg: [], md: [], sm: [] }, cols: { lg: 12, md: 8, sm: 4 } };
  config.widgetConfigs.ouvertures = {};
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

/** Position à l'écran d'un élément du plan, en % (style `left` / `top`). */
const at = (page: Page, id: string) =>
  page.locator(`[data-floorplan-item="${id}"]`).evaluate(el => [(el as HTMLElement).style.left, (el as HTMLElement).style.top].join(' '));

/**
 * Ouvre la page et attend la maquette : les pastilles accrochées n'apparaissent
 * qu'une fois projetées. Puis que la maison ait fini de s'ouvrir — les murs
 * coupés descendent en glissant, et la pastille posée sur l'un d'eux avec.
 */
async function openModel(page: Page) {
  await page.goto('/#maison');
  await expect(page.getByText('20.4 °C')).toBeVisible({ timeout: 60_000 });
  await expect
    .poll(async () => {
      const before = await at(page, 'temp');
      await page.waitForTimeout(250);
      return before === (await at(page, 'temp'));
    })
    .toBe(true);
}

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

/**
 * Mode édition, un outil pris. Le mode édition redimensionne le canevas : on
 * attend son indication, puis que maquette et pastilles aient été redessinées
 * — sans quoi un clic peut tomber sur une pastille encore à son ancienne
 * place. Rend de quoi cliquer sur le canevas, en fraction de sa taille.
 */
async function drawWith(page: Page, tool: string, hint: RegExp) {
  await openModel(page);
  await page.getByRole('button', { name: 'Modifier le dashboard' }).click();
  await page.getByRole('button', { name: tool, exact: true }).click();
  await expect(page.getByText(hint)).toBeVisible();
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
  const box = (await page.locator('[data-floorplan-3d] canvas').boundingBox())!;
  return (x: number, y: number) => page.mouse.click(box.x + box.width * x, box.y + box.height * y);
}

/** Trois points au sol, autour de la table de la salle à manger. */
const DINING_FLOOR = [
  [0.386, 0.629],
  [0.486, 0.48],
  [0.443, 0.752],
] as const;

/** Sauvegarde, puis attend que le serveur ait gardé `expected` : la liste `key` du plan, chaque élément résumé par `describe`. */
async function expectSaved<T>(page: Page, request: APIRequestContext, key: string, describe: (item: T) => string, expected: string[]) {
  await page.getByRole('button', { name: 'Sauvegarder' }).click();
  await expect
    .poll(async () => {
      const config = await (await request.get(`${API}/api/config`)).json();
      const items: T[] = config.pages.find((p: { id: string }) => p.id === 'maison')?.floorplan?.[key] ?? [];
      return items.map(describe);
    })
    .toEqual(expected);
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

test('the thermal view colours a room with the temperature measured in it', async ({ page }) => {
  await openModel(page);
  await page.getByRole('button', { name: 'Températures des pièces' }).click();
  await expect(page.getByText('20.4°', { exact: true })).toBeVisible();
  // La pastille du capteur s'efface : sa valeur est au centre de la pièce.
  await expect(page.getByText('20.4 °C')).toHaveCount(0);
});

test('a tap on a room flies the camera to it, and Escape brings it back', async ({ page }) => {
  await openModel(page);
  // En vue thermique, la valeur de la pièce marque son centre — et laisse passer le toucher.
  await page.getByRole('button', { name: 'Températures des pièces' }).click();
  const label = page.getByText('20.4°', { exact: true });
  const centre = () =>
    label.evaluate(el => [(el as HTMLElement).style.left, (el as HTMLElement).style.top].map(v => Math.round(parseFloat(v))));
  const home = await centre();
  const box = (await label.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  const back = page.getByRole('button', { name: 'Chambre', exact: true });
  await expect(back).toBeVisible();
  // La caméra vise la pièce : son centre arrive au milieu de l'écran.
  await expect.poll(centre).toEqual([50, 50]);
  // Les pastilles des autres pièces s'estompent ; la card, posée sur l'écran, reste.
  await expect(page.locator('[data-floorplan-item="lamp-kitchen"]')).toHaveCSS('opacity', '0.2');
  await expect(page.locator('[data-floorplan-item="weather-3d"]')).toHaveCSS('opacity', '1');

  await page.keyboard.press('Escape');
  await expect(back).toBeHidden();
  await expect.poll(centre).toEqual(home);
  await expect(page.locator('[data-floorplan-item="lamp-kitchen"]')).toHaveCSS('opacity', '1');
});

test('a chip hidden by the model fades out once the camera stops', async ({ page }) => {
  await openModel(page);
  const lamp = page.locator('[data-floorplan-item="lamp-kitchen"]');
  await expect(lamp).toHaveCSS('opacity', '1');
  // Un demi-tour : son point d'accroche, au sol contre une cloison, passe derrière le muret.
  const { height } = (await page.locator('[data-floorplan-3d] canvas').boundingBox())!;
  await orbit(page, height / 2);
  await expect(lamp).toHaveCSS('opacity', '0');
  await page.getByRole('button', { name: 'Recentrer' }).click();
  await expect(lamp).toHaveCSS('opacity', '1');
});

test('the replay plays the last 24 hours back, the sun with them', async ({ page }) => {
  await openModel(page);
  await page.getByRole('button', { name: 'Rejouer les dernières 24 heures' }).click();
  const slider = page.getByRole('slider', { name: 'Heure rejouée' });
  await expect(slider).toBeVisible();
  // Rejouée, la maison montre le passé : pastilles et cards, qui montrent le présent, s'estompent.
  await expect(page.locator('[data-floorplan-item="weather-3d"]')).toHaveCSS('opacity', '0.2');

  // La lecture part d'il y a 24 heures : en pause, on choisit l'heure.
  await page.getByRole('button', { name: 'Pause' }).click();
  const { min } = await slider.evaluate(el => ({ min: Number((el as HTMLInputElement).min) }));
  /** L'instant de la période qui tombe à cette heure UTC. */
  const at = (utcHour: number) => {
    const day = 86_400_000;
    const time = Math.floor(min / day) * day + utcHour * 3_600_000;
    return String(time < min ? time + day : time);
  };
  // Clarté du haut du ciel, derrière la maquette.
  const sky = () =>
    page.locator('[data-floorplan-plan]').evaluate(el => {
      const [, r, g, b] = getComputedStyle(el)
        .backgroundImage.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)!
        .map(Number);
      return r + g + b;
    });
  // Le mock place la maison à Paris : à 1 h UTC, il fait nuit ; à midi, grand jour.
  await slider.fill(at(1));
  await expect.poll(sky).toBeLessThan(150);
  await slider.fill(at(12));
  await expect.poll(sky).toBeGreaterThan(300);

  // Échap revient au direct.
  await page.keyboard.press('Escape');
  await expect(slider).toBeHidden();
  await expect(page.locator('[data-floorplan-item="weather-3d"]')).toHaveCSS('opacity', '1');
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test('the compass turns the house with the phone, until it is turned by hand', async ({ page }) => {
    await openModel(page);
    // Le téléphone tourné vers `alpha`, comme Android le dit.
    const face = (alpha: number) =>
      page.evaluate(
        a =>
          window.dispatchEvent(new DeviceOrientationEvent('deviceorientationabsolute', { alpha: a, beta: 40, gamma: 0, absolute: true })),
        alpha
      );
    const compass = page.getByRole('button', { name: 'Boussole' });
    // Rien tant que l'appareil ne donne pas son orientation.
    await expect(compass).toBeHidden();
    await face(0);
    await compass.click();
    await expect(compass).toHaveAttribute('aria-pressed', 'true');

    // Plus haut à l'écran, c'est plus loin devant soi.
    const top = (id: string) => page.locator(`[data-floorplan-item="${id}"]`).evaluate(el => parseFloat((el as HTMLElement).style.top));
    // Face au sud (alpha tourne à l'envers : 180°) : le séjour, au sud, passe devant la chambre.
    await face(180);
    await expect.poll(async () => (await top('lamp-living')) < (await top('lamp-bedroom'))).toBe(true);
    // Face à l'est (alpha 270°) : le séjour, à l'est, passe devant la cuisine.
    await face(270);
    await expect.poll(async () => (await top('lamp-living')) < (await top('lamp-kitchen'))).toBe(true);

    // Tourner la maison au doigt coupe la boussole.
    await orbit(page, 60);
    await expect(compass).toHaveAttribute('aria-pressed', 'false');
  });

  test('a card on the model keeps a readable width, inside the plan', async ({ page }) => {
    await openModel(page);
    const card = (await page.locator('[data-floorplan-item="weather-3d"]').boundingBox())!;
    const plan = (await page.locator('[data-floorplan-plan]').boundingBox())!;
    // Ses 20 % d'un plan en image, qui ne descend pas sous 768 px — pas 20 % de l'écran.
    expect(card.width).toBeGreaterThan(150);
    // Posée au bord droit : elle rentre dans le plan plutôt que d'en déborder.
    expect(card.x + card.width).toBeLessThanOrEqual(plan.x + plan.width + 1);
  });
});

test('in edit mode, a click on the model places a chip anchored where it landed', async ({ page }, testInfo) => {
  const click = await drawWith(page, 'Pastille', /Cliquez sur la maquette/);
  // Le sol de la salle à manger, à l'écart des pastilles.
  await click(0.4, 0.58);
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

test('the Elements tab lists the lamps, and places one that only offers lights', async ({ page }) => {
  await openModel(page);
  await page.getByRole('button', { name: 'Modifier le dashboard' }).click();
  await page.getByRole('tab', { name: 'Éléments' }).click();
  const remove = page.getByRole('tabpanel').getByRole('button', { name: 'Retirer la lampe' });
  // Les trois pastilles d'une lumière : ni le capteur de mouvement, ni le thermomètre.
  await expect(remove).toHaveCount(3);

  await page.getByRole('button', { name: 'Poser une lampe' }).click();
  await expect(page.getByText(/là où est la lampe/)).toBeVisible();
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
  const box = (await page.locator('[data-floorplan-3d] canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.58);
  // Rien que des lumières : le volet du salon n'est pas proposé.
  await page.getByPlaceholder('Rechercher...').fill('salon');
  await expect(page.getByRole('button', { name: 'light.salon', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'cover.volet_salon', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'light.salon', exact: true }).click();

  await expect(page.locator('[data-floorplan-item]')).toHaveCount(WIDGETS.length + 1);
  await expect(remove).toHaveCount(4);
  // Posée, l'outil repose des pastilles de tout genre.
  await expect(page.getByText(/pour y poser une pastille/)).toBeVisible();
});

test('in edit mode, two clicks draw a door, which is kept once saved', async ({ page, request }) => {
  const click = await drawWith(page, 'Porte · volet', /côté gonds/);
  // Un pan du mur du fond, entre deux fenêtres : le coin bas, puis le coin haut opposé.
  await click(0.511, 0.21);
  await expect(page.getByText(/coin haut opposé de l'ouverture/)).toBeVisible();
  await click(0.529, 0.134);

  const dialog = page.getByRole('dialog', { name: 'Élément animé' });
  await page.getByPlaceholder('Rechercher...').fill('porte_entree');
  await page.getByRole('button', { name: 'binary_sensor.porte_entree', exact: true }).click();
  // Deviné d'après l'entité : un capteur de porte, une porte.
  await expect(dialog.getByRole('button', { name: 'Porte', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: 'Ajouter' }).click();
  await expect(dialog).toHaveCount(0);

  await page.getByRole('tab', { name: 'Ouvertures' }).click();
  await expect(page.getByText("Porte d'entrée")).toBeVisible();

  await expectSaved(page, request, 'parts', (p: { kind: string; entityId: string }) => `${p.kind} ${p.entityId}`, [
    'door binary_sensor.porte_entree',
  ]);
});

test('in edit mode, clicks on the floor draw a named room, which is kept once saved', async ({ page, request }) => {
  const click = await drawWith(page, 'Pièce', /Cliquez les coins de la pièce/);
  for (const [x, y] of DINING_FLOOR) await click(x, y);
  await expect(page.getByText(/Recliquez le premier coin/)).toBeVisible();
  await page.keyboard.press('Enter');
  await page.getByRole('textbox', { name: 'Nom de la pièce' }).fill('Salle à manger');
  await page.keyboard.press('Enter');
  // Son nom, posé au centre de la pièce.
  await expect(page.getByText('Salle à manger')).toBeVisible();

  await expectSaved(page, request, 'rooms', (r: { name: string; points: unknown[] }) => `${r.name} ${r.points.length}`, [
    'Chambre 4',
    'Salle à manger 3',
  ]);
});

test('in edit mode, clicks along a route lay an energy cable, which shows its power once saved', async ({ page, request }) => {
  const click = await drawWith(page, 'Câble', /Cliquez le long du trajet/);
  // Trois points au sol, puis Entrée.
  for (const [x, y] of DINING_FLOOR) await click(x, y);
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: "Câble d'énergie" });
  await page.getByPlaceholder('Rechercher...').fill('panneaux');
  await page.getByRole('button', { name: 'sensor.din_panneaux_solaire_puissance', exact: true }).click();
  // Deviné d'après l'entité : un câble solaire.
  await expect(dialog.getByRole('button', { name: 'Solaire' })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: 'Ajouter' }).click();
  // La puissance du câble, à mi-longueur.
  await expect(page.locator('[data-floorplan-cable]')).toHaveText('420 W');

  await expectSaved(
    page,
    request,
    'cables',
    (c: { kind: string; entityId: string; points: unknown[] }) => `${c.kind} ${c.entityId} ${c.points.length}`,
    ['solar sensor.din_panneaux_solaire_puissance 3']
  );
});

test('in edit mode, a .glb file is uploaded as the model, and its bin deletes it', async ({ page, request }) => {
  await page.goto('/#vierge');
  await page.getByRole('button', { name: 'Modifier le dashboard' }).click();

  const picker = page.getByRole('group', { name: 'Maquette 3D' });
  await picker.getByRole('button', { name: 'Fichier' }).click();
  const uploaded = page.waitForResponse(r => r.url().includes('/api/uploads/model'));
  await picker.locator('input[type=file]').setInputFiles(MODEL);
  const { url } = await (await uploaded).json();

  // La maquette téléversée s'affiche à la place de l'état vide.
  await expect(page.getByText('Pas encore de plan')).toHaveCount(0);
  await expect(page.locator('[data-floorplan-3d] canvas')).toBeVisible();
  await expect(page.getByText('Chargement de la maquette…')).toHaveCount(0, { timeout: 60_000 });

  await page.getByRole('tab', { name: 'Maquette' }).click();
  await page.getByRole('button', { name: 'Supprimer la maquette' }).click();
  await expect(page.getByText('Pas encore de plan')).toBeVisible();
  expect((await request.get(`${API}${url}`)).status()).toBe(404);
});

// ── Les vraies portes d'une maquette ExportToHASS ────────────────────────────

/** Les ouvertures montées dans la maquette, et où elles en sont (`id=0.5`). */
const openings = (page: Page) => page.locator('[data-floorplan-3d]');

/** Ouvre la page aux vraies portes, et attend qu'elles soient montées. */
async function openOpenings(page: Page) {
  await page.goto('/#ouvertures');
  await expect(openings(page)).toHaveAttribute('data-floorplan-openings', /Porte_Chambre_1=/, { timeout: 60_000 });
}

/** Les liaisons des ouvertures de la page, telles que le serveur les a gardées. */
async function savedLinks(request: APIRequestContext) {
  const config = await (await request.get(`${API}/api/config`)).json();
  const links: { node: string; entityId: string }[] =
    config.pages.find((p: { id: string }) => p.id === 'ouvertures')?.floorplan?.openings?.links ?? [];
  return links.map(l => `${l.node} ${l.entityId}`);
}

test('a real door of the model turns with the entity linked to it', async ({ page }) => {
  await openOpenings(page);
  // Liée à une entité ouverte : la porte, modélisée entrouverte, s'est ouverte.
  await expect(openings(page)).toHaveAttribute('data-floorplan-openings', 'Porte_Chambre_1=1');
});

test('the furniture of the model fades above the cut of the walls, rather than being cut', async ({ page }) => {
  // three.js ne dit que dans la console qu'un shader ne compile pas.
  const shaderErrors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error' && message.text().includes('THREE.WebGLProgram')) shaderErrors.push(message.text());
  });
  await openOpenings(page);
  // L'armoire, le canapé, la table : ni le volet, posé devant le mur, ni les portes et fenêtres.
  const ghosts = (await openings(page).getAttribute('data-floorplan-ghosts'))?.split(' ').sort();
  expect(ghosts).toEqual(['1_1', '2_1', 'Armoire_Chambre_1', 'Armoire_Chambre_2', 'Canape_1', 'Canape_2']);
  // La porte a fini de s'ouvrir : la maison a été dessinée, fondu et fantômes compris.
  await expect(openings(page)).toHaveAttribute('data-floorplan-openings', 'Porte_Chambre_1=1');
  expect(shaderErrors).toEqual([]);
});

test('in edit mode, the Openings tab lists the doors of the model, and links one', async ({ page, request }) => {
  await openOpenings(page);
  await page.getByRole('button', { name: 'Modifier le dashboard' }).click();
  await page.getByRole('tab', { name: 'Ouvertures' }).click();
  for (const name of ['Porte_Cuisine', 'Fenetre_Salon', 'Baie_Salon']) {
    await expect(page.getByRole('button', { name: new RegExp(`^${name}.*Lier une entité`) })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: /^Porte_Chambre.*Porte du cellier/ })).toBeVisible();
  // La fenêtre sans nom valide, dans le mur du sud.
  await expect(page.getByText(/1 objet sans nom valide/)).toBeVisible();

  await page.getByRole('button', { name: /^Porte_Cuisine/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Porte_Cuisine' });
  await page.getByPlaceholder('Rechercher...').fill('porte_entree');
  await page.getByRole('button', { name: 'binary_sensor.porte_entree', exact: true }).click();
  // Deviné d'après son nom : une porte.
  await expect(dialog.getByRole('button', { name: 'Porte', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: 'Lier' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Porte_Cuisine.*Porte d'entrée/ })).toBeVisible();
  // Liée à une entité fermée : elle l'est.
  await expect(openings(page)).toHaveAttribute('data-floorplan-openings', /Porte_Cuisine_1=0/);

  await page.getByRole('button', { name: 'Sauvegarder' }).click();
  await expect
    .poll(() => savedLinks(request))
    .toEqual(['Porte_Chambre_1 binary_sensor.porte_cellier', 'Porte_Cuisine_1 binary_sensor.porte_entree']);
});

test('in edit mode, the Openings tab proposes the entity named like an opening, linked in one click', async ({ page, request }) => {
  await openOpenings(page);
  await page.getByRole('button', { name: 'Modifier le dashboard' }).click();
  await page.getByRole('tab', { name: 'Ouvertures' }).click();
  // `cover.volet_chambre`, pas `cover.volet_chambre_invites` : celui qui a le moins de mots en plus.
  await expect(page.getByRole('button', { name: /^Volet_Chambre.*Proposée : Chambre$/ })).toBeVisible();
  await page.getByRole('button', { name: "Lier l'entité proposée" }).click();
  await expect(page.getByRole('button', { name: /^Volet_Chambre.*Proposée/ })).toHaveCount(0);

  await page.getByRole('button', { name: 'Sauvegarder' }).click();
  await expect.poll(() => savedLinks(request)).toContain('Volet_Chambre_1 cover.volet_chambre');
});

test('the security view circles in red what is left open, and says so', async ({ page }) => {
  await openOpenings(page);
  const security = page.getByRole('button', { name: 'Portes et fenêtres' });
  await security.click();
  // La porte de la chambre, liée au cellier, ouvert ; un volet ouvert ne compte pas.
  await expect(page.getByRole('status')).toHaveText('1 ouverte : Porte du cellier');
  await expect(openings(page)).toHaveAttribute('data-floorplan-alerts', '1');

  await security.click();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(openings(page)).toHaveAttribute('data-floorplan-alerts', '0');
});

test('in edit mode, a click on a real window of the model opens its link window', async ({ page }) => {
  await openOpenings(page);
  await page.getByRole('button', { name: 'Modifier le dashboard' }).click();
  await page.getByRole('button', { name: 'Porte · volet', exact: true }).click();
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
  const box = (await page.locator('[data-floorplan-3d] canvas').boundingBox())!;
  // La fenêtre à deux vantaux, dans le mur du fond : survolée, elle se nomme.
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.245);
  await expect(page.getByText('Cliquez pour lier « Fenetre_Salon ».')).toBeVisible();
  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.245);
  const dialog = page.getByRole('dialog', { name: 'Fenetre_Salon' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Fenêtre', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
