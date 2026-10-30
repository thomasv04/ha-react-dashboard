import { useState, useCallback } from 'react';
import { Play, Check, AlertTriangle, X } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { ButtonCardConfig } from '@/types/widget-configs';
import { cn } from '@/lib/utils';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';
import { useI18n } from '@/i18n';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { useColor } from '@/hooks/useColor';

type FeedbackState = 'idle' | 'confirming' | 'running' | 'success' | 'error';

export function ButtonCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<ButtonCardConfig>(widgetId || 'button');
  const helpers = useHass(s => s.helpers);
  const playFeedback = useSoundFeedback('button', config?.soundOverrides);

  const [feedback, setFeedback] = useState<FeedbackState>('idle');

  const label = config?.label ?? t('widgets.button.label');
  const subtitle = config?.subtitle;
  const color = useColor(config?.color) ?? 'var(--ds-accent)';
  const domain = config?.domain ?? 'script';
  const service = config?.service ?? 'turn_on';
  const requireConfirm = config?.requireConfirm ?? false;
  const confirmText = config?.confirmText ?? t('widgets.button.confirmDefault');

  const iconName = config?.icon;
  const customIconUrl = iconName && isCustomIcon(iconName) ? getCustomIconUrl(iconName) : undefined;
  const IconComponent = iconName && !isCustomIcon(iconName) ? (resolveIcon(iconName) ?? Play) : Play;

  const callService = useCallback(async () => {
    setFeedback('running');
    playFeedback('press');
    try {
      let serviceData: Record<string, unknown> = {};
      if (config?.serviceData) {
        try {
          serviceData = JSON.parse(config.serviceData);
        } catch {
          /* ignore invalid JSON */
        }
      }
      // `as never` sur domain/service : ils sont saisis par l'utilisateur, donc
      // inconnus à la compilation. La surcharge de `callService` en déduit alors
      // que `serviceData` doit être `undefined` — d'où le cast de l'objet entier.
      await helpers.callService({
        domain: domain as never,
        service: service as never,
        target: config?.entityId ? { entity_id: config.entityId } : undefined,
        serviceData: Object.keys(serviceData).length ? serviceData : undefined,
      } as never);
      setFeedback('success');
      setTimeout(() => setFeedback('idle'), 1800);
    } catch {
      setFeedback('error');
      setTimeout(() => setFeedback('idle'), 2500);
    }
  }, [helpers, domain, service, config, setFeedback, playFeedback]);

  const handlePress = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (feedback === 'running') return;
      if (requireConfirm && feedback !== 'confirming') {
        setFeedback('confirming');
        return;
      }
      setFeedback('idle');
      callService();
    },
    [feedback, requireConfirm, callService, setFeedback]
  );

  const cancelConfirm = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setFeedback('idle');
    },
    [setFeedback]
  );

  // Pastille d'état : la couleur du bouton au repos, good ou alert après l'action.
  const pebble =
    feedback === 'success'
      ? 'var(--ds-good)'
      : feedback === 'error'
        ? 'var(--ds-alert)'
        : feedback === 'running'
          ? 'var(--ds-surface-3)'
          : color;

  return (
    <div className='relative h-full select-none overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)]'>
      <button
        className='flex h-full w-full flex-col items-center justify-center gap-3 p-[var(--ds-space-4)] transition-transform active:scale-[0.98] disabled:active:scale-100'
        onClick={handlePress}
        disabled={feedback === 'running'}
        aria-busy={feedback === 'running'}
      >
        <span className='flex size-14 shrink-0 items-center justify-center rounded-full text-white' style={{ background: pebble }}>
          {feedback === 'running' ? (
            <span
              aria-hidden='true'
              className='size-6 animate-spin rounded-full border-[3px] border-[var(--ds-ink-muted)] border-t-transparent'
            />
          ) : feedback === 'success' ? (
            <Check size={26} aria-hidden='true' />
          ) : feedback === 'error' ? (
            <X size={26} aria-hidden='true' />
          ) : customIconUrl ? (
            <img src={customIconUrl} alt='' className='size-7 object-contain' />
          ) : (
            // eslint-disable-next-line react-hooks/static-components
            <IconComponent size={26} aria-hidden='true' />
          )}
        </span>
        <span className='flex min-w-0 flex-col items-center'>
          <span
            className={cn(
              'max-w-full truncate text-center text-[17px] font-semibold leading-tight',
              feedback === 'success' && 'text-[var(--ds-good)]',
              feedback === 'error' && 'text-[var(--ds-alert)]'
            )}
          >
            {feedback === 'success' ? t('widgets.button.done') : feedback === 'error' ? t('widgets.button.error') : label}
          </span>
          {subtitle && feedback === 'idle' && <span className='max-w-full truncate text-sm text-[var(--ds-ink-muted)]'>{subtitle}</span>}
        </span>
      </button>

      {/* Confirmation : un voile opaque, deux pilules */}
      {feedback === 'confirming' && (
        <div
          role='alertdialog'
          aria-label={confirmText}
          className='absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--ds-surface-1)] px-4'
        >
          <AlertTriangle size={24} aria-hidden='true' className='text-[var(--ds-heat)]' />
          <p className='text-center text-[15px] font-semibold leading-snug'>{confirmText}</p>
          <div className='flex gap-2'>
            <button
              onClick={cancelConfirm}
              className='h-11 rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)] px-5 text-sm font-semibold'
            >
              {t('widgets.button.cancel')}
            </button>
            <button
              onClick={handlePress}
              className='h-11 rounded-[var(--ds-radius-pill)] bg-[var(--ds-tile-on)] px-5 text-sm font-bold text-[var(--ds-tile-on-ink)]'
            >
              {t('widgets.button.confirm')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
