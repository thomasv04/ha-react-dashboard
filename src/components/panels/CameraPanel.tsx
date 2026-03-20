import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHass } from '@hakit/core';
import { Camera } from 'lucide-react';
import { Panel } from '@/components/layout/Panel';
import { CameraFeed } from '@/components/ui/CameraFeed';
import { cn } from '@/lib/utils';

interface Cam {
  entityId: string;
  name: string;
}

const CAMERAS: Cam[] = [
  { entityId: 'camera.sonnette_frigate', name: 'Sonnette' },
  { entityId: 'camera.cuisine', name: 'Cuisine' },
  { entityId: 'camera.salon_frigate', name: 'Salon' },
  { entityId: 'camera.couloir_frigate', name: 'Couloir' },
];

export function CameraPanel() {
  const { helpers } = useHass();
  const entities = useHass(s => s.entities);

  const haSelected = entities?.['input_select.camera_selecter']?.state as string | undefined;
  const [localSelected, setLocalSelected] = useState<string>(CAMERAS[0].name);
  const selected = haSelected ?? localSelected;

  function select(name: string) {
    setLocalSelected(name);
    helpers.callService({
      domain: 'input_select',
      service: 'select_option',
      target: { entity_id: 'input_select.camera_selecter' },
      serviceData: { option: name },
    });
  }

  const current = CAMERAS.find(c => c.name === selected) ?? CAMERAS[0];

  return (
    <Panel title='Caméras' icon={<Camera size={18} />} wide>
      <div className='flex gap-4 h-[55vh] min-h-0'>
        {/* ── Iframe viewer ── */}
        <div className='flex-1 min-w-0 relative rounded-2xl overflow-hidden gc-inner'>
          <AnimatePresence mode='wait'>
            <motion.div
              key={current.entityId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className='w-full h-full'
            >
              <CameraFeed entityId={current.entityId} className='w-full h-full' />
            </motion.div>
          </AnimatePresence>

          {/* Camera name badge */}
          <div className='absolute bottom-3 left-3 gc-inner rounded-full px-3 py-1 text-xs text-white/70 font-medium pointer-events-none'>
            {current.name}
          </div>
        </div>

        {/* ── Camera list ── */}
        <div className='w-36 flex flex-col gap-2 overflow-y-auto pr-1 shrink-0'>
          {CAMERAS.map((cam, i) => {
            const isActive = cam.name === selected;
            return (
              <motion.button
                key={cam.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => select(cam.name)}
                className={cn(
                  'w-full text-left px-4 py-2.5 rounded-2xl text-sm font-medium transition-all',
                  isActive ? 'bg-white/15 text-white border border-white/20' : 'gc-inner text-white/50 hover:text-white/80'
                )}
              >
                {cam.name}
              </motion.button>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
