import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { SensorCardConfig } from '@/types/widget-configs';
import { cn } from '@/lib/utils';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';
import { Power } from 'lucide-react';
import { useHass } from '@hakit/core';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { SparkLine } from '@/components/charts/SparkLine';
import { SensorGauge } from '@/components/charts/SensorGauge';
import { BarChart } from '@/components/charts/BarChart';
import { useSensorHistory } from '@/hooks/useSensorHistory';
import { useI18n } from '@/i18n';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { useRipple, RippleLayer } from '@/components/ui/Ripple';
import { useWidgetSize } from '@/hooks/useWidgetSize';

function useRelativeTime(isoTimestamp: string | undefined): string {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!isoTimestamp) return '';
  // eslint-disable-next-line react-hooks/purity
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return '__justNow__';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return `${Math.floor(diffH / 24)}j`;
}

const DOMAIN_ICONS: Record<string, string> = {
  sensor: 'Activity',
  binary_sensor: 'CircleDot',
  switch: 'ToggleRight',
  input_boolean: 'ToggleRight',
  light: 'Lightbulb',
  script: 'Play',
  scene: 'Theater',
  automation: 'Zap',
};

const TOGGLEABLE = new Set(['switch', 'input_boolean', 'light', 'script', 'scene', 'automation']);

function formatState(state: string, unit?: string): string {
  const num = parseFloat(state);
  if (isNaN(num)) return state;
  const formatted = Number.isInteger(num) ? num.toString() : num.toFixed(1);
  return unit ? `${formatted} ${unit}` : formatted;
}

function getThresholdColor(value: number, thresholds?: { value: number; color: string }[]): string | undefined {
  if (!thresholds?.length) return undefined;
  const sorted = [...thresholds].sort((a, b) => a.value - b.value);
  let color: string | undefined;
  for (const t of sorted) {
    if (value >= t.value) color = t.color;
  }
  return color;
}

export function SensorCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<SensorCardConfig>(widgetId || 'sensor');
  const entityId = config?.entityId ?? 'sensor.bedroom_temperature';
  const variant = config?.variant ?? 'default';

  const entity = useSafeEntity(entityId);
  const { helpers } = useHass();
  const playFeedback = useSoundFeedback();
  const { data: historyData, loading: historyLoading } = useSensorHistory(variant === 'sparkline' || variant === 'bar' ? entityId : '', 24);

  const showStaleBadge = config?.staleBadge ?? false;
  const staleThreshold = (config?.staleThresholdMinutes ?? 10) * 60_000;
  const lastUpdated =
    (entity as unknown as { last_updated?: string } | null)?.last_updated ??
    ((entity?.attributes as Record<string, unknown> | undefined)?.last_updated as string | undefined);
  const relativeTime = useRelativeTime(showStaleBadge ? lastUpdated : undefined);
  const { ripples, trigger: triggerRipple } = useRipple();
  const cardRef = useRef<HTMLDivElement>(null);
  const widgetSize = useWidgetSize(cardRef);
  const isCompact = widgetSize === 'xs' || widgetSize === 'sm';

  if (!entity) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className='gc rounded-3xl p-4 flex items-center justify-center h-full'
      >
        <span className='text-white/30 text-sm'>{t('widgets.sensor.notFound')}</span>
      </motion.div>
    );
  }

  const domain = entityId.split('.')[0];
  const name = config?.name ?? (entity.attributes.friendly_name as string) ?? entityId;
  const unit = entity.attributes.unit_of_measurement as string | undefined;
  const state = entity.state;
  const numericValue = parseFloat(state);
  const isNumeric = !isNaN(numericValue);
  const isToggleable = TOGGLEABLE.has(domain);
  const isOn = ['on', 'playing', 'home', 'heating'].includes(state);

  const iconName = config?.icon ?? DOMAIN_ICONS[domain] ?? 'Activity';
  const customIconUrl = isCustomIcon(iconName) ? getCustomIconUrl(iconName) : undefined;
  // eslint-disable-next-line react-hooks/static-components
  const IconComponent = customIconUrl ? undefined : resolveIcon(iconName);

  const thresholdColor = isNumeric ? getThresholdColor(numericValue, config?.thresholds) : undefined;
  const accentColor = thresholdColor ?? (isOn ? '#fbbf24' : '#60a5fa');

  // eslint-disable-next-line react-hooks/purity
  const isStale = showStaleBadge && lastUpdated ? Date.now() - new Date(lastUpdated).getTime() > staleThreshold : false;
  const staleBadgeLabel =
    relativeTime === '__justNow__'
      ? t('widgets.sensor.justNow')
      : relativeTime
        ? t('widgets.sensor.updatedAgo', { value: relativeTime })
        : '';

  const handleToggle = () => {
    if (!isToggleable) return;
    if (domain === 'script') {
      helpers.callService({ domain: 'script', service: 'turn_on', target: { entity_id: entityId } });
    } else if (domain === 'scene') {
      helpers.callService({ domain: 'scene', service: 'turn_on', target: { entity_id: entityId } });
    } else {
      helpers.callService({ domain: domain as never, service: 'toggle', target: { entity_id: entityId } });
    }
    playFeedback(domain === 'script' || domain === 'scene' ? 'click' : isOn ? 'toggle_off' : 'toggle_on');
  };

  const displayState = (() => {
    if (domain === 'binary_sensor')
      return isOn ? (config?.onText ?? t('widgets.sensor.active')) : (config?.offText ?? t('widgets.sensor.inactive'));
    if (isToggleable) return isOn ? t('widgets.light.on') : t('widgets.light.off');
    return formatState(state, unit);
  })();

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE }}
      onPointerDown={isToggleable ? triggerRipple : undefined}
      onClick={isToggleable ? handleToggle : undefined}
      className={cn(
        'gc rounded-3xl flex flex-col h-full relative overflow-hidden select-none',
        isCompact ? 'p-2.5' : 'p-3.5',
        isToggleable ? 'cursor-pointer' : 'cursor-default'
      )}
    >
      {isToggleable && <RippleLayer ripples={ripples} color={`${accentColor}25`} />}

      {/* ── Header : nom + badge toggle ── */}
      <div className='flex items-center justify-between mb-1'>
        <span className='text-white/40 text-xs font-medium truncate'>{name}</span>

        {isToggleable ? (
          <motion.span
            key={isOn ? 'on' : 'off'}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            className={cn(
              'text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border shrink-0 ml-2',
              isOn ? 'bg-green-500/15 text-green-300 border-green-500/20' : 'bg-white/5 text-white/25 border-white/8'
            )}
          >
            {isOn ? 'ON' : 'OFF'}
          </motion.span>
        ) : showStaleBadge && staleBadgeLabel ? (
          <span
            className={cn(
              'text-[10px] px-2 py-0.5 rounded-full border shrink-0 ml-2',
              isStale ? 'bg-red-500/15 text-red-400 border-red-500/20' : 'bg-white/5 text-white/20 border-white/8'
            )}
          >
            {staleBadgeLabel}
          </span>
        ) : null}
      </div>

      {/* ── Icône ── */}
      <div className={cn('flex items-center justify-between', isCompact ? 'mb-1' : 'mb-2')}>
        <motion.div
          animate={isOn ? { scale: [1, 1.07, 1] } : undefined}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className={cn(
            'rounded-xl flex items-center justify-center border transition-all duration-300',
            isCompact ? 'w-7 h-7' : 'w-9 h-9',
            isOn || (!isToggleable && !thresholdColor) ? 'bg-white/8 border-white/12' : 'bg-white/5 border-white/8'
          )}
          style={
            thresholdColor
              ? { backgroundColor: `${thresholdColor}14`, borderColor: `${thresholdColor}30` }
              : isOn
                ? { backgroundColor: `${accentColor}14`, borderColor: `${accentColor}28` }
                : undefined
          }
        >
          {customIconUrl ? (
            <img src={customIconUrl} alt='' className={cn('object-contain', isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
          ) : IconComponent ? (
            <IconComponent
              size={isCompact ? 14 : 17}
              className='text-white/55 transition-colors'
              style={thresholdColor || isOn ? { color: accentColor } : undefined}
            />
          ) : (
            <Power size={isCompact ? 14 : 17} className='text-white/55' />
          )}
        </motion.div>

        {/* Stale badge inline si pas de toggle */}
        {!isToggleable && showStaleBadge && isStale && (
          <span className='text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20'>
            ⚠ {t('widgets.sensor.stale')}
          </span>
        )}
      </div>

      {/* ── Corps : valeur / gauge / chart ── */}
      <div className='flex-1 flex flex-col justify-end min-h-0'>
        {variant === 'gauge' && isNumeric ? (
          <div className='flex-1 flex items-center justify-center'>
            <SensorGauge
              value={numericValue}
              min={config?.min ?? 0}
              max={config?.max ?? 100}
              unit={unit}
              color={accentColor}
              size={90}
              label={name}
            />
          </div>
        ) : (
          <>
            {/* Graphique mini */}
            {isNumeric && (variant === 'sparkline' || variant === 'bar') && (
              <div className='mb-2'>
                {historyLoading ? (
                  <div className='h-8 w-full rounded bg-white/5 animate-pulse' />
                ) : historyData.length > 1 ? (
                  variant === 'sparkline' ? (
                    <SparkLine data={historyData} height={32} color={accentColor} id={`spark-${widgetId}`} />
                  ) : (
                    <BarChart data={historyData} height={32} color={accentColor} />
                  )
                ) : null}
              </div>
            )}

            {/* Barre de progression (variant default numérique) */}
            {isNumeric && variant === 'default' && !isCompact && (
              <div className='mb-2'>
                <svg viewBox='0 0 120 6' className='w-full h-1.5' style={{ overflow: 'visible' }}>
                  <rect x='0' y='1' width='120' height='4' rx='2' fill='rgba(255,255,255,0.06)' />
                  <motion.rect
                    x='0'
                    y='1'
                    height='4'
                    rx='2'
                    initial={{ width: 0 }}
                    animate={{
                      width: Math.max(
                        4,
                        Math.min(120, ((numericValue - (config?.min ?? 0)) / ((config?.max ?? 100) - (config?.min ?? 0))) * 120)
                      ),
                    }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    fill={accentColor}
                    opacity={0.55}
                  />
                </svg>
              </div>
            )}

            {/* Valeur principale */}
            <div
              className={cn('font-light tracking-tight leading-none', isCompact ? 'text-xl' : 'text-3xl')}
              style={thresholdColor ? { color: thresholdColor } : undefined}
            >
              {isNumeric ? (
                <AnimatedNumber value={numericValue} decimals={Number.isInteger(numericValue) ? 0 : 1} suffix={unit ? ` ${unit}` : ''} />
              ) : (
                <span className='text-white'>{displayState}</span>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
