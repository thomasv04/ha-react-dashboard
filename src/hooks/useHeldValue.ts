import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * La valeur de Home Assistant, sauf pendant `holdMs` après le dernier geste :
 * la valeur posée au doigt l'emporte. Un volet en marche remonte sa position
 * plusieurs fois par seconde ; sans ça, la pilule sauterait sous le doigt, et
 * reviendrait en arrière le temps que HA confirme.
 *
 * Inspiré de `stores/hold.ts` de Paddock (https://github.com/paduction/paddock, MIT).
 */
export function useHeldValue<T>(haValue: T, holdMs = 3000): [T, (value: T, ms?: number) => void] {
  const [held, setHeld] = useState<{ value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const hold = useCallback(
    (value: T, ms = holdMs) => {
      setHeld({ value });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setHeld(null), ms);
    },
    [holdMs]
  );

  return [held ? held.value : haValue, hold];
}
