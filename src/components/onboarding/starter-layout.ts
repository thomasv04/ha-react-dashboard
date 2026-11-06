import { WIDGET_DISPOSITIONS } from '@/widgets';
import { areaDomains, CONTROL_DOMAINS } from '@/hooks/useAreaControls';
import type { DashboardLayout, GridWidget, LayoutPanel } from '@/context/DashboardLayoutContext';
import type { WidgetConfig, WidgetConfigs } from '@/types/widget-configs';

/** Ce qu'il faut d'une pièce Home Assistant pour la mettre en page. */
export interface StarterArea {
  area_id: string;
  name: string;
  entities: { entity_id: string }[];
}

/**
 * Les appareils qui méritent une tuile à eux, dans l'ordre de la page, et
 * combien au plus par pièce : au-delà, la pièce reste pilotable par sa tuile.
 */
const DEVICE_TILES: { domain: string; type: GridWidget['type']; max: number; extra?: Record<string, unknown> }[] = [
  { domain: 'climate', type: 'thermostat', max: 1, extra: { minTemp: 10, maxTemp: 30 } },
  { domain: 'light', type: 'light', max: 4 },
  { domain: 'cover', type: 'cover', max: 3 },
  { domain: 'media_player', type: 'media_player', max: 1, extra: { disposition: 'horizontal' } },
];

/** Pièces qui ont au moins un appareil pilotable — celles cochées d'office. */
export const hasControls = (area: StarterArea) => area.entities.some(e => e.entity_id.split('.')[0] in CONTROL_DOMAINS);

/**
 * La première page d'une installation : l'accueil et la météo, une tuile par
 * pièce, puis un panneau par pièce avec ses principaux appareils.
 *
 * Pure : elle ne lit que ce qu'on lui passe, ce qui la rend vérifiable sans
 * Home Assistant.
 */
export function buildStarterLayout(
  areas: StarterArea[],
  { weatherId, roomsTitle }: { weatherId?: string; roomsTitle: string }
): { layout: DashboardLayout; widgetConfigs: WidgetConfigs } {
  const widgetConfigs: WidgetConfigs = {};
  let n = 0;

  const tile = (type: GridWidget['type'], cols: number, config: Record<string, unknown>): GridWidget => {
    const id = `${type}-${++n}`;
    const disposition = WIDGET_DISPOSITIONS[type]?.[0];
    const size = disposition?.defaultSize.lg ?? { w: 2, h: 2 };
    widgetConfigs[id] = { type, ...config } as WidgetConfig;
    return { id, type, w: Math.min(size.w, cols), h: size.h, ...(disposition && { disposition: disposition.id }) };
  };

  const panels: LayoutPanel[] = [
    {
      id: 'panel-home',
      cols: 5,
      widgets: [tile('welcome', 5, { routines: [] }), ...(weatherId ? [tile('weather', 5, { entityId: weatherId })] : [])],
    },
  ];

  if (areas.length > 0) {
    panels.push({
      id: 'panel-rooms',
      title: roomsTitle,
      cols: 4,
      widgets: areas.map(area =>
        tile('room', 4, {
          label: area.name,
          icon: 'Home',
          area: area.area_id,
          areaControls: areaDomains(area),
        })
      ),
    });
  }

  for (const area of areas) {
    const devices = DEVICE_TILES.flatMap(({ domain, type, max, extra }) =>
      area.entities
        .filter(e => e.entity_id.startsWith(`${domain}.`))
        .slice(0, max)
        .map(e => tile(type, 6, { entityId: e.entity_id, ...extra }))
    );
    if (devices.length > 0) panels.push({ id: `panel-${area.area_id}`, title: area.name, cols: 6, widgets: devices });
  }

  return { layout: { panels }, widgetConfigs };
}
