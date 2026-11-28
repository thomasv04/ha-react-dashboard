import type { Area } from '@hakit/core';
import type { CoverSection } from '@/types/widget-configs';
import { areaEntityIds } from '@/hooks/useAreaControls';

export interface ResolvedSection {
  name: string;
  covers: string[];
}

/**
 * Les volets choisis à la main l'emportent ; sinon, ceux de la zone HA. Le nom
 * de la zone sert de titre quand la section n'en a pas. Une section sans volet
 * disparaît.
 */
export function resolveSections(sections: CoverSection[] | undefined, areas: Area[]): ResolvedSection[] {
  return (sections ?? []).flatMap(section => {
    const area = section.area ? areas.find(a => a.area_id === section.area) : undefined;
    const picked = (section.covers ?? []).filter(Boolean);
    const covers = picked.length ? picked : areaEntityIds(area, 'cover');
    if (!covers.length) return [];
    return [{ name: section.name || area?.name || '', covers }];
  });
}

/** Volets de « Tout ouvrir / Tout fermer » : ceux choisis, sinon tous ceux de la card, sans doublon. */
export function allTargets(allCovers: string[] | undefined, sections: ResolvedSection[]): string[] {
  const picked = (allCovers ?? []).filter(Boolean);
  return [...new Set(picked.length ? picked : sections.flatMap(s => s.covers))];
}

/** Un volet compte comme ouvert dès qu'il n'est pas fermé à 0 %. */
export function isCoverOpen(entity: { state: string; attributes: Record<string, unknown> } | undefined): boolean {
  if (!entity) return false;
  const position = entity.attributes.current_position as number | undefined;
  return position !== undefined ? position > 0 : entity.state === 'open' || entity.state === 'opening';
}
