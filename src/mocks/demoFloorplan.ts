import type { DashboardConfigV2, GridWidget } from '@/context/DashboardLayoutContext';
import type { FloorplanCable, FloorplanPart, FloorplanRoom } from '@/lib/floorplan';
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
  chip('demo-temperature', [-11.2, 0.5, -4.6]),
  // Un capteur de température par pièce : la vue thermique les retrouve.
  chip('demo-temp-sejour', [-6.5, 0.5, 1.8]),
  chip('demo-temp-cuisine', [-11.4, 0.92, 0.2]),
  chip('demo-temp-bain', [-7.1, 0.5, -5]),
  chip('demo-temp-amis', [-2.4, 0.5, -4.2]),
  // La batterie SolarFlow, où se rejoignent les câbles : son niveau.
  chip('demo-batterie', [-4.1, 0.3, 1.6]),
  // Une card n'est pas accrochée : elle reste posée en % de l'écran.
  { id: 'demo-meteo', type: 'weather', x: 0, y: 0, w: 2, h: 1, pos: { x: 88, y: 22, w: 20, h: 32 } },
];

const CONFIGS = {
  'demo-cuisine': { type: 'chip', entityId: 'light.bandeau_led_cuisine', glow: true, glowSize: 12 },
  'demo-salon': { type: 'chip', entityId: 'light.living_room', glow: true, glowSize: 12 },
  'demo-chambre': { type: 'chip', entityId: 'light.chambre', glow: true, glowSize: 12 },
  'demo-couloir': { type: 'chip', entityId: 'binary_sensor.couloir_mouvement' },
  'demo-temperature': { type: 'chip', entityId: 'sensor.temperature_chambre_temperature' },
  'demo-temp-sejour': { type: 'chip', entityId: 'sensor.temperature_sejour' },
  'demo-temp-cuisine': { type: 'chip', entityId: 'sensor.temperature_cuisine' },
  'demo-temp-bain': { type: 'chip', entityId: 'sensor.temperature_salle_de_bain' },
  'demo-temp-amis': { type: 'chip', entityId: 'sensor.temperature_chambre_amis' },
  'demo-meteo': { type: 'weather', entityId: 'weather.home' },
  'demo-batterie': { type: 'chip', entityId: 'sensor.solarflow_2400_ac_electric_level' },
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

/** Les pièces, dessinées au sol : un rectangle chacune, du nord (z−) au sud. */
const room = (id: string, name: string, x0: number, x1: number, z0: number, z1: number): FloorplanRoom => ({
  id,
  name,
  y: 0,
  points: [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ],
});

/**
 * Le circuit d'une batterie Zendure SolarFlow, l'installation du mock : tout
 * passe par elle, au sud du séjour. Chaque câble est tracé au sol dans le sens
 * où va l'énergie quand sa valeur est positive.
 */
const HUB: [number, number, number] = [-4.1, 0, 1.6];
const CABLES: FloorplanCable[] = [
  {
    id: 'demo-cable-solaire',
    kind: 'solar',
    entityId: 'sensor.din_panneaux_solaire_puissance',
    points: [[-5.4, 0, -1.9], [-4.1, 0, -1.9], HUB],
  },
  {
    id: 'demo-cable-reseau',
    kind: 'grid',
    entityId: 'sensor.solarflow_2400_ac_grid_input_power',
    points: [[-8.4, 0, 1.6], HUB],
  },
  {
    id: 'demo-cable-maison',
    kind: 'home',
    entityId: 'sensor.solarflow_2400_ac_output_home_power',
    points: [HUB, [-2.2, 0, 1.6], [-2.2, 0, 0.8]],
  },
];

const ROOMS: FloorplanRoom[] = [
  room('demo-cuisine', 'Cuisine', -13, -8.85, -2.15, 2.6),
  room('demo-sejour', 'Séjour', -8.85, -1.03, -2.15, 2.62),
  room('demo-chambre', 'Chambre', -12.9, -9.55, -6.75, -2.55),
  room('demo-bain', 'Salle de bain', -7.95, -6.2, -6.75, -3.65),
  room('demo-eau', "Salle d'eau", -5.82, -4.07, -6.75, -2.55),
  room('demo-amis', "Chambre d'amis", -3.81, -1.06, -6.75, -2.85),
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
        floorplan: { image: '', model: MODEL, idleRotate: true, lampGlow: true, parts: PARTS, rooms: ROOMS, cables: CABLES },
      },
    ],
    layouts: { ...config.layouts, [ID]: { widgets: { lg: WIDGETS, md: WIDGETS, sm: WIDGETS }, cols: { lg: 12, md: 8, sm: 4 } } },
    widgetConfigs: { ...config.widgetConfigs, [ID]: CONFIGS },
  };
}
