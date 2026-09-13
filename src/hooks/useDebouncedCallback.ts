import { useCallback, useRef } from 'react';

/**
 * Diffère un appel tant qu'il en arrive d'autres.
 *
 * Pour les commandes qu'un geste continu déclenche en rafale — un curseur de
 * luminosité, un curseur de volume : Home Assistant n'a besoin que de la
 * dernière position, pas des quarante intermédiaires.
 */
export function useDebouncedCallback<T extends (...args: never[]) => void>(fn: T, delay: number): T {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Arrow inline en premier argument : le compilateur React refuse une
  // expression `function` castée, il ne peut pas en analyser les dépendances.
  const debounced = useCallback(
    (...args: Parameters<T>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
  return debounced as unknown as T;
}
