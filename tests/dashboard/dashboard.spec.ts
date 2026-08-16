/**
 * Dashboard E2E tests — tests the full dashboard in mock-HA mode.
 *
 * Runs against Vite dev server (port 5174) with VITE_MOCK_HA=true
 * and Express API server (port 8098) with isolated test DB.
 * → Zero interaction with a real Home Assistant instance.
 *
 * Run with: npm run test:e2e:dashboard
 */
import { test, expect } from '@playwright/test';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Wait for the dashboard grid to be loaded (at least one widget visible). */
async function waitForDashboard(page: import('@playwright/test').Page) {
  // The grid renders widgets inside [data-widget-id] elements
  await page.waitForSelector('[data-widget-id]', { timeout: 15_000 });
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
    await expect(greetingWidget.getByText(/\d{2}[:\u202f]\d{2}/)).toBeVisible();
  });

  test('hides the dock until a panel is added to it', async ({ page }) => {
    // Plus de panneaux intégrés : un dashboard neuf n'a pas de dock du tout.
    await expect(page.locator('nav')).toHaveCount(0);
  });
});

// ── Edit mode ─────────────────────────────────────────────────────────────────

test.describe('Edit mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);
  });

  test('can enter and exit edit mode', async ({ page }) => {
    // The edit button has title="Modifier le dashboard"
    const editBtn = page.getByRole('button', { name: 'Modifier le dashboard' });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // In edit mode, the grid container gets .dashboard-editing
    await expect(page.locator('.dashboard-editing')).toBeVisible();

    // Action buttons appear.
    //
    // `exact` partout : la 2.2.0 a ajouté « Annuler (Ctrl+Z) » à côté de
    // « Annuler », et « Ajouter une pastille » à côté d'« Ajouter ». Sans lui,
    // le mode strict de Playwright refuse deux correspondances.
    await expect(page.getByRole('button', { name: 'Ajouter', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sauvegarder' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Annuler', exact: true })).toBeVisible();

    // Exit edit mode
    const exitBtn = page.getByRole('button', { name: 'Quitter le mode édition' });
    await exitBtn.click();

    // Edit mode is off
    await expect(page.locator('.dashboard-editing')).not.toBeVisible();
  });

  test('shows widget labels and overlays in edit mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Modifier le dashboard' }).click();
    await expect(page.locator('.dashboard-editing')).toBeVisible();

    // Each widget shows "Configurer le widget" and "Retirer du dashboard" buttons
    const configBtns = page.getByRole('button', { name: 'Configurer le widget' });
    expect(await configBtns.count()).toBeGreaterThanOrEqual(3);

    const removeBtns = page.getByRole('button', { name: 'Retirer du dashboard' });
    expect(await removeBtns.count()).toBeGreaterThanOrEqual(3);

    // Cleanup
    await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  });

  test('widgets have drag handles in edit mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Modifier le dashboard' }).click();
    await expect(page.locator('.dashboard-editing')).toBeVisible();

    // Drag handles are marked with [data-drag-handle]
    const handles = page.locator('[data-drag-handle]');
    expect(await handles.count()).toBeGreaterThanOrEqual(3);

    await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  });
});

// ── Add widget flow ───────────────────────────────────────────────────────────

test.describe('Add widget modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);
    await page.getByRole('button', { name: 'Modifier le dashboard' }).click();
    await expect(page.locator('.dashboard-editing')).toBeVisible();
  });

  test('opens and closes the add widget modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();

    // Modal title
    await expect(page.getByText('Ajouter un widget')).toBeVisible();

    // Search input
    const searchInput = page.getByPlaceholder('Rechercher un widget...');
    await expect(searchInput).toBeVisible();

    // Click the backdrop to close
    await page.locator('.fixed.inset-0.bg-black\\/60').click({ position: { x: 10, y: 10 } });
    await expect(page.getByText('Ajouter un widget')).not.toBeVisible();
  });

  test('can search for a widget in the add modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(page.getByText('Ajouter un widget')).toBeVisible();

    const searchInput = page.getByPlaceholder('Rechercher un widget...');
    await searchInput.fill('météo');

    // Should filter the widget list — "Météo" should appear
    await expect(page.getByText('Météo').first()).toBeVisible();

    await page.keyboard.press('Escape');
  });

  test('can add a widget from the modal', async ({ page }) => {
    const initialWidgetCount = await page.locator('[data-widget-id]').count();

    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Ajouter un widget' })).toBeVisible();

    // Click "Capteur" in the widget list button
    await page.getByRole('button', { name: 'Capteur', exact: true }).click();

    // Les widgets liés à un domaine HA (ici `sensor`) insèrent une étape de
    // choix d'entité : tant qu'aucune entité n'est retenue, le bouton d'ajout
    // reste désactivé.
    await page.getByRole('button', { name: /Choisir une entité/i }).click();
    await page
      .getByRole('button', { name: /sensor.bedroom_temperature/ })
      .first()
      .click();

    // Wait for the preview panel's "Ajouter au dashboard" button to appear
    const addToDashboardBtn = page.getByRole('button', { name: /Ajouter au dashboard/i });
    await expect(addToDashboardBtn).toBeVisible({ timeout: 5000 });
    await addToDashboardBtn.click();

    // Modal should close and widget count should increase
    const newWidgetCount = await page.locator('[data-widget-id]').count();
    expect(newWidgetCount).toBeGreaterThan(initialWidgetCount);

    // L'ajout enchaîne sur la modale d'édition du nouveau widget : la fermer
    // avant de pouvoir atteindre la barre du mode édition.
    // La modale d'édition n'écoute pas Échap : on utilise son propre bouton.
    // `getByText` : le bouton du mode édition porte le même nom, mais via son
    // attribut `title` — seul celui de la modale a « Annuler » comme contenu.
    await page.getByText('Annuler', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Capteur' })).toHaveCount(0);

    // Cancel to discard changes (don't persist to test DB).
    // `getByTitle` et non `getByRole` : deux boutons portent le nom « Annuler »
    // (celui du mode édition et celui de la modale). Et `exact` en plus, sans
    // quoi le titre du bouton d'annulation « Annuler (Ctrl+Z) » correspond
    // aussi — `getByTitle` cherche une sous-chaîne par défaut.
    await page.getByTitle('Annuler', { exact: true }).click();
  });
});

// ── Remove widget ─────────────────────────────────────────────────────────────

test.describe('Remove widget', () => {
  test('can remove a widget in edit mode', async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);
    await page.getByRole('button', { name: 'Modifier le dashboard' }).click();
    await expect(page.locator('.dashboard-editing')).toBeVisible();

    const initialCount = await page.locator('[data-widget-id]').count();

    // Click the first "Retirer du dashboard" button
    const removeBtn = page.getByRole('button', { name: 'Retirer du dashboard' }).first();
    await removeBtn.click();

    // Confirm deletion in the popover
    const confirmBtn = page.getByRole('button', { name: 'Supprimer' }).first();
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Wait for the widget to be removed from the DOM
    await page.waitForTimeout(500);
    const newCount = await page.locator('[data-widget-id]').count();
    expect(newCount).toBe(initialCount - 1);

    // Cancel to discard
    await page.getByRole('button', { name: 'Annuler', exact: true }).click();
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

    const dockBtn = page.locator('nav').getByRole('button', { name: 'Panneau E2E' });
    await expect(dockBtn).toBeVisible();

    await dockBtn.click();
    await expect(page.getByText('Bloc de test')).toBeVisible({ timeout: 5000 });
  });
});

// ── Theme / Settings modal ────────────────────────────────────────────────────

test.describe('Settings', () => {
  test('opens the theme/settings modal', async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);

    const settingsBtn = page.getByRole('button', { name: 'Paramètres' });
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // The theme modal should appear with appearance settings
    await expect(page.getByText(/apparence|thème|fond/i).first()).toBeVisible({ timeout: 5000 });
  });
});
