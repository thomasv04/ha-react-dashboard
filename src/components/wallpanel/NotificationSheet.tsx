import { motion } from 'framer-motion';
import { useHass } from '@hakit/core';
import { AlertTriangle, Bell, BellOff, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useNotifications, type DashboardNotification, type NotificationAction } from '@/context/NotificationContext';
import { callHAService } from '@/lib/ha-service';
import { resolveIcon, useIconCatalog } from '@/lib/lucide-icon-map';
import { RichText } from '@/components/ui/RichText';
import { staggerGridItem } from '@/lib/motion-variants';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { WallPanelSheet } from './WallPanelSheet';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type Level = NonNullable<DashboardNotification['level']>;

const LEVELS: Record<Level, { tint: string }> = {
  info: { tint: 'text-[var(--ds-accent)]' },
  success: { tint: 'text-[var(--ds-good)]' },
  warning: { tint: 'text-[var(--ds-warm-light)]' },
  error: { tint: 'text-[var(--ds-alert)]' },
};

/** Icône par défaut du niveau — écrite en dur, et non piochée dans une table :
 *  un composant choisi au rendu n'est pas une constante pour React. */
function LevelIcon({ level, className }: { level: Level; className?: string }) {
  const size = 20;
  if (level === 'success') return <CheckCircle2 size={size} className={className} />;
  if (level === 'warning') return <AlertTriangle size={size} className={className} />;
  if (level === 'error') return <XCircle size={size} className={className} />;
  return <Info size={size} className={className} />;
}

const ACTION_VARIANTS = {
  default: 'bg-[var(--ds-surface-3)] text-[var(--ds-ink)]',
  primary: 'bg-[var(--ds-accent)] text-white',
  danger: 'bg-[var(--ds-alert)] text-white',
} as const;

/** « il y a 5 min » — `Intl` fait le travail, y compris l'accord et la langue. */
function relativeTime(iso: string | undefined, language: string): string {
  if (!iso) return '';
  const delta = Date.parse(iso) - Date.now();
  if (Number.isNaN(delta)) return '';
  const format = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  const abs = Math.abs(delta);
  if (abs < HOUR) return format.format(Math.round(delta / MINUTE), 'minute');
  if (abs < DAY) return format.format(Math.round(delta / HOUR), 'hour');
  return format.format(Math.round(delta / DAY), 'day');
}

function NotificationCard({ item, onDismiss }: { item: DashboardNotification; onDismiss: () => void }) {
  const { language, t } = useI18n();
  const helpers = useHass(s => s.helpers);
  const levelName = item.level ?? 'info';
  const level = LEVELS[levelName];
  const when = relativeTime(item.created_at, language);

  const Custom = item.icon ? resolveIcon(item.icon) : null;
  const iconClass = cn('shrink-0 mt-0.5', level.tint);
  // eslint-disable-next-line react-hooks/static-components
  const icon = Custom ? <Custom size={20} className={iconClass} /> : <LevelIcon level={levelName} className={iconClass} />;

  const run = (action: NotificationAction) => {
    const [domain, service] = action.service?.split('.') ?? [];
    if (domain && service) callHAService(helpers, domain, service, {}, action.service_data);
    // Agir efface la notification, sauf demande explicite : un « Installer »
    // sur lequel on a appuyé n'a plus rien à dire.
    if (!action.keep) onDismiss();
  };

  return (
    <motion.div variants={staggerGridItem} className='rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] px-4 py-3'>
      <div className='flex items-start gap-3'>
        {icon}
        <div className='flex-1 min-w-0'>
          {item.title && <p className='text-[17px] font-semibold'>{item.title}</p>}
          <RichText
            type={item.content_type}
            value={item.message}
            className='mt-0.5 whitespace-pre-line break-words text-sm text-[var(--ds-ink-muted)]'
          />
          {when && <p className='mt-1.5 text-xs text-[var(--ds-ink-muted)]'>{when}</p>}
        </div>
        <button
          onClick={onDismiss}
          aria-label={t('common.close')}
          className='touch-target flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'
        >
          <X size={18} />
        </button>
      </div>

      {item.actions && item.actions.length > 0 && (
        <div className='mt-3 flex flex-wrap gap-2 pl-8'>
          {item.actions.map((action, i) => (
            <button
              key={i}
              onClick={() => run(action)}
              className={cn(
                'h-10 rounded-[var(--ds-radius-pill)] px-4 text-sm font-semibold',
                ACTION_VARIANTS[action.variant ?? 'default']
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/**
 * Feuille du haut : les notifications propres au dashboard, alimentées par
 * l'événement `ha_dashboard_notification`.
 */
export function NotificationSheet({ onClose }: { onClose: () => void }) {
  // Les icones hors du noyau arrivent avec le catalogue complet, charge a la
  // demande : sans cet abonnement elles resteraient sur leur icone de repli.
  useIconCatalog();
  const { t } = useI18n();
  const { notifications, dismiss, dismissAll } = useNotifications();

  return (
    <WallPanelSheet
      side='top'
      title={t('layout.wallPanel.gestures.notifications')}
      icon={<Bell size={20} />}
      onClose={onClose}
      action={
        notifications.length > 0 ? (
          <button
            onClick={dismissAll}
            className='h-10 shrink-0 rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)] px-4 text-sm font-semibold'
          >
            {t('layout.wallPanel.gestures.dismissAll')}
          </button>
        ) : undefined
      }
    >
      {notifications.map(item => (
        <NotificationCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
      ))}
      {notifications.length === 0 && (
        <div className='flex flex-col items-center gap-2 py-10 text-[var(--ds-ink-muted)]'>
          <BellOff size={28} />
          <p className='text-sm'>{t('layout.wallPanel.gestures.noNotifications')}</p>
        </div>
      )}
    </WallPanelSheet>
  );
}
