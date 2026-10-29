import { useState, useMemo } from 'react';
import { Zap, Sun, Home, PlugZap, BatteryCharging } from 'lucide-react';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useEntityHistory } from '@/hooks/useEntityHistory';
import { MoreInfoHeader } from './MoreInfoHeader';
import { InfoSidebar, type SidebarModule } from './sidebar';
import { HistoryGraph } from '@/components/charts/HistoryGraph';
import type { EnergyCardConfig } from '@/types/widget-types';
import { useI18n } from '@/i18n';
import { friendlyName } from '@/lib/ha-service';

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
        <span className='text-4xl font-bold text-[var(--ds-ink)]'>{level}%</span>
        <span
          className={`text-sm font-medium mt-1 ${isCharging ? 'text-[var(--ds-good)]' : isDischarging ? 'text-[var(--ds-heat-ink)]' : 'text-[var(--ds-ink-muted)]'}`}
        >
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
    <div className='flex items-center gap-3 rounded-[var(--ds-radius-lg)] bg-[var(--ds-sheet-section)] px-4 py-3'>
      <Icon size={22} aria-hidden='true' className='shrink-0' style={{ color: active ? color : 'var(--ds-ink-muted)' }} />
      <div className='flex-1 min-w-0'>
        <p className='text-[15px] font-bold text-[var(--ds-ink-muted)]'>{label}</p>
        <p className='text-lg font-semibold text-[var(--ds-ink)]'>
          {value} <span className='text-xs text-[var(--ds-ink-muted)]'>{unit}</span>
        </p>
      </div>
    </div>
  );
}

export default function EnergyMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { t } = useI18n();
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

  if (!entity) return <div className='p-12 text-[var(--ds-ink-muted)] text-center'>{t('common.entityNotFound')}</div>;

  const name = friendlyName(entity) ?? t('widgets.energy.defaultName');
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
    <div className='flex flex-col gap-4 p-6'>
      {/* Left panel */}
      <div className='flex flex-col'>
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
          <div className='flex gap-1 bg-[var(--ds-sheet-section)] rounded-[var(--ds-radius-md)] p-1 w-fit mb-4'>
            {historyTabs
              .filter(t => t.show)
              .map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setHistoryTab(tab.id)}
                  className={`h-10 rounded-[var(--ds-radius-sm)] px-4 text-sm font-semibold transition-colors ${
                    historyTab === tab.id ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'text-[var(--ds-ink-muted)]'
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
        <div>
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
                        packState === 'charging'
                          ? 'text-[var(--ds-good)]'
                          : packState === 'discharging'
                            ? 'text-[var(--ds-heat-ink)]'
                            : 'text-[var(--ds-ink-muted)]',
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
