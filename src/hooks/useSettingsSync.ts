import { useEffect, useRef, useCallback } from 'react';
import { apiUrl } from '@/lib/api-base';

const DEVICE_ID_KEY = 'ha_dashboard_device_id';
const SYNC_INTERVAL_MS = 4_000;
const DEBOUNCE_MS = 3_500;

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `device-${Date.now()}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function useSettingsSync<T extends object>(
  settings: T,
  onRemoteUpdate: (settings: T) => void
) {
  const deviceId = useRef(getOrCreateDeviceId());
  const lastRevisionRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track last pushed snapshot to avoid pushing unchanged data
  const lastPushedRef = useRef<string>('');
  // Track whether we've done the initial pull
  const initialPullDoneRef = useRef(false);

  const pushToServer = useCallback(async (data: T) => {
    const serialized = JSON.stringify(data);
    if (serialized === lastPushedRef.current) return;
    try {
      const res = await fetch(apiUrl('/api/settings/current'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId.current,
          data,
          expected_revision: lastRevisionRef.current,
        }),
      });
      if (res.ok) {
        const { revision } = await res.json() as { revision: number };
        lastRevisionRef.current = revision;
        lastPushedRef.current = serialized;
      }
    } catch {
      // network error — retry next debounce cycle
    }
  }, []);

  const pullFromServer = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/api/settings/current?device_id=${deviceId.current}`));
      if (!res.ok) return;
      const json = await res.json() as { revision?: number; data?: T };
      const { revision, data } = json;
      if (!data || revision === undefined) return;
      if (revision > lastRevisionRef.current) {
        lastRevisionRef.current = revision;
        lastPushedRef.current = JSON.stringify(data);
        onRemoteUpdate(data);
      }
    } catch {
      // ignore network errors
    }
  }, [onRemoteUpdate]);

  // Initial pull on mount — load persisted settings from server
  useEffect(() => {
    if (initialPullDoneRef.current) return;
    initialPullDoneRef.current = true;
    pullFromServer();
  }, [pullFromServer]);

  // Debounce push local → server when settings change
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => pushToServer(settings), DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [settings, pushToServer]);

  // Poll server for changes from other devices
  useEffect(() => {
    syncIntervalRef.current = setInterval(pullFromServer, SYNC_INTERVAL_MS);
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [pullFromServer]);
}
