import { useEffect, useState } from 'react';
import { useHass } from '@hakit/core';
import { parseEvents, type FrigateEvent } from '@/lib/frigate';

/** Une minute : un nouvel événement apparaît vite, sans harceler Frigate. */
const REFRESH_MS = 60_000;
/** Assez pour 12 vignettes et une chronologie par caméra. */
const LIMIT = 50;

interface FrigateEventsState {
  events: FrigateEvent[];
  status: 'loading' | 'ready' | 'error';
}

/** Même liste : mêmes événements, mêmes fins — un événement en cours finit. */
const sameEvents = (a: FrigateEvent[], b: FrigateEvent[]) =>
  a.length === b.length && a.every((e, i) => e.id === b[i].id && e.end_time === b[i].end_time);

/**
 * Les événements des dernières `hours` heures, du plus récent au plus ancien.
 *
 * `instanceId` : l'identifiant de l'instance dans l'intégration Frigate,
 * `frigate` par défaut. `cameras` : noms Frigate séparés par des virgules ;
 * vide, toutes. Une chaîne et non une liste : stable d'un rendu à l'autre.
 */
export function useFrigateEvents({
  instanceId,
  cameras,
  hours,
}: {
  instanceId: string;
  cameras: string;
  hours: number;
}): FrigateEventsState {
  const connection = useHass(s => s.connection);
  const [state, setState] = useState<FrigateEventsState>({ events: [], status: 'loading' });

  useEffect(() => {
    if (!connection || typeof connection.sendMessagePromise !== 'function') {
      setState({ events: [], status: 'error' });
      return;
    }
    const names = cameras
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);
    let alive = true;
    const load = async () => {
      try {
        const raw = await connection.sendMessagePromise({
          type: 'frigate/events/get',
          instance_id: instanceId,
          ...(names.length > 0 && { cameras: names }),
          after: Math.floor(Date.now() / 1000) - hours * 3600,
          limit: LIMIT,
          decode_json: true,
        });
        const events = parseEvents(raw);
        // Rien de neuf à la minute : la card et ses vignettes ne se re-rendent pas.
        if (alive) setState(s => (s.status === 'ready' && sameEvents(s.events, events) ? s : { events, status: 'ready' }));
      } catch {
        if (alive) setState(s => ({ events: s.events, status: 'error' }));
      }
    };
    void load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [connection, instanceId, cameras, hours]);

  return state;
}
