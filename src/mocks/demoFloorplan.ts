import type { DashboardConfigV2, GridWidget } from '@/context/DashboardLayoutContext';
import type { FloorplanPart } from '@/lib/floorplan';
import type { WidgetConfigs } from '@/types/widget-configs';

/**
 * Mode mock (`vite --mode mock`) : une page « Maison 3D » toujours présente,
 * pour essayer la maquette sans rien configurer. Les tests e2e, lancés sans
 * `--mode mock`, ne la voient pas.
 *
 * La maquette est celle des tests (cf. `tests/dashboard/fixtures/ATTRIBUTION.md`),
 * servie depuis le dépôt par le serveur de développement : elle n'entre ni dans
 * le build ni dans l'add-on. Adresse relative, à cause de la `base` de Vite.
 */
const ID = 'demo-3d';
const MODEL = 'tests/dashboard/fixtures/smart-home-floor-plan.glb';

/** Pastille accrochée à un point de la maquette, dans ses propres coordonnées. */
const chip = (id: string, anchor: [number, number, number]): GridWidget => ({
  id,
  type: 'chip',
  x: 0,
  y: 0,
  w: 2,
  h: 1,
  pos: { x: 50, y: 50, anchor },
});

const WIDGETS: GridWidget[] = [
  chip('demo-cuisine', [-12.37, 0, -1.74]),
  chip('demo-salon', [-4.34, 0.39, -0.64]),
  chip('demo-chambre', [-2.88, 0.63, -6.58]),
  chip('demo-couloir', [-6.02, 1.63, -6.71]),
  chip('demo-temperature', [-1.01, 3.05, -2.54]),
  // Une card n'est pas accrochée : elle reste posée en % de l'écran.
  { id: 'demo-meteo', type: 'weather', x: 0, y: 0, w: 2, h: 1, pos: { x: 88, y: 22, w: 20, h: 32 } },
];

const CONFIGS = {
  'demo-cuisine': { type: 'chip', entityId: 'light.bandeau_led_cuisine', glow: true, glowSize: 12 },
  'demo-salon': { type: 'chip', entityId: 'light.living_room', glow: true, glowSize: 12 },
  'demo-chambre': { type: 'chip', entityId: 'light.chambre', glow: true, glowSize: 12 },
  'demo-couloir': { type: 'chip', entityId: 'binary_sensor.couloir_mouvement' },
  'demo-temperature': { type: 'chip', entityId: 'sensor.temperature_chambre_temperature' },
  'demo-meteo': { type: 'weather', entityId: 'weather.home' },
} as WidgetConfigs;

/** Portes, fenêtres et volets dessinés sur la maquette. */
const PARTS: FloorplanPart[] = [
  // La porte du mur du fond, près de la cuisine : ouverte.
  {
    id: 'demo-porte-cellier',
    kind: 'door',
    entityId: 'binary_sensor.porte_cellier',
    a: [-13.016, 0.246, -2.196],
    b: [-13.037, 2.09, -1.603],
    side: -1,
    color: '#8d6b51',
  },
  // La fenêtre de la cuisine, son volet à mi-hauteur (côté pièce : on le voit).
  {
    id: 'demo-volet-cuisine',
    kind: 'shutter',
    entityId: 'cover.volet_baie_salon',
    a: [-13.029, 1.016, 1.298],
    b: [-13.215, 2.336, -0.405],
    side: 1,
    color: '#c9cbcc',
  },
  // Une fenêtre du fond, ouverte.
  {
    id: 'demo-fenetre-chambre',
    kind: 'window',
    entityId: 'binary_sensor.fenetre_chambre',
    a: [-9.062, 0.83, -6.837],
    b: [-8.215, 2.362, -6.942],
    side: 1,
    color: '#987358',
  },
];

/** Ajoute la page de démonstration si elle n'y est pas déjà. */
export function withDemoFloorplan(config: DashboardConfigV2): DashboardConfigV2 {
  if (config.pages.some(p => p.id === ID)) return config;
  return {
    ...config,
    pages: [
      ...config.pages,
      {
        id: ID,
        label: 'Maison 3D',
        icon: 'Home',
        type: 'floorplan',
        order: Math.max(-1, ...config.pages.map(p => p.order)) + 1,
        floorplan: { image: '', model: MODEL, idleRotate: true, parts: PARTS },
      },
    ],
    layouts: { ...config.layouts, [ID]: { widgets: { lg: WIDGETS, md: WIDGETS, sm: WIDGETS }, cols: { lg: 12, md: 8, sm: 4 } } },
    widgetConfigs: { ...config.widgetConfigs, [ID]: CONFIGS },
  };
}
