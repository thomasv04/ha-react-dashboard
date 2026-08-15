import { useRef } from 'react';
import { motion } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { SensorCardConfig } from '@/types/widget-configs';
import { cn } from '@/lib/utils';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';
import { Power, Activity } from 'lucide-react';
import { CardPlaceholder } from '@/components/ui/CardPlaceholder';
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
import { useRelativeTime, JUST_NOW } from '@/hooks/useRelativeTime';

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
  const isCompact = widgetSize.compact;

  if (!entity) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='gc rounded-3xl p-4 h-full'>
        <CardPlaceholder icon={Activity} text={t('widgets.sensor.notFound')} />
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
  const IconComponent = customIconUrl ? undefined : resolveIcon(iconName);

  const thresholdColor = isNumeric ? getThresholdColor(numericValue, config?.thresholds) : undefined;
  const accentColor = thresholdColor ?? (isOn ? '#fbbf24' : '#60a5fa');

  const gaugeMin = config?.min ?? 0;
  const gaugeMax = config?.max ?? 100;
  const gaugePercent = Math.max(0, Math.min(100, ((numericValue - gaugeMin) / (gaugeMax - gaugeMin || 1)) * 100));

  // eslint-disable-next-line react-hooks/purity
  const isStale = showStaleBadge && lastUpdated ? Date.now() - new Date(lastUpdated).getTime() > staleThreshold : false;
  const staleBadgeLabel =
    relativeTime === JUST_NOW ? t('widgets.sensor.justNow') : relativeTime ? t('widgets.sensor.updatedAgo', { value: relativeTime }) : '';

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

  const iconTile = (
    <motion.div
      animate={isOn ? { scale: [1, 1.07, 1] } : undefined}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      className={cn(
        'rounded-xl flex items-center justify-center border transition-all duration-300 shrink-0',
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
        // eslint-disable-next-line react-hooks/static-components
        <IconComponent
          size={isCompact ? 14 : 17}
          className='text-white/55 transition-colors'
          style={thresholdColor || isOn ? { color: accentColor } : undefined}
        />
      ) : (
        <Power size={isCompact ? 14 : 17} className='text-white/55' />
      )}
    </motion.div>
  );

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
      style={
        thresholdColor || isOn
          ? { borderColor: `${accentColor}30`, boxShadow: `var(--dash-elev-card), 0 0 28px -10px ${accentColor}77` }
          : undefined
      }
    >
      {isToggleable && <RippleLayer ripples={ripples} color={`${accentColor}25`} />}

      {/* Halo d'accent en fond — donne de la profondeur au verre dès que la
          valeur franchit un seuil ou que l'entité est allumée. */}
      {(thresholdColor || isOn) && (
        <span
          aria-hidden
          className='-top-10 -right-10 w-32 h-32 rounded-full pointer-events-none'
          // `position` en inline : `.gc > *` force `relative` sur les enfants
          // directs et bat l'utilitaire Tailwind. Même parade que Ripple.
          style={{ position: 'absolute', background: `radial-gradient(circle, ${accentColor}26 0%, transparent 70%)` }}
        />
      )}

      {/* ── Header : (icône) + nom + badge toggle ──
          Sur une tuile 2×2, l'icône occupait sa propre rangée et laissait un
          trou entre elle et la valeur. Elle rejoint la ligne du titre : le
          corps récupère la hauteur et la valeur peut respirer. */}
      <div className='flex items-center justify-between mb-1 gap-2'>
        <div className='flex items-center gap-2 min-w-0'>
          {isCompact && iconTile}
          <span className='text-white/40 text-xs font-medium truncate'>{name}</span>
        </div>

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

      {/* ── Icône (cards larges — sur sa propre rangée) ── */}
      {!isCompact && (
        <div className='flex items-center justify-between mb-2'>
          {iconTile}

          {/* Stale badge inline si pas de toggle */}
          {!isToggleable && showStaleBadge && isStale && (
            <span className='text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20'>
              ⚠ {t('widgets.sensor.stale')}
            </span>
          )}
        </div>
      )}

      {/* ── Corps : valeur / gauge / chart ──
          `justify-center` et non `justify-end` : la valeur creusait un trou
          entre l'icône et elle sur les tuiles hautes. */}
      <div className='flex-1 flex flex-col min-h-0 justify-center'>
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

            {/* Valeur principale — l'unité se détache en plus petit et plus
                sourde, la valeur reste le seul point de fixation. */}
            <div
              className={cn('font-light tracking-tight leading-none flex items-baseline gap-1', isCompact ? 'text-2xl' : 'text-[2.1rem]')}
              style={thresholdColor ? { color: thresholdColor } : undefined}
            >
              {isNumeric ? (
                <>
                  <AnimatedNumber value={numericValue} decimals={Number.isInteger(numericValue) ? 0 : 1} />
                  {unit && <span className={cn('font-medium text-white/35 shrink-0', isCompact ? 'text-xs' : 'text-sm')}>{unit}</span>}
                </>
              ) : (
                <span className='text-white'>{displayState}</span>
              )}
            </div>

            {/* Jauge linéaire (variant default numérique) — piste de verre
                creusée, remplissage dégradé avec halo à l'extrémité. Les bornes
                donnent enfin une échelle au chiffre. */}
            {isNumeric && variant === 'default' && !widgetSize.squat && (
              <div className='mt-2.5'>
                <div
                  className='relative h-1.5 w-full rounded-full overflow-hidden'
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.35), inset 0 -1px 0 rgba(255,255,255,0.04)',
                  }}
                >
                  <motion.div
                    className='absolute inset-y-0 left-0 rounded-full'
                    initial={{ width: 0 }}
                    animate={{ width: `${gaugePercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{
                      background: `linear-gradient(90deg, ${accentColor}55, ${accentColor})`,
                      boxShadow: `0 0 10px -1px ${accentColor}aa`,
                    }}
                  />
                </div>
                {!isCompact && (
                  <div className='flex justify-between mt-1 text-[9px] font-medium tabular-nums text-white/25'>
                    <span>{gaugeMin}</span>
                    <span>{gaugeMax}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
