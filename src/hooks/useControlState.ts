import { useSafeEntity } from './useSafeEntity';
import { useEntities } from './useEntities';
import { isActiveState } from '@/lib/ha-service';
import type { RoomControl } from '@/types/widget-configs';

/**
 * État actif d'un bouton de pièce.
 */
export function useControlState(ctrl: RoomControl): { active: boolean } {
  const stateEntity = useSafeEntity(ctrl.stateEntity ?? '');
  // Bouton dérivé d'un domaine de zone : actif dès qu'une de ses entités l'est.
  const groupIds = ctrl.entityIds ?? [];
  const group = useEntities(groupIds);

  // Sans entité d'état, le bouton n'a pas d'« allumé » : choisir une couleur
  // le montre actif.
  const active = groupIds.length
    ? groupIds.some(id => isActiveState(group?.[id]?.state))
    : ctrl.stateEntity
      ? isActiveState(stateEntity?.state)
      : Boolean(ctrl.color);

  return { active };
}
