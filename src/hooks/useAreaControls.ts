import { useMemo } from 'react';
import { useAreas, type Area } from '@hakit/core';
import { isActiveState, toggleService } from '@/lib/ha-service';
import { useI18n } from '@/i18n';
import type { RoomControl } from '@/types/widget-configs';

/**
 * Domaines proposés comme contrôle de zone, dans l'ordre du sélecteur.
 * Un domaine absent d'ici reste accessible entité par entité.
 */
export const CONTROL_DOMAINS: Record<string, string> = {
  light: 'Lightbulb',
  switch: 'ToggleRight',
  cover: 'Blinds',
  fan: 'Fan',
  climate: 'Thermometer',
  lock: 'Lock',
  media_player: 'Speaker',
  vacuum: 'Bot',
  scene: 'Sparkles',
  script: 'Play',
  input_boolean: 'ToggleRight',
};

/** Un jeton de `areaControls` désigne un domaine entier ou une entité — le point tranche. */
export const isEntityToken = (token: string) => token.includes('.');

/** La zone HA choisie, ou `undefined`. */
export function useArea(areaId?: string): Area | undefined {
  const areas = useAreas();
  return areaId ? areas.find(a => a.area_id === areaId) : undefined;
}

/** Domaines effectivement présents dans la zone, dans l'ordre de CONTROL_DOMAINS. */
export function areaDomains(area: Area | undefined): string[] {
  const present = new Set((area?.entities ?? []).map(e => e.entity_id.split('.')[0]));
  return Object.keys(CONTROL_DOMAINS).filter(d => present.has(d));
}

/**
 * Boutons dérivés d'une zone Home Assistant, comme la card « zone » native :
 * un jeton de domaine devient un bouton qui pilote toute la zone, un jeton
 * d'entité un bouton qui pilote cette entité.
 */
export function useAreaControls(areaId?: string, tokens?: string[]): RoomControl[] {
  const area = useArea(areaId);
  const { t } = useI18n();
  return useMemo(() => buildAreaControls(area, tokens, d => t(`widgets.room.domains.${d}`)), [area, tokens, t]);
}

/** Le cœur de `useAreaControls`, sans React — c'est là qu'est la logique à vérifier. */
export function buildAreaControls(
  area: Area | undefined,
  tokens: string[] | undefined,
  domainLabel: (domain: string) => string
): RoomControl[] {
  if (!area || !tokens?.length) return [];

  return tokens.flatMap<RoomControl>(token => {
    if (isEntityToken(token)) {
      const entity = area.entities.find(e => e.entity_id === token);
      if (!entity) return [];
      const domain = token.split('.')[0];
      const [serviceDomain, service] = toggleService(domain, isActiveState(entity.state));
      return [
        {
          label: (entity.attributes.friendly_name as string | undefined) ?? token,
          icon: CONTROL_DOMAINS[domain] ?? 'Package',
          domain: serviceDomain,
          service,
          entityId: token,
          stateEntity: token,
        },
      ];
    }

    const members = area.entities.filter(e => e.entity_id.startsWith(`${token}.`));
    if (!members.length) return [];
    // Le bouton d'un domaine vise ses entités, pas la zone : `homeassistant.toggle`
    // n'est pas cantonné à un domaine, et sur `area_id` il basculait tout ce que
    // la zone contient — un clic sur « ventilation » ouvrait aussi les volets.
    const active = members.some(e => isActiveState(e.state));
    const [serviceDomain, service] = toggleService(token, active);
    return [
      {
        label: domainLabel(token),
        icon: CONTROL_DOMAINS[token] ?? 'Package',
        domain: serviceDomain,
        service,
        entityIds: members.map(e => e.entity_id),
      },
    ];
  });
}
