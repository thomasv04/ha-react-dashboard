/**
 * L'accueil d'une installation neuve : écrans plein page, puis une première
 * page construite à partir des pièces Home Assistant.
 *
 * Run with: npm run test:e2e:dashboard
 */
import { test, expect, type Page } from './fixtures';

const ents = (...ids: string[]) => ids.map(entity_id => ({ entity_id, state: 'off', attributes: {} }));
const AREAS = [
  { area_id: 'salon', name: 'Salon', entities: ents('light.salon', 'cover.volet_salon', 'climate.living_room') },
  { area_id: 'cuisine', name: 'Cuisine', entities: ents('light.bandeau_led_cuisine', 'cover.volet_cuisine') },
  { area_id: 'cave', name: 'Cave', entities: ents('sensor.cave') },
];

type SavedConfig = {
  pages: { id: string }[];
  layouts: Record<string, { panels: { title?: string; widgets: { type: string }[] }[] }>;
  widgetConfigs: Record<string, Record<string, Record<string, unknown>>>;
};

/** Serveur sans configuration ; les enregistrements sont interceptés. */
async function freshInstall(page: Page) {
  const saved: SavedConfig[] = [];
  await page.addInitScript(areas => Object.assign(window, { __mockAreas: areas }), AREAS);
  await page.route('**/api/config', async route => {
    if (route.request().method() === 'PUT') {
      saved.push(route.request().postDataJSON());
      return route.fulfill({ status: 200, json: {}, headers: { 'X-Config-Revision': '1' } });
    }
    return route.fulfill({ status: 404, json: { message: 'No configuration yet' } });
  });
  return saved;
}

test('une installation neuve construit sa première page depuis les pièces', async ({ page }) => {
  const saved = await freshInstall(page);
  await page.goto('/');

  const onboarding = page.getByTestId('onboarding');
  await expect(onboarding.getByRole('heading', { name: /Bienvenue/ })).toBeVisible();
  await onboarding.getByRole('button', { name: 'Commencer' }).click();

  await expect(onboarding.getByRole('heading', { name: 'Langue et apparence' })).toBeVisible();
  await onboarding.getByRole('radio', { name: /^Clair/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await onboarding.getByRole('button', { name: 'Continuer' }).click();

  // Pièces équipées cochées d'office, la cave (un capteur seul) non.
  await expect(onboarding.getByRole('checkbox', { name: /Salon/ })).toBeChecked();
  await expect(onboarding.getByRole('checkbox', { name: /Cave/ })).not.toBeChecked();
  await onboarding.getByRole('checkbox', { name: /Cuisine/ }).click();
  await onboarding.getByTestId('onboarding-create').click();

  await expect(onboarding.getByRole('heading', { name: "C'est prêt" })).toBeVisible();
  expect(saved).toHaveLength(1);
  const home = saved[0].layouts.home;
  expect(saved[0].pages.map(p => p.id)).toEqual(['home']);
  expect(home.panels.map(p => [p.title, p.widgets.map(w => w.type)])).toEqual([
    [undefined, ['welcome', 'weather']],
    ['Pièces', ['room']],
    ['Salon', ['thermostat', 'light', 'cover']],
  ]);

  await onboarding.getByRole('button', { name: 'Découvrir seul' }).click();
  await expect(onboarding).toHaveCount(0);
  await expect(page.locator('[data-widget-id]').first()).toBeVisible();
});

test('« Passer » laisse la page vide, qui propose de reprendre depuis les pièces', async ({ page }) => {
  const saved = await freshInstall(page);
  await page.goto('/');
  await page.getByTestId('onboarding-skip').click();

  const empty = page.getByTestId('empty-state');
  await expect(empty).toBeVisible();
  expect(saved).toHaveLength(0);

  // Ni l'accueil ni la visite ne reviennent d'eux-mêmes au rechargement.
  await page.reload();
  await expect(empty).toBeVisible();
  await expect(page.getByTestId('onboarding')).toHaveCount(0);

  await empty.getByRole('button', { name: 'Construire depuis mes pièces' }).click();
  await expect(page.getByTestId('onboarding')).toBeVisible();
});

test('une installation configurée ne voit pas l’accueil', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-widget-id]').first()).toBeVisible();
  await expect(page.getByTestId('onboarding')).toHaveCount(0);
});
