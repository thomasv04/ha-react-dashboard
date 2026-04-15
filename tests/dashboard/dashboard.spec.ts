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

  test('shows the bottom navigation', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    // Bottom nav has panel buttons (scoped to nav to avoid shortcut card matches)
    await expect(nav.getByRole('button', { name: /Lumières/ })).toBeVisible();
    await expect(nav.getByRole('button', { name: /Volets/ })).toBeVisible();
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

    // Action buttons appear
    await expect(page.getByRole('button', { name: 'Ajouter' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sauvegarder' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Annuler' })).toBeVisible();

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
    await page.getByRole('button', { name: 'Annuler' }).click();
  });

  test('widgets have drag handles in edit mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Modifier le dashboard' }).click();
    await expect(page.locator('.dashboard-editing')).toBeVisible();

    // Drag handles are marked with [data-drag-handle]
    const handles = page.locator('[data-drag-handle]');
    expect(await handles.count()).toBeGreaterThanOrEqual(3);

    await page.getByRole('button', { name: 'Annuler' }).click();
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
    await page.getByRole('button', { name: 'Ajouter' }).click();

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
    await page.getByRole('button', { name: 'Ajouter' }).click();
    await expect(page.getByText('Ajouter un widget')).toBeVisible();

    const searchInput = page.getByPlaceholder('Rechercher un widget...');
    await searchInput.fill('météo');

    // Should filter the widget list — "Météo" should appear
    await expect(page.getByText('Météo').first()).toBeVisible();

    await page.keyboard.press('Escape');
  });

  test('can add a widget from the modal', async ({ page }) => {
    const initialWidgetCount = await page.locator('[data-widget-id]').count();

    await page.getByRole('button', { name: 'Ajouter' }).click();
    await expect(page.getByRole('heading', { name: 'Ajouter un widget' })).toBeVisible();

    // Click "Capteur" in the widget list button
    await page.getByRole('button', { name: 'Capteur', exact: true }).click();

    // Wait for the preview panel's "Ajouter au dashboard" button to appear
    const addToDashboardBtn = page.getByRole('button', { name: /Ajouter au dashboard/i });
    await expect(addToDashboardBtn).toBeVisible({ timeout: 5000 });
    await addToDashboardBtn.click();

    // Modal should close and widget count should increase
    const newWidgetCount = await page.locator('[data-widget-id]').count();
    expect(newWidgetCount).toBeGreaterThan(initialWidgetCount);

    // Cancel to discard changes (don't persist to test DB)
    await page.getByRole('button', { name: 'Annuler' }).click();
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
    await page.getByRole('button', { name: 'Annuler' }).click();
  });
});

// ── Bottom nav panels ─────────────────────────────────────────────────────────

test.describe('Bottom nav panels', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForDashboard(page);
  });

  test('opens lights panel from bottom nav', async ({ page }) => {
    // Scope to nav to avoid matching the shortcut card button
    await page
      .locator('nav')
      .getByRole('button', { name: /Lumières/ })
      .click();
    // Panel should slide in with light controls
    await expect(page.getByText(/bandeau|cuisine|salon|chambre/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('opens shutters panel from bottom nav', async ({ page }) => {
    await page
      .locator('nav')
      .getByRole('button', { name: /Volets/ })
      .click();
    await expect(page.getByText(/volet|cuisine|salon/i).first()).toBeVisible({ timeout: 5000 });
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
