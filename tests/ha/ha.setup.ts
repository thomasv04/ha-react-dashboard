/**
 * Prépare le HA neuf du conteneur : onboarding, intégration, configuration du
 * dashboard, puis un jeton posé là où le frontend HA le cherche (`hassTokens`),
 * pour que chaque test arrive connecté.
 *
 * Rejouable sur un HA déjà prêt (`npm run test:ha -- --keep`) : le compte
 * existant se reconnecte, l'intégration déjà installée est laissée.
 */
import { test as setup, expect, type APIRequestContext } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { AUTH_FILE, CONFIG_API, LIGHT, SEED, USER } from './seed';

async function authCode(request: APIRequestContext, clientId: string): Promise<string> {
  const steps: { step: string; done: boolean }[] = await (await request.get('/api/onboarding')).json();
  if (!steps.find(s => s.step === 'user')?.done) {
    const res = await request.post('/api/onboarding/users', { data: { client_id: clientId, ...USER } });
    expect(res.ok(), await res.text()).toBeTruthy();
    return (await res.json()).auth_code;
  }
  const flow = await (
    await request.post('/auth/login_flow', { data: { client_id: clientId, handler: ['homeassistant', null], redirect_uri: clientId } })
  ).json();
  const res = await request.post(`/auth/login_flow/${flow.flow_id}`, {
    data: { client_id: clientId, username: USER.username, password: USER.password },
  });
  const body = await res.json();
  expect(body.type, JSON.stringify(body)).toBe('create_entry');
  return body.result;
}

setup('prépare Home Assistant', async ({ request, baseURL }) => {
  const clientId = `${baseURL}/`;
  const code = await authCode(request, clientId);
  const tokens = await (
    await request.post('/auth/token', { form: { grant_type: 'authorization_code', code, client_id: clientId } })
  ).json();
  expect(tokens.access_token, JSON.stringify(tokens)).toBeTruthy();
  const headers = { Authorization: `Bearer ${tokens.access_token}` };

  // Le reste de l'onboarding : sans lui, le frontend y ramène à chaque page.
  for (const step of ['core_config', 'analytics']) await request.post(`/api/onboarding/${step}`, { headers, data: {} });
  await request.post('/api/onboarding/integration', {
    headers,
    data: { client_id: clientId, redirect_uri: `${clientId}?auth_callback=1` },
  });

  // L'intégration, par son config flow — comme un clic dans Paramètres → Intégrations.
  const flow = await (await request.post('/api/config/config_entries/flow', { headers, data: { handler: 'ha_react_dashboard' } })).json();
  if (flow.type === 'form') {
    const done = await (await request.post(`/api/config/config_entries/flow/${flow.flow_id}`, { headers, data: {} })).json();
    expect(done.type, JSON.stringify(done)).toBe('create_entry');
  } else {
    expect(flow.reason, JSON.stringify(flow)).toMatch(/single_instance_allowed|already_configured/);
  }

  // `demo` se charge en parallèle du reste.
  await expect.poll(async () => (await request.get(`/api/states/${LIGHT}`, { headers })).status(), { timeout: 60_000 }).toBe(200);

  const put = await request.put(CONFIG_API, { headers, data: SEED });
  expect(put.ok(), await put.text()).toBeTruthy();

  const hassTokens = {
    ...tokens,
    hassUrl: baseURL,
    clientId,
    expires: Date.now() + tokens.expires_in * 1000,
  };
  mkdirSync(dirname(AUTH_FILE), { recursive: true });
  writeFileSync(
    AUTH_FILE,
    JSON.stringify({
      cookies: [],
      origins: [
        {
          origin: baseURL,
          localStorage: [
            { name: 'hassTokens', value: JSON.stringify(hassTokens) },
            { name: 'ha-dashboard-tour-done', value: 'true' },
          ],
        },
      ],
    })
  );
});
