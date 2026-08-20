import { useSafeEntity } from './useSafeEntity';
import { useEntities } from './useEntities';
import { useColor } from './useColor';
import { isActiveState } from '@/lib/ha-service';
import type { RoomControl } from '@/types/widget-configs';

/**
 * Couleur et état actif d'un bouton de pièce.
 *
 * Partagé par RoomCard et RoomsGrid, dont les boutons ne diffèrent que par leur
 * habillage — la logique dupliquée y divergeait.
 */
export function useControlState(ctrl: RoomControl): { color: string; active: boolean } {
  const stateEntity = useSafeEntity(ctrl.stateEntity ?? '');
  // Bouton dérivé d'un domaine de zone : actif dès qu'une de ses entités l'est.
  const groupIds = ctrl.entityIds ?? [];
  const group = useEntities(groupIds);
  const color = useColor(ctrl.color) ?? '#60a5fa';

  // Sans entité d'état, le bouton n'a pas d'« allumé » : la couleur choisie
  // devient sa couleur tout court. Sinon le réglage restait sans effet, et
  // c'était le bug — un bouton sans entité d'état ne changeait jamais de teinte.
  const active = groupIds.length
    ? groupIds.some(id => isActiveState(group?.[id]?.state))
    : ctrl.stateEntity
      ? isActiveState(stateEntity?.state)
      : Boolean(ctrl.color);

  return { color, active };
}
