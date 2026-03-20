import { useEffect, useRef } from 'react';
import { useHass } from '@hakit/core';
import { useToast } from '@/context/ToastContext';

/**
 * Subscribes to the custom HA event `ha_dashboard_toast` over the existing
 * WebSocket connection and displays a toast notification.
 *
 * Fire from an automation:
 *   action:
 *     - event: ha_dashboard_toast
 *       event_data:
 *         title: "Le courrier est arrivé !"
 *         description: "Capteur boîte aux lettres déclenché"
 *         persistent: true          # optional, default false
 *         duration_ms: 8000         # optional, default 5000
 *         actions:                  # optional list of action buttons
 *           - label: "Voir sonnette"
 *             service: "input_boolean.turn_on"
 *             service_data:
 *               entity_id: input_boolean.show_camera_sonnette
 *           - label: "Ignorer"
 */

interface HAToastAction {
  label: string;
  /** Full service name e.g. "light.turn_on" or domain+service split */
  service?: string;
  service_data?: Record<string, unknown>;
  variant?: 'default' | 'primary' | 'danger';
}

interface HAToastEvent {
  title: string;
  description?: string;
  persistent?: boolean;
  duration_ms?: number;
  /** Sound preset: 'notification' | 'alert' | 'success' | 'warning', URL, or false to mute */
  sound?: string | false;
  actions?: HAToastAction[];
}

export function useHAToast() {
  const connection = useHass(s => s.connection);
  const { addToast } = useToast();
  const helpers = useHass(s => s.helpers);

  // Stable refs so the effect doesn't re-subscribe when these change identity
  const addToastRef = useRef(addToast);
  const helpersRef = useRef(helpers);
  useEffect(() => {
    addToastRef.current = addToast;
  }, [addToast]);
  useEffect(() => {
    helpersRef.current = helpers;
  }, [helpers]);

  useEffect(() => {
    if (!connection) return;

    // cancelled flag handles React 18 StrictMode double-invoke:
    // if cleanup runs before the Promise resolves, we immediately unsubscribe
    let cancelled = false;
    let unsubscribeFn: (() => void) | undefined;

    connection
      .subscribeEvents((event: { data: HAToastEvent }) => {
        const { title, description, persistent, duration_ms, sound, actions } = event.data;

        addToastRef.current({
          title,
          description,
          persistent: persistent ?? false,
          durationMs: duration_ms ?? 5000,
          sound: sound === undefined ? 'notification' : sound,
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
      }, 'ha_dashboard_toast')
      .then(unsub => {
        if (cancelled) {
          // Already cleaned up — unsubscribe immediately
          (unsub as unknown as () => void)();
        } else {
          unsubscribeFn = unsub as unknown as () => void;
        }
      });

    return () => {
      cancelled = true;
      unsubscribeFn?.();
    };
  }, [connection]); // Only re-subscribe when the WebSocket connection changes
}
