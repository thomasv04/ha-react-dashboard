/**
 * Dashboard E2E tests — tests the full dashboard in mock-HA mode.
 *
 * Runs against Vite dev server (port 5174) with VITE_MOCK_HA=true
 * and Express API server (port 8098) with isolated test DB.
 * → Zero interaction with a real Home Assistant instance.
 *
 * Run with: npm run test:e2e:dashboard
 */
import { test, expect, type Page } from '@playwright/test';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Wait for the dashboard grid to be loaded (at least one widget visible). */
async function waitForDashboard(page: Page) {
  // The grid renders widgets inside [data-widget-id] elements
  await page.waitForSelector('[data-widget-id]', { timeout: 15_000 });
}

/** Le crayon du haut : la carte des panneaux. */
async function openLayoutMap(page: Page) {
  await page.getByRole('button', { name: 'Modifier le dashboard' }).click();
  await expect(page.locator('.dashboard-editing')).toBeVisible();
}

/** Le crayon d'un panneau : ses tuiles en édition. */
async function openPanelEditor(page: Page) {
  await page.getByRole('button', { name: 'Modifier ce panneau' }).first().click();
  await expect(page.getByRole('button', { name: 'Ajouter une tuile' }).first()).toBeVisible();
}

/** Abandonne l'édition : sans modification, un seul appui suffit. */
async function discardEdit(page: Page) {
  await page.getByRole('button', { name: 'Abandonner les modifications' }).click();
  await expect(page.locator('.dashboard-editing')).toHaveCount(0);
}

// La visite guidée se lance seule au premier chargement et recouvre l'interface
// d'un calque plein écran : les tests fonctionnels la neutralisent. Elle a son
// propre spec (`tour.spec.ts`).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ha-dashboard-tour-done', 'true'));
});

// ── Smoke ─────────────────────────────────────────────────────────────────────

test.describe('Dashboard smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);
  });

  test('renders the dashboard with widgets', async ({ page }) => {
    const widgets = page.locator('[data-widget-id]');
    await expect(widgets.first()).toBeVisible();
    // Default layout should have multiple widgets
    expect(await widgets.count()).toBeGreaterThanOrEqual(5);
  });

  test('shows the clock / greeting area', async ({ page }) => {
    // The GreetingCard widget should be present and show a time display
    const greetingWidget = page.locator('[data-widget-id="greeting"]');
    await expect(greetingWidget).toBeVisible();
    // Clock shows HH:MM format
    await expect(greetingWidget.getByText(/\d{1,2}\D\d{2}/)).toBeVisible();
  });

  test('shows the rail with the home page, and no pinned panel', async ({ page }) => {
    // Le rail existe toujours ; sans panneau épinglé, il ne porte que les pages.
    await expect(page.getByRole('navigation', { name: 'Pages' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accueil' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Panneau E2E' })).toHaveCount(0);
  });
});

// ── Edit mode ─────────────────────────────────────────────────────────────────

test.describe('Edit mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);
  });

  test('the top pencil opens the map of panels', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Modifier le dashboard' })).toBeVisible();
    await openLayoutMap(page);

    // La carte : on y range des panneaux, pas des tuiles.
    await expect(page.getByRole('button', { name: 'Enregistrer et terminer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajouter un panneau' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abandonner les modifications' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Déplacer le panneau' }).first()).toBeVisible();
    await expect(page.getByTitle('Déplacer la tuile')).toHaveCount(0);

    await discardEdit(page);
  });

  test('a panel pencil edits its tiles only, and Layout goes back to the map', async ({ page }) => {
    await openLayoutMap(page);
    await openPanelEditor(page);

    // Les tuiles du panneau portent leurs boutons ; on peut revenir à la carte.
    expect(await page.getByRole('button', { name: 'Configurer le widget' }).count()).toBeGreaterThanOrEqual(3);
    expect(await page.getByRole('button', { name: 'Retirer du dashboard' }).count()).toBeGreaterThanOrEqual(3);

    await page.getByRole('button', { name: 'Disposition' }).click();
    await expect(page.getByTitle('Déplacer la tuile')).toHaveCount(0);

    await discardEdit(page);
  });

  test('tiles have move and resize handles in panel edit mode', async ({ page }) => {
    await openLayoutMap(page);
    await openPanelEditor(page);

    // Le calque de chaque tuile se saisit pour la déplacer ; son coin la redimensionne.
    expect(await page.getByTitle('Déplacer la tuile').count()).toBeGreaterThanOrEqual(3);
    expect(await page.getByRole('button', { name: 'Redimensionner' }).count()).toBeGreaterThanOrEqual(3);

    await discardEdit(page);
  });
});

// ── Add widget flow ───────────────────────────────────────────────────────────

test.describe('Add widget gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);
    await openLayoutMap(page);
    await openPanelEditor(page);
  });

  test('opens and closes the gallery', async ({ page }) => {
    await page.getByRole('button', { name: 'Ajouter une tuile' }).first().click();

    const gallery = page.getByRole('dialog', { name: 'Ajouter un widget' });
    await expect(gallery).toBeVisible();
    await expect(gallery.getByPlaceholder('Rechercher un widget...')).toBeVisible();

    // Un appui sur le voile referme la galerie.
    await page.locator('.fixed.inset-0.bg-black\\/60').click({ position: { x: 10, y: 10 } });
    await expect(gallery).toHaveCount(0);
  });

  test('can search for a widget in the gallery', async ({ page }) => {
    await page.getByRole('button', { name: 'Ajouter une tuile' }).first().click();
    const gallery = page.getByRole('dialog', { name: 'Ajouter un widget' });

    await gallery.getByPlaceholder('Rechercher un widget...').fill('météo');

    // Les cartes sont filtrées : « Météo » reste, un autre widget disparaît.
    await expect(gallery.getByRole('button', { name: /^Météo/ }).first()).toBeVisible();
    await expect(gallery.getByRole('button', { name: /^Serrure/ })).toHaveCount(0);
  });

  test('can add a widget from the gallery', async ({ page }) => {
    const initialWidgetCount = await page.locator('[data-widget-id]').count();

    await page.getByRole('button', { name: 'Ajouter une tuile' }).first().click();
    const gallery = page.getByRole('dialog', { name: 'Ajouter un widget' });

    // La carte « Capteur » : son nom est suivi de sa description. Le « s » exclut
    // la catégorie « Capteurs », dans la colonne de gauche.
    await gallery
      .getByRole('button', { name: /^Capteur\s/ })
      .first()
      .click();

    // Les widgets liés à un domaine HA (ici `sensor`) insèrent une étape de
    // choix d'entité : tant qu'aucune entité n'est retenue, l'ajout est impossible.
    await gallery.getByRole('button', { name: /Choisir une entité/i }).click();
    await gallery
      .getByRole('button', { name: /sensor.bedroom_temperature/ })
      .first()
      .click();
    await gallery.getByRole('button', { name: /Ajouter au dashboard/i }).click();

    // La galerie se referme et la tuile est posée.
    await expect(gallery).toHaveCount(0);
    expect(await page.locator('[data-widget-id]').count()).toBeGreaterThan(initialWidgetCount);

    // L'ajout enchaîne sur les réglages du nouveau widget : on les ferme.
    const sheet = page.getByRole('dialog', { name: 'Capteur' });
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect(sheet).toHaveCount(0);

    // Rien n'est enregistré : la config a changé, l'abandon demande confirmation.
    await page.getByRole('button', { name: 'Abandonner les modifications' }).click();
    await expect(page.getByText('Abandonner ?')).toBeVisible();
  });
});

// ── Remove widget ─────────────────────────────────────────────────────────────

test.describe('Remove widget', () => {
  test('can remove a widget in panel edit mode', async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);
    await openLayoutMap(page);
    await openPanelEditor(page);

    const initialCount = await page.locator('[data-widget-id]').count();

    await page.getByRole('button', { name: 'Retirer du dashboard' }).first().click();

    // Confirmation sur la tuile elle-même
    const confirmBtn = page.getByRole('button', { name: 'Supprimer', exact: true }).first();
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    await expect(page.locator('[data-widget-id]')).toHaveCount(initialCount - 1);

    // Abandon : la config a changé, l'abandon demande confirmation.
    await page.getByRole('button', { name: 'Abandonner les modifications' }).click();
    await expect(page.getByText('Abandonner ?')).toBeVisible();
  });
});

// ── Dock ──────────────────────────────────────────────────────────────────────

test.describe('Dock', () => {
  test('shows a custom panel put in the dock, and opens it', async ({ page }) => {
    // Le dock ne connaît plus que les panneaux créés par l'utilisateur, et son
    // contenu vit dans localStorage. On amorce les deux.
    await page.addInitScript(() => {
      localStorage.setItem('ha-dashboard-dock-panels', JSON.stringify(['e2e-panel']));
    });
    await page.route('**/api/config', async (route, request) => {
      if (request.method() !== 'GET') return route.continue();
      const res = await route.fetch();
      const body = await res.json();
      body.customPanels = [
        { id: 'e2e-panel', name: 'Panneau E2E', icon: 'Layers', blocks: [{ id: 'b1', type: 'section-header', title: 'Bloc de test' }] },
      ];
      await route.fulfill({ response: res, json: body });
    });

    await page.goto('/');
    await waitForDashboard(page);

    const dockBtn = page.getByRole('navigation', { name: 'Pages' }).getByRole('button', { name: 'Panneau E2E' });
    await expect(dockBtn).toBeVisible();

    await dockBtn.click();
    await expect(page.getByText('Bloc de test')).toBeVisible({ timeout: 5000 });
  });
});

// ── Settings ──────────────────────────────────────────────────────────────────

test.describe('Settings', () => {
  test('opens the settings from the launcher, full screen', async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);

    // Le lanceur est la seule porte des réglages.
    await page.getByRole('button', { name: 'Ouvrir les apps' }).click();
    await page.getByRole('button', { name: 'Paramètres' }).click();

    const settings = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Apparence' }) });
    await expect(settings).toBeVisible({ timeout: 5000 });
    // Les sections sont dans la liste de gauche, l'écran de veille parmi elles.
    await expect(settings.getByRole('button', { name: 'Écran de veille' })).toBeVisible();
    await expect(settings.getByRole('radio', { name: 'Sombre' })).toBeVisible();
  });
});
