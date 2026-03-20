/**
 * Smoke tests — verifies that every Storybook story renders without
 * uncaught JavaScript errors and produces non-empty content.
 *
 * Run with: npx playwright test tests/storybook/smoke.spec.ts
 * Requires Storybook at http://localhost:6006
 */
import { test, expect } from '@playwright/test';

const STORIES: { id: string; label: string }[] = [
  // ── Cards ─────────────────────────────────────────────────────────────────
  { id: 'cards-activitybar--default', label: 'ActivityBar/Default' },
  { id: 'cards-activitybar--mobile', label: 'ActivityBar/Mobile' },
  { id: 'cards-activitybar--tablet', label: 'ActivityBar/Tablet' },
  { id: 'cards-activitybar--responsive', label: 'ActivityBar/Responsive' },
  { id: 'cards-alarmcard--default', label: 'AlarmCard/Default' },
  { id: 'cards-cameracard--default', label: 'CameraCard/Default' },
  { id: 'cards-energycard--default', label: 'EnergyCard/Default' },
  { id: 'cards-greetingcard--default', label: 'GreetingCard/Default' },
  { id: 'cards-greetingcard--clock', label: 'GreetingCard/Clock' },
  { id: 'cards-pelletcard--default', label: 'PelletCard/Default' },
  { id: 'cards-roomsgrid--default', label: 'RoomsGrid/Default' },
  { id: 'cards-shortcutscard--default', label: 'ShortcutsCard/Default' },
  { id: 'cards-tempocard--default', label: 'TempoCard/Default' },
  { id: 'cards-thermostatcard--default', label: 'ThermostatCard/Default' },
  { id: 'cards-weathercard--default', label: 'WeatherCard/Default' },
  // ── Layout ────────────────────────────────────────────────────────────────
  { id: 'layout-bottomnav--default', label: 'BottomNav/Default' },
  { id: 'layout-panel--default', label: 'Panel/Default' },
  { id: 'layout-panel--wide', label: 'Panel/Wide' },
  { id: 'layout-panel--no-icon', label: 'Panel/NoIcon' },
  // ── Panels ────────────────────────────────────────────────────────────────
  { id: 'panels-camerapanel--default', label: 'CameraPanel/Default' },
  { id: 'panels-flowerspanel--default', label: 'FlowersPanel/Default' },
  { id: 'panels-lightspanel--default', label: 'LightsPanel/Default' },
  { id: 'panels-notificationspanel--default', label: 'NotificationsPanel/Default' },
  { id: 'panels-securitypanel--default', label: 'SecurityPanel/Default' },
  { id: 'panels-shutterspanel--default', label: 'ShuttersPanel/Default' },
  { id: 'panels-vacuumpanel--default', label: 'VacuumPanel/Default' },
  // ── UI: Button ────────────────────────────────────────────────────────────
  { id: 'ui-button--default', label: 'Button/Default' },
  { id: 'ui-button--outline', label: 'Button/Outline' },
  { id: 'ui-button--secondary', label: 'Button/Secondary' },
  { id: 'ui-button--ghost', label: 'Button/Ghost' },
  { id: 'ui-button--destructive', label: 'Button/Destructive' },
  { id: 'ui-button--link', label: 'Button/Link' },
  { id: 'ui-button--with-icon', label: 'Button/WithIcon' },
  { id: 'ui-button--icon-only', label: 'Button/IconOnly' },
  { id: 'ui-button--small', label: 'Button/Small' },
  { id: 'ui-button--large', label: 'Button/Large' },
  { id: 'ui-button--disabled', label: 'Button/Disabled' },
  { id: 'ui-button--all-variants', label: 'Button/AllVariants' },
  { id: 'ui-button--all-sizes', label: 'Button/AllSizes' },
  // ── UI: Card ──────────────────────────────────────────────────────────────
  { id: 'ui-card--default', label: 'Card/Default' },
  { id: 'ui-card--small', label: 'Card/Small' },
  { id: 'ui-card--with-action', label: 'Card/WithAction' },
  { id: 'ui-card--with-footer', label: 'Card/WithFooter' },
  // ── UI: Slider ────────────────────────────────────────────────────────────
  { id: 'ui-slider--default', label: 'Slider/Default' },
  { id: 'ui-slider--range', label: 'Slider/Range' },
  { id: 'ui-slider--disabled', label: 'Slider/Disabled' },
  { id: 'ui-slider--with-steps', label: 'Slider/WithSteps' },
  { id: 'ui-slider--controlled', label: 'Slider/Controlled' },
  { id: 'ui-slider--brightness', label: 'Slider/Brightness' },
  // ── UI: Toast ─────────────────────────────────────────────────────────────
  { id: 'ui-toast--simple-dismiss', label: 'Toast/SimpleDismiss' },
  { id: 'ui-toast--courier-arrived', label: 'Toast/CourierArrived' },
];

for (const story of STORIES) {
  test(`${story.label} renders without errors`, async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', err => {
      // ResizeObserver loop errors are browser noise, not component errors
      if (!err.message.includes('ResizeObserver')) {
        jsErrors.push(err.message);
      }
    });

    await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
    await page.waitForLoadState('networkidle');

    // No uncaught JavaScript errors
    expect(jsErrors, `JS errors in ${story.label}: ${jsErrors.join(', ')}`).toHaveLength(0);

    // Storybook error boundary should not be visible
    const errorHeading = page.locator('h1:has-text("does not provide an export")');
    await expect(errorHeading).not.toBeVisible();

    // Some content is rendered (body is not blank)
    const bodyContent = await page.locator('body').innerHTML();
    expect(bodyContent.trim().length).toBeGreaterThan(50);
  });
}
