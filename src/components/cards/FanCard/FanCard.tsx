import { useRef } from 'react';
import { Fan, RefreshCw } from 'lucide-react';
import { CardPlaceholder } from '@/components/ui/CardPlaceholder';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { useFanSpeed } from '@/hooks/useFanSpeed';
import { useI18n } from '@/i18n';
import type { FanCardConfig } from '@/types/widget-configs';
import { friendlyName } from '@/lib/ha-service';
import { DeviceTile } from '@/components/ds/DeviceTile';
import { PillSlider } from '@/components/ds/PillSlider';
import { Chip } from '@/components/ds/Chip';

/** `FanEntityFeature` — bits utilisés ici */
const FEATURE_SET_SPEED = 1;
const FEATURE_OSCILLATE = 2;

export function FanCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<FanCardConfig>(widgetId || 'fan');
  const entityId = config?.entityId ?? '';
  const cardRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(cardRef);

  const entity = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);
  const playFeedback = useSoundFeedback();

  const { percentage, setPercentage } = useFanSpeed(entityId, entity?.attributes.percentage as number | undefined);

  if (!entity) {
    return (
      <div ref={cardRef} className='rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)] h-full p-4'>
        <CardPlaceholder icon={Fan} text={t('widgets.fan.notFound')} />
      </div>
    );
  }

  const isOn = entity.state === 'on';
  const name = config?.name ?? friendlyName(entity) ?? entityId;
  const features = (entity.attributes.supported_features as number | undefined) ?? 0;
  const supportsSpeed = (features & FEATURE_SET_SPEED) !== 0;
  const supportsOscillate = (features & FEATURE_OSCILLATE) !== 0 && !(config?.hideOscillate ?? false);
  const oscillating = entity.attributes.oscillating === true;
  // `percentage_step` donne le nombre de crans réels : un ventilateur à trois
  // vitesses n'a pas à exposer un curseur au pourcent près.
  const step = (entity.attributes.percentage_step as number | undefined) ?? 1;

  const handleToggle = () => {
    helpers.callService({ domain: 'fan', service: 'toggle', target: { entity_id: entityId } });
    playFeedback(isOn ? 'toggle_off' : 'toggle_on');
  };

  const handleOscillate = () => {
    helpers.callService({
      domain: 'fan',
      service: 'oscillate',
      target: { entity_id: entityId },
      serviceData: { oscillating: !oscillating },
    });
    playFeedback('click');
  };

  const stateLabel = isOn
    ? supportsSpeed
      ? `${t('widgets.fan.on')} · ${Math.round(percentage)} %`
      : t('widgets.fan.on')
    : t('widgets.fan.off');

  // Vitesse et oscillation restent visibles à l'arrêt : bouger le curseur
  // rallume (`fan.set_percentage` allume implicitement).
  const showControls = !size.compact && (supportsSpeed || supportsOscillate);

  return (
    <div ref={cardRef} className='h-full'>
      <DeviceTile name={name} state={stateLabel} icon={Fan} active={isOn} onToggle={handleToggle} layout={size.squat ? 'row' : 'stack'}>
        {showControls && supportsSpeed && (
          <PillSlider
            value={percentage}
            onChange={setPercentage}
            step={step}
            label={t('widgets.fan.speed')}
            valueText={`${Math.round(percentage)} %`}
            fill={isOn ? 'var(--ds-tile-on-ink)' : 'var(--ds-tile-on)'}
            track={isOn ? 'rgba(0, 0, 0, 0.22)' : 'var(--ds-surface-3)'}
            className='h-11'
          />
        )}
        {showControls && supportsOscillate && (
          <Chip icon={RefreshCw} label={t('widgets.fan.oscillate')} active={oscillating} onClick={handleOscillate} />
        )}
      </DeviceTile>
    </div>
  );
}
