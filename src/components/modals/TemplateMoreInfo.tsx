import { useState } from 'react';
import { FileCode } from 'lucide-react';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useEntityHistory } from '@/hooks/useEntityHistory';
import { useTemplate } from '@/hooks/useTemplate';
import { MoreInfoHeader } from './MoreInfoHeader';
import { MoreInfoLayout } from './MoreInfoLayout';
import { InfoSidebar, type SidebarModule } from './sidebar';
import { HistoryGraph } from '@/components/charts/HistoryGraph';
import type { TemplateCardConfig } from '@/types/widget-types';
import { friendlyName } from '@/lib/ha-service';

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
  const name = friendlyName(entity) ?? (primaryInfo || templateEntityId || 'Template');

  return (
    <MoreInfoLayout
      showPanel={showInfoPanel && !!templateEntityId}
      sidebar={
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
      }
    >
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
    </MoreInfoLayout>
  );
}
