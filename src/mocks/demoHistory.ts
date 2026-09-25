import { guessCableKind, isPowerSensor, type HistoryEntry } from '@/lib/floorplan';
import { MOCK_ENTITIES } from './hassEntities';

/**
 * Mode mock : une journée simulée, pour rejouer les 24 dernières heures de la
 * page « Maison 3D » — lampes allumées au réveil et le soir, porte ouverte à
 * quelques moments, fenêtre aérée le matin, volet fermé la nuit ; les panneaux
 * qui produisent au soleil, la maison qui consomme au réveil et le soir, le
 * réseau qui comble.
 */

/** Plages horaires (heures locales) où chaque sorte d'entité est active — allumée, ouverte. */
const SCHEDULES: Record<string, [number, number][]> = {
  light: [
    [6.75, 8],
    [18.5, 23.5],
  ],
  door: [
    [7.75, 7.92],
    [12.25, 12.42],
    [18.5, 18.67],
  ],
  window: [[8.5, 9.5]],
  cover: [[7.25, 22.5]],
};

/** Un échantillon toutes les cinq minutes : assez fin pour une porte ouverte dix minutes. */
const STEP_MS = 5 * 60_000;

function kindOf(entityId: string): string | null {
  const domain = entityId.split('.')[0];
  if (domain === 'light' || domain === 'cover') return domain;
  const attributes = MOCK_ENTITIES[entityId]?.attributes;
  if (isPowerSensor(attributes)) return 'power';
  const deviceClass = attributes?.device_class;
  if (deviceClass === 'window') return 'window';
  return deviceClass === 'door' || deviceClass === 'garage_door' ? 'door' : null;
}

/** Production des panneaux, en watts : une cloche de 7 h à 20 h, 1 800 W au plus fort. */
const solar = (hour: number) => Math.round(1800 * Math.max(0, Math.sin((Math.PI * (hour - 7)) / 13)));
/** Consommation de la maison : un fond, le réveil, la soirée. */
const home = (hour: number) =>
  Math.round(150 + 40 * Math.sin(hour * 3) + (hour >= 6.75 && hour < 8 ? 900 : 0) + (hour >= 18.5 && hour < 23 ? 650 : 0));

/** Puissance d'un capteur à cette heure, selon ce que son nom dit de lui — comme pour un câble. */
function powerAt(entityId: string, hour: number) {
  const kind = guessCableKind(entityId);
  // Le réseau comble ce que les panneaux ne couvrent pas.
  if (kind === 'grid') return Math.max(0, home(hour) - solar(hour));
  return kind === 'solar' ? solar(hour) : home(hour);
}

/** L'historique de ces entités entre `start` et `end` (ms), au format de `history/history_during_period`. */
export function demoHistory(entityIds: string[], start: number, end: number): Record<string, HistoryEntry[]> {
  return Object.fromEntries(
    entityIds.flatMap(id => {
      const kind = kindOf(id);
      if (!kind) return [];
      const attributes = MOCK_ENTITIES[id]?.attributes ?? {};
      const entries: HistoryEntry[] = [];
      for (let time = start; time <= end; time += STEP_MS) {
        const date = new Date(time);
        const hour = date.getHours() + date.getMinutes() / 60;
        if (kind === 'power') {
          entries.push({ s: String(powerAt(id, hour)), lu: time / 1000 });
          continue;
        }
        const active = SCHEDULES[kind].some(([from, to]) => hour >= from && hour < to);
        const state = kind === 'cover' ? (active ? 'open' : 'closed') : active ? 'on' : 'off';
        if (state === entries[entries.length - 1]?.s) continue;
        entries.push({
          s: state,
          a: kind === 'cover' ? { ...attributes, current_position: active ? 100 : 0 } : attributes,
          lu: time / 1000,
        });
      }
      return [[id, entries]];
    })
  );
}
