import { useSafeEntity } from './useSafeEntity';
import { useColor } from './useColor';
import type { RoomControl } from '@/types/widget-configs';

/** États de repos : tout le reste compte comme actif — `on`, mais aussi `open`, `heat`, `playing`… */
const IDLE = new Set(['off', 'closed', 'unavailable', 'unknown', 'none', 'idle', 'standby', '']);

/**
 * Couleur et état actif d'un bouton de pièce.
 *
 * Partagé par RoomCard et RoomsGrid, dont les boutons ne diffèrent que par leur
 * habillage — la logique dupliquée y divergeait.
 */
export function useControlState(ctrl: RoomControl): { color: string; active: boolean } {
  const stateEntity = useSafeEntity(ctrl.stateEntity ?? '');
  const color = useColor(ctrl.color) ?? '#60a5fa';
  // Sans entité d'état, le bouton n'a pas d'« allumé » : la couleur choisie
  // devient sa couleur tout court. Sinon le réglage restait sans effet, et
  // c'était le bug — un bouton sans entité d'état ne changeait jamais de teinte.
  const active = ctrl.stateEntity ? !IDLE.has(stateEntity?.state ?? '') : Boolean(ctrl.color);
  return { color, active };
}
