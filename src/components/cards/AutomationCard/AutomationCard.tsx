import { useRef } from 'react';
import { Workflow, Clock } from 'lucide-react';
import { CardPlaceholder } from '@/components/ui/CardPlaceholder';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useRelativeTime, JUST_NOW } from '@/hooks/useRelativeTime';
import { useHass } from '@hakit/core';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
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
  const lastTriggered = !relative
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

  return (
    <div ref={cardRef} className='h-full'>
      <button
        role='switch'
        aria-checked={isOn}
        onClick={handleToggle}
        className={cn(
          'flex h-full w-full select-none items-center gap-3 overflow-hidden text-left transition-colors',
          embedded
            ? 'rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-3)] p-3'
            : 'rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] px-4',
          'text-[var(--ds-ink)]'
        )}
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
        <span className='flex min-w-0 flex-1 flex-col'>
          <span className='truncate text-[17px] font-semibold leading-tight'>{name}</span>
          <span className='flex min-w-0 items-center gap-1.5 text-sm text-[var(--ds-ink-muted)]'>
            {size.compact ? (
              <span className='truncate'>{isOn ? t('widgets.automation.active') : t('widgets.automation.inactive')}</span>
            ) : (
              <>
                <Clock size={13} aria-hidden='true' className='shrink-0' />
                <span className='truncate'>{lastTriggered}</span>
              </>
            )}
          </span>
        </span>
        <SwitchTrack on={isOn} />
      </button>
    </div>
  );
}
