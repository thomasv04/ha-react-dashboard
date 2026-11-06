/**
 * Captures de la carte dans le vrai Home Assistant, publiées en commentaire de
 * la PR par la CI (`scripts/pr-screenshots.sh`). Ne compare rien : la
 * régression visuelle, elle, est dans `tests/dashboard/visual.spec.ts`.
 *
 * Entités de l'intégration `demo` : aucune donnée d'une vraie maison.
 */
import { test, expect } from '@playwright/test';
import { accessToken, CONFIG_API, DASHBOARD, freshInstall, SEED } from './seed';

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

// L'accueil d'une installation neuve, la page qu'il construit, puis la page
// vide de qui part de zéro. La page construite est enregistrée : le test
// suivant réamorce sa configuration, comme ceux de `card.spec.ts`.
for (const theme of ['dark', 'light'] as const) {
  test(`captures de l'accueil, thème ${theme}`, async ({ page }) => {
    await freshInstall(page);
    await page.addInitScript(t => localStorage.setItem('ha-dashboard-theme', JSON.stringify({ themeId: t })), theme);
    await page.goto(DASHBOARD);

    const onboarding = page.getByTestId('onboarding');
    await expect(onboarding.getByRole('heading', { name: /Bienvenue/ })).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/4-accueil-bienvenue-${theme}.png` });

    await onboarding.getByRole('button', { name: 'Commencer' }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/5-accueil-apparence-${theme}.png` });

    await onboarding.getByRole('button', { name: 'Continuer' }).click();
    await expect(onboarding.getByRole('checkbox').first()).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/6-accueil-pieces-${theme}.png` });

    await onboarding.getByTestId('onboarding-create').click();
    await onboarding.getByRole('button', { name: 'Découvrir seul' }).click();
    await expect(page.locator('ha-react-dashboard-panel [data-widget-id^="room-"]').first()).toBeVisible();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/7-premiere-page-${theme}.png` });

    // La lecture répond toujours « rien encore » ; l'accueil, lui, est fait :
    // reste la page vide, celle de qui a choisi de partir de zéro.
    await page.evaluate(() => localStorage.removeItem('ha-dashboard-config-cache'));
    await page.reload();
    await expect(page.getByTestId('empty-state')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/8-page-vide-${theme}.png` });
  });
}
