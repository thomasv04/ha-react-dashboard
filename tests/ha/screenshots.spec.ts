/**
 * Captures de la carte dans le vrai Home Assistant, publiées en commentaire de
 * la PR par la CI (`scripts/pr-screenshots.sh`). Ne compare rien : la
 * régression visuelle, elle, est dans `tests/dashboard/visual.spec.ts`.
 *
 * Entités de l'intégration `demo` : aucune donnée d'une vraie maison.
 */
import { test, expect } from '@playwright/test';
import { accessToken, CONFIG_API, DASHBOARD, SEED } from './seed';

const OUT = 'test-results/ha-screenshots';

for (const theme of ['dark', 'light'] as const) {
  test(`captures, thème ${theme}`, async ({ page, request }) => {
    expect((await request.put(CONFIG_API, { headers: { Authorization: `Bearer ${accessToken()}` }, data: SEED })).ok()).toBeTruthy();
    await page.addInitScript(t => localStorage.setItem('ha-dashboard-theme', JSON.stringify({ themeId: t })), theme);
    await page.goto(DASHBOARD);
    await expect(page.locator('ha-react-dashboard-panel [data-widget-id]')).toHaveCount(SEED.layouts.home.panels[0].widgets.length, {
      timeout: 30_000,
    });
    // Polices et entrée des tuiles.
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/1-accueil-${theme}.png` });

    await page.getByRole('button', { name: 'Modifier ce panneau' }).first().click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/2-edition-${theme}.png` });
    await page.getByRole('button', { name: 'Abandonner les modifications' }).click();

    await page.locator('ha-react-dashboard-panel [data-widget-id="thermostat-hvac"]').click();
    await expect(page.getByTestId('more-info-modal')).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/3-fiche-thermostat-${theme}.png` });
  });
}
