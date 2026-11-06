import { useEffect, useRef } from 'react';
import { useHass } from '@hakit/core';
import { useToast } from '@/context/ToastContext';
import { HA_EVENT_TYPES, toastFromEvent, type HAToastEvent } from '@/lib/ha-events';

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
        addToastRef.current(toastFromEvent(event.data, helpersRef.current));
      }, HA_EVENT_TYPES.toast)
      .then(unsub => {
        const unsubscribe = unsub as unknown as () => void;
        if (cancelled) {
          // Already cleaned up — unsubscribe immediately
          unsubscribe();
        } else {
          unsubscribeFn = unsubscribe;
        }
      });

    return () => {
      cancelled = true;
      unsubscribeFn?.();
    };
  }, [connection]); // Only re-subscribe when the WebSocket connection changes
}
