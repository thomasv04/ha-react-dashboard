import { useState, useEffect, useRef } from 'react';
import { useHass } from '@hakit/core';
import { useMoreInfoReady } from '@/context/MoreInfoReadyContext';

export interface HistoryPoint {
  value: number;
  time: Date;
  state: string;
}

export interface EntityHistoryResult {
  data: HistoryPoint[];
  loading: boolean;
  error: string | null;
}

// HA >= 2022.12 minimal_response format
type NewEntry = { s: string; lc?: number; lu?: number };
// HA < 2022.12 format
type OldEntry = { state: string; last_changed: string };

type HistoryResult = Record<string, NewEntry[]> | OldEntry[][];

export function useEntityHistory(entityId: string, hours: number = 24, refreshInterval: number = 5 * 60 * 1000): EntityHistoryResult {
  const [data, setData] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { connection } = useHass();
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);
  // Defer fetching until the MoreInfo modal animation is complete (avoids setState during FLIP)
  const ready = useMoreInfoReady();

  useEffect(() => {
    if (!ready || !connection || !entityId) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

        const result = await connection.sendMessagePromise<HistoryResult>({
          type: 'history/history_during_period',
          start_time: start.toISOString(),
          end_time: now.toISOString(),
          entity_ids: [entityId],
          minimal_response: true,
          significant_changes_only: true,
        });

        let points: HistoryPoint[] = [];

        if (Array.isArray(result)) {
          // Old HA format: array of arrays
          const entityData = result[0] as OldEntry[] | undefined;
          if (entityData) {
            points = entityData.map(e => ({
              value: parseFloat(e.state),
              time: new Date(e.last_changed),
              state: e.state,
            }));
          }
        } else if (result && typeof result === 'object') {
          // New HA format (>= 2022.12): dict keyed by entityId
          const entityData = result[entityId] as NewEntry[] | undefined;
          if (entityData && entityData.length > 0) {
            // First entry has `last_changed` as ISO or `lc` as unix seconds
            // Subsequent entries only have `lc` if the state *changed*
            // For entries without `lc`, interpolate time between known timestamps
            const startTs = start.getTime() / 1000;
            const endTs = now.getTime() / 1000;

            // Pass 1: assign known timestamps
            const raw = entityData.map((e, i) => ({
              value: parseFloat(e.s),
              state: e.s,
              ts: e.lc ?? (i === 0 ? startTs : 0),
            }));

            // Pass 2: fill gaps by spreading unknown timestamps evenly
            let lastKnown = raw[0].ts;
            for (let i = 1; i < raw.length; i++) {
              if (raw[i].ts > 0) {
                lastKnown = raw[i].ts;
              } else {
                // Find next known timestamp
                let nextKnown = endTs;
                for (let j = i + 1; j < raw.length; j++) {
                  if (raw[j].ts > 0) {
                    nextKnown = raw[j].ts;
                    break;
                  }
                }
                // Count consecutive unknowns
                let gapCount = 0;
                for (let j = i; j < raw.length && raw[j].ts === 0; j++) gapCount++;
                // Spread evenly
                for (let j = 0; j < gapCount; j++) {
                  raw[i + j].ts = lastKnown + ((nextKnown - lastKnown) * (j + 1)) / (gapCount + 1);
                }
                i += gapCount - 1;
              }
            }

            points = raw.map(r => ({
              value: r.value,
              time: new Date(r.ts * 1000),
              state: r.state,
            }));
          }
        }

        // Downsample if too many points
        const maxPoints = 100;
        if (points.length > maxPoints) {
          const step = Math.ceil(points.length / maxPoints);
          points = points.filter((_, i) => i % step === 0);
        }

        setData(points);
      } catch (err) {
        console.error(`[useEntityHistory] Error for ${entityId}:`, err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
    intervalRef.current = setInterval(fetchHistory, refreshInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [connection, entityId, hours, refreshInterval, ready]);

  return { data, loading, error };
}
