import { useEffect, useRef } from 'react';
import { useHass } from '@hakit/core';
import { useModal } from '@/context/ModalContext';
import { HA_EVENT_TYPES, modalFromEvent, type HAModalEvent } from '@/lib/ha-events';

export function useHAModal() {
  const connection = useHass(s => s.connection);
  const { openModal } = useModal();
  const helpers = useHass(s => s.helpers);

  // Stable refs to avoid re-subscription
  const openModalRef = useRef(openModal);
  const helpersRef = useRef(helpers);

  useEffect(() => {
    openModalRef.current = openModal;
  }, [openModal]);

  useEffect(() => {
    helpersRef.current = helpers;
  }, [helpers]);

  useEffect(() => {
    if (!connection) return;

    let cancelled = false;
    let unsubscribeFn: (() => void) | undefined;

    connection
      .subscribeEvents((event: { data: HAModalEvent }) => {
        // Une modale du dashboard : `useHAPanel` s'en charge, sous les contextes des modales.
        if (event.data?.panel) return;
        openModalRef.current(modalFromEvent(event.data, helpersRef.current));
      }, HA_EVENT_TYPES.modal)
      .then(unsub => {
        const unsubscribe = unsub as unknown as () => void;
        if (cancelled) {
          unsubscribe();
        } else {
          unsubscribeFn = unsubscribe;
        }
      });

    return () => {
      cancelled = true;
      unsubscribeFn?.();
    };
  }, [connection]);
}
