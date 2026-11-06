/**
 * L'aperçu de la modale d'édition d'un widget : la card dans sa vraie case,
 * réduite pour tenir — pas écrasée dans une boîte sans hauteur.
 *
 * Run with: npm run test:e2e:dashboard
 */
import { test, expect } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ha-dashboard-tour-done', 'true'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Modifier ce panneau' }).first().click();
  await page.locator('[data-widget-id="thermostat-seed"]').hover();
  await page
    .locator('[data-widget-id="thermostat-seed"]')
    .getByRole('button', { name: /Configurer/ })
    .click();
});

test("l'aperçu du thermostat montre son cadran sous le titre, sans chevauchement", async ({ page }) => {
  const sheet = page.getByRole('dialog', { name: 'Thermostat' });
  const preview = sheet.getByTestId('tile-preview');
  await expect(preview).toBeVisible();

  const title = await preview.locator('span.truncate').boundingBox();
  const up = await preview.getByRole('button', { name: 'Monter la consigne' }).boundingBox();
  expect(title).toBeTruthy();
  expect(up).toBeTruthy();
  // La flèche est sous le titre : avant, la zone du cadran s'écrasait à zéro.
  expect(up!.y).toBeGreaterThanOrEqual(title!.y + title!.height - 1);
  await page.screenshot({ path: 'test-results/widget-edit-preview.png' });
});

test('le nom saisi se lit dans la card et dans son aperçu', async ({ page }) => {
  const sheet = page.getByRole('dialog', { name: 'Thermostat' });
  await sheet.getByRole('textbox', { name: 'Nom affiché' }).fill('Poêle salon');
  await expect(sheet.getByTestId('tile-preview')).toContainText('Poêle salon');

  await sheet.getByRole('button', { name: 'Appliquer' }).click();
  await expect(page.locator('[data-widget-id="thermostat-seed"]')).toContainText('Poêle salon');
});
