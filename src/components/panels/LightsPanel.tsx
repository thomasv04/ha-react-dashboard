import { motion } from 'framer-motion';
import { Lightbulb, Sun } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { Panel } from '@/components/layout/Panel';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

const LIGHTS = [
  { id: 'light.bandeau_led_cuisine', label: 'Bandeau LEDs Cuisine' },
  // Ajouter d'autres lumières ici
];

function LightRow({ entityId, label }: { entityId: string; label: string }) {
  const light = useSafeEntity(entityId);
  const { helpers } = useHass();
  if (!light) return null;

  const isOn = light.state === 'on';
  const brightness = (light.attributes.brightness as number | undefined) ?? 0;
  const pct = Math.round((brightness / 255) * 100);

  function toggle() {
    helpers.callService({ domain: 'light', service: 'toggle', target: { entity_id: entityId } });
  }

  function setBrightness(val: number[]) {
    helpers.callService({
      domain: 'light',
      service: 'turn_on',
      target: { entity_id: entityId },
      serviceData: { brightness: Math.round((val[0] / 100) * 255) },
    });
  }

  return (
    <div className='gc-inner rounded-2xl p-4'>
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center gap-2'>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggle}
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
              isOn ? 'bg-yellow-400/20 text-yellow-400' : 'gc-btn text-white/30'
            )}
          >
            <Lightbulb size={16} />
          </motion.button>
          <div>
            <div className='text-white font-medium text-sm'>{label}</div>
            <div className='text-white/40 text-xs'>{isOn ? `${pct}%` : 'Éteint'}</div>
          </div>
        </div>
        <div className={cn('w-2 h-2 rounded-full', isOn ? 'bg-yellow-400' : 'bg-zinc-600')} />
      </div>

      {isOn && (
        <div className='flex items-center gap-3'>
          <Sun size={12} className='text-white/30' />
          <Slider value={[pct]} min={1} max={100} step={1} onValueChange={setBrightness} className='flex-1' />
          <Sun size={16} className='text-yellow-400/80' />
        </div>
      )}
    </div>
  );
}

export function LightsPanel() {
  return (
    <Panel title='Lumières' icon={<Lightbulb size={18} />}>
      <div className='flex flex-col gap-2'>
        {LIGHTS.map(light => (
          <LightRow key={light.id} entityId={light.id} label={light.label} />
        ))}
      </div>
      <p className='text-white/20 text-xs text-center mt-2'>
        Ajouter d'autres entités dans <code>LightsPanel.tsx</code>
      </p>
    </Panel>
  );
}
