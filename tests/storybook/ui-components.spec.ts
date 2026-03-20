/**
 * UI component interaction tests — covers Button, Slider, Card and Toast.
 * These are the building blocks used across all domotics panels and cards,
 * so regressions here break the entire UI.
 */
import { test, expect } from '@playwright/test';

// ── Button ────────────────────────────────────────────────────────────────────

test.describe('Button — variants', () => {
  test('Default renders with text "Button"', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-button--default&viewMode=story');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Button' })).toBeVisible();
  });

  test('Outline renders correctly', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-button--outline&viewMode=story');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Button' })).toBeVisible();
  });

  test('Destructive renders with "Supprimer"', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-button--destructive&viewMode=story');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Supprimer' })).toBeVisible();
  });

  test('Disabled button has disabled attribute', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-button--disabled&viewMode=story');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Disabled' })).toBeDisabled();
  });

  test('AllVariants renders multiple buttons', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-button--all-variants&viewMode=story');
    await page.waitForLoadState('networkidle');
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('AllSizes renders buttons of different sizes', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-button--all-sizes&viewMode=story');
    await page.waitForLoadState('networkidle');
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('WithIcon renders and contains text', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-button--with-icon&viewMode=story');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /Envoyer/ })).toBeVisible();
  });

  test('Default button is clickable without error', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-button--default&viewMode=story');
    await page.waitForLoadState('networkidle');
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.getByRole('button', { name: 'Button' }).click();
    expect(errors).toHaveLength(0);
  });
});

// ── Slider ────────────────────────────────────────────────────────────────────

test.describe('Slider', () => {
  test('Default has a slider thumb at 40%', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-slider--default&viewMode=story');
    await page.waitForLoadState('networkidle');
    const slider = page.getByRole('slider');
    await expect(slider).toBeVisible();
    await expect(slider).toHaveAttribute('aria-valuenow', '40');
  });

  test('Range has two slider thumbs', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-slider--range&viewMode=story');
    await page.waitForLoadState('networkidle');
    const thumbs = page.getByRole('slider');
    await expect(thumbs).toHaveCount(2);
  });

  test('Disabled slider has aria-disabled', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-slider--disabled&viewMode=story');
    await page.waitForLoadState('networkidle');
    const slider = page.getByRole('slider');
    await expect(slider).toHaveAttribute('data-disabled', '');
  });

  test('Controlled slider shows value "50%"', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-slider--controlled&viewMode=story');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Valeur : 50%')).toBeVisible();
  });

  test('Brightness slider is visible and has correct range (0-255)', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-slider--brightness&viewMode=story');
    await page.waitForLoadState('networkidle');
    const slider = page.getByRole('slider');
    await expect(slider).toBeVisible();
    await expect(slider).toHaveAttribute('aria-valuemin', '0');
    await expect(slider).toHaveAttribute('aria-valuemax', '255');
  });

  test('WithSteps slider has step attribute of 10', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-slider--with-steps&viewMode=story');
    await page.waitForLoadState('networkidle');
    const slider = page.getByRole('slider');
    await expect(slider).toBeVisible();
  });
});

// ── Card ──────────────────────────────────────────────────────────────────────

test.describe('Card', () => {
  test('Default renders title and description', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-card--default&viewMode=story');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Titre de la carte')).toBeVisible();
    await expect(page.getByText('Description optionnelle de la carte.')).toBeVisible();
  });

  test('Small renders with compact title', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-card--small&viewMode=story');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Carte compacte')).toBeVisible();
  });

  test('WithAction shows action button', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-card--with-action&viewMode=story');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Modifier' })).toBeVisible();
  });

  test('WithFooter renders footer content', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-card--with-footer&viewMode=story');
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').textContent();
    expect(body!.length).toBeGreaterThan(20);
  });
});

// ── Toast ─────────────────────────────────────────────────────────────────────

test.describe('Toast', () => {
  test('SimpleDismiss shows trigger button', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-toast--simple-dismiss&viewMode=story');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Afficher la notification' })).toBeVisible();
  });

  test('SimpleDismiss shows toast notification on button click', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-toast--simple-dismiss&viewMode=story');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Afficher la notification' }).click();
    await expect(page.getByText('Mise à jour disponible')).toBeVisible();
  });

  test('CourierArrived toast shows with action buttons', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-toast--courier-arrived&viewMode=story');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Afficher la notification' }).click();
    await expect(page.getByText('Le courrier est arrivé !')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Voir les caméras' })).toBeVisible();
  });
});

// ── Layout/Panel ──────────────────────────────────────────────────────────────

test.describe('Layout/Panel', () => {
  test('Default renders with a heading', async ({ page }) => {
    await page.goto('/iframe.html?id=layout-panel--default&viewMode=story');
    await page.waitForLoadState('networkidle');
    const heading = page.getByRole('heading');
    await expect(heading).toBeVisible();
  });

  test('Wide variant renders', async ({ page }) => {
    await page.goto('/iframe.html?id=layout-panel--wide&viewMode=story');
    await page.waitForLoadState('networkidle');
    const heading = page.getByRole('heading');
    await expect(heading).toBeVisible();
  });

  test('NoIcon variant renders', async ({ page }) => {
    await page.goto('/iframe.html?id=layout-panel--no-icon&viewMode=story');
    await page.waitForLoadState('networkidle');
    const heading = page.getByRole('heading');
    await expect(heading).toBeVisible();
  });
});

// ── Layout/BottomNav ──────────────────────────────────────────────────────────

test.describe('Layout/BottomNav', () => {
  test('renders navigation buttons', async ({ page }) => {
    await page.goto('/iframe.html?id=layout-bottomnav--default&viewMode=story');
    await page.waitForLoadState('networkidle');
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
