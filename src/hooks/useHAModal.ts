import { useEffect, useRef } from 'react';
import { useHass } from '@hakit/core';
import { useModal } from '@/context/ModalContext';
import { callHAService } from '@/lib/ha-service';

interface HAModalAction {
  label: string;
  service?: string;
  service_data?: Record<string, unknown>;
  variant?: 'default' | 'primary' | 'danger';
}

interface HAModalEvent {
  title?: string;
  content?: string;
  content_type?: 'markdown' | 'html' | 'plain';
  persistent?: boolean;
  width?: 'sm' | 'md' | 'lg' | 'full';
  sound?: string | false;
  dismissible?: boolean;
  actions?: HAModalAction[];
}

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
        const { title, content, content_type, persistent, width, sound, dismissible, actions } = event.data;

        // Process content based on type
        let processedContent: string | { type: 'markdown' | 'html' | 'plain'; value: string } | undefined;

        if (content) {
          if (content_type && content_type !== 'plain') {
            processedContent = { type: content_type, value: content };
          } else {
            processedContent = content;
          }
        }

        openModalRef.current({
          title,
          content: processedContent,
          persistent: persistent ?? false,
          width: width ?? 'md',
          sound: sound === undefined ? 'notification' : sound,
          dismissible: dismissible ?? true,
          actions: actions?.map(a => ({
            label: a.label,
            variant: a.variant ?? 'default',
            onClick: () => {
              if (a.service) {
                const parts = a.service.split('.');
                if (parts.length === 2) {
                  callHAService(helpersRef.current, parts[0], parts[1], {}, a.service_data);
                }
              }
            },
          })),
        });
      }, 'ha_dashboard_modal')
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
