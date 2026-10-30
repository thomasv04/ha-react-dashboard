import { useState } from 'react';
import { Workflow } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useEntityHistory } from '@/hooks/useEntityHistory';
import { MoreInfoHeader } from './MoreInfoHeader';
import { MoreInfoLayout } from './MoreInfoLayout';
import { InfoSidebar, type SidebarModule } from './sidebar';
import { BinaryTimeline } from '@/components/charts/BinaryTimeline';
import { resolveIcon } from '@/lib/lucide-icon-map';
import type { AutomationCardConfig } from '@/types/widget-types';
import { useI18n } from '@/i18n';
import { friendlyName } from '@/lib/ha-service';

export default function AutomationMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { t, language } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<AutomationCardConfig>(widgetId);
  const showInfoPanel = config?.showInfoPanel !== false;
  const [historyHours, setHistoryHours] = useState(24);
  const entity = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);
  const { data } = useEntityHistory(entityId, historyHours);

  if (!entity) return <div className='p-12 text-[var(--ds-ink-muted)] text-center'>{t('common.entityNotFound')}</div>;

  const isOn = entity.state === 'on';
  const name = config?.name ?? friendlyName(entity) ?? entityId;
  const lastTriggered = entity.attributes.last_triggered as string | undefined;
  const mode = entity.attributes.mode as string | undefined;
  const IconComp = resolveIcon(config?.icon) ?? Workflow;

  const handleToggle = () => {
    helpers.callService({
      domain: 'automation',
      service: 'toggle',
      target: { entity_id: entityId },
    });
  };

  return (
    <MoreInfoLayout
      showPanel={showInfoPanel}
      sidebar={
        <InfoSidebar
          modules={
            [
              {
                type: 'details',
                title: t('common.moreInfo.info'),
                entries: [
                  ...(lastTriggered
                    ? [{ label: t('common.moreInfo.lastTriggered'), value: new Date(lastTriggered).toLocaleString(language) }]
                    : []),
                  ...(mode ? [{ label: t('common.moreInfo.mode'), value: mode }] : []),
                  {
                    label: t('common.moreInfo.state'),
                    value: isOn ? t('common.active') : t('common.inactive'),
                    color: isOn ? 'text-[var(--ds-good)]' : 'text-[var(--ds-ink-muted)]',
                  },
                ],
              },
              { type: 'timeline', entityId },
              { type: 'history', historyHours, onHistoryHoursChange: setHistoryHours },
              { type: 'attributes', entityId },
              { type: 'entityId', entityIds: [entityId] },
            ] as SidebarModule[]
          }
        />
      }
    >
      <MoreInfoHeader
        icon={IconComp}
        name={name}
        state={isOn ? t('common.active') : t('common.inactive')}
        stateColor={isOn ? 'var(--ds-good)' : undefined}
      />

      {/* Toggle */}
      <div className='flex justify-center'>
        <button
          onClick={handleToggle}
          aria-pressed={isOn}
          aria-label={name}
          className={`flex size-24 items-center justify-center rounded-full transition-colors ${
            isOn ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-sheet-section)] text-[var(--ds-ink-muted)]'
          }`}
        >
          {/* eslint-disable-next-line react-hooks/static-components */}
          <IconComp size={32} />
        </button>
      </div>

      {/* Info */}
      <div className='mt-6 space-y-3'>
        {lastTriggered && (
          <div className='flex items-center justify-between rounded-[var(--ds-radius-lg)] bg-[var(--ds-sheet-section)] px-5 py-4 text-[15px]'>
            <span className='text-[var(--ds-ink-muted)]'>{t('common.moreInfo.lastTriggered')}</span>
            <span className='font-semibold'>{new Date(lastTriggered).toLocaleString(language)}</span>
          </div>
        )}
        {mode && (
          <div className='flex items-center justify-between rounded-[var(--ds-radius-lg)] bg-[var(--ds-sheet-section)] px-5 py-4 text-[15px]'>
            <span className='text-[var(--ds-ink-muted)]'>{t('common.moreInfo.mode')}</span>
            <span className='font-semibold'>{mode}</span>
          </div>
        )}
      </div>

      {/* Binary timeline */}
      <div className='mt-6'>
        <BinaryTimeline data={data} />
      </div>
    </MoreInfoLayout>
  );
}
