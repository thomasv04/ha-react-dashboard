import { useState } from 'react';
import { ArrowUpDown, ChevronUp, Square, ChevronDown } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { MoreInfoHeader } from './MoreInfoHeader';
import { InfoSidebar, type SidebarModule } from './sidebar';
import type { CoverCardConfig } from '@/types/widget-types';

const PRESETS = [
  { label: 'FERMÉ', value: 0 },
  { label: '25%', value: 25 },
  { label: '50%', value: 50 },
  { label: '75%', value: 75 },
  { label: 'OUVERT', value: 100 },
];

export default function CoverMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<CoverCardConfig>(widgetId);
  const showInfoPanel = config?.showInfoPanel !== false;
  const [historyHours, setHistoryHours] = useState(24);
  const entity = useSafeEntity(entityId);
  const { helpers } = useHass();

  if (!entity) return <div className='p-12 text-white/40 text-center'>Entité introuvable</div>;

  const name = config?.name ?? (entity.attributes.friendly_name as string) ?? entityId;
  const position = (entity.attributes.current_position as number | undefined) ?? 0;
  const state = entity.state;
  const stateColor = state === 'open' ? '#10b981' : state === 'closed' ? '#6b7280' : '#f59e0b';
  const closedPct = 100 - position;

  const callService = (service: string, data?: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (helpers.callService as any)({
      domain: 'cover',
      service,
      target: { entity_id: entityId },
      serviceData: data,
    });
  };

  // Slat lines count proportional to closed percentage
  const slatCount = Math.round((closedPct / 100) * 10);

  return (
    <div className={`p-8 md:p-12 ${showInfoPanel ? 'lg:grid lg:grid-cols-5 lg:gap-8' : ''}`}>
      <div className={showInfoPanel ? 'lg:col-span-3' : ''}>
        <MoreInfoHeader icon={ArrowUpDown} name={name} state={state.charAt(0).toUpperCase() + state.slice(1)} stateColor={stateColor} />

        {/* Cover visual */}
        <div className='flex flex-col items-center mt-6'>
          <div
            className='relative rounded-xl border border-white/10 overflow-hidden'
            style={{ width: 200, height: 280, background: 'rgba(255,255,255,0.03)' }}
          >
            {/* Closed portion */}
            <div
              className='absolute top-0 left-0 right-0 transition-all duration-500'
              style={{
                height: `${closedPct}%`,
                background: 'linear-gradient(180deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))',
              }}
            >
              {/* Slats */}
              {Array.from({ length: slatCount }, (_, i) => (
                <div key={i} className='border-b border-blue-400/20' style={{ height: `${100 / Math.max(slatCount, 1)}%` }} />
              ))}
            </div>
          </div>
          <p className='text-white/60 text-sm mt-3 font-medium'>{position}% ouvert</p>
        </div>

        {/* Control buttons */}
        <div className='flex items-center justify-center gap-3 mt-6'>
          <button
            onClick={() => callService('open_cover')}
            className='flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-medium transition-colors'
          >
            <ChevronUp size={16} /> OUVRIR
          </button>
          <button
            onClick={() => callService('stop_cover')}
            className='flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-medium transition-colors'
          >
            <Square size={14} /> STOP
          </button>
          <button
            onClick={() => callService('close_cover')}
            className='flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-medium transition-colors'
          >
            <ChevronDown size={16} /> FERMER
          </button>
        </div>
      </div>

      {showInfoPanel && (
        <div className='lg:col-span-2 mt-8 lg:mt-0'>
          <InfoSidebar
            modules={
              [
                {
                  type: 'presets',
                  title: 'Préréglages',
                  presets: PRESETS.map(p => ({ label: p.label, value: p.value, active: position === p.value })),
                  onSelect: v => callService('set_cover_position', { position: v }),
                },
                {
                  type: 'details',
                  title: 'Informations',
                  entries: [
                    { label: 'ÉTAT', value: state },
                    { label: 'POSITION', value: `${position}%` },
                    { label: 'CLASSE', value: (entity.attributes.device_class as string) ?? '—' },
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
