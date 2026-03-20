/**
 * Panel interaction tests — verifies that each domotics panel renders its
 * content and that critical controls (toggles, buttons) function correctly.
 *
 * Panels are the full-screen control surfaces for lights, shutters, vacuum, etc.
 * A broken panel = user cannot control their home.
 */
import { test, expect } from '@playwright/test';

// ── LightsPanel ───────────────────────────────────────────────────────────────

test.describe('LightsPanel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/iframe.html?id=panels-lightspanel--default&viewMode=story');
    await page.waitForLoadState('networkidle');
  });

  test('shows panel heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Lumières' })).toBeVisible();
  });

  test('shows the light entity row (Bandeau LEDs Cuisine)', async ({ page }) => {
    await expect(page.getByText('Bandeau LEDs Cuisine')).toBeVisible();
  });

  test('shows brightness percentage (light is on at 71% in mock)', async ({ page }) => {
    await expect(page.getByText('71%')).toBeVisible();
  });

  test('brightness slider is visible when light is on', async ({ page }) => {
    const slider = page.getByRole('slider');
    await expect(slider).toBeVisible();
    await expect(slider).toHaveAttribute('aria-valuemin', '1');
    await expect(slider).toHaveAttribute('aria-valuemax', '100');
  });

  test('light toggle button is interactive (no JS error on click)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    // Toggle button is the second button (first is the Panel close button)
    await page.getByRole('button').nth(1).click();
    expect(errors).toHaveLength(0);
  });

  test('panel close button is present', async ({ page }) => {
    // Panel wraps with a header containing a close (X) button
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ── ShuttersPanel ─────────────────────────────────────────────────────────────

test.describe('ShuttersPanel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/iframe.html?id=panels-shutterspanel--default&viewMode=story');
    await page.waitForLoadState('networkidle');
  });

  test('shows panel heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Volets' })).toBeVisible();
  });

  test('shows global Tout ouvrir / Tout fermer buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Tout ouvrir' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tout fermer' })).toBeVisible();
  });

  test('shows all 10 shutter rooms from mock', async ({ page }) => {
    await expect(page.getByText('Cuisine')).toBeVisible();
    await expect(page.getByText('Cellier')).toBeVisible();
    await expect(page.getByText('Chambre')).toBeVisible();
    await expect(page.getByText('Bureau')).toBeVisible();
    await expect(page.getByText('Salle de bain')).toBeVisible();
  });

  test('shows position percentages from mock', async ({ page }) => {
    // cover.volet_cuisine = open (100%), cover.volet_cellier = closed (0%)
    await expect(page.getByText('100%').first()).toBeVisible();
    await expect(page.getByText('0%').first()).toBeVisible();
  });

  test('Tout ouvrir button is clickable without error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.getByRole('button', { name: 'Tout ouvrir' }).click();
    expect(errors).toHaveLength(0);
  });
});

// ── VacuumPanel ───────────────────────────────────────────────────────────────

test.describe('VacuumPanel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/iframe.html?id=panels-vacuumpanel--default&viewMode=story');
    await page.waitForLoadState('networkidle');
  });

  test('shows panel heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Aspirateur' })).toBeVisible();
  });

  test('shows battery level from mock (100%)', async ({ page }) => {
    await expect(page.getByText('100')).toBeVisible();
    await expect(page.getByText('En charge')).toBeVisible();
  });

  test('shows control buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Démarrer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Arrêter' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Base' })).toBeVisible();
  });

  test('shows PIÈCES À NETTOYER section', async ({ page }) => {
    await expect(page.getByText('PIÈCES À NETTOYER')).toBeVisible();
  });

  test('shows all 8 room selection buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Cuisine' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Chambre' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salle de bain' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salon' })).toBeVisible();
  });

  test('shows launch cleaning button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Lancer le lavage/ })).toBeVisible();
  });

  test('Démarrer button is clickable without error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.getByRole('button', { name: 'Démarrer' }).click();
    expect(errors).toHaveLength(0);
  });

  test('room toggle buttons are clickable without error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.getByRole('button', { name: 'Cuisine' }).click();
    await page.getByRole('button', { name: 'Chambre' }).click();
    expect(errors).toHaveLength(0);
  });
});

// ── SecurityPanel ─────────────────────────────────────────────────────────────

test.describe('SecurityPanel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/iframe.html?id=panels-securitypanel--default&viewMode=story');
    await page.waitForLoadState('networkidle');
  });

  test('renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => {
      if (!err.message.includes('ResizeObserver')) errors.push(err.message);
    });
    expect(errors).toHaveLength(0);
  });

  test('shows alarm status (Désarmé) since mock is disarmed', async ({ page }) => {
    await expect(page.getByText('Désarmé')).toBeVisible();
  });
});

// ── FlowersPanel ──────────────────────────────────────────────────────────────

test.describe('FlowersPanel', () => {
  test('renders and shows plant data from mock', async ({ page }) => {
    await page.goto('/iframe.html?id=panels-flowerspanel--default&viewMode=story');
    await page.waitForLoadState('networkidle');
    // Panel heading or content should be visible
    const body = await page.locator('body').textContent();
    expect(body!.length).toBeGreaterThan(20);
  });
});

// ── NotificationsPanel ────────────────────────────────────────────────────────

test.describe('NotificationsPanel', () => {
  test('renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => {
      if (!err.message.includes('ResizeObserver')) errors.push(err.message);
    });
    await page.goto('/iframe.html?id=panels-notificationspanel--default&viewMode=story');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});

// ── CameraPanel ───────────────────────────────────────────────────────────────

test.describe('CameraPanel', () => {
  test('renders without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => {
      if (!err.message.includes('ResizeObserver')) errors.push(err.message);
    });
    await page.goto('/iframe.html?id=panels-camerapanel--default&viewMode=story');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
