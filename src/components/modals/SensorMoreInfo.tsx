import { useState } from 'react';
import { Activity } from 'lucide-react';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useEntityHistory } from '@/hooks/useEntityHistory';
import { MoreInfoHeader } from './MoreInfoHeader';
import { MoreInfoLayout } from './MoreInfoLayout';
import { InfoSidebar, type SidebarModule } from './sidebar';
import { HistoryGraph } from '@/components/charts/HistoryGraph';
import { BinaryTimeline } from '@/components/charts/BinaryTimeline';
import { resolveIcon } from '@/lib/lucide-icon-map';
import type { SensorCardConfig } from '@/types/widget-types';
import { useI18n } from '@/i18n';
import { friendlyName } from '@/lib/ha-service';

const BINARY_DOMAINS = ['binary_sensor', 'switch', 'automation', 'cover', 'light'];

export default function SensorMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<SensorCardConfig>(widgetId);
  const showInfoPanel = config?.showInfoPanel !== false;
  const [historyHours, setHistoryHours] = useState(24);
  const entity = useSafeEntity(entityId);
  const { data } = useEntityHistory(entityId, historyHours);

  if (!entity) return <div className='p-12 text-white/40 text-center'>{t('common.entityNotFound')}</div>;

  const domain = entityId.split('.')[0];
  const isNumeric = !isNaN(parseFloat(entity.state)) && !BINARY_DOMAINS.includes(domain);
  const name = config?.name ?? friendlyName(entity) ?? entityId;
  const unit = entity.attributes.unit_of_measurement as string | undefined;
  const IconComp = resolveIcon(config?.icon) ?? Activity;

  const sidebarModules: SidebarModule[] = [
    { type: 'timeline', entityId },
    { type: 'history', historyHours, onHistoryHoursChange: setHistoryHours },
    { type: 'attributes', entityId },
    { type: 'entityId', entityIds: [entityId] },
  ];

  return (
    <MoreInfoLayout showPanel={showInfoPanel} sidebar={<InfoSidebar modules={sidebarModules} />}>
      <MoreInfoHeader
        icon={IconComp}
        name={name}
        state={entity.state}
        unit={unit}
        stateColor={isNumeric ? '#60a5fa' : entity.state === 'on' ? '#10b981' : '#6b7280'}
      />
      <div className='mt-6'>{isNumeric ? <HistoryGraph data={data} color='#60a5fa' /> : <BinaryTimeline data={data} />}</div>
    </MoreInfoLayout>
  );
}
