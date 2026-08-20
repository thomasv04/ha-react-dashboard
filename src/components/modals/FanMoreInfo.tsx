import { useState } from 'react';
import { motion } from 'framer-motion';
import { Fan, RefreshCw, RotateCcw, RotateCw } from 'lucide-react';
import { useHass } from '@hakit/core';
import { callHAService } from '@/lib/ha-service';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useFanSpeed } from '@/hooks/useFanSpeed';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { MoreInfoHeader } from './MoreInfoHeader';
import { InfoSidebar, type SidebarModule } from './sidebar';
import type { FanCardConfig } from '@/types/widget-types';
import { useI18n } from '@/i18n';

/** `FanEntityFeature` — bits utilisés ici */
const FEATURE_SET_SPEED = 1;
const FEATURE_OSCILLATE = 2;
const FEATURE_DIRECTION = 4;
const FEATURE_PRESET_MODE = 8;

const ACCENT = '#38bdf8';

export default function FanMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<FanCardConfig>(widgetId);
  const showInfoPanel = config?.showInfoPanel !== false;
  const [historyHours, setHistoryHours] = useState(24);
  const entity = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);
  const { percentage, setPercentage } = useFanSpeed(entityId, entity?.attributes.percentage as number | undefined);

  if (!entity) return <div className='p-12 text-white/40 text-center'>{t('common.entityNotFound')}</div>;

  const call = (service: string, data?: Record<string, unknown>) => callHAService(helpers, 'fan', service, { entity_id: entityId }, data);

  const isOn = entity.state === 'on';
  const name = config?.name ?? (entity.attributes.friendly_name as string) ?? entityId;
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
    <div className={`p-8 md:p-12 ${showInfoPanel ? 'lg:grid lg:grid-cols-5 lg:gap-8' : ''}`}>
      <div className={showInfoPanel ? 'lg:col-span-3' : ''}>
        <MoreInfoHeader
          icon={Fan}
          name={name}
          state={isOn ? t('widgets.fan.on') : t('widgets.fan.off')}
          stateColor={isOn ? ACCENT : '#6b7280'}
        />

        {/* Interrupteur : l'hélice tourne d'autant plus vite que la vitesse est haute */}
        <div className='flex justify-center mt-8'>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => call('toggle')}
            aria-label={name}
            className='w-40 h-40 rounded-full flex items-center justify-center border-2 transition-colors'
            style={
              isOn
                ? { background: `${ACCENT}18`, borderColor: `${ACCENT}59`, boxShadow: `0 0 60px -12px ${ACCENT}` }
                : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }
            }
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
              <Fan size={64} strokeWidth={1.2} style={{ color: isOn ? ACCENT : 'rgba(255,255,255,0.2)' }} />
            </motion.span>
          </motion.button>
        </div>

        {/* Vitesse — visible même à l'arrêt : `fan.set_percentage` rallume. */}
        {supportsSpeed && (
          <div className='mt-8 max-w-sm mx-auto'>
            <div className='flex justify-between mb-3'>
              <span className='text-[10px] font-bold uppercase tracking-widest text-white/40'>{t('widgets.fan.speed')}</span>
              <span className='text-white font-semibold tabular-nums'>{Math.round(percentage)}%</span>
            </div>
            <input
              type='range'
              min={0}
              max={100}
              step={step}
              value={percentage}
              onChange={e => setPercentage(Number(e.target.value))}
              aria-label={t('widgets.fan.speed')}
              className='w-full h-3 accent-sky-400 cursor-pointer'
            />
          </div>
        )}

        {(supportsOscillate || supportsDirection) && (
          <div className='flex items-center justify-center gap-3 mt-6'>
            {supportsOscillate && (
              <button
                onClick={() => call('oscillate', { oscillating: !oscillating })}
                className='flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors'
                style={
                  oscillating
                    ? { background: `${ACCENT}18`, borderColor: `${ACCENT}35`, color: '#7dd3fc' }
                    : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }
                }
              >
                <RefreshCw size={15} className={oscillating ? 'animate-spin [animation-duration:3s]' : undefined} />
                {t('widgets.fan.oscillate')}
              </button>
            )}
            {supportsDirection && (
              <button
                onClick={() => call('set_direction', { direction: direction === 'forward' ? 'reverse' : 'forward' })}
                className='flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white/70 hover:text-white text-sm font-medium transition-colors'
              >
                {direction === 'forward' ? <RotateCw size={15} /> : <RotateCcw size={15} />}
                {direction === 'forward' ? t('widgets.fan.forward') : t('widgets.fan.reverse')}
              </button>
            )}
          </div>
        )}
      </div>

      {showInfoPanel && (
        <div className='lg:col-span-2 mt-8 lg:mt-0'>
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
        </div>
      )}
    </div>
  );
}
