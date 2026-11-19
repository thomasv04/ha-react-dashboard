import type { FrigateEvent } from '@/lib/frigate';

/** Échelle de la frise (maquette « Caméra — chronologie ») : un trait par minute, 20 px entre deux. */
export const PX_PER_MIN = 20;
/** Largeur minimale d'un événement : assez pour son icône et pour le doigt. */
export const MIN_BLOCK = 28;
/** Un repère horaire toutes les 5 minutes. */
const LABEL_EVERY_MIN = 5;

export interface Timeline {
  /** Largeur totale de la frise, en px ; l'instant présent est au bord droit. */
  width: number;
  blocks: { id: string; label: string; left: number; width: number }[];
  /** Repères horaires : position en px et instant (ms). */
  marks: { left: number; at: number }[];
}

/**
 * La frise des `hours` dernières heures : chaque événement à sa place, aussi
 * large que sa durée (un événement en cours court jusqu'à maintenant), et un
 * repère toutes les cinq minutes rondes.
 */
export function buildTimeline(events: FrigateEvent[], now: number, hours: number): Timeline {
  const start = now - hours * 3_600_000;
  const x = (ms: number) => ((ms - start) / 60_000) * PX_PER_MIN;
  const blocks = events
    .filter(e => e.start_time * 1000 >= start)
    .map(e => {
      const left = x(e.start_time * 1000);
      const right = x((e.end_time ?? now / 1000) * 1000);
      return { id: e.id, label: e.label, left, width: Math.max(MIN_BLOCK, right - left) };
    });
  const step = LABEL_EVERY_MIN * 60_000;
  const marks: Timeline['marks'] = [];
  for (let at = Math.ceil(start / step) * step; at <= now; at += step) marks.push({ left: x(at), at });
  return { width: x(now), blocks, marks };
}

/** Position, sur la frise, d'un instant (ms). */
export const timelineX = (at: number, now: number, hours: number) => ((at - (now - hours * 3_600_000)) / 60_000) * PX_PER_MIN;

/** « Aujourd'hui », « Hier » ou rien : le jour d'un événement, à préfixer à son heure. */
export function dayOf(at: number, now: number): 'today' | 'yesterday' | null {
  const day = (ms: number) => new Date(ms).setHours(0, 0, 0, 0);
  const diff = Math.round((day(now) - day(at)) / 86_400_000);
  return diff === 0 ? 'today' : diff === 1 ? 'yesterday' : null;
}
