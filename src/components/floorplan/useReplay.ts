import { useCallback, useEffect, useState } from 'react';
import { useHass } from '@hakit/core';
import type { Connection } from 'home-assistant-js-websocket';
import type { HistoryEntry } from '@/lib/floorplan';

/** Rejouées : les dernières 24 heures. */
const DAY_MS = 24 * 3_600_000;
/** Lecture accélérée : une demi-heure par seconde, la journée en 48 s. */
const SPEED = 1800;
/** Une avancée toutes les 50 ms : vingt par seconde, le soleil glisse sans à-coups. */
const TICK_MS = 50;

type History = Record<string, HistoryEntry[]>;

/** L'historique de ces entités sur la période : demandé à HA, simulé en mode mock. */
async function loadHistory(connection: Connection | null | undefined, entityIds: string[], start: number, end: number): Promise<History> {
  if (import.meta.env.MODE === 'mock') return (await import('@/mocks/demoHistory')).demoHistory(entityIds, start, end);
  if (!connection || !entityIds.length) return {};
  return connection.sendMessagePromise<History>({
    type: 'history/history_during_period',
    start_time: new Date(start).toISOString(),
    end_time: new Date(end).toISOString(),
    entity_ids: entityIds,
    // Luminosité d'une lampe, position d'un volet : des attributs, qui changent sans l'état.
    minimal_response: false,
    no_attributes: false,
    significant_changes_only: false,
  });
}

/**
 * Rejouer les 24 dernières heures : l'instant rejoué, sa lecture accélérée, et
 * l'historique de ces entités. `span` nul : on est en direct.
 */
export function useReplay(entityIds: string[]) {
  const connection = useHass(s => s.connection);
  const [span, setSpan] = useState<{ start: number; end: number } | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [history, setHistory] = useState<History>({});

  // Arrivée au présent, la lecture s'arrête d'elle-même.
  const running = playing && !!span && time < span.end;
  useEffect(() => {
    if (!running || !span) return;
    const timer = window.setInterval(() => setTime(t => Math.min(span.end, t + TICK_MS * SPEED)), TICK_MS);
    return () => window.clearInterval(timer);
  }, [running, span]);

  const close = useCallback(() => {
    setSpan(null);
    setPlaying(false);
  }, []);

  return {
    span,
    time,
    running,
    history,
    close,
    seek: setTime,
    open() {
      const end = Date.now();
      const start = end - DAY_MS;
      setSpan({ start, end });
      setTime(start);
      setPlaying(true);
      setHistory({});
      // Sans historique, lampes et portes restent dans leur état du moment.
      loadHistory(connection, entityIds, start, end).then(
        result => setHistory(result ?? {}),
        () => {}
      );
    },
    toggle() {
      if (!span) return;
      // Relancée une fois au présent : la journée repart du début.
      if (!running && time >= span.end) setTime(span.start);
      setPlaying(!running);
    },
  };
}
