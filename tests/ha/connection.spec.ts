/**
 * Un écran mural doit survivre à un redémarrage de Home Assistant : le bandeau
 * annonce la coupure, puis la carte se reconnecte et suit de nouveau les états.
 *
 * Run with: npm run test:ha
 */
import { test, expect } from '@playwright/test';
import { accessToken, CONFIG_API, DASHBOARD, LIGHT, SEED } from './seed';

const headers = () => ({ Authorization: `Bearer ${accessToken()}` });

test('un redémarrage de HA est annoncé, puis la carte se reconnecte', async ({ page, request }) => {
  test.setTimeout(240_000);
  expect((await request.put(CONFIG_API, { headers: headers(), data: SEED })).ok()).toBeTruthy();
  await page.goto(DASHBOARD);
  const toggle = page.locator('ha-react-dashboard-panel [data-widget-id="light-bed"] button[aria-pressed]');
  await expect(toggle).toBeVisible({ timeout: 30_000 });

  // La requête n'a pas toujours le temps de répondre : HA s'arrête.
  await request.post('/api/services/homeassistant/restart', { headers: headers() }).catch(() => undefined);
  const banner = page.locator('[data-connection]');
  await expect(banner).toHaveAttribute('data-connection', 'lost', { timeout: 30_000 });

  // Revenu : le bandeau disparaît…
  await expect(banner).toHaveCount(0, { timeout: 180_000 });
  // … et les états arrivent de nouveau. Le WebSocket revient avant que `demo`
  // ait recréé ses entités : attendre la lampe avant de la piloter.
  await expect
    .poll(async () => (await request.get(`/api/states/${LIGHT}`, { headers: headers() })).status(), { timeout: 60_000 })
    .toBe(200);
  await request.post('/api/services/light/turn_on', { headers: headers(), data: { entity_id: LIGHT } });
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await request.post('/api/services/light/turn_off', { headers: headers(), data: { entity_id: LIGHT } });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});
