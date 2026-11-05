import { useEffect, useState } from 'react';
import { useHass } from '@hakit/core';
import { parseEvents, type FrigateEvent } from '@/lib/frigate';

/** Une minute : un nouvel événement apparaît vite, sans harceler Frigate. */
const REFRESH_MS = 60_000;

export interface FrigateEventsState {
  events: FrigateEvent[];
  status: 'loading' | 'ready' | 'error';
}

/**
 * Les événements des dernières `hours` heures, du plus récent au plus ancien.
 *
 * `instanceId` : l'identifiant de l'instance dans l'intégration Frigate,
 * `frigate` par défaut. `cameras` : noms Frigate ; vide, toutes.
 */
export function useFrigateEvents({
  instanceId,
  cameras,
  hours,
  limit = 50,
}: {
  instanceId: string;
  cameras: string[];
  hours: number;
  limit?: number;
}): FrigateEventsState {
  const connection = useHass(s => s.connection);
  const [state, setState] = useState<FrigateEventsState>({ events: [], status: 'loading' });
  // Le contenu, pas l'identité : la liste est souvent recréée à chaque rendu.
  const camerasKey = cameras.join(',');

  useEffect(() => {
    if (!connection || typeof connection.sendMessagePromise !== 'function') {
      setState({ events: [], status: 'error' });
      return;
    }
    let alive = true;
    const load = async () => {
      try {
        const raw = await connection.sendMessagePromise({
          type: 'frigate/events/get',
          instance_id: instanceId,
          ...(camerasKey && { cameras: camerasKey.split(',') }),
          after: Math.floor(Date.now() / 1000) - hours * 3600,
          limit,
          decode_json: true,
        });
        if (alive) setState({ events: parseEvents(raw), status: 'ready' });
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
  }, [connection, instanceId, camerasKey, hours, limit]);

  return state;
}
