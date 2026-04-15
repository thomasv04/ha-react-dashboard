import { useRef, useCallback } from 'react';

interface LongPressHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
}

export function useLongPress(onLongPress: () => void, duration = 500): LongPressHandlers {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(
    (e: React.PointerEvent) => {
      // Only primary pointer (finger or left mouse)
      if (e.button !== undefined && e.button !== 0) return;
      timer.current = setTimeout(() => {
        onLongPress();
        timer.current = null;
      }, duration);
    },
    [onLongPress, duration]
  );

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
  };
}
