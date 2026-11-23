import { useRef } from 'react';
import { Workflow, Clock } from 'lucide-react';
import { CardPlaceholder } from '@/components/ui/CardPlaceholder';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useRelativeTime, JUST_NOW } from '@/hooks/useRelativeTime';
import { useHass } from '@hakit/core';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useHideTitle } from '@/hooks/useHideTitle';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { cn } from '@/lib/utils';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';
import type { AutomationCardConfig } from '@/types/widget-configs';
import { useI18n } from '@/i18n';
import { useGroupEmbedded } from '@/components/cards/GroupCard/GroupCard';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { friendlyName } from '@/lib/ha-service';
import { SwitchTrack } from '@/components/ds/Switch';

export function AutomationCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const hideTitle = useHideTitle();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<AutomationCardConfig>(widgetId || 'automation');
  const entityId = config?.entityId ?? 'automation.example';
  const embedded = useGroupEmbedded();

  const entity = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);
  const playFeedback = useSoundFeedback();
  const cardRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(cardRef);
  const relative = useRelativeTime(entity?.attributes.last_triggered as string | undefined);
  const timeEntityId = config?.timeEntityId;
  const timeEntity = useSafeEntity(timeEntityId ?? '');

  if (!entity) {
    return (
      <div ref={cardRef} className='rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)] h-full p-4'>
        <CardPlaceholder icon={Workflow} text={t('widgets.automation.notFound')} compact={size.compact} />
      </div>
    );
  }

  const isOn = entity.state === 'on';
  const name = config?.name ?? friendlyName(entity) ?? entityId;

  // Seule information qui manquait vraiment sur une automatisation : quand
  // elle s'est déclenchée pour la dernière fois.
  const lastTriggered = config?.subtitle
    ? config.subtitle
    : !relative
      ? t('widgets.automation.neverTriggered')
      : relative === JUST_NOW
        ? t('widgets.automation.justTriggered')
        : t('widgets.automation.triggeredAgo', { value: relative });

  const IconComponent = config?.icon && !isCustomIcon(config.icon) ? (resolveIcon(config.icon) ?? Workflow) : Workflow;
  const customIconUrl = config?.icon && isCustomIcon(config.icon) ? getCustomIconUrl(config.icon) : undefined;

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    helpers.callService({
      domain: 'automation',
      service: 'toggle',
      target: { entity_id: entityId },
    });
    playFeedback(isOn ? 'toggle_off' : 'toggle_on');
  };

  // `state` d'un input_datetime « heure seule » : « HH:MM:SS ».
  const showTime = !!timeEntity && !size.squat;
  const handleTime = (time: string) => {
    if (!timeEntityId) return;
    helpers.callService({
      domain: 'input_datetime',
      service: 'set_datetime',
      target: { entity_id: timeEntityId },
      serviceData: { time },
    });
  };

  return (
    <div ref={cardRef} className={cn('flex h-full flex-col', embedded ? '' : 'rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)]')}>
      <button
        role='switch'
        aria-checked={isOn}
        onClick={handleToggle}
        className={cn(
          'flex min-h-0 w-full flex-1 select-none items-center gap-3 overflow-hidden text-left transition-colors',
          embedded ? 'rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-3)] p-3' : 'px-4',
          'text-[var(--ds-ink)]'
        )}
      >
        <span
          className={cn('grid shrink-0 place-items-center', showTime && 'size-12 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)]')}
        >
          {customIconUrl ? (
            <img src={customIconUrl} alt='' className='size-6 shrink-0 object-contain' />
          ) : (
            // eslint-disable-next-line react-hooks/static-components
            <IconComponent
              size={22}
              aria-hidden='true'
              className={cn('shrink-0', isOn ? 'text-[var(--ds-accent)]' : 'text-[var(--ds-ink-muted)]')}
            />
          )}
        </span>
        <span className='flex min-w-0 flex-1 flex-col'>
          {!hideTitle && <span className='truncate text-[17px] font-semibold leading-tight'>{name}</span>}
          <span className='flex min-w-0 items-center gap-1.5 text-sm text-[var(--ds-ink-muted)]'>
            {size.compact ? (
              <span className='truncate'>{isOn ? t('widgets.automation.active') : t('widgets.automation.inactive')}</span>
            ) : (
              <>
                {!config?.subtitle && <Clock size={13} aria-hidden='true' className='shrink-0' />}
                <span className='truncate'>{lastTriggered}</span>
              </>
            )}
          </span>
        </span>
        <SwitchTrack on={isOn} />
      </button>
      {showTime && (
        <div className={cn('px-4 pb-4 text-[var(--ds-ink)]', embedded && 'px-0 pb-0')}>
          <p className='mb-2 text-sm font-medium'>{t('widgets.automation.triggerTime')}</p>
          <div className='flex items-center gap-3 rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-1)] p-2.5'>
            <span className='grid size-11 shrink-0 place-items-center rounded-full bg-[var(--ds-surface-2)] text-[var(--ds-ink-muted)]'>
              <Clock size={20} aria-hidden='true' />
            </span>
            <TimeInputs value={timeEntity.state} onCommit={handleTime} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Deux cases HH : MM. Validé à la sortie du champ ou sur Entrée, pas à chaque frappe. */
function TimeInputs({ value, onCommit }: { value: string; onCommit: (time: string) => void }) {
  const hRef = useRef<HTMLInputElement>(null);
  const mRef = useRef<HTMLInputElement>(null);
  const [h = '00', m = '00'] = value.split(':');

  const commit = () => {
    const read = (el: HTMLInputElement | null, max: number) =>
      String(Math.min(max, Math.max(0, parseInt(el?.value ?? '', 10) || 0))).padStart(2, '0');
    const hh = read(hRef.current, 23);
    const mm = read(mRef.current, 59);
    // Remet en forme (« 6 » → « 06 ») et écarte les saisies invalides.
    if (hRef.current) hRef.current.value = hh;
    if (mRef.current) mRef.current.value = mm;
    if (hh !== h || mm !== m) onCommit(`${hh}:${mm}:00`);
  };

  const box =
    'h-11 w-full min-w-0 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-2)] text-center text-xl font-medium tabular-nums text-[var(--ds-ink)] outline-none focus:ring-2 focus:ring-[var(--ds-accent)]';
  const props = {
    type: 'text',
    inputMode: 'numeric' as const,
    maxLength: 2,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && e.currentTarget.blur(),
  };

  // `key` : quand HA change l'heure (autre écran), les champs repartent de la nouvelle valeur.
  return (
    <div key={value} className='flex min-w-0 flex-1 items-center gap-2'>
      <input ref={hRef} defaultValue={h} aria-label='HH' className={box} {...props} />
      <span className='text-xl font-medium text-[var(--ds-ink)]'>:</span>
      <input ref={mRef} defaultValue={m} aria-label='MM' className={box} {...props} />
    </div>
  );
}
