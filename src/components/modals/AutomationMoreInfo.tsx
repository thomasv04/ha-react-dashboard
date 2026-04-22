import { useState } from 'react';
import { Workflow } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useEntityHistory } from '@/hooks/useEntityHistory';
import { MoreInfoHeader } from './MoreInfoHeader';
import { InfoSidebar, type SidebarModule } from './sidebar';
import { BinaryTimeline } from '@/components/charts/BinaryTimeline';
import { resolveIcon } from '@/lib/lucide-icon-map';
import type { AutomationCardConfig } from '@/types/widget-types';

export default function AutomationMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<AutomationCardConfig>(widgetId);
  const showInfoPanel = config?.showInfoPanel !== false;
  const [historyHours, setHistoryHours] = useState(24);
  const entity = useSafeEntity(entityId);
  const { helpers } = useHass();
  const { data } = useEntityHistory(entityId, historyHours);

  if (!entity) return <div className='p-12 text-white/40 text-center'>Entité introuvable</div>;

  const isOn = entity.state === 'on';
  const name = config?.name ?? (entity.attributes.friendly_name as string) ?? entityId;
  const lastTriggered = entity.attributes.last_triggered as string | undefined;
  const mode = entity.attributes.mode as string | undefined;
  // eslint-disable-next-line react-hooks/static-components
  const IconComp = resolveIcon(config?.icon) ?? Workflow;

  const handleToggle = () => {
    helpers.callService({
      domain: 'automation',
      service: 'toggle',
      target: { entity_id: entityId },
    });
  };

  return (
    <div className={`p-8 md:p-12 ${showInfoPanel ? 'lg:grid lg:grid-cols-5 lg:gap-8' : ''}`}>
      <div className={showInfoPanel ? 'lg:col-span-3' : ''}>
        <MoreInfoHeader icon={IconComp} name={name} state={isOn ? 'Actif' : 'Inactif'} stateColor={isOn ? '#10b981' : '#6b7280'} />

        {/* Toggle */}
        <div className='flex justify-center mt-8'>
          <button
            onClick={handleToggle}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              isOn
                ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.2)]'
                : 'bg-white/5 text-white/30 hover:bg-white/10'
            }`}
          >
            {/* eslint-disable-next-line react-hooks/static-components */}
            <IconComp size={32} />
          </button>
        </div>

        {/* Info */}
        <div className='mt-8 space-y-4'>
          {lastTriggered && (
            <div className='flex items-center justify-between text-sm bg-white/5 rounded-xl px-4 py-3'>
              <span className='text-white/50'>Dernière exécution</span>
              <span className='text-white font-medium'>{new Date(lastTriggered).toLocaleString('fr-FR')}</span>
            </div>
          )}
          {mode && (
            <div className='flex items-center justify-between text-sm bg-white/5 rounded-xl px-4 py-3'>
              <span className='text-white/50'>Mode</span>
              <span className='text-white font-medium uppercase'>{mode}</span>
            </div>
          )}
        </div>

        {/* Binary timeline */}
        <div className='mt-6'>
          <BinaryTimeline data={data} />
        </div>
      </div>

      {showInfoPanel && (
        <div className='lg:col-span-2 mt-8 lg:mt-0'>
          <InfoSidebar
            modules={
              [
                {
                  type: 'details',
                  title: 'Informations',
                  entries: [
                    ...(lastTriggered ? [{ label: 'Dernière exécution', value: new Date(lastTriggered).toLocaleString('fr-FR') }] : []),
                    ...(mode ? [{ label: 'Mode', value: mode.toUpperCase() }] : []),
                    { label: 'État', value: isOn ? 'Actif' : 'Inactif', color: isOn ? 'text-emerald-400' : 'text-zinc-400' },
                  ],
                },
                { type: 'timeline', entityId },
                { type: 'history', historyHours, onHistoryHoursChange: setHistoryHours },
                { type: 'attributes', entityId },
                { type: 'entityId', entityIds: [entityId] },
              ] as SidebarModule[]
            }
          />
        </div>
      )}
    </div>
  );
}
