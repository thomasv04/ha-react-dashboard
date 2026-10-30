import { Workflow } from 'lucide-react';
import { CardPlaceholder } from '@/components/ui/CardPlaceholder';
import { useHass, type HassStore } from '@hakit/core';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { cn } from '@/lib/utils';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';
import type { AutomationListCardConfig, AutomationItem } from '@/types/widget-configs';
import { useI18n } from '@/i18n';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import type { SoundPreset } from '@/lib/sounds';
import { friendlyName } from '@/lib/ha-service';
import { SwitchTrack } from '@/components/ds/Switch';

function AutomationRow({
  item,
  helpers,
  soundOverrides,
  t,
}: {
  item: AutomationItem;
  // `HassStore['helpers']` et non `ReturnType<typeof useHass>` : `useHass` est
  // un store zustand surchargé, son type de retour brut se résout en `unknown`.
  helpers: HassStore['helpers'];
  soundOverrides?: Record<string, SoundPreset>;
  t: (key: string) => string;
}) {
  const entity = useSafeEntity(item.entityId);
  const isOn = entity?.state === 'on';
  const playFeedback = useSoundFeedback('automation', soundOverrides);

  const IconComponent = item.icon && !isCustomIcon(item.icon) ? (resolveIcon(item.icon) ?? Workflow) : Workflow;
  const customIconUrl = item.icon && isCustomIcon(item.icon) ? getCustomIconUrl(item.icon) : undefined;

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!entity) return;
    helpers.callService({ domain: 'automation', service: 'toggle', target: { entity_id: item.entityId } });
    playFeedback(isOn ? 'toggle_off' : 'toggle_on');
  };

  const name = item.name ?? friendlyName(entity) ?? item.entityId;

  return (
    <li>
      <button
        role='switch'
        aria-checked={isOn}
        onClick={handleToggle}
        className='flex w-full select-none items-center gap-3 rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-3)] px-3 py-2.5 text-left text-[var(--ds-ink)]'
      >
        {customIconUrl ? (
          <img src={customIconUrl} alt='' className='size-5 shrink-0 object-contain' />
        ) : (
          // eslint-disable-next-line react-hooks/static-components
          <IconComponent
            size={20}
            aria-hidden='true'
            className={cn('shrink-0', isOn ? 'text-[var(--ds-accent)]' : 'text-[var(--ds-ink-muted)]')}
          />
        )}
        <span className='flex min-w-0 flex-1 flex-col'>
          <span className='truncate text-[15px] font-semibold leading-tight'>{name as string}</span>
          <span className='truncate text-[13px] text-[var(--ds-ink-muted)]'>
            {isOn ? t('widgets.automation_list.active') : t('widgets.automation_list.inactive')}
          </span>
        </span>
        <SwitchTrack on={isOn} />
      </button>
    </li>
  );
}

export function AutomationListCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<AutomationListCardConfig>(widgetId || 'automation_list');
  // Sélecteur ciblé : `useHass()` sans sélecteur s'abonne à tout le store et
  // re-rendait la liste à chaque message WebSocket de la maison.
  const helpers = useHass(s => s.helpers);

  const items: AutomationItem[] = config?.automations ?? [];
  const name = config?.name ?? t('widgets.automation_list.label');
  // Sélecteur qui ne renvoie qu'un nombre : la card ne se re-rend que si le
  // décompte change réellement, pas à chaque message du store.
  const activeCount = useHass(s => items.filter(i => s.entities?.[i.entityId]?.state === 'on').length);

  if (items.length === 0) {
    return (
      <div className='rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)] h-full p-4'>
        <CardPlaceholder icon={Workflow} text={t('widgets.automation_list.empty')} hint={t('widgets.automation_list.emptyHint')} />
      </div>
    );
  }

  return (
    <div className='flex h-full flex-col gap-3 overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] p-[var(--ds-space-4)] text-[var(--ds-ink)]'>
      {/* En-tête avec le compteur d'actives */}
      <div className='min-w-0 shrink-0'>
        <div className='truncate text-[17px] font-semibold leading-tight'>{name}</div>
        <div className='text-sm tabular-nums text-[var(--ds-ink-muted)]'>
          {t('widgets.automation_list.activeCount', { count: activeCount, total: items.length })}
        </div>
      </div>

      <ul className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto' style={{ scrollbarWidth: 'none' }}>
        {items.map(item => (
          <AutomationRow key={item.entityId} item={item} helpers={helpers} soundOverrides={config?.soundOverrides} t={t} />
        ))}
      </ul>
    </div>
  );
}
