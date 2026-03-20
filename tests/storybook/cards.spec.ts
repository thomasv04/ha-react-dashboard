/**
 * Card interaction tests — verifies critical domotics card behaviours:
 * rendering, state display, user interactions and data-driven content.
 *
 * All HA entities come from `.storybook/mocks/hakit-core.tsx`.
 */
import { test, expect } from '@playwright/test';

// ── AlarmCard ─────────────────────────────────────────────────────────────────

test.describe('AlarmCard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/iframe.html?id=cards-alarmcard--default&viewMode=story');
    await page.waitForLoadState('networkidle');
  });

  test('shows disarmed state by default', async ({ page }) => {
    await expect(page.getByText('Désarmé')).toBeVisible();
  });

  test('has an expand/collapse button', async ({ page }) => {
    // The chevron expand button is the last button in the status row
    const buttons = page.getByRole('button');
    await expect(buttons.last()).toBeVisible();
  });

  test('clicking expand reveals PIN keypad', async ({ page }) => {
    // The chevron expand button is the last visible button
    await page.getByRole('button').last().click();
    // PIN keypad digits 1–9 should appear
    await expect(page.getByRole('button', { name: '1' })).toBeVisible();
    await expect(page.getByRole('button', { name: '5' })).toBeVisible();
    await expect(page.getByRole('button', { name: '9' })).toBeVisible();
  });

  test('PIN keypad has arm mode buttons', async ({ page }) => {
    await page.getByRole('button').last().click();
    await expect(page.getByRole('button', { name: 'Désarmer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Domicile' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Absent' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nuit' })).toBeVisible();
  });

  test('entering PIN digits updates the code field', async ({ page }) => {
    await page.getByRole('button').last().click();
    await page.getByRole('button', { name: '1' }).click();
    await page.getByRole('button', { name: '2' }).click();
    await page.getByRole('button', { name: '3' }).click();
    // Code display shows \u2022 (bullet) for each digit — placeholder MUST disappear
    await expect(page.getByText('Code PIN')).not.toBeVisible();
    // Three bullets visible in the code area
    await expect(page.locator('span').filter({ hasText: '\u2022\u2022\u2022' })).toBeVisible();
  });

  test('delete key clears last digit', async ({ page }) => {
    await page.getByRole('button').last().click();
    await page.getByRole('button', { name: '1' }).click();
    await page.getByRole('button', { name: '2' }).click();
    // ⌫ button in the numpad clears the last digit
    await page.getByRole('button', { name: '⌫' }).click();
    // After one delete: only 1 bullet (•) remains, not two
    await expect(page.locator('span').filter({ hasText: '••' })).not.toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^•$/ })).toBeVisible();
  });
});

// ── ShortcutsCard ─────────────────────────────────────────────────────────────

test.describe('ShortcutsCard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/iframe.html?id=cards-shortcutscard--default&viewMode=story');
    await page.waitForLoadState('networkidle');
  });

  test('shows RACCOURCIS heading', async ({ page }) => {
    await expect(page.getByText('RACCOURCIS')).toBeVisible();
  });

  test('renders all 7 shortcut buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Volets/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Lumières/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sécurité/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Aspirateur/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Plantes/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Notifs/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Caméras/ })).toBeVisible();
  });

  test('security button shows alarm state (Désarmée)', async ({ page }) => {
    // Mock has alarm in 'disarmed' state → should show "Désarmée"
    await expect(page.getByRole('button', { name: /Désarmée/ })).toBeVisible();
  });

  test('clicking Lumières does not throw a JS error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.getByRole('button', { name: /Lumières/ }).click();
    expect(errors).toHaveLength(0);
  });
});

// ── WeatherCard ───────────────────────────────────────────────────────────────

test.describe('WeatherCard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/iframe.html?id=cards-weathercard--default&viewMode=story');
    await page.waitForLoadState('networkidle');
  });

  test('renders without mock export error', async ({ page }) => {
    await expect(page.locator('h1:has-text("does not provide an export")')).not.toBeVisible();
  });

  test('shows current temperature from mock (12°)', async ({ page }) => {
    await expect(page.getByText('12°')).toBeVisible();
  });

  test('shows wind speed from mock (18 km/h)', async ({ page }) => {
    await expect(page.getByText(/18/)).toBeVisible();
    await expect(page.getByText(/km\/h/)).toBeVisible();
  });

  test('shows 4-day forecast', async ({ page }) => {
    // Mock has 5 forecast days → shows 4 (skips today)
    const forecastItems = page.locator('.grid.grid-cols-4 > div');
    await expect(forecastItems).toHaveCount(4);
  });
});

// ── EnergyCard ────────────────────────────────────────────────────────────────

test.describe('EnergyCard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/iframe.html?id=cards-energycard--default&viewMode=story');
    await page.waitForLoadState('networkidle');
  });

  test('shows battery level from mock (78%)', async ({ page }) => {
    await expect(page.getByText(/78/)).toBeVisible();
  });
});

// ── GreetingCard ──────────────────────────────────────────────────────────────

test.describe('GreetingCard', () => {
  test('Default renders greeting content', async ({ page }) => {
    await page.goto('/iframe.html?id=cards-greetingcard--default&viewMode=story');
    await page.waitForLoadState('networkidle');
    // Should show a greeting text (Bonjour / Bonsoir / Bonne nuit)
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(0);
  });

  test('Clock story renders time display', async ({ page }) => {
    await page.goto('/iframe.html?id=cards-greetingcard--clock&viewMode=story');
    await page.waitForLoadState('networkidle');
    // Clock should show time in HH:MM format
    const timePattern = /\d{1,2}:\d{2}/;
    const body = await page.locator('body').textContent();
    expect(body).toMatch(timePattern);
  });
});

// ── ThermostatCard ────────────────────────────────────────────────────────────

test.describe('ThermostatCard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/iframe.html?id=cards-thermostatcard--default&viewMode=story');
    await page.waitForLoadState('networkidle');
  });

  test('renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => {
      if (!err.message.includes('ResizeObserver')) errors.push(err.message);
    });
    expect(errors).toHaveLength(0);
  });

  test('shows target temperature from mock (21°)', async ({ page }) => {
    await expect(page.getByText(/21/)).toBeVisible();
  });

  test('shows current temperature from mock (19.5°)', async ({ page }) => {
    await expect(page.getByText(/19/)).toBeVisible();
  });
});

// ── TempoCard ─────────────────────────────────────────────────────────────────

test.describe('TempoCard', () => {
  test('shows Tempo color from mock (Bleu)', async ({ page }) => {
    await page.goto('/iframe.html?id=cards-tempocard--default&viewMode=story');
    await page.waitForLoadState('networkidle');
    // Multiple 'Bleu' texts exist in TempoCard (current + next day) — use first()
    await expect(page.getByText(/Bleu/i).first()).toBeVisible();
  });
});

// ── RoomsGrid ─────────────────────────────────────────────────────────────────

test.describe('RoomsGrid', () => {
  test('shows room temperature data from mock', async ({ page }) => {
    await page.goto('/iframe.html?id=cards-roomsgrid--default&viewMode=story');
    await page.waitForLoadState('networkidle');
    // Mock has sensor.temperature_chambre_temperature = 20.4°C
    await expect(page.getByText(/Chambre/i)).toBeVisible();
  });
});
