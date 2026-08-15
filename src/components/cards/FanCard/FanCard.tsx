import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { Fan, RefreshCw } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import type { FanCardConfig } from '@/types/widget-configs';

/** `FanEntityFeature` — bits utilisés ici */
const FEATURE_SET_SPEED = 1;
const FEATURE_OSCILLATE = 2;

const ACCENT = '#38bdf8';

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

  const haPercentage = entity?.attributes.percentage as number | undefined;
  const [localPercentage, setLocalPercentage] = useState<number | null>(null);
  // La valeur locale ne sert qu'à lisser le glissement : dès que HA confirme,
  // c'est lui qui fait foi.
  useEffect(() => setLocalPercentage(null), [haPercentage]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendPercentage = useCallback(
    (percentage: number) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        helpers.callService({ domain: 'fan', service: 'set_percentage', target: { entity_id: entityId }, serviceData: { percentage } });
      }, 150);
    },
    [helpers, entityId]
  );

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  if (!entity) {
    return (
      <div ref={cardRef} className='gc rounded-3xl p-4 flex items-center justify-center h-full'>
        <span className='text-white/30 text-sm'>{t('widgets.fan.notFound')}</span>
      </div>
    );
  }

  const isOn = entity.state === 'on';
  const name = config?.name ?? (entity.attributes.friendly_name as string | undefined) ?? entityId;
  const features = (entity.attributes.supported_features as number | undefined) ?? 0;
  const supportsSpeed = (features & FEATURE_SET_SPEED) !== 0;
  const supportsOscillate = (features & FEATURE_OSCILLATE) !== 0 && !(config?.hideOscillate ?? false);
  const oscillating = entity.attributes.oscillating === true;
  // `percentage_step` donne le nombre de crans réels : un ventilateur à trois
  // vitesses n'a pas à exposer un curseur au pourcent près.
  const step = (entity.attributes.percentage_step as number | undefined) ?? 1;
  const percentage = localPercentage ?? haPercentage ?? 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    helpers.callService({ domain: 'fan', service: 'toggle', target: { entity_id: entityId } });
    playFeedback(isOn ? 'toggle_off' : 'toggle_on');
  };

  const handleOscillate = (e: React.MouseEvent) => {
    e.stopPropagation();
    helpers.callService({
      domain: 'fan',
      service: 'oscillate',
      target: { entity_id: entityId },
      serviceData: { oscillating: !oscillating },
    });
    playFeedback('click');
  };

  const handleSpeed = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const pct = parseInt(e.target.value, 10);
    setLocalPercentage(pct);
    sendPercentage(pct);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE }}
      className={cn(
        'gc rounded-3xl h-full overflow-hidden select-none',
        size.squat ? 'px-3 py-2 flex items-center gap-3' : 'p-3.5 flex flex-col'
      )}
      style={
        isOn
          ? {
              background: `linear-gradient(180deg, ${ACCENT}26, ${ACCENT}12)`,
              borderColor: `${ACCENT}44`,
              boxShadow: `var(--dash-elev-card), 0 0 28px -8px ${ACCENT}66`,
            }
          : undefined
      }
    >
      {/* En-tête */}
      <div className={cn('flex items-center justify-between shrink-0', size.squat ? 'hidden' : 'mb-1')}>
        <span className='text-white/40 text-xs font-medium truncate'>{name}</span>
        <span
          className={cn(
            'text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border shrink-0 ml-2',
            isOn ? 'text-sky-300' : 'bg-white/5 text-white/25 border-white/8'
          )}
          style={isOn ? { background: `${ACCENT}18`, borderColor: `${ACCENT}35` } : undefined}
        >
          {isOn && supportsSpeed ? `${Math.round(percentage)}%` : isOn ? 'ON' : 'OFF'}
        </span>
      </div>

      {/* Bouton : l'hélice tourne d'autant plus vite que la vitesse est haute */}
      <div className={cn('flex items-center justify-center', size.squat ? 'shrink-0' : 'flex-1 min-h-0')}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleToggle}
          className={cn(
            'relative border flex items-center justify-center transition-all duration-300',
            size.squat ? 'w-10 h-10 rounded-xl' : size.compact ? 'w-14 h-14 rounded-2xl' : 'w-16 h-16 rounded-2xl'
          )}
          style={
            isOn
              ? { background: `${ACCENT}18`, borderColor: `${ACCENT}35` }
              : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }
          }
        >
          <motion.span
            className='relative flex'
            animate={isOn ? { rotate: 360 } : { rotate: 0 }}
            transition={
              isOn
                ? { repeat: Infinity, ease: 'linear', duration: Math.max(0.6, 3 - (supportsSpeed ? percentage : 100) / 45) }
                : { duration: 0.3 }
            }
          >
            <Fan
              size={size.squat ? 18 : size.compact ? 24 : 28}
              className={isOn ? '' : 'text-white/25'}
              style={isOn ? { color: ACCENT, filter: `drop-shadow(0 0 10px ${ACCENT}99)` } : undefined}
            />
          </motion.span>
        </motion.button>
      </div>

      {size.squat && (
        <div className='flex-1 min-w-0'>
          <div className='text-white/40 text-xs font-medium truncate'>{name}</div>
          <div className='text-xs font-semibold' style={{ color: isOn ? ACCENT : 'rgba(255,255,255,0.25)' }}>
            {isOn && supportsSpeed ? `${Math.round(percentage)}%` : isOn ? t('widgets.fan.on') : t('widgets.fan.off')}
          </div>
        </div>
      )}

      {/* Vitesse + oscillation — masqués dès que la card est écrasée */}
      {isOn && !size.compact && (
        <div className='shrink-0 mt-2 flex flex-col gap-2'>
          {supportsSpeed && (
            <input
              type='range'
              min={0}
              max={100}
              step={step}
              value={percentage}
              onChange={handleSpeed}
              onClick={e => e.stopPropagation()}
              className='w-full h-1 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-grab
                [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:shadow-md'
              style={{
                background: `linear-gradient(to right, ${ACCENT} 0%, ${ACCENT} ${percentage}%, rgba(255,255,255,0.08) ${percentage}%, rgba(255,255,255,0.08) 100%)`,
              }}
            />
          )}

          {supportsOscillate && (
            <button
              onClick={handleOscillate}
              className={cn(
                'flex items-center justify-center gap-1.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-colors',
                oscillating ? 'text-sky-300' : 'border-white/8 bg-white/5 text-white/40 hover:bg-white/8'
              )}
              style={oscillating ? { background: `${ACCENT}18`, borderColor: `${ACCENT}35` } : undefined}
            >
              <RefreshCw size={12} />
              {t('widgets.fan.oscillate')}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
