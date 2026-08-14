import { useRef, useCallback } from 'react';

interface LongPressHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
}

/** Au-delà de ce déplacement, le geste est un glissement, pas un appui. */
const MOVE_TOLERANCE_PX = 10;

/**
 * Appui long sur une card, **annulé dès que le pointeur glisse**.
 *
 * Sans ce seuil, régler la jauge d'un thermostat ou un curseur de luminosité
 * maintenait le pointeur enfoncé plus de 500 ms sans quitter la card : la fiche
 * « plus d'infos » s'ouvrait en plein réglage, et le `click` de fin de geste la
 * rouvrait ensuite. `moved` sert justement à filtrer ce clic-là.
 */
export function useLongPress(onLongPress: () => void, duration = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(
    (e: React.PointerEvent) => {
      // Only primary pointer (finger or left mouse)
      if (e.button !== undefined && e.button !== 0) return;
      moved.current = false;
      origin.current = { x: e.clientX, y: e.clientY };
      timer.current = setTimeout(() => {
        onLongPress();
        timer.current = null;
      }, duration);
    },
    [onLongPress, duration]
  );

  const move = useCallback(
    (e: React.PointerEvent) => {
      if (!origin.current) return;
      if (Math.hypot(e.clientX - origin.current.x, e.clientY - origin.current.y) > MOVE_TOLERANCE_PX) {
        moved.current = true;
        cancel();
      }
    },
    [cancel]
  );

  const end = useCallback(() => {
    origin.current = null;
    cancel();
  }, [cancel]);

  const handlers: LongPressHandlers = {
    onPointerDown: start,
    onPointerMove: move,
    onPointerUp: end,
    onPointerLeave: end,
  };

  // `moved` reste vrai jusqu'au `pointerdown` suivant : le `click` qui suit un
  // glissement peut donc être ignoré par l'appelant.
  return { handlers, moved };
}
