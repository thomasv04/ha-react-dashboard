import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { useHeldValue } from '@/hooks/useHeldValue';
import { useI18n } from '@/i18n';

export const ROUND_BUTTON =
  'flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)] text-[var(--ds-ink)] active:scale-95 transition-transform';

export type CoverCommand = 'open_cover' | 'close_cover' | 'stop_cover' | 'toggle';

/** Un volet : sa position tenue au doigt, ses commandes et son état lisible. Partagé par les cards Volet et Volets par section. */
export function useCover(entityId: string) {
  const { t } = useI18n();
  const entity = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);
  const playFeedback = useSoundFeedback();

  const haPosition = entity?.attributes.current_position as number | undefined;
  // Position posée au doigt, tenue 3 s après le dernier geste : le volet en
  // marche ne fait pas sauter la pilule, et rien ne revient en arrière avant HA.
  const [heldPosition, holdPosition] = useHeldValue(haPosition);

  // Envoyée une seule fois, au relâchement.
  const sendPosition = (position: number) => {
    holdPosition(position);
    helpers.callService({
      domain: 'cover',
      service: 'set_cover_position',
      target: { entity_id: entityId },
      serviceData: { position: Math.round(position) },
    });
  };

  const call = (service: CoverCommand) => {
    helpers.callService({ domain: 'cover', service, target: { entity_id: entityId } });
    playFeedback(service === 'open_cover' ? 'door_open' : service === 'close_cover' ? 'door_close' : 'warning');
  };

  const state = entity?.state ?? '';
  const position = heldPosition ?? 0;
  const supportsPosition = haPosition !== undefined;
  const stateLabel =
    state === 'open'
      ? t('widgets.cover.open')
      : state === 'closed'
        ? t('widgets.cover.closed')
        : state === 'opening'
          ? t('widgets.cover.opening')
          : state === 'closing'
            ? t('widgets.cover.closing')
            : state;

  return {
    entity,
    state,
    position,
    supportsPosition,
    isOpen: state === 'open' || position > 0,
    stateLabel,
    stateWithPosition: supportsPosition && state === 'open' ? t('widgets.cover.percentOpen', { value: Math.round(position) }) : stateLabel,
    holdPosition,
    sendPosition,
    call,
  };
}
