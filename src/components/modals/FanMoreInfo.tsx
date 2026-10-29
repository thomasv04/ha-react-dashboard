import { useState } from 'react';
import { motion } from 'framer-motion';
import { Fan, RefreshCw, RotateCcw, RotateCw } from 'lucide-react';
import { useHass } from '@hakit/core';
import { callHAService, friendlyName } from '@/lib/ha-service';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useFanSpeed } from '@/hooks/useFanSpeed';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { PillSlider } from '@/components/ds/PillSlider';
import { MoreInfoHeader } from './MoreInfoHeader';
import { MoreInfoLayout } from './MoreInfoLayout';
import { InfoSidebar, type SidebarModule } from './sidebar';
import type { FanCardConfig } from '@/types/widget-types';
import { useI18n } from '@/i18n';

/** `FanEntityFeature` — bits utilisés ici */
const FEATURE_SET_SPEED = 1;
const FEATURE_OSCILLATE = 2;
const FEATURE_DIRECTION = 4;
const FEATURE_PRESET_MODE = 8;

export default function FanMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<FanCardConfig>(widgetId);
  const showInfoPanel = config?.showInfoPanel !== false;
  const [historyHours, setHistoryHours] = useState(24);
  const entity = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);
  const { percentage, setPercentage } = useFanSpeed(entityId, entity?.attributes.percentage as number | undefined);

  if (!entity) return <div className='p-12 text-[var(--ds-ink-muted)] text-center'>{t('common.entityNotFound')}</div>;

  const call = (service: string, data?: Record<string, unknown>) => callHAService(helpers, 'fan', service, { entity_id: entityId }, data);

  const isOn = entity.state === 'on';
  const name = config?.name ?? friendlyName(entity) ?? entityId;
  const features = (entity.attributes.supported_features as number | undefined) ?? 0;
  const supportsSpeed = (features & FEATURE_SET_SPEED) !== 0;
  const supportsOscillate = (features & FEATURE_OSCILLATE) !== 0;
  const supportsDirection = (features & FEATURE_DIRECTION) !== 0;
  const presetModes = (features & FEATURE_PRESET_MODE) !== 0 ? ((entity.attributes.preset_modes as string[] | undefined) ?? []) : [];
  const presetMode = entity.attributes.preset_mode as string | undefined;
  const oscillating = entity.attributes.oscillating === true;
  const direction = (entity.attributes.direction as string | undefined) ?? 'forward';
  // `percentage_step` donne les crans réels : un ventilateur à trois vitesses
  // n'a pas à exposer un curseur au pourcent près.
  const step = (entity.attributes.percentage_step as number | undefined) ?? 1;

  return (
    <MoreInfoLayout
      showPanel={showInfoPanel}
      sidebar={
        <InfoSidebar
          modules={
            [
              ...(presetModes.length
                ? [
                    {
                      type: 'select',
                      title: t('widgets.fan.presetMode'),
                      value: presetMode ?? '',
                      options: presetModes,
                      onChange: (v: string) => call('set_preset_mode', { preset_mode: v }),
                    },
                  ]
                : []),
              {
                type: 'details',
                title: t('widgets.fan.info'),
                entries: [
                  { label: t('widgets.fan.state'), value: isOn ? t('widgets.fan.on') : t('widgets.fan.off') },
                  ...(supportsSpeed ? [{ label: t('widgets.fan.speed'), value: `${Math.round(percentage)}%` }] : []),
                  ...(supportsOscillate
                    ? [{ label: t('widgets.fan.oscillate'), value: oscillating ? t('common.on') : t('common.off') }]
                    : []),
                ],
              },
              { type: 'timeline', entityId },
              { type: 'history', historyHours, onHistoryHoursChange: setHistoryHours },
              { type: 'attributes', entityId },
              { type: 'entityId', entityIds: [entityId] },
            ] as SidebarModule[]
          }
        />
      }
    >
      <MoreInfoHeader
        icon={Fan}
        name={name}
        state={isOn ? t('widgets.fan.on') : t('widgets.fan.off')}
        stateColor={isOn ? 'var(--ds-tile-on)' : undefined}
      />

      {/* Interrupteur : l'hélice tourne d'autant plus vite que la vitesse est haute */}
      <div className='flex justify-center mt-8'>
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => call('toggle')}
          aria-label={name}
          aria-pressed={isOn}
          className={`flex size-40 items-center justify-center rounded-full transition-colors ${
            isOn ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-sheet-section)] text-[var(--ds-ink-muted)]'
          }`}
        >
          <motion.span
            className='flex'
            animate={isOn ? { rotate: 360 } : { rotate: 0 }}
            transition={
              isOn
                ? { repeat: Infinity, ease: 'linear', duration: Math.max(0.6, 3 - (supportsSpeed ? percentage : 100) / 45) }
                : { duration: 0.3 }
            }
          >
            <Fan size={64} strokeWidth={1.2} />
          </motion.span>
        </motion.button>
      </div>

      {/* Vitesse — visible même à l'arrêt : `fan.set_percentage` rallume. */}
      {supportsSpeed && (
        <div className='mt-8 max-w-sm mx-auto'>
          <div className='flex justify-between mb-3'>
            <span className='text-[15px] font-bold text-[var(--ds-ink-muted)]'>{t('widgets.fan.speed')}</span>
            <span className='text-[var(--ds-ink)] font-semibold tabular-nums'>{Math.round(percentage)}%</span>
          </div>
          <PillSlider
            value={percentage}
            step={step}
            onChange={setPercentage}
            label={t('widgets.fan.speed')}
            valueText={`${Math.round(percentage)} %`}
            icon={Fan}
          />
        </div>
      )}

      {(supportsOscillate || supportsDirection) && (
        <div className='flex items-center justify-center gap-3 mt-6'>
          {supportsOscillate && (
            <button
              onClick={() => call('oscillate', { oscillating: !oscillating })}
              aria-pressed={oscillating}
              className={`flex h-11 items-center gap-2 rounded-[var(--ds-radius-pill)] px-5 text-[15px] font-semibold ${
                oscillating ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-sheet-section)]'
              }`}
            >
              <RefreshCw size={15} className={oscillating ? 'animate-spin [animation-duration:3s]' : undefined} />
              {t('widgets.fan.oscillate')}
            </button>
          )}
          {supportsDirection && (
            <button
              onClick={() => call('set_direction', { direction: direction === 'forward' ? 'reverse' : 'forward' })}
              className='flex h-11 items-center gap-2 rounded-[var(--ds-radius-pill)] bg-[var(--ds-sheet-section)] px-5 text-[15px] font-semibold'
            >
              {direction === 'forward' ? <RotateCw size={15} /> : <RotateCcw size={15} />}
              {direction === 'forward' ? t('widgets.fan.forward') : t('widgets.fan.reverse')}
            </button>
          )}
        </div>
      )}
    </MoreInfoLayout>
  );
}
