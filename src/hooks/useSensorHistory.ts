import { useState, useEffect, useRef } from 'react';
import { useHass } from '@hakit/core';

// HA >= 2022.12 minimal_response format
type NewEntry = { s: string; lc?: number; lu?: number };
// HA < 2022.12 format
type OldEntry = { state: string; last_changed: string };

type HistoryResult = Record<string, NewEntry[]> | OldEntry[][];

export function useSensorHistory(
  entityId: string,
  hours: number = 24,
  refreshInterval: number = 5 * 60 * 1000
): { data: number[]; loading: boolean } {
  const [data, setData] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const { connection } = useHass();
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    if (!connection || !entityId) {
      setData([]);
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
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

        let rawValues: number[] = [];

        if (Array.isArray(result)) {
          // Old HA format: array of arrays
          const entityData = result[0] as OldEntry[] | undefined;
          if (entityData) {
            rawValues = entityData.map(e => parseFloat(e.state)).filter(v => !isNaN(v));
          }
        } else if (result && typeof result === 'object') {
          // New HA format (>= 2022.12): dict keyed by entityId
          const entityData = result[entityId] as NewEntry[] | undefined;
          if (entityData) {
            rawValues = entityData.map(e => parseFloat(e.s)).filter(v => !isNaN(v));
          }
        }

        const maxPoints = 50;
        if (rawValues.length > maxPoints) {
          const step = Math.ceil(rawValues.length / maxPoints);
          setData(rawValues.filter((_, i) => i % step === 0));
        } else {
          setData(rawValues);
        }
      } catch (err) {
        console.error(`[useSensorHistory] Error for ${entityId}:`, err);
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
  }, [connection, entityId, hours, refreshInterval]);

  return { data, loading };
}
