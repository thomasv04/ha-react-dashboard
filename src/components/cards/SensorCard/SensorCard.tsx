import { motion } from 'framer-motion';
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
import { useState, useEffect } from 'react';
import { useRipple, RippleLayer } from '@/components/ui/Ripple';

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

// ── Domaine → icône par défaut ────────────────────────────────────────────────
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

// ── Domaines "actionnables" (toggle) ──────────────────────────────────────────
const TOGGLEABLE = new Set(['switch', 'input_boolean', 'light', 'script', 'scene', 'automation']);

// ── Formattage de l'état numérique ────────────────────────────────────────────
function formatState(state: string, unit?: string): string {
  const num = parseFloat(state);
  if (isNaN(num)) return state;
  const formatted = Number.isInteger(num) ? num.toString() : num.toFixed(1);
  return unit ? `${formatted} ${unit}` : formatted;
}

// ── Couleur basée sur les seuils ──────────────────────────────────────────────
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
  const { data: historyData, loading: historyLoading } = useSensorHistory(variant === 'sparkline' || variant === 'bar' ? entityId : '', 24);

  const showStaleBadge = config?.staleBadge ?? false;
  const staleThreshold = (config?.staleThresholdMinutes ?? 10) * 60_000;
  const lastUpdated =
    (entity as unknown as { last_updated?: string } | null)?.last_updated ??
    ((entity?.attributes as Record<string, unknown> | undefined)?.last_updated as string | undefined);
  const relativeTime = useRelativeTime(showStaleBadge ? lastUpdated : undefined);
  const { ripples, trigger: triggerRipple } = useRipple();

  if (!entity) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className='gc rounded-3xl p-5 flex items-center justify-center h-full'
      >
        <span className='text-white/30 text-sm'>Entité introuvable</span>
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
  };

  const displayState = (() => {
    if (domain === 'binary_sensor') {
      return isOn ? (config?.onText ?? 'Actif') : (config?.offText ?? 'Inactif');
    }
    if (isToggleable) {
      return isOn ? 'Allumé' : 'Éteint';
    }
    return formatState(state, unit);
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onPointerDown={isToggleable ? triggerRipple : undefined}
      className={cn(
        'gc rounded-3xl p-5 flex flex-col justify-between h-full relative overflow-hidden cursor-default',
        isToggleable && 'cursor-pointer'
      )}
      onClick={isToggleable ? handleToggle : undefined}
    >
      {isToggleable && <RippleLayer ripples={ripples} />}
      {/* Header: icône + badge */}
      <div className='flex items-start justify-between'>
        <motion.div
          animate={isOn ? { scale: [1, 1.08, 1] } : undefined}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300',
            isOn
              ? 'bg-gradient-to-br from-amber-400/15 to-amber-400/25 border border-amber-400/20 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
              : 'bg-white/5 border border-white/8'
          )}
          style={
            thresholdColor
              ? { backgroundColor: `${thresholdColor}15`, borderColor: `${thresholdColor}30`, boxShadow: `0 0 12px ${thresholdColor}20` }
              : undefined
          }
        >
          {customIconUrl ? (
            <img src={customIconUrl} alt='' className='w-5 h-5 object-contain' />
          ) : IconComponent ? (
            <IconComponent
              size={20}
              className={cn(isOn ? 'text-amber-400' : 'text-white/60', 'transition-colors')}
              style={thresholdColor ? { color: thresholdColor } : undefined}
            />
          ) : (
            <Power size={20} className='text-white/60' />
          )}
        </motion.div>

        {isToggleable && (
          <motion.span
            key={isOn ? 'on' : 'off'}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: isOn ? 1 : 0.95, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={cn(
              'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all duration-300',
              isOn
                ? 'bg-green-500/15 text-green-400 border-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.15)]'
                : 'bg-white/5 text-white/30 border-white/8'
            )}
          >
            {isOn ? 'ON' : 'OFF'}
          </motion.span>
        )}
      </div>

      {/* Body: valeur principale */}
      {variant === 'gauge' && isNumeric ? (
        <div className='mt-auto flex justify-center'>
          <SensorGauge
            value={numericValue}
            min={config?.min ?? 0}
            max={config?.max ?? 100}
            unit={unit}
            color={thresholdColor ?? '#60a5fa'}
            size={100}
            label={name}
          />
        </div>
      ) : (
        <div className='mt-auto'>
          {isNumeric && (
            <div className='mb-2'>
              {variant === 'sparkline' && historyData.length > 1 ? (
                <SparkLine data={historyData} height={40} color={thresholdColor ?? '#60a5fa'} id={`spark-${widgetId}`} />
              ) : variant === 'bar' && historyData.length > 1 ? (
                <BarChart data={historyData} height={40} color={thresholdColor ?? '#60a5fa'} />
              ) : (variant === 'sparkline' || variant === 'bar') && historyLoading ? (
                <div className='h-10 w-full rounded bg-white/5 animate-pulse' />
              ) : (
                <svg viewBox='0 0 120 8' className='w-full h-2'>
                  <defs>
                    <linearGradient id={`sensorGrad-${widgetId}`} x1='0' y1='0' x2='1' y2='0'>
                      <stop offset='0%' stopColor={thresholdColor ?? 'rgba(255,255,255,0.4)'} stopOpacity='0.2' />
                      <stop offset='100%' stopColor={thresholdColor ?? 'rgba(255,255,255,0.6)'} />
                    </linearGradient>
                  </defs>
                  <rect x='0' y='2' width='120' height='4' rx='2' fill='white' opacity='0.06' />
                  <motion.rect
                    x='0'
                    y='2'
                    height='4'
                    rx='2'
                    initial={{ width: 0 }}
                    animate={{
                      width: Math.max(
                        4,
                        Math.min(120, ((numericValue - (config?.min ?? 0)) / ((config?.max ?? 50) - (config?.min ?? 0))) * 120)
                      ),
                    }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    fill={`url(#sensorGrad-${widgetId})`}
                  />
                </svg>
              )}
            </div>
          )}
          <div className='text-3xl font-light tracking-tight text-white' style={thresholdColor ? { color: thresholdColor } : undefined}>
            {isNumeric ? (
              <AnimatedNumber value={numericValue} decimals={Number.isInteger(numericValue) ? 0 : 1} suffix={unit ? ` ${unit}` : ''} />
            ) : (
              displayState
            )}
          </div>
          <div className='text-white/40 text-xs mt-1 uppercase tracking-wider font-medium'>
            {name}
            {isNumeric && unit && <span className='text-white/25 ml-1'>{unit}</span>}
          </div>
          {showStaleBadge && staleBadgeLabel && (
            <motion.div
              key={staleBadgeLabel}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                'text-[10px] mt-1.5 px-2 py-0.5 rounded-full w-fit border transition-colors duration-500',
                isStale ? 'bg-red-500/15 text-red-400 border-red-500/20' : 'bg-white/5 text-white/25 border-white/8'
              )}
            >
              {isStale ? `⚠ ${t('widgets.sensor.stale')} · ${staleBadgeLabel}` : staleBadgeLabel}
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
