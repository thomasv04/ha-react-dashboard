import { useState, useEffect } from 'react';

/** Renvoyé quand l'horodatage a moins d'une minute — à traduire par l'appelant. */
export const JUST_NOW = '__justNow__';

/** Durée écoulée depuis `since` (ms), en forme courte (`5m`, `3h`, `2j`). */
export function relativeTime(since: number, now: number = Date.now()): string {
  const diffMin = Math.floor((now - since) / 60_000);
  if (diffMin < 1) return JUST_NOW;
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return `${Math.floor(diffH / 24)}j`;
}

/**
 * Durée écoulée depuis un horodatage ISO, réévaluée toutes les 30 s pour que
 * l'affichage ne fige pas. Sans horodatage, pas de minuteur : une card qui n'a
 * rien à dater ne se re-rend pas pour rien.
 */
export function useRelativeTime(isoTimestamp: string | undefined): string {
  const [, setTick] = useState(0);
  const active = !!isoTimestamp;
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, [active]);

  return isoTimestamp ? relativeTime(new Date(isoTimestamp).getTime()) : '';
}
