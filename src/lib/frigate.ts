import { translateOr } from '@/i18n/translate-or';

/**
 * Événements Frigate, lus par l'intégration Frigate de Home Assistant :
 * `frigate/events/get` au WebSocket, vignettes et clips par son proxy.
 */

export interface FrigateEvent {
  id: string;
  /** Nom de la caméra côté Frigate (`entree`, pas `camera.entree`). */
  camera: string;
  label: string;
  /** Secondes depuis l'époque. */
  start_time: number;
  end_time?: number | null;
  has_clip?: boolean;
}

/**
 * Vignette, photo ou clip d'un événement, par le proxy de l'intégration.
 * Le chemin `notifications` ne demande pas de jeton : c'est celui des
 * notifications mobiles, et un `<img>` ne sait pas en porter.
 */
export const frigateMedia = (id: string, kind: 'thumbnail.jpg' | 'snapshot.jpg' | 'clip.mp4') =>
  `/api/frigate/notifications/${encodeURIComponent(id)}/${kind}`;

/** L'étiquette traduite (« Personne »), ou telle quelle si elle est inconnue. */
export const frigateLabel = (t: (key: string) => string, label: string) => translateOr(t, `widgets.camera_events.labels.${label}`, label);

/** Les étiquettes qui ont un compteur, dans l'ordre de l'Echo Show : personnes, puis colis, puis le reste. */
const COUNTED = ['person', 'package', 'car', 'animal', 'dog', 'cat'];

/** Combien d'événements par étiquette, les plus parlantes d'abord. */
export function countByLabel(events: FrigateEvent[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.label, (counts.get(e.label) ?? 0) + 1);
  return [...counts].sort(([a, x], [b, y]) => {
    const ia = COUNTED.indexOf(a);
    const ib = COUNTED.indexOf(b);
    if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    return y - x;
  });
}

/** La réponse de `frigate/events/get` : une liste, ou sa forme JSON selon `decode_json`. */
export function parseEvents(raw: unknown): FrigateEvent[] {
  const list = typeof raw === 'string' ? (JSON.parse(raw) as unknown) : raw;
  if (!Array.isArray(list)) return [];
  return list
    .filter((e): e is FrigateEvent => !!e && typeof e === 'object' && typeof e.id === 'string' && typeof e.start_time === 'number')
    .sort((a, b) => b.start_time - a.start_time);
}
