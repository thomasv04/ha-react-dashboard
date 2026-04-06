import { useEffect, useRef } from 'react';
import { useHass } from '@hakit/core';
import { useModal } from '@/context/ModalContext';

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
        const {
          title,
          content,
          content_type,
          persistent,
          width,
          sound,
          dismissible,
          actions,
        } = event.data;

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
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (helpersRef.current.callService as any)({
                    domain: parts[0],
                    service: parts[1],
                    serviceData: a.service_data,
                  });
                }
              }
            },
          })),
        });
      }, 'ha_dashboard_modal')
      .then(unsub => {
        if (cancelled) {
          (unsub as unknown as () => void)();
        } else {
          unsubscribeFn = unsub as unknown as () => void;
        }
      });

    return () => {
      cancelled = true;
      unsubscribeFn?.();
    };
  }, [connection]);
}