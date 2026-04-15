import { createContext, useContext } from 'react';

/**
 * Signals that the MoreInfo modal animation is complete and it is safe to
 * run expensive effects (e.g. history data fetches via useEntityHistory).
 *
 * Default: true — so components used outside a MoreInfoModal work normally.
 */
export const MoreInfoReadyContext = createContext<boolean>(true);

export function useMoreInfoReady(): boolean {
  return useContext(MoreInfoReadyContext);
}
