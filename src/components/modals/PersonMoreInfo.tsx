import { useState } from 'react';
import { User, MapPin } from 'lucide-react';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { MoreInfoHeader } from './MoreInfoHeader';
import { InfoSidebar, type SidebarModule } from './sidebar';
import type { PersonStatusConfig } from '@/types/widget-types';

export default function PersonMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<PersonStatusConfig>(widgetId);
  const showInfoPanel = config?.showInfoPanel !== false;
  const [historyHours, setHistoryHours] = useState(24);

  // Use first person entity from config or fallback to entityId
  const personEntityId = entityId || config?.persons?.[0]?.entityId || '';
  const entity = useSafeEntity(personEntityId);

  if (!entity) return <div className='p-12 text-white/40 text-center'>Entité introuvable</div>;

  const name = config?.persons?.[0]?.name ?? (entity.attributes.friendly_name as string) ?? personEntityId;
  const state = entity.state;
  const isHome = state === 'home';
  const lat = entity.attributes.latitude as number | undefined;
  const lon = entity.attributes.longitude as number | undefined;
  const entityPicture = entity.attributes.entity_picture as string | undefined;
  const batteryLevel = entity.attributes.battery_level as number | undefined;

  return (
    <div className={`p-8 md:p-12 ${showInfoPanel ? 'lg:grid lg:grid-cols-5 lg:gap-8' : ''}`}>
      <div className={showInfoPanel ? 'lg:col-span-3' : ''}>
        <MoreInfoHeader
          icon={User}
          name={name}
          state={isHome ? 'Home' : state}
          stateColor={isHome ? '#10b981' : '#f59e0b'}
          image={entityPicture}
        />

        {/* Map */}
        {lat != null && lon != null ? (
          <div className='mt-6 rounded-2xl overflow-hidden' style={{ height: 'clamp(16rem, 35vw, 24rem)' }}>
            <iframe
              title='Location'
              width='100%'
              height='100%'
              style={{ border: 0 }}
              loading='lazy'
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.005},${lon + 0.01},${lat + 0.005}&layer=mapnik&marker=${lat},${lon}`}
            />
          </div>
        ) : (
          <div className='mt-6 flex items-center gap-2 text-white/40 text-sm bg-white/5 rounded-xl px-4 py-3'>
            <MapPin size={16} />
            <span>Position GPS non disponible</span>
          </div>
        )}

        {/* Location info */}
        <div className='mt-4 space-y-2'>
          <div className='flex items-center justify-between text-sm bg-white/5 rounded-xl px-4 py-3'>
            <span className='text-white/50'>Zone</span>
            <span className='text-white font-medium capitalize'>{state}</span>
          </div>
          {lat != null && lon != null && (
            <div className='flex items-center justify-between text-sm bg-white/5 rounded-xl px-4 py-3'>
              <span className='text-white/50'>Coordonnées</span>
              <span className='text-white font-mono text-xs'>
                {lat.toFixed(4)}, {lon.toFixed(4)}
              </span>
            </div>
          )}
        </div>
      </div>

      {showInfoPanel && (
        <div className='lg:col-span-2 mt-8 lg:mt-0'>
          <InfoSidebar
            modules={
              [
                {
                  type: 'details',
                  title: 'Localisation',
                  entries: [
                    { label: 'Zone', value: state, color: isHome ? 'text-emerald-400' : 'text-amber-400' },
                    ...(lat != null && lon != null ? [{ label: 'Coordonnées', value: `${lat.toFixed(4)}, ${lon.toFixed(4)}` }] : []),
                    ...(batteryLevel != null
                      ? [{ label: 'Batterie', value: `${batteryLevel}%`, color: batteryLevel > 20 ? 'text-emerald-400' : 'text-red-400' }]
                      : []),
                  ],
                },
                { type: 'timeline', entityId: personEntityId },
                { type: 'history', historyHours, onHistoryHoursChange: setHistoryHours },
                { type: 'attributes', entityId: personEntityId },
                { type: 'entityId', entityIds: [personEntityId] },
              ] as SidebarModule[]
            }
          />
        </div>
      )}
    </div>
  );
}
