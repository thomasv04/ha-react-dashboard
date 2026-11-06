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
  // Un HA déjà configuré puis redémarré ne sert plus `/api/onboarding` (404) :
  // le compte existe, on s'y connecte.
  const onboarding = await request.get('/api/onboarding');
  const steps: { step: string; done: boolean }[] = onboarding.ok() ? await onboarding.json() : [];
  if (onboarding.ok() && !steps.find(s => s.step === 'user')?.done) {
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

/** Un appel WebSocket de Home Assistant : les registres n'ont pas d'API REST. */
async function haSocket(baseURL: string, token: string) {
  const socket = new WebSocket(`${baseURL.replace(/^http/, 'ws')}/api/websocket`);
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  let id = 0;
  await new Promise<void>((resolve, reject) => {
    socket.onerror = () => reject(new Error('WebSocket de HA injoignable'));
    socket.onmessage = event => {
      const msg = JSON.parse(String(event.data));
      if (msg.type === 'auth_required') socket.send(JSON.stringify({ type: 'auth', access_token: token }));
      else if (msg.type === 'auth_ok') resolve();
      else if (msg.type === 'auth_invalid') reject(new Error(msg.message));
      else if (msg.type === 'result') {
        const call = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.success) call?.resolve(msg.result);
        else call?.reject(new Error(JSON.stringify(msg.error)));
      }
    };
  });
  return {
    call: <T>(message: Record<string, unknown>) =>
      new Promise<T>((resolve, reject) => {
        pending.set(++id, { resolve: resolve as (v: unknown) => void, reject });
        socket.send(JSON.stringify({ ...message, id }));
      }),
    close: () => socket.close(),
  };
}

/**
 * Les pièces que l'onboarding de HA crée (salon, cuisine, chambre — leur
 * identifiant suit la langue du compte) restent vides : `demo` ne range rien.
 * On y met quelques entités, pour que l'accueil du dashboard ait de quoi
 * construire une page.
 */
const ROOMS: [RegExp, string[]][] = [
  [/salon|living/, ['light.living_room_rgbww_lights', 'cover.living_room_window', 'climate.hvac', 'media_player.living_room']],
  [/cuisine|kitchen/, ['light.kitchen_lights', 'cover.kitchen_window']],
  [/chambre|bedroom/, ['light.bed_light', 'media_player.bedroom']],
];

async function furnishRooms(baseURL: string, token: string) {
  const ha = await haSocket(baseURL, token);
  try {
    const areas = await ha.call<{ area_id: string }[]>({ type: 'config/area_registry/list' });
    // Seulement les entités que `demo` enregistre dans cette version de HA.
    const registered = new Set((await ha.call<{ entity_id: string }[]>({ type: 'config/entity_registry/list' })).map(e => e.entity_id));
    for (const [pattern, entities] of ROOMS) {
      const area = areas.find(a => pattern.test(a.area_id));
      expect(area, `pièce ${pattern} absente : ${areas.map(a => a.area_id)}`).toBeTruthy();
      const present = entities.filter(id => registered.has(id));
      expect(present, `aucune entité de ${pattern} enregistrée`).not.toHaveLength(0);
      for (const entity_id of present) await ha.call({ type: 'config/entity_registry/update', entity_id, area_id: area!.area_id });
    }
  } finally {
    ha.close();
  }
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

  await furnishRooms(baseURL!, tokens.access_token);

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
