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

test("le toast s'affiche à côté de la feuille, sans la recouvrir", async ({ page }) => {
  const sheet = page.getByTestId('devtools-sheet');
  await sheet.getByRole('radio', { name: 'Toast' }).click();
  await sheet.getByRole('switch', { name: /Persistant/ }).click();
  await expect(sheet.locator('pre')).toContainText('persistent: true');
  await sheet.getByTestId('devtools-preview').click();

  const toast = page.getByRole('status').filter({ hasText: 'Le courrier est arrivé' });
  await expect(toast).toBeVisible();
  await page.waitForTimeout(500); // la feuille de décalage et l'entrée du toast
  const sheetBox = (await page.getByRole('dialog', { name: 'Outils de développement' }).boundingBox())!;
  const toastBox = (await toast.boundingBox())!;
  expect(toastBox.x + toastBox.width).toBeLessThanOrEqual(sheetBox.x);
});

test("une notification se lit dans le tiroir, qu'on voit dans la feuille", async ({ page }) => {
  const sheet = page.getByTestId('devtools-sheet');
  await sheet.getByRole('radio', { name: 'Notification' }).click();
  await expect(sheet.locator('pre')).toContainText('event: ha_dashboard_notification');

  const drawer = sheet.getByTestId('devtools-drawer');
  await expect(drawer.getByText('Aucune notification')).toBeVisible();
  await sheet.getByTestId('devtools-preview').click();
  await expect(drawer.getByText('Le courrier est arrivé')).toBeVisible();

  await drawer.getByRole('button', { name: 'Fermer' }).click();
  await expect(drawer.getByText('Le courrier est arrivé')).toHaveCount(0);
});

test('« Copier » fonctionne en HTTP, sans navigator.clipboard', async ({ page }) => {
  // Une tablette ouvre souvent HA en http://homeassistant.local : pas de contexte
  // sécurisé, donc pas d'API du presse-papiers — le repli doit prendre le relais.
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    const w = window as unknown as { __copied?: string };
    document.execCommand = (command: string) => {
      w.__copied = document.querySelector<HTMLTextAreaElement>('textarea[readonly]')?.value;
      return command === 'copy';
    };
  });

  const sheet = page.getByTestId('devtools-sheet');
  await sheet.getByRole('button', { name: 'Copier' }).click();
  await expect(sheet.getByText('Copié', { exact: true })).toBeVisible();
  const copied = await page.evaluate(() => (window as unknown as { __copied?: string }).__copied);
  expect(copied).toContain('event: ha_dashboard_modal');
});

test('tous les champs sont là : plusieurs boutons, JSON vérifié, YAML à jour', async ({ page }) => {
  const sheet = page.getByTestId('devtools-sheet');
  const yaml = sheet.locator('pre');

  await sheet.getByRole('radio', { name: 'Markdown' }).click();
  await expect(yaml).toContainText('content_type: "markdown"');

  await sheet.getByTestId('devtools-add-action').click();
  await sheet.getByTestId('devtools-add-action').click();
  const first = sheet.getByRole('group', { name: 'Bouton 1' });
  await first.getByRole('textbox', { name: 'Libellé' }).fill('Allumer');
  await first.getByRole('radio', { name: 'Principal' }).click();
  await first.getByRole('textbox', { name: /Service appelé/ }).fill('light.turn_on');
  await first.getByRole('textbox', { name: /Entité visée/ }).fill('light.salon');
  await first.getByRole('textbox', { name: /Autres données/ }).fill('{"brightness_pct": 40}');
  const second = sheet.getByRole('group', { name: 'Bouton 2' });
  await second.getByRole('textbox', { name: 'Libellé' }).fill('Plus tard');
  await second.getByRole('radio', { name: 'Danger' }).click();

  await expect(yaml).toContainText('variant: "primary"');
  await expect(yaml).toContainText('brightness_pct: 40');
  await expect(yaml).toContainText('variant: "danger"');

  // Un JSON illisible est signalé et bloque l'envoi comme l'aperçu.
  await first.getByRole('textbox', { name: /Autres données/ }).fill('{oups');
  await expect(first.getByRole('alert')).toContainText('JSON invalide');
  await expect(sheet.getByTestId('devtools-preview')).toBeDisabled();
  await expect(sheet.getByTestId('devtools-send')).toBeDisabled();

  await second.getByRole('button', { name: 'Retirer le bouton 2' }).click();
  await expect(sheet.getByRole('group', { name: 'Bouton 2' })).toHaveCount(0);
});

test('la notification expose id, niveau, icône, « garder » et le retrait (dismiss)', async ({ page }) => {
  const sheet = page.getByTestId('devtools-sheet');
  await sheet.getByRole('radio', { name: 'Notification' }).click();
  await sheet.getByRole('textbox', { name: /Identifiant/ }).fill('maj-1');
  await sheet.getByRole('radio', { name: 'Alerte' }).click();
  await sheet.getByTestId('devtools-add-action').click();
  const button = sheet.getByRole('group', { name: 'Bouton 1' });
  await button.getByRole('textbox', { name: 'Libellé' }).fill('Voir');
  await button.getByRole('switch', { name: /Garder après l’action/ }).click();
  await expect(sheet.locator('pre')).toContainText('keep: true');
  await expect(sheet.locator('pre')).toContainText('level: "warning"');

  await sheet.getByTestId('devtools-preview').click();
  const drawer = sheet.getByTestId('devtools-drawer');
  await expect(drawer.getByText('Le courrier est arrivé')).toBeVisible();

  // Retirer par identifiant vide le tiroir de cette notification.
  await sheet.getByRole('switch', { name: /Retirer au lieu d’ajouter/ }).click();
  await expect(sheet.locator('pre')).toContainText('dismiss: true');
  await sheet.getByTestId('devtools-preview').click();
  await expect(drawer.getByText('Le courrier est arrivé')).toHaveCount(0);
});

test('le son propose les préréglages, le silence et une adresse', async ({ page }) => {
  const sheet = page.getByTestId('devtools-sheet');
  const sound = sheet.getByRole('combobox', { name: 'Son' });
  await sound.selectOption('chime');
  await expect(sheet.locator('pre')).toContainText('sound: "chime"');
  await sound.selectOption('muted');
  await expect(sheet.locator('pre')).toContainText('sound: false');
  await sound.selectOption('url');
  await sheet.getByRole('textbox', { name: 'Adresse du son' }).fill('/local/sonnette.mp3');
  await expect(sheet.locator('pre')).toContainText('sound: "/local/sonnette.mp3"');
});
