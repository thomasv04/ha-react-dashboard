/**
 * Amorçage de la base de test avant la suite E2E.
 *
 * Les tests attendent un dashboard **peuplé** (au moins cinq widgets, dont une
 * horloge d'identifiant `greeting`). Or la base de test démarre vide : le
 * serveur répond `{ message: 'No config yet' }`, le dashboard affiche son état
 * vide, aucun `[data-widget-id]` n'apparaît et les treize tests expirent.
 *
 * Ce projet `setup` s'exécute avant le projet `chromium` (via `dependencies`),
 * donc après le démarrage des serveurs : la configuration est posée par l'API,
 * ce qui rend la suite indépendante de tout état résiduel de la base.
 */
import { test as setup, expect } from '@playwright/test';

const API = 'http://localhost:8098';

/** Disposition minimale couvrant ce que les tests observent. */
const w = (id: string, type: string, x: number, y: number, ww: number, h: number) => ({ id, type, x, y, w: ww, h });

const LAYOUT = {
  lg: [
    w('greeting', 'greeting', 0, 0, 3, 1),
    w('weather-seed', 'weather', 3, 0, 3, 3),
    w('sensor-seed', 'sensor', 6, 0, 3, 2),
    w('light-seed', 'light', 9, 0, 3, 2),
    w('thermostat-seed', 'thermostat', 0, 1, 3, 3),
    w('camera-seed', 'camera', 6, 2, 6, 3),
  ],
  md: [
    w('greeting', 'greeting', 0, 0, 4, 1),
    w('weather-seed', 'weather', 4, 0, 4, 2),
    w('sensor-seed', 'sensor', 0, 1, 4, 2),
    w('light-seed', 'light', 4, 2, 4, 2),
    w('thermostat-seed', 'thermostat', 0, 3, 4, 2),
    w('camera-seed', 'camera', 0, 5, 8, 3),
  ],
  sm: [
    w('greeting', 'greeting', 0, 0, 4, 1),
    w('weather-seed', 'weather', 0, 1, 4, 2),
    w('sensor-seed', 'sensor', 0, 3, 2, 2),
    w('light-seed', 'light', 2, 3, 2, 2),
    w('thermostat-seed', 'thermostat', 0, 5, 4, 2),
    w('camera-seed', 'camera', 0, 7, 4, 2),
  ],
};

setup('amorce la configuration du dashboard de test', async ({ request }) => {
  const res = await request.put(`${API}/api/config`, {
    data: {
      version: 2,
      pages: [{ id: 'home', label: 'Accueil', icon: 'LayoutGrid', type: 'grid', order: 0 }],
      layouts: { home: { widgets: LAYOUT, cols: { lg: 12, md: 8, sm: 4 } } },
      widgetConfigs: {
        home: {
          'weather-seed': { type: 'weather', entityId: 'weather.home' },
          'sensor-seed': { type: 'sensor', entityId: 'sensor.bedroom_temperature' },
          'light-seed': { type: 'light', entityId: 'light.salon' },
          'thermostat-seed': { type: 'thermostat', entityId: 'climate.living_room' },
          'camera-seed': { type: 'camera', cameras: [{ entityId: 'camera.front_door', name: 'Entrée' }] },
        },
      },
    },
  });
  expect(res.ok()).toBeTruthy();

  // Relecture : la suite entière dépend de cette configuration.
  const check = await request.get(`${API}/api/config`);
  const body = await check.json();
  expect(body.layouts.home.widgets.lg.length).toBeGreaterThanOrEqual(5);
});
