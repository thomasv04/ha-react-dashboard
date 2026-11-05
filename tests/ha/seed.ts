/** Données partagées par l'amorçage et les tests dans HA. */
import { readFileSync } from 'node:fs';

export const AUTH_FILE = 'test-results/ha-auth.json';
export const DASHBOARD = '/react-dashboard';
export const CONFIG_API = '/api/ha_react_dashboard/config';

/** Compte du HA jetable : il n'existe que dans le conteneur des tests. */
export const USER = { name: 'E2E', username: 'e2e', password: 'e2e-password-not-secret', language: 'fr' };

/** Entités de l'intégration `demo`. */
export const LIGHT = 'light.bed_light';

const tile = (id: string, type: string, w: number, h: number) => ({ id, type, w, h });

export const SEED = {
  version: 2,
  pages: [{ id: 'home', label: 'Accueil', icon: 'LayoutGrid', type: 'grid', order: 0 }],
  layouts: {
    home: {
      panels: [
        {
          id: 'ha-panel',
          cols: 9,
          widgets: [
            tile('light-bed', 'light', 3, 2),
            tile('light-kitchen', 'light', 3, 2),
            tile('cover-kitchen', 'cover', 3, 2),
            tile('thermostat-hvac', 'thermostat', 3, 3),
            tile('sensor-outside', 'sensor', 3, 2),
          ],
        },
      ],
    },
  },
  widgetConfigs: {
    home: {
      'light-bed': { type: 'light', entityId: LIGHT, name: 'Chambre' },
      'light-kitchen': { type: 'light', entityId: 'light.kitchen_lights', name: 'Cuisine' },
      'cover-kitchen': { type: 'cover', entityId: 'cover.kitchen_window', name: 'Fenêtre cuisine' },
      'thermostat-hvac': { type: 'thermostat', entityId: 'climate.hvac', minTemp: 7, maxTemp: 35 },
      'sensor-outside': { type: 'sensor', entityId: 'sensor.outside_temperature', name: 'Dehors' },
    },
  },
};

/** Jeton d'accès posé par `ha.setup.ts` — valable trente minutes, assez pour la suite. */
export function accessToken(): string {
  const state = JSON.parse(readFileSync(AUTH_FILE, 'utf8'));
  const tokens = state.origins[0].localStorage.find((e: { name: string }) => e.name === 'hassTokens');
  return JSON.parse(tokens.value).access_token;
}
