import { motion } from 'framer-motion';
import { Flame, Minus, Plus } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { cn } from '@/lib/utils';

export function PelletCard() {
  const pellet = useSafeEntity('climate.living_room');
  const { helpers } = useHass();
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
      target: { entity_id: 'climate.living_room' },
      serviceData: { temperature: targetTemp + delta },
    });
  }

  function toggle() {
    helpers.callService({
      domain: 'climate',
      service: isOn ? 'turn_off' : 'turn_on',
      target: { entity_id: 'climate.living_room' },
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className='gc rounded-3xl p-5 h-full'
    >
      {/* Header */}
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <Flame size={18} className={isOn ? 'text-orange-400' : 'text-zinc-600'} />
          <span className='text-white font-semibold text-sm'>Feu à pellet</span>
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
