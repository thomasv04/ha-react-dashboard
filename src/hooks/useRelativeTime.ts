import { useState, useEffect } from 'react';

/** Renvoyé quand l'horodatage a moins d'une minute — à traduire par l'appelant. */
export const JUST_NOW = '__justNow__';

/**
 * Durée écoulée depuis un horodatage ISO, en forme courte (`5m`, `3h`, `2j`).
 * Se réévalue toutes les 30 s pour que l'affichage ne fige pas.
 */
export function useRelativeTime(isoTimestamp: string | undefined): string {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!isoTimestamp) return '';
  // eslint-disable-next-line react-hooks/purity
  const diffMin = Math.floor((Date.now() - new Date(isoTimestamp).getTime()) / 60_000);
  if (diffMin < 1) return JUST_NOW;
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return `${Math.floor(diffH / 24)}j`;
}
