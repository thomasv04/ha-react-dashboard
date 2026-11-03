import { useSyncExternalStore } from 'react';
import { useUser } from '@hakit/core';

// Vue invité : un état d'interface, pas d'identité. Il vit hors de React pour
// que la barre du haut, le plateau et les réglages le lisent sans fournisseur —
// y compris dans la shadow root de la carte Home Assistant. Il ne survit pas à
// un rechargement : on ne reste pas bloqué dans une vue sans outils.
let guestPreview = false;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
const getGuestPreview = () => guestPreview;

export function setGuestPreview(on: boolean) {
  guestPreview = on;
  listeners.forEach(listener => listener());
}

/** Le compte Home Assistant est administrateur — la vue invité n'y change rien. */
export function useRealAdmin(): boolean {
  return !!useUser()?.is_admin;
}

/** Vue invité active : l'interface se comporte comme pour un non-administrateur. */
export function useGuestPreview(): boolean {
  return useSyncExternalStore(subscribe, getGuestPreview);
}

/**
 * Faut-il montrer les outils d'administration ? Faux en vue invité. Ne remplace
 * pas le contrôle du serveur (`adminWrites`) : il ne décide que de l'affichage.
 */
export function useIsAdmin(): boolean {
  const real = useRealAdmin();
  const guest = useGuestPreview();
  return real && !guest;
}
