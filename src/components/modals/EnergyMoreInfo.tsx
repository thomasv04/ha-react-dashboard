import { useState, useMemo } from 'react';
import { Zap, Sun, Home, PlugZap, BatteryCharging } from 'lucide-react';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useEntityHistory } from '@/hooks/useEntityHistory';
import { MoreInfoHeader } from './MoreInfoHeader';
import { InfoSidebar, type SidebarModule } from './sidebar';
import { HistoryGraph } from '@/components/charts/HistoryGraph';
import type { EnergyCardConfig } from '@/types/widget-types';

type HistoryTab = 'battery' | 'solar' | 'grid' | 'home';

function HorizontalBattery({ level, state }: { level: number; state: string }) {
  const color = level > 60 ? '#22c55e' : level > 25 ? '#eab308' : '#ef4444';
  const colorLight = level > 60 ? '#4ade80' : level > 25 ? '#fbbf24' : '#f87171';
  const isCharging = state === 'charging';
  const isDischarging = state === 'discharging';

  // Horizontal battery: body 200×80, terminal on right
  const bodyW = 200;
  const bodyH = 80;
  const termW = 12;
  const termH = 32;
  const pad = 6;
  const innerW = bodyW - pad * 2;
  const innerH = bodyH - pad * 2;
  const fillW = (level / 100) * innerW;

  return (
    <div className='flex items-center gap-5'>
      <svg width={bodyW + termW + 4} height={bodyH} viewBox={`0 0 ${bodyW + termW + 4} ${bodyH}`}>
        <defs>
          <linearGradient id='battHGrad' x1='0' y1='0' x2='1' y2='0'>
            <stop offset='0%' stopColor={color} />
            <stop offset='100%' stopColor={colorLight} />
          </linearGradient>
          <linearGradient id='battHShimmer' x1='0' y1='0' x2='1' y2='0'>
            <stop offset='0%' stopColor='white' stopOpacity='0' />
            <stop offset='50%' stopColor='white' stopOpacity='0.12' />
            <stop offset='100%' stopColor='white' stopOpacity='0' />
          </linearGradient>
        </defs>
        {/* Body outline */}
        <rect x='0' y='0' width={bodyW} height={bodyH} rx='10' fill='none' stroke='rgba(255,255,255,0.15)' strokeWidth='2.5' />
        {/* Ghost track */}
        <rect x={pad} y={pad} width={innerW} height={innerH} rx='6' fill='rgba(255,255,255,0.04)' />
        {/* Fill */}
        <rect
          x={pad}
          y={pad}
          width={fillW}
          height={innerH}
          rx='6'
          fill='url(#battHGrad)'
          style={{ transition: 'width 1s ease-out', filter: `drop-shadow(0 0 10px ${color}50)` }}
        />
        {/* Shimmer */}
        <rect x={pad} y={pad} width={fillW} height={innerH} rx='6' fill='url(#battHShimmer)' style={{ transition: 'width 1s ease-out' }} />
        {/* Terminal nub */}
        <rect x={bodyW + 2} y={(bodyH - termH) / 2} width={termW} height={termH} rx='4' fill='rgba(255,255,255,0.2)' />
        {/* Charging bolt */}
        {isCharging && (
          <polygon points='108,18 88,42 102,42 94,62 118,36 104,36 112,18' fill='white' fillOpacity='0.75'>
            <animate attributeName='fill-opacity' values='0.5;0.85;0.5' dur='2s' repeatCount='indefinite' />
          </polygon>
        )}
        {/* Discharging arrow (pointing left = energy leaving) */}
        {isDischarging && (
          <polygon points='85,40 105,28 105,36 130,36 130,44 105,44 105,52' fill='white' fillOpacity='0.5'>
            <animate attributeName='fill-opacity' values='0.3;0.65;0.3' dur='1.8s' repeatCount='indefinite' />
          </polygon>
        )}
      </svg>

      {/* Text beside battery */}
      <div className='flex flex-col'>
        <span className='text-4xl font-bold text-white'>{level}%</span>
        <span className={`text-sm font-medium mt-1 ${isCharging ? 'text-green-400' : isDischarging ? 'text-orange-400' : 'text-zinc-400'}`}>
          {isCharging && <BatteryCharging size={14} className='inline mr-1' />}
          {isCharging ? 'En charge' : isDischarging ? 'En décharge' : 'Veille'}
        </span>
      </div>
    </div>
  );
}

function normalizePackState(raw: string): string {
  if (['charging', 'En charge', '1'].includes(raw)) return 'charging';
  if (['discharging', 'En décharge', '2'].includes(raw)) return 'discharging';
  return 'idle';
}

function FlowCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
  active,
}: {
  icon: typeof Sun;
  label: string;
  value: string;
  unit: string;
  color: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 border transition-all ${
        active ? `bg-[${color}]/10 border-[${color}]/20` : 'bg-white/[0.03] border-white/[0.06]'
      }`}
      style={active ? { backgroundColor: `${color}15`, borderColor: `${color}30` } : undefined}
    >
      <div className='w-9 h-9 rounded-xl flex items-center justify-center' style={{ backgroundColor: `${color}20` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className='flex-1 min-w-0'>
        <p className='text-[10px] font-bold uppercase tracking-widest text-white/40'>{label}</p>
        <p className='text-lg font-semibold text-white'>
          {value} <span className='text-xs text-white/40'>{unit}</span>
        </p>
      </div>
    </div>
  );
}

export default function EnergyMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<EnergyCardConfig>(widgetId);
  const showInfoPanel = config?.showInfoPanel !== false;
  const [historyHours, setHistoryHours] = useState(24);
  const [historyTab, setHistoryTab] = useState<HistoryTab>('battery');

  const batteryLevelId = entityId || config?.batteryLevelEntity || '';
  const solarId = config?.solarProductionEntity ?? '';
  const gridId = config?.gridInputPowerEntity ?? '';
  const homeId = config?.homeOutputPowerEntity ?? '';

  const entity = useSafeEntity(batteryLevelId);
  const solarEntity = useSafeEntity(solarId);
  const gridEntity = useSafeEntity(gridId);
  const homeEntity = useSafeEntity(homeId);
  const batteryStateEntity = useSafeEntity(config?.batteryStateEntity ?? '');

  const historyEntityId = useMemo(() => {
    switch (historyTab) {
      case 'solar':
        return solarId;
      case 'grid':
        return gridId;
      case 'home':
        return homeId;
      default:
        return batteryLevelId;
    }
  }, [historyTab, batteryLevelId, solarId, gridId, homeId]);

  const { data } = useEntityHistory(historyEntityId, historyHours);

  if (!entity) return <div className='p-12 text-white/40 text-center'>Entité introuvable</div>;

  const name = (entity.attributes.friendly_name as string) ?? 'Énergie Solaire';
  const level = Number(entity.state) || 0;
  const packState = normalizePackState(batteryStateEntity?.state ?? 'idle');

  const solarVal = solarEntity?.state ?? '—';
  const solarUnit = (solarEntity?.attributes.unit_of_measurement as string) ?? 'W';
  const gridVal = gridEntity?.state ?? '—';
  const gridUnit = (gridEntity?.attributes.unit_of_measurement as string) ?? 'W';
  const homeVal = homeEntity?.state ?? '—';
  const homeUnit = (homeEntity?.attributes.unit_of_measurement as string) ?? 'W';

  const historyColors: Record<HistoryTab, string> = {
    battery: '#facc15',
    solar: '#22c55e',
    grid: '#60a5fa',
    home: '#f97316',
  };

  const historyTabs: { id: HistoryTab; label: string; show: boolean }[] = [
    { id: 'battery', label: 'Batterie', show: true },
    { id: 'solar', label: 'Solaire', show: !!solarId },
    { id: 'grid', label: 'Réseau', show: !!gridId },
    { id: 'home', label: 'Maison', show: !!homeId },
  ];

  return (
    <div className='p-8 md:p-12 lg:grid lg:grid-cols-5 lg:gap-8'>
      {/* Left panel */}
      <div className='lg:col-span-3 flex flex-col'>
        <MoreInfoHeader icon={Zap} name={name} state={`${level}%`} stateColor='#facc15' />

        {/* Horizontal battery */}
        <div className='flex justify-center mt-6'>
          <HorizontalBattery level={level} state={packState} />
        </div>

        {/* Flow cards */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4'>
          {solarEntity && (
            <FlowCard icon={Sun} label='Solaire' value={solarVal} unit={solarUnit} color='#22c55e' active={Number(solarVal) > 0} />
          )}
          {gridEntity && (
            <FlowCard icon={PlugZap} label='Réseau' value={gridVal} unit={gridUnit} color='#60a5fa' active={Number(gridVal) > 0} />
          )}
          {homeEntity && (
            <FlowCard icon={Home} label='Maison' value={homeVal} unit={homeUnit} color='#f97316' active={Number(homeVal) > 0} />
          )}
        </div>

        {/* History tabs + graph */}
        <div className='mt-6'>
          <div className='flex gap-1 bg-white/5 rounded-xl p-1 w-fit mb-4'>
            {historyTabs
              .filter(t => t.show)
              .map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setHistoryTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-colors ${
                    historyTab === tab.id ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
          </div>
          <HistoryGraph data={data} color={historyColors[historyTab]} />
        </div>
      </div>

      {/* Right panel — Energy sidebar */}
      {showInfoPanel && (
        <div className='lg:col-span-2 mt-8 lg:mt-0'>
          <InfoSidebar
            modules={
              [
                { type: 'powerBalance', production: Number(solarVal) || 0, consumption: Number(homeVal) || 0 },
                {
                  type: 'powerBars',
                  entries: [
                    { label: 'Solaire', value: Number(solarVal) || 0, unit: solarUnit, color: '#22c55e' },
                    { label: 'Réseau', value: Number(gridVal) || 0, unit: gridUnit, color: '#60a5fa' },
                    { label: 'Maison', value: Number(homeVal) || 0, unit: homeUnit, color: '#f97316' },
                  ],
                },
                {
                  type: 'details',
                  title: 'Batterie',
                  entries: [
                    { label: 'Niveau', value: `${level}%` },
                    {
                      label: 'État',
                      value: packState === 'charging' ? 'En charge' : packState === 'discharging' ? 'En décharge' : 'Veille',
                      color:
                        packState === 'charging' ? 'text-green-400' : packState === 'discharging' ? 'text-orange-400' : 'text-zinc-400',
                    },
                    ...(gridEntity ? [{ label: 'Puissance réseau', value: `${gridVal} ${gridUnit}` }] : []),
                  ],
                },
                { type: 'history', historyHours, onHistoryHoursChange: setHistoryHours },
                { type: 'entityId', entityIds: [batteryLevelId, solarId, gridId, homeId] },
              ] as SidebarModule[]
            }
          />
        </div>
      )}
    </div>
  );
}
