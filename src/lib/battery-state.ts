export type PackState = 'charging' | 'discharging' | 'idle';

/**
 * Normalise l'état d'un pack batterie.
 *
 * Les onduleurs ne s'accordent pas : certains publient un libellé
 * (`charging`), d'autres un code numérique (`1`), d'autres encore la
 * traduction affichée (`En charge`). Un `includes('charg')` naïf ne voit rien
 * d'un `"1"` — d'où cette table.
 *
 * Extrait d'`EnergyCard` où il était privé, pour être partagé avec le widget
 * de flux d'énergie.
 */
export function normalizePackState(raw: string): PackState {
  const v = raw.trim();
  if (['charging', 'En charge', '1'].includes(v)) return 'charging';
  if (['discharging', 'En décharge', '2'].includes(v)) return 'discharging';
  return 'idle';
}
