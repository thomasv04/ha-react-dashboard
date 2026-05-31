import { useEffect, useState } from 'react';

const hasBrowserApis = () =>
  typeof globalThis.window !== 'undefined' && typeof globalThis.document !== 'undefined';

const getMotionAllowed = (): boolean => {
  if (!hasBrowserApis()) return false;
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const slowUpdate = window.matchMedia?.('(update: slow)')?.matches;
  return !document.hidden && !prefersReducedMotion && !slowUpdate;
};

function addMediaListener(query: MediaQueryList | null, listener: () => void): () => void {
  if (!query) return () => {};
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }
  return () => {};
}

export function useLowPowerMotion(): boolean {
  const [motionAllowed, setMotionAllowed] = useState(getMotionAllowed);

  useEffect(() => {
    if (!hasBrowserApis()) return;
    const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const slowUpdateQuery = window.matchMedia?.('(update: slow)');
    const update = () => setMotionAllowed(getMotionAllowed());

    const r1 = addMediaListener(reducedMotionQuery, update);
    const r2 = addMediaListener(slowUpdateQuery, update);
    document.addEventListener('visibilitychange', update);
    update();

    return () => {
      r1();
      r2();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return motionAllowed;
}
