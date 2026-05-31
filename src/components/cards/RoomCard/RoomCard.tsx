import { motion } from 'framer-motion';
import { Thermometer, Lightbulb, Droplets, ChevronRight, Package } from 'lucide-react';
import { useHass } from '@hakit/core';
import { usePanel, type PanelId } from '@/context/PanelContext';
import { useEntities } from '@/hooks/useEntities';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { RoomCardConfig, RoomControl } from '@/types/widget-configs';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { useGroupEmbedded } from '@/components/cards/GroupCard/GroupCard';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import type { SoundPreset } from '@/lib/sounds';

// ── Control button ─────────────────────────────────────────────────────────────

function ControlButton({
  ctrl,
  embedded,
  soundOverrides,
}: {
  ctrl: RoomControl;
  embedded?: boolean;
  soundOverrides?: Record<string, SoundPreset>;
}) {
  const { helpers } = useHass();
  const playFeedback = useSoundFeedback('rooms', soundOverrides);
  const stateEntity = useSafeEntity(ctrl.stateEntity ?? '');
  const isOn = stateEntity ? stateEntity.state === 'on' : false;

  const iconName = ctrl.icon;
  const customIconUrl = iconName && isCustomIcon(iconName) ? getCustomIconUrl(iconName) : undefined;
  // eslint-disable-next-line react-hooks/static-components
  const IconComp = !customIconUrl ? (resolveIcon(iconName) ?? Package) : null;

  const color = ctrl.color ?? '#60a5fa';
  const active = ctrl.stateEntity ? isOn : false;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    helpers.callService({
      domain: ctrl.domain as never,
      service: ctrl.service as never,
      target: ctrl.entityId ? { entity_id: ctrl.entityId } : undefined,
    });
    playFeedback('room_tap');
  };

  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={handleClick}
      title={ctrl.label}
      className='flex-1 flex flex-col items-center justify-center gap-1 rounded-xl border transition-all duration-300'
      style={{
        padding: embedded ? '6px 4px' : '8px 4px',
        ...(active
          ? { background: `${color}18`, borderColor: `${color}30` }
          : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }),
      }}
    >
      {customIconUrl ? (
        <img src={customIconUrl} alt='' className='w-4 h-4 object-contain' />
      ) : IconComp ? (
        // eslint-disable-next-line react-hooks/static-components
        <IconComp size={embedded ? 14 : 16} style={active ? { color } : { color: 'rgba(255,255,255,0.35)' }} />
      ) : null}
      <span
        className='text-[9px] font-medium leading-none truncate max-w-full px-1'
        style={active ? { color } : { color: 'rgba(255,255,255,0.35)' }}
      >
        {ctrl.label}
      </span>
    </motion.button>
  );
}

// ── Default light toggle ───────────────────────────────────────────────────────

function LightToggle({
  entityIds,
  embedded,
  soundOverrides,
}: {
  entityIds: string[];
  embedded?: boolean;
  soundOverrides?: Record<string, SoundPreset>;
}) {
  const { t } = useI18n();
  const { helpers } = useHass();
  const playFeedback = useSoundFeedback('rooms', soundOverrides);
  const entities = useEntities(entityIds);
  const anyOn = entityIds.some(id => entities?.[id]?.state === 'on');

  const handleToggleAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    entityIds.forEach(id => {
      helpers.callService({ domain: 'light', service: 'toggle', target: { entity_id: id } });
    });
    playFeedback(anyOn ? 'light_off' : 'light_on');
  };

  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={handleToggleAll}
      className='flex-1 flex flex-col items-center justify-center gap-1 rounded-xl border transition-all duration-300'
      style={{
        padding: embedded ? '6px 4px' : '8px 4px',
        ...(anyOn
          ? { background: 'rgba(251,191,36,0.14)', borderColor: 'rgba(251,191,36,0.28)' }
          : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }),
      }}
    >
      <Lightbulb size={embedded ? 14 : 16} style={anyOn ? { color: '#fbbf24' } : { color: 'rgba(255,255,255,0.35)' }} />
      <span className='text-[9px] font-medium leading-none' style={anyOn ? { color: '#fbbf24' } : { color: 'rgba(255,255,255,0.35)' }}>
        {anyOn ? t('widgets.light.on') : t('widgets.light.off')}
      </span>
    </motion.button>
  );
}

// ── Main RoomCard ──────────────────────────────────────────────────────────────

export function RoomCard() {
  const embedded = useGroupEmbedded();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<RoomCardConfig>(widgetId || 'room');
  const { openPanel } = usePanel();

  const label = config?.label ?? 'Pièce';
  const iconName = config?.icon ?? 'Home';
  const iconBg = config?.iconBg ?? 'from-blue-500 to-sky-400';
  const panelId = config?.panelId;
  const lightEntities = config?.lightEntities ?? [];
  const controls = config?.controls ?? [];

  const sensorIds = [config?.tempEntity, config?.humidityEntity].filter(Boolean) as string[];
  const sensors = useEntities(sensorIds);

  const rawTemp = config?.tempEntity ? sensors?.[config.tempEntity]?.state : undefined;
  const temp = rawTemp && rawTemp !== 'unavailable' ? Number(rawTemp) : null;

  const rawHumidity = config?.humidityEntity ? sensors?.[config.humidityEntity]?.state : undefined;
  const humidity = rawHumidity && rawHumidity !== 'unavailable' ? Number(rawHumidity) : null;

  const customIconUrl = iconName && isCustomIcon(iconName) ? getCustomIconUrl(iconName) : undefined;
  const IconComp = !customIconUrl ? (resolveIcon(iconName) ?? Package) : null;

  const hasControls = controls.length > 0 || lightEntities.length > 0;

  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (panelId) openPanel(panelId as PanelId);
  };

  // When embedded inside a GroupCard, we strip the gc class (no double glassmorphism)
  const baseClass = embedded ? 'rounded-2xl flex flex-col overflow-hidden h-full' : 'gc rounded-2xl flex flex-col overflow-hidden h-full';

  const bgStyle = embedded ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' } : undefined;

  return (
    <div className={baseClass} style={bgStyle}>
      {/* Header */}
      <div className={cn('flex items-start gap-2.5', embedded ? 'p-2.5' : 'p-3')}>
        {/* Icon */}
        <div
          className={cn(
            'rounded-xl flex items-center justify-center shrink-0 shadow-md bg-gradient-to-br',
            iconBg,
            embedded ? 'w-8 h-8' : 'w-9 h-9'
          )}
        >
          {customIconUrl ? (
            <img src={customIconUrl} alt='' className='w-4 h-4 object-contain' />
          ) : // eslint-disable-next-line react-hooks/static-components
          IconComp ? (
            <IconComp size={embedded ? 15 : 17} className='text-white' strokeWidth={1.8} />
          ) : null}
        </div>

        {/* Name + sensors */}
        <div className='flex flex-col min-w-0 flex-1'>
          <div className='flex items-center justify-between gap-1'>
            <span className={cn('text-white/90 font-semibold leading-tight truncate', embedded ? 'text-xs' : 'text-sm')}>{label}</span>
            {panelId && (
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={handlePanelClick}
                className='shrink-0 w-5 h-5 rounded-lg flex items-center justify-center border transition-colors'
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <ChevronRight size={11} className='text-white/40' />
              </motion.button>
            )}
          </div>
          {(temp !== null || humidity !== null) && (
            <div className='flex items-center gap-2 mt-0.5'>
              {temp !== null && !isNaN(temp) && (
                <span className='text-[10px] text-white/45 font-medium flex items-center gap-0.5'>
                  <Thermometer size={9} className='text-white/25' />
                  <AnimatedNumber value={temp} decimals={1} suffix='°' />
                </span>
              )}
              {humidity !== null && !isNaN(humidity) && (
                <span className='text-[10px] text-white/45 font-medium flex items-center gap-0.5'>
                  <Droplets size={9} className='text-sky-400/50' />
                  {humidity.toFixed(0)}%
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      {hasControls && (
        <div className={cn('flex gap-1.5 mt-auto', embedded ? 'px-2.5 pb-2.5' : 'px-3 pb-3')}>
          {lightEntities.length > 0 && controls.length === 0 && (
            <LightToggle entityIds={lightEntities} embedded={embedded} soundOverrides={config?.soundOverrides} />
          )}
          {controls.map((ctrl, i) => (
            <ControlButton key={i} ctrl={ctrl} embedded={embedded} soundOverrides={config?.soundOverrides} />
          ))}
        </div>
      )}
    </div>
  );
}
