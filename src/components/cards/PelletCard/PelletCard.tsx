import { motion } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { Flame, Minus, Plus } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { PelletCardConfig } from '@/types/widget-configs';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';

export function PelletCard() {
  const { t } = useI18n();
  const widgetId = useWidgetId();
  // `useWidgetConfig` renvoie le contexte, pas la config : c'est
  // `getWidgetConfig(id)` qui donne celle du widget.
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<PelletCardConfig>(widgetId || 'pellet');
  const entityId = config?.entityId ?? 'climate.pellet_stove';
  const pellet = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);
  const playFeedback = useSoundFeedback();
  if (!pellet) return null;

  const currentTemp = pellet.attributes.current_temperature as number | undefined;
  const targetTemp = pellet.attributes.temperature as number | undefined;
  const hvacMode = pellet.state; // 'heat' | 'off' | etc.
  const isOn = hvacMode !== 'off';

  function setTemp(delta: number) {
    if (targetTemp === undefined) return;
    helpers.callService({
      domain: 'climate',
      service: 'set_temperature',
      target: { entity_id: entityId },
      serviceData: { temperature: targetTemp + delta },
    });
    playFeedback(delta > 0 ? 'temperature_up' : 'temperature_down');
  }

  function toggle() {
    helpers.callService({
      domain: 'climate',
      service: isOn ? 'turn_off' : 'turn_on',
      target: { entity_id: entityId },
    });
    playFeedback(isOn ? 'toggle_off' : 'toggle_on');
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE, delay: 0.25 }}
      className='gc rounded-3xl p-5 h-full'
    >
      {/* Header */}
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <Flame size={18} className={isOn ? 'text-orange-400' : 'text-zinc-600'} />
          <span className='text-white font-semibold text-sm'>{t('widgets.pellet.title')}</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggle}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-semibold transition-colors',
            isOn ? 'bg-orange-500/20 text-orange-400' : 'gc-btn text-white/40'
          )}
        >
          {isOn ? 'ON' : 'OFF'}
        </motion.button>
      </div>

      {/* Temperature display */}
      <div className='text-center mb-4'>
        <div className='text-5xl font-bold text-white'>{targetTemp !== undefined ? `${targetTemp}°` : '—'}</div>
        <div className='text-white/40 text-sm mt-1'>
          Actuel : <span className='text-white/70'>{currentTemp !== undefined ? `${currentTemp}°C` : '—'}</span>
        </div>
      </div>

      {/* +/- Controls */}
      {isOn && (
        <div className='flex items-center justify-center gap-4'>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setTemp(-0.5)}
            className='w-10 h-10 rounded-full gc-btn text-white flex items-center justify-center'
          >
            <Minus size={16} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setTemp(0.5)}
            className='w-10 h-10 rounded-full bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 flex items-center justify-center'
          >
            <Plus size={16} />
          </motion.button>
        </div>
      )}

      {/* Mode badge */}
      <div className='mt-3 text-center'>
        <span className='text-xs text-white/30 capitalize'>{hvacMode}</span>
      </div>
    </motion.div>
  );
}
