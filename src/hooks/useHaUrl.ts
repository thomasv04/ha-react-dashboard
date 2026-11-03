import { useCallback } from 'react';
import { useHass } from '@hakit/core';
import { haBaseUrl, resolveHaUrl } from '@/lib/ha-url';

/**
 * Résout un chemin renvoyé par Home Assistant (`/api/media_player_proxy/…`)
 * par rapport à l'instance réellement connectée — voir `@/lib/ha-url`.
 */
export function useHaUrl(): (url: string | undefined | null) => string | undefined {
  const wsUrl = useHass(s => (s as { connection?: { socket?: { url?: string } } }).connection?.socket?.url);
  const base = haBaseUrl(wsUrl, import.meta.env.VITE_HA_URL as string | undefined);
  return useCallback((url: string | undefined | null) => resolveHaUrl(url, base), [base]);
}
