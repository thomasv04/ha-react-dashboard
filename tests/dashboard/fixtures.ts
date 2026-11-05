/**
 * Un serveur d'API par worker Playwright, pour que la suite tourne en parallèle.
 *
 * Avec un seul serveur, un test qui écrit la configuration (le plan, les
 * réglages) la changeait sous les pieds des autres : la suite tournait sur un
 * seul worker. Chaque worker lance ici le sien, sur sa propre base, amorcée avec
 * la configuration de test. Le serveur de dev reste unique : son proxy choisit
 * le serveur d'API d'après l'en-tête `x-test-api-port` (`vite.config.ts`), que
 * chaque contexte de navigateur du worker envoie.
 *
 * Les specs importent `test` et `expect` d'ici, et `API` pour appeler leur
 * serveur directement.
 */
import { test as base, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// `TEST_WORKER_INDEX` : unique pour toute la durée de la suite, même quand un
// worker est relancé après un échec — pas de port encore occupé par l'ancien.
const PORT = 9100 + Number(process.env.TEST_WORKER_INDEX ?? 0);
export const API = `http://localhost:${PORT}`;

/**
 * Disposition minimale couvrant ce que les tests observent : un seul panneau,
 * ses tuiles dans l'ordre (le modèle de la v2 n'a plus de coordonnées).
 */
const tile = (id: string, type: string, w: number, h: number) => ({ id, type, w, h });

const SEED = {
  version: 2,
  pages: [{ id: 'home', label: 'Accueil', icon: 'LayoutGrid', type: 'grid', order: 0 }],
  layouts: {
    home: {
      panels: [
        {
          id: 'seed-panel',
          cols: 9,
          widgets: [
            tile('greeting', 'greeting', 3, 1),
            tile('weather-seed', 'weather', 3, 3),
            tile('sensor-seed', 'sensor', 3, 2),
            tile('light-seed', 'light', 3, 2),
            tile('thermostat-seed', 'thermostat', 3, 3),
            tile('camera-seed', 'camera', 6, 3),
            tile('calendar-seed', 'calendar', 3, 3),
          ],
        },
      ],
    },
  },
  widgetConfigs: {
    home: {
      'weather-seed': { type: 'weather', entityId: 'weather.home' },
      'sensor-seed': { type: 'sensor', entityId: 'sensor.bedroom_temperature' },
      'light-seed': { type: 'light', entityId: 'light.salon' },
      'thermostat-seed': { type: 'thermostat', entityId: 'climate.living_room' },
      'calendar-seed': { type: 'calendar', entityIds: ['calendar.famille', 'calendar.travail'] },
      'camera-seed': { type: 'camera', cameras: [{ entityId: 'camera.front_door', name: 'Entrée' }] },
    },
  },
};

export const test = base.extend<object, { apiServer: void }>({
  apiServer: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, provide) => {
      const dir = join(tmpdir(), 'ha-dashboard-e2e', String(PORT));
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir, { recursive: true });
      const server = spawn(process.execPath, ['server/index.js'], {
        env: {
          ...process.env,
          PORT: String(PORT),
          DB_PATH: join(dir, 'dashboard.db'),
          UPLOADS_DIR: join(dir, 'uploads'),
          NODE_ENV: 'development',
        },
        stdio: ['ignore', 'ignore', 'inherit'],
      });

      const deadline = Date.now() + 30_000;
      while (
        !(await fetch(`${API}/api/health`).then(
          r => r.ok,
          () => false
        ))
      ) {
        if (Date.now() > deadline) throw new Error(`Le serveur d'API du port ${PORT} n'a pas démarré.`);
        await new Promise(r => setTimeout(r, 200));
      }
      // Sans configuration, le dashboard est vide : chaque test attend un `[data-widget-id]`.
      const res = await fetch(`${API}/api/config`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(SEED),
      });
      if (!res.ok) throw new Error(`Amorçage refusé : ${res.status} ${await res.text()}`);

      await provide();
      server.kill();
    },
    { scope: 'worker', auto: true },
  ],
  extraHTTPHeaders: async ({ extraHTTPHeaders }, provide) => provide({ ...extraHTTPHeaders, 'x-test-api-port': String(PORT) }),
});

export { expect };
export type { APIRequestContext, Page } from '@playwright/test';
