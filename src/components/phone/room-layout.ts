import { WIDGET_DISPOSITIONS } from '@/widgets';
import type { DashboardLayout, GridWidget } from '@/context/DashboardLayoutContext';
import type { WidgetConfig, WidgetConfigs } from '@/types/widget-configs';

/**
 * Les appareils d'une pièce, dans l'ordre de la maquette « Pièce — Salon » :
 * le lecteur en tête, le chauffage, les lumières, puis le reste. Tailles en
 * colonnes de la trame du téléphone (4 colonnes) : 2 = une demi-largeur.
 */
const DEVICES: { domain: string; type: GridWidget['type']; w: number; h: number; extra?: Record<string, unknown> }[] = [
  { domain: 'media_player', type: 'media_player', w: 4, h: 2 },
  { domain: 'climate', type: 'thermostat', w: 4, h: 3, extra: { minTemp: 10, maxTemp: 30 } },
  { domain: 'light', type: 'light', w: 2, h: 1 },
  { domain: 'cover', type: 'cover', w: 2, h: 3 },
  { domain: 'fan', type: 'fan', w: 2, h: 1 },
  { domain: 'lock', type: 'lock', w: 2, h: 1 },
  { domain: 'vacuum', type: 'vacuum', w: 4, h: 3 },
];

/** Ce qu'il faut d'une zone Home Assistant pour la mettre en page. */
export interface RoomArea {
  area_id: string;
  entities: { entity_id: string }[];
}

/**
 * La page d'une pièce, déduite de sa zone : un seul panneau, une tuile par
 * appareil pilotable. Pure : vérifiable sans Home Assistant.
 */
export function buildRoomLayout(area: RoomArea): { layout: DashboardLayout; widgetConfigs: WidgetConfigs } {
  const widgetConfigs: WidgetConfigs = {};
  const widgets: GridWidget[] = DEVICES.flatMap(({ domain, type, w, h, extra }) =>
    area.entities
      .filter(e => e.entity_id.startsWith(`${domain}.`))
      .map(e => {
        const id = `${type}-${e.entity_id}`;
        const disposition = WIDGET_DISPOSITIONS[type]?.[0];
        widgetConfigs[id] = { type, entityId: e.entity_id, ...extra } as WidgetConfig;
        return { id, type, w, h, ...(disposition && { disposition: disposition.id }) };
      })
  );
  // Une seule card pour les caméras de la pièce : elle passe de l'une à l'autre.
  const cameras = area.entities.filter(e => e.entity_id.startsWith('camera.')).map(e => ({ entityId: e.entity_id }));
  if (cameras.length) {
    widgetConfigs.camera = { type: 'camera', cameras } as WidgetConfig;
    widgets.push({ id: 'camera', type: 'camera', w: 4, h: 3 });
  }
  return { layout: { panels: widgets.length ? [{ id: `room-${area.area_id}`, cols: 4, widgets }] : [] }, widgetConfigs };
}
