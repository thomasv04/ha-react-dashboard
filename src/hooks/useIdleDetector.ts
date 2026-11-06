import { useEffect, useRef, useCallback } from 'react';

interface UseIdleDetectorOptions {
  /** Délai en secondes. 0 désactive le détecteur. */
  idleTime: number;
  enabled: boolean;
  onIdle: () => void;
  onActive?: () => void;
}

/**
 * Détecte l'inactivité de l'utilisateur (souris, tactile, clavier).
 * Appelle onIdle après idleTime secondes sans interaction.
 * Appelle onActive dès qu'une interaction est détectée après l'état idle.
 */
export function useIdleDetector({ idleTime, enabled, onIdle, onActive }: UseIdleDetectorOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdleRef = useRef(false);
  // Les rappels changent à chaque rendu de l'appelant (fonctions en ligne) : en
  // dépendre réabonnait les six écouteurs et relançait le minuteur à chaque fois.
  const callbacks = useRef({ onIdle, onActive });
  useEffect(() => {
    callbacks.current = { onIdle, onActive };
  });

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isIdleRef.current) {
      isIdleRef.current = false;
      callbacks.current.onActive?.();
    }
    if (!enabled || idleTime <= 0) return;
    timerRef.current = setTimeout(() => {
      isIdleRef.current = true;
      callbacks.current.onIdle();
    }, idleTime * 1000);
  }, [enabled, idleTime]);

  useEffect(() => {
    if (!enabled || idleTime <= 0) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // démarrer le timer dès le montage

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, idleTime, resetTimer]);
}
