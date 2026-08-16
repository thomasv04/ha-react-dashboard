import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

const STORAGE_KEY = 'ha-dashboard-notifications';
/** Au-delà, les plus anciennes sont oubliées — le stockage local est borné. */
const MAX_STORED = 50;

export interface NotificationAction {
  label: string;
  variant?: 'default' | 'primary' | 'danger';
  /** Service complet, ex. `hassio.addon_update`. */
  service?: string;
  service_data?: Record<string, unknown>;
  /** Par défaut, agir efface la notification. */
  keep?: boolean;
}

export interface DashboardNotification {
  id: string;
  title?: string;
  message: string;
  /** `html` est assaini au rendu ; `markdown` est affiché tel quel. */
  content_type?: 'plain' | 'html' | 'markdown';
  level?: 'info' | 'success' | 'warning' | 'error';
  /** Nom d'icône lucide. */
  icon?: string;
  /** Horodatage ISO de réception. */
  created_at: string;
  actions?: NotificationAction[];
}

interface NotificationContextValue {
  notifications: DashboardNotification[];
  /** Ajoute ou remplace (même `id`). Renvoie l'identifiant retenu. */
  notify: (notification: Omit<DashboardNotification, 'id' | 'created_at'> & { id?: string; created_at?: string }) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

function load(): DashboardNotification[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    // Le contenu vient du stockage local, modifiable à la main : on ne garde
    // que les entrées qui ont la forme attendue plutôt que de faire confiance.
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is DashboardNotification =>
        typeof n === 'object' &&
        n !== null &&
        typeof (n as DashboardNotification).id === 'string' &&
        typeof (n as DashboardNotification).message === 'string'
    );
  } catch {
    return [];
  }
}

function save(notifications: DashboardNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // Quota plein ou stockage refusé : la liste en mémoire reste correcte,
    // seule la survie au rechargement est perdue.
  }
}

/**
 * Notifications propres au dashboard, alimentées par l'événement
 * `ha_dashboard_notification` — indépendantes des `persistent_notification`
 * de Home Assistant.
 *
 * Elles sont conservées dans le stockage local : une tablette murale se
 * recharge (redémarrage de HA, mise à jour de l'add-on), et un message
 * « mise à jour disponible » qui disparaîtrait au passage n'aurait servi à rien.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<DashboardNotification[]>(load);

  const update = useCallback((next: (prev: DashboardNotification[]) => DashboardNotification[]) => {
    setNotifications(prev => {
      const result = next(prev).slice(0, MAX_STORED);
      save(result);
      return result;
    });
  }, []);

  const notify = useCallback<NotificationContextValue['notify']>(
    notification => {
      const id = notification.id ?? `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const full: DashboardNotification = {
        ...notification,
        id,
        created_at: notification.created_at ?? new Date().toISOString(),
      };
      // Le même `id` remplace au lieu de s'empiler : une automatisation qui
      // republie l'état d'une mise à jour ne doit pas remplir la liste.
      update(prev => [full, ...prev.filter(n => n.id !== id)]);
      return id;
    },
    [update]
  );

  const dismiss = useCallback((id: string) => update(prev => prev.filter(n => n.id !== id)), [update]);
  const dismissAll = useCallback(() => update(() => []), [update]);

  return <NotificationContext.Provider value={{ notifications, notify, dismiss, dismissAll }}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
