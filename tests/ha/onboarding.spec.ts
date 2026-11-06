/**
 * Le premier lancement dans un vrai Home Assistant : les pièces viennent des
 * registres de HA, la page construite est enregistrée par l'intégration.
 *
 * Seule la lecture de la configuration est interceptée, pour répondre ce que
 * l'intégration répond tant que rien n'a été enregistré. Les tests suivants
 * réamorcent la leur.
 *
 * Run with: npm run test:ha
 */
import { test, expect } from '@playwright/test';
import { accessToken, CONFIG_API, DASHBOARD, freshInstall } from './seed';

test('une installation neuve construit et enregistre sa première page', async ({ page, request }) => {
  await freshInstall(page);
  await page.goto(DASHBOARD);

  const onboarding = page.getByTestId('onboarding');
  await expect(onboarding.getByRole('heading', { name: /Bienvenue/ })).toBeVisible({ timeout: 30_000 });
  await onboarding.getByRole('button', { name: 'Commencer' }).click();
  await onboarding.getByRole('button', { name: 'Continuer' }).click();

  // Les pièces de l'intégration `demo`, lues dans les registres de HA.
  const rooms = onboarding.getByRole('checkbox');
  await expect(rooms.first()).toBeVisible();
  const checked = await onboarding.getByRole('checkbox', { checked: true }).count();
  expect(checked).toBeGreaterThan(0);
  await onboarding.getByTestId('onboarding-create').click();
  await expect(onboarding.getByRole('heading', { name: "C'est prêt" })).toBeVisible();

  const saved = await (await request.get(CONFIG_API, { headers: { Authorization: `Bearer ${accessToken()}` } })).json();
  const panels: { title?: string; widgets: { type: string }[] }[] = saved.layouts.home.panels;
  expect(panels[0].widgets.map(w => w.type)).toContain('welcome');
  expect(panels.find(p => p.title === 'Pièces')?.widgets).toHaveLength(checked);

  await onboarding.getByRole('button', { name: 'Découvrir seul' }).click();
  await expect(onboarding).toHaveCount(0);
  await expect(page.locator('ha-react-dashboard-panel [data-widget-id^="room-"]').first()).toBeVisible();
});
