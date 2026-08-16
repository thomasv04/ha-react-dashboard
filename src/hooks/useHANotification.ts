import { useEffect, useRef } from 'react';
import { useHass } from '@hakit/core';
import { useNotifications, type NotificationAction } from '@/context/NotificationContext';

/**
 * Subscribes to the custom HA event `ha_dashboard_notification` over the
 * existing WebSocket connection and files it in the dashboard's own
 * notification drawer (swipe down on the wall panel).
 *
 * Fire from an automation:
 *   action:
 *     - event: ha_dashboard_notification
 *       event_data:
 *         id: "update-2.3.0"        # optional — same id replaces, none = new entry
 *         title: "Mise à jour disponible"
 *         message: "Une nouvelle version est prête à être installée."
 *         content_type: plain       # plain | html (sanitised) | markdown (raw)
 *         level: info               # info | success | warning | error
 *         icon: Download            # lucide icon name
 *         actions:
 *           - label: "Installer"
 *             variant: primary
 *             service: hassio.addon_update
 *             service_data:
 *               addon: ha-react-dashboard
 *           - label: "Plus tard"
 *
 * Retract it the same way — `dismiss: true` with the id, or without an id to
 * clear the whole drawer:
 *     - event: ha_dashboard_notification
 *       event_data:
 *         id: "update-2.3.0"
 *         dismiss: true
 */

interface HANotificationEvent {
  id?: string;
  title?: string;
  message?: string;
  content_type?: 'plain' | 'html' | 'markdown';
  level?: 'info' | 'success' | 'warning' | 'error';
  icon?: string;
  actions?: NotificationAction[];
  /** Retire la notification `id`, ou vide la liste si `id` est absent. */
  dismiss?: boolean;
}

export function useHANotification() {
  const connection = useHass(s => s.connection);
  const { notify, dismiss, dismissAll } = useNotifications();

  // Refs stables : sans elles, chaque rendu du provider relancerait
  // l'abonnement au WebSocket.
  const storeRef = useRef({ notify, dismiss, dismissAll });
  useEffect(() => {
    storeRef.current = { notify, dismiss, dismissAll };
  }, [notify, dismiss, dismissAll]);

  useEffect(() => {
    if (!connection) return;

    // `cancelled` couvre le double montage de StrictMode : si le nettoyage
    // passe avant la résolution, on se désabonne aussitôt.
    let cancelled = false;
    let unsubscribeFn: (() => void) | undefined;

    connection
      .subscribeEvents((event: { data: HANotificationEvent }) => {
        const { id, title, message, content_type, level, icon, actions, dismiss: shouldDismiss } = event.data ?? {};

        if (shouldDismiss) {
          if (id) storeRef.current.dismiss(id);
          else storeRef.current.dismissAll();
          return;
        }

        // Une notification sans texte n'a rien à montrer : l'ignorer vaut mieux
        // qu'une ligne vide impossible à interpréter dans le tiroir.
        if (!message && !title) return;

        storeRef.current.notify({ id, title, message: message ?? '', content_type, level, icon, actions });
      }, 'ha_dashboard_notification')
      .then(unsub => {
        const unsubscribe = unsub as unknown as () => void;
        if (cancelled) unsubscribe();
        else unsubscribeFn = unsubscribe;
      });

    return () => {
      cancelled = true;
      unsubscribeFn?.();
    };
  }, [connection]);
}
