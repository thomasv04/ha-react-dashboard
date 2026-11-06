/**
 * Outils de développement : le bac à sable des événements Home Assistant.
 *
 * Run with: npm run test:e2e:dashboard
 */
import { test, expect } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ha-dashboard-tour-done', 'true'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir les apps' }).click();
  await page.getByRole('button', { name: 'Outils de développement' }).click();
});

test('le formulaire montre la modale ici et écrit son YAML', async ({ page }) => {
  const sheet = page.getByTestId('devtools-sheet');
  await sheet.getByRole('textbox', { name: 'Titre' }).fill('Porte ouverte');
  await sheet.getByRole('radio', { name: 'Large' }).click();
  await sheet.getByRole('switch', { name: /Bloquante/ }).click();

  await expect(sheet.locator('pre')).toContainText('event: ha_dashboard_modal');
  await expect(sheet.locator('pre')).toContainText('title: "Porte ouverte"');
  await expect(sheet.locator('pre')).toContainText('width: "lg"');
  await expect(sheet.locator('pre')).toContainText('dismissible: false');

  await sheet.getByTestId('devtools-preview').click();
  const modal = page.getByRole('dialog', { name: 'Porte ouverte' });
  await expect(modal).toBeVisible();
  // Bloquante : pas de bouton de fermeture, Échap ne la ferme pas.
  await expect(modal.getByRole('button', { name: 'Fermer' })).toHaveCount(0);
});

test('le toast et la notification passent par le même formulaire', async ({ page }) => {
  const sheet = page.getByTestId('devtools-sheet');
  await sheet.getByRole('radio', { name: 'Toast' }).click();
  await sheet.getByRole('switch', { name: /Persistant/ }).click();
  await expect(sheet.locator('pre')).toContainText('persistent: true');
  await sheet.getByTestId('devtools-preview').click();
  await expect(page.getByRole('status').filter({ hasText: 'Le courrier est arrivé' })).toBeVisible();

  await sheet.getByRole('radio', { name: 'Notification' }).click();
  await expect(sheet.locator('pre')).toContainText('event: ha_dashboard_notification');
  await expect(sheet.getByText(/balayez l'écran de veille/)).toBeVisible();
});
