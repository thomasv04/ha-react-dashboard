import { useSyncExternalStore } from 'react';

/**
 * Combien de feuilles latérales (`Sheet`) sont ouvertes. Hors de React, comme
 * l'état « vue invité » : la feuille est portée dans `document.body` et les
 * toasts ailleurs, sans parent commun pour se passer l'information.
 */
let count = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

/** À appeler tant que la feuille est ouverte ; renvoie de quoi la déclarer fermée. */
export function registerSheet(): () => void {
  count += 1;
  emit();
  return () => {
    count -= 1;
    emit();
  };
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

/** Une feuille occupe le bord droit : les toasts se rangent à sa gauche. */
export const useSheetOpen = () => useSyncExternalStore(subscribe, () => count > 0);
