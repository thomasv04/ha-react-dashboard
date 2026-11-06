import type { Modal, ModalAction } from '@/context/ModalContext';
import type { Toast } from '@/context/ToastContext';
import type { NotificationAction, useNotifications } from '@/context/NotificationContext';
import { callHAService } from '@/lib/ha-service';

/**
 * Les trois événements Home Assistant que le dashboard écoute, et ce que chacun
 * affiche. Les hooks `useHA*` s'y abonnent ; le bac à sable des Outils de
 * développement passe par les mêmes fonctions pour son aperçu local, qui montre
 * donc exactement ce qu'afficherait l'événement.
 */
export const HA_EVENT_TYPES = {
  modal: 'ha_dashboard_modal',
  toast: 'ha_dashboard_toast',
  notification: 'ha_dashboard_notification',
} as const;

export interface HAEventAction {
  label: string;
  /** Service complet, `domaine.service`. */
  service?: string;
  service_data?: Record<string, unknown>;
  variant?: 'default' | 'primary' | 'danger';
}

export interface HAModalEvent {
  title?: string;
  content?: string;
  content_type?: 'markdown' | 'html' | 'plain';
  width?: 'sm' | 'md' | 'lg' | 'full';
  sound?: string | false;
  dismissible?: boolean;
  actions?: HAEventAction[];
}

export interface HAToastEvent {
  title: string;
  description?: string;
  persistent?: boolean;
  duration_ms?: number;
  /** 'notification' | 'alert' | 'success' | 'warning', une URL, ou false pour couper */
  sound?: string | false;
  actions?: HAEventAction[];
}

export interface HANotificationEvent {
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

type Helpers = { callService: unknown };
type NotificationStore = Pick<ReturnType<typeof useNotifications>, 'notify' | 'dismiss' | 'dismissAll'>;

function eventActions(actions: HAEventAction[] | undefined, helpers: Helpers): ModalAction[] | undefined {
  return actions?.map(a => ({
    label: a.label,
    variant: a.variant ?? 'default',
    onClick: () => {
      const [domain, service, ...rest] = a.service?.split('.') ?? [];
      if (domain && service && rest.length === 0) callHAService(helpers, domain, service, {}, a.service_data);
    },
  }));
}

export function modalFromEvent(data: HAModalEvent, helpers: Helpers): Omit<Modal, 'id'> {
  const { title, content, content_type, width, sound, dismissible, actions } = data;
  return {
    title,
    content: content && content_type && content_type !== 'plain' ? { type: content_type, value: content } : content,
    width: width ?? 'md',
    sound: sound === undefined ? 'notification' : sound,
    dismissible: dismissible ?? true,
    actions: eventActions(actions, helpers),
  };
}

export function toastFromEvent(data: HAToastEvent, helpers: Helpers): Omit<Toast, 'id'> {
  const { title, description, persistent, duration_ms, sound, actions } = data;
  return {
    title,
    description,
    persistent: persistent ?? false,
    durationMs: duration_ms ?? 5000,
    sound: sound === undefined ? 'notification' : sound,
    actions: eventActions(actions, helpers),
  };
}

export function applyNotificationEvent(data: HANotificationEvent | undefined, store: NotificationStore) {
  const { id, title, message, content_type, level, icon, actions, dismiss } = data ?? {};

  if (dismiss) {
    if (id) store.dismiss(id);
    else store.dismissAll();
    return;
  }

  // Une notification sans texte n'a rien à montrer : l'ignorer vaut mieux
  // qu'une ligne vide impossible à interpréter dans le tiroir.
  if (!message && !title) return;

  store.notify({ id, title, message: message ?? '', content_type, level, icon, actions });
}
