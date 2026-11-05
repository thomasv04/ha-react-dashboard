/**
 * Fiche plein écran du calendrier : ouverte depuis la card, mois + liste du jour.
 *
 * Les évènements viennent du mock de connexion (`calendar.get_events`), posés
 * autour de la date du jour.
 *
 * Run with: npm run test:e2e:dashboard
 */
import { test, expect, type Page } from './fixtures';

async function openCalendar(page: Page) {
  await page.addInitScript(() => localStorage.setItem('ha-dashboard-tour-done', 'true'));
  await page.goto('/');
  await page.waitForSelector('[data-widget-id]', { timeout: 15_000 });
  await page.locator('[data-widget-id="calendar-seed"]').click();
  await expect(page.getByTestId('more-info-modal')).toBeVisible({ timeout: 5000 });
}

const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test.describe('Calendrier plein écran', () => {
  test('affiche le mois et la liste du jour courant', async ({ page }) => {
    await openCalendar(page);

    const today = page.locator(`[data-day="${key(new Date())}"]`);
    await expect(today).toHaveAttribute('aria-current', 'date');
    await expect(today).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('calendar-day').getByText('Rendez-vous médecin')).toBeVisible();
    await expect(page.getByTestId('calendar-day').getByText('Réunion équipe')).toBeVisible();
  });

  test('toucher un jour affiche ses évènements', async ({ page }) => {
    await openCalendar(page);

    const d = new Date();
    const tomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    await page.locator(`[data-day="${key(tomorrow)}"]`).click();
    await expect(page.getByTestId('calendar-day').getByText('Anniversaire de Léa')).toBeVisible();
    await expect(page.getByTestId('calendar-day').getByText('Rendez-vous médecin')).toHaveCount(0);
  });

  test('navigue de mois en mois et bascule en vue journée', async ({ page }) => {
    await openCalendar(page);

    const month = page.getByTestId('calendar-month').locator('h3');
    const before = await month.textContent();
    await page.getByRole('button', { name: 'Mois suivant' }).click();
    await expect(month).not.toHaveText(before!);
    await page.getByRole('button', { name: "Aujourd'hui" }).click();
    await expect(month).toHaveText(before!);

    await page.getByRole('button', { name: 'Changer de vue' }).click();
    await expect(page.getByTestId('calendar-month')).toHaveCount(0);
    await expect(page.getByTestId('calendar-day')).toBeVisible();
  });

  test('le bouton « + » est désactivé (pas de création dans ce lot)', async ({ page }) => {
    await openCalendar(page);
    await expect(page.getByRole('button', { name: /Ajouter un évènement/ })).toBeDisabled();
  });
});
