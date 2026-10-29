import { useRef } from 'react';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { SensorCardConfig } from '@/types/widget-configs';
import { cn, clamp } from '@/lib/utils';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';
import { Power, Activity } from 'lucide-react';
import { CardPlaceholder } from '@/components/ui/CardPlaceholder';
import { useHass } from '@hakit/core';
import { SparkLine } from '@/components/charts/SparkLine';
import { SensorGauge } from '@/components/charts/SensorGauge';
import { BarChart } from '@/components/charts/BarChart';
import { useSensorHistory } from '@/hooks/useSensorHistory';
import { useI18n } from '@/i18n';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useRelativeTime, JUST_NOW } from '@/hooks/useRelativeTime';
import { friendlyName } from '@/lib/ha-service';

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
  const helpers = useHass(s => s.helpers);
  const playFeedback = useSoundFeedback();
  const { data: historyData, loading: historyLoading } = useSensorHistory(variant === 'sparkline' || variant === 'bar' ? entityId : '', 24);

  const showStaleBadge = config?.staleBadge ?? false;
  const staleThreshold = (config?.staleThresholdMinutes ?? 10) * 60_000;
  const lastUpdated =
    (entity as unknown as { last_updated?: string } | null)?.last_updated ??
    ((entity?.attributes as Record<string, unknown> | undefined)?.last_updated as string | undefined);
  const relativeTime = useRelativeTime(showStaleBadge ? lastUpdated : undefined);
  const cardRef = useRef<HTMLDivElement>(null);
  const widgetSize = useWidgetSize(cardRef);
  const isCompact = widgetSize.compact;

  if (!entity) {
    return (
      <div ref={cardRef} className='gc h-full p-4'>
        <CardPlaceholder icon={Activity} text={t('widgets.sensor.notFound')} />
      </div>
    );
  }

  const domain = entityId.split('.')[0];
  const name = config?.name ?? friendlyName(entity) ?? entityId;
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
  const accentColor = thresholdColor ?? 'var(--ds-accent)';
  // Une entité qu'on bascule passe en tile-on quand elle est allumée, comme les tuiles d'appareil.
  const lit = isToggleable && isOn;

  const gaugeMin = config?.min ?? 0;
  const gaugeMax = config?.max ?? 100;
  const gaugePercent = clamp(((numericValue - gaugeMin) / (gaugeMax - gaugeMin || 1)) * 100, 0, 100);

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

  const icon = customIconUrl ? (
    <img src={customIconUrl} alt='' className='size-6 shrink-0 object-contain' />
  ) : IconComponent ? (
    // eslint-disable-next-line react-hooks/static-components
    <IconComponent size={22} aria-hidden='true' className='shrink-0' style={thresholdColor ? { color: thresholdColor } : undefined} />
  ) : (
    <Power size={22} aria-hidden='true' className='shrink-0' />
  );

  const badge = showStaleBadge && staleBadgeLabel && !isToggleable && (
    <span
      className={cn(
        'truncate text-sm',
        isStale ? 'text-[var(--ds-alert)]' : lit ? 'text-[var(--ds-tile-on-muted)]' : 'text-[var(--ds-ink-muted)]'
      )}
    >
      {isStale ? `${t('widgets.sensor.stale')} · ${staleBadgeLabel}` : staleBadgeLabel}
    </span>
  );

  const Root = isToggleable ? 'button' : 'div';

  return (
    <div ref={cardRef} className='h-full'>
      <Root
        {...(isToggleable ? { onClick: handleToggle, 'aria-pressed': isOn } : {})}
        className={cn(
          'flex h-full w-full select-none flex-col overflow-hidden rounded-[var(--ds-radius-lg)] text-left transition-colors',
          lit ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-2)] text-[var(--ds-ink)]',
          widgetSize.squat ? 'flex-row items-center gap-3 px-4' : 'gap-2 p-[var(--ds-space-4)]'
        )}
      >
        {/* En-tête : icône, nom, et l'âge de la mesure quand il compte */}
        <div className={cn('flex min-w-0 items-center gap-3', widgetSize.squat && 'flex-1')}>
          {icon}
          <div className='min-w-0'>
            <div className='truncate text-[17px] font-semibold leading-tight'>{name}</div>
            {widgetSize.squat || isToggleable || domain === 'binary_sensor' ? (
              <div className={cn('truncate text-sm', lit ? 'text-[var(--ds-tile-on-muted)]' : 'text-[var(--ds-ink-muted)]')}>
                {displayState}
              </div>
            ) : (
              badge
            )}
          </div>
        </div>

        {/* Corps : valeur, jauge ou courbe — pas pour un interrupteur, l'état est dans l'en-tête */}
        {!widgetSize.squat && isNumeric && !isToggleable && (
          <div className='flex min-h-0 flex-1 flex-col justify-center gap-2'>
            {variant === 'gauge' ? (
              <div className='flex flex-1 items-center justify-center'>
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
                <div className='flex items-baseline gap-1.5' style={thresholdColor ? { color: thresholdColor } : undefined}>
                  <span className={cn('font-light leading-none tracking-[-1.5px] tabular-nums', isCompact ? 'text-4xl' : 'text-[56px]')}>
                    {Number.isInteger(numericValue) ? numericValue : numericValue.toFixed(1)}
                  </span>
                  {unit && <span className='text-xl text-[var(--ds-ink-muted)]'>{unit}</span>}
                </div>

                {(variant === 'sparkline' || variant === 'bar') &&
                  (historyLoading ? (
                    <div className='h-10 w-full animate-pulse rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)]' />
                  ) : historyData.length > 1 ? (
                    variant === 'sparkline' ? (
                      <SparkLine data={historyData} height={48} color={accentColor} id={`spark-${widgetId}`} />
                    ) : (
                      <BarChart data={historyData} height={48} color={accentColor} />
                    )
                  ) : null)}

                {/* Jauge en pilule entre les bornes configurées */}
                {variant === 'default' && (
                  <div
                    role='meter'
                    aria-label={name}
                    aria-valuenow={numericValue}
                    aria-valuemin={gaugeMin}
                    aria-valuemax={gaugeMax}
                    className='h-3 w-full overflow-hidden rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)]'
                  >
                    <div
                      className='h-full rounded-[var(--ds-radius-pill)]'
                      style={{ width: `${gaugePercent}%`, background: accentColor }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Valeur texte (état non numérique d'un capteur) */}
        {!widgetSize.squat && !isNumeric && !isToggleable && domain !== 'binary_sensor' && (
          <div className='flex flex-1 items-center text-3xl font-light'>{displayState}</div>
        )}
      </Root>
    </div>
  );
}
