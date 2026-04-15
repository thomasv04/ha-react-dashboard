import { useState } from 'react';
import { Activity } from 'lucide-react';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useEntityHistory } from '@/hooks/useEntityHistory';
import { MoreInfoHeader } from './MoreInfoHeader';
import { InfoSidebar, type SidebarModule } from './sidebar';
import { HistoryGraph } from '@/components/charts/HistoryGraph';
import { BinaryTimeline } from '@/components/charts/BinaryTimeline';
import { resolveIcon } from '@/lib/lucide-icon-map';
import type { SensorCardConfig } from '@/types/widget-types';

const BINARY_DOMAINS = ['binary_sensor', 'switch', 'automation', 'cover', 'light'];

export default function SensorMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<SensorCardConfig>(widgetId);
  const showInfoPanel = config?.showInfoPanel !== false;
  const [historyHours, setHistoryHours] = useState(24);
  const entity = useSafeEntity(entityId);
  const { data } = useEntityHistory(entityId, historyHours);

  if (!entity) return <div className='p-12 text-white/40 text-center'>Entité introuvable</div>;

  const domain = entityId.split('.')[0];
  const isNumeric = !isNaN(parseFloat(entity.state)) && !BINARY_DOMAINS.includes(domain);
  const name = config?.name ?? (entity.attributes.friendly_name as string) ?? entityId;
  const unit = entity.attributes.unit_of_measurement as string | undefined;
  const IconComp = resolveIcon(config?.icon) ?? Activity;

  const sidebarModules: SidebarModule[] = [
    { type: 'timeline', entityId },
    { type: 'history', historyHours, onHistoryHoursChange: setHistoryHours },
    { type: 'attributes', entityId },
    { type: 'entityId', entityIds: [entityId] },
  ];

  return (
    <div className={`p-8 md:p-12 ${showInfoPanel ? 'lg:grid lg:grid-cols-5 lg:gap-8' : ''}`}>
      <div className={showInfoPanel ? 'lg:col-span-3' : ''}>
        <MoreInfoHeader
          icon={IconComp}
          name={name}
          state={entity.state}
          unit={unit}
          stateColor={isNumeric ? '#60a5fa' : entity.state === 'on' ? '#10b981' : '#6b7280'}
        />
        <div className='mt-6'>{isNumeric ? <HistoryGraph data={data} color='#60a5fa' /> : <BinaryTimeline data={data} />}</div>
      </div>
      {showInfoPanel && (
        <div className='lg:col-span-2 mt-8 lg:mt-0'>
          <InfoSidebar modules={sidebarModules} />
        </div>
      )}
    </div>
  );
}
