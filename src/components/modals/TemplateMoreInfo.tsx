import { useState } from 'react';
import { FileCode } from 'lucide-react';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useEntityHistory } from '@/hooks/useEntityHistory';
import { useTemplate } from '@/hooks/useTemplate';
import { MoreInfoHeader } from './MoreInfoHeader';
import { InfoSidebar, type SidebarModule } from './sidebar';
import { HistoryGraph } from '@/components/charts/HistoryGraph';
import type { TemplateCardConfig } from '@/types/widget-types';

export default function TemplateMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<TemplateCardConfig>(widgetId);
  const showInfoPanel = config?.showInfoPanel !== false;
  const [historyHours, setHistoryHours] = useState(24);

  const templateEntityId = entityId || config?.entityId || '';
  const entity = useSafeEntity(templateEntityId);
  const { data } = useEntityHistory(templateEntityId, historyHours);

  const primaryInfo = useTemplate(config?.primaryInfo ?? '');
  const secondaryInfo = useTemplate(config?.secondaryInfo ?? '');

  const isNumeric = entity ? !isNaN(parseFloat(entity.state)) : false;
  const name = (entity?.attributes.friendly_name as string) ?? (primaryInfo || templateEntityId || 'Template');

  return (
    <div className={`p-8 md:p-12 ${showInfoPanel && templateEntityId ? 'lg:grid lg:grid-cols-5 lg:gap-8' : ''}`}>
      <div className={showInfoPanel && templateEntityId ? 'lg:col-span-3' : ''}>
        <MoreInfoHeader icon={FileCode} name={name} state={entity?.state ?? '—'} stateColor='#a78bfa' />

        {/* Resolved template content */}
        <div className='mt-6 space-y-4'>
          {primaryInfo && <div className='text-2xl text-white font-semibold'>{primaryInfo}</div>}
          {secondaryInfo && <div className='text-base text-white/60'>{secondaryInfo}</div>}
        </div>

        {/* History graph for numeric entities */}
        {isNumeric && data.length >= 2 && (
          <div className='mt-6'>
            <HistoryGraph data={data} color='#a78bfa' />
          </div>
        )}
      </div>

      {showInfoPanel && templateEntityId && (
        <div className='lg:col-span-2 mt-8 lg:mt-0'>
          <InfoSidebar
            modules={
              [
                { type: 'timeline', entityId: templateEntityId },
                { type: 'history', historyHours, onHistoryHoursChange: setHistoryHours },
                { type: 'attributes', entityId: templateEntityId },
                { type: 'entityId', entityIds: [templateEntityId] },
              ] as SidebarModule[]
            }
          />
        </div>
      )}
    </div>
  );
}
