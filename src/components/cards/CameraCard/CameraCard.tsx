import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHass } from '@hakit/core';
import { CameraFeed } from '@/components/ui/CameraFeed/components/CameraFeed';
import { cn } from '@/lib/utils';
import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { CameraCardConfig } from '@/types/widget-configs';

interface Cam {
  entityId: string;
  name: string;
}

const DEFAULT_CAMERAS: Cam[] = [
  { entityId: 'camera.sonnette_frigate', name: 'Sonnette' },
  { entityId: 'camera.cuisine', name: 'Cuisine' },
  { entityId: 'camera.salon_frigate', name: 'Salon' },
  { entityId: 'camera.couloir_frigate', name: 'Couloir' },
];

export function CameraCard() {
  const { getWidgetConfig } = useDashboardLayout();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<CameraCardConfig>(widgetId || 'camera');
  const cameras: Cam[] = config?.cameras?.length ? config.cameras : DEFAULT_CAMERAS;
  const selectorEntity = config?.selectorEntity ?? 'input_select.camera_selecter';

  const { helpers } = useHass();
  const entities = useHass(s => s.entities);

  const haSelected = entities?.[selectorEntity]?.state as string | undefined;
  const [localSelected, setLocalSelected] = useState<string>(cameras[0].name);
  const selected = haSelected ?? localSelected;

  function select(name: string) {
    setLocalSelected(name);
    helpers.callService({
      domain: 'input_select',
      service: 'select_option',
      target: { entity_id: selectorEntity },
      serviceData: { option: name },
    });
  }

  const current = cameras.find(c => c.name === selected) ?? cameras[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className='gc rounded-3xl p-3 flex gap-3 h-full'
    >
      {/* ── Camera feed with padding + rounded corners ── */}
      <div className='flex-1 min-w-0 relative rounded-2xl overflow-hidden bg-black/50'>
        <AnimatePresence mode='wait'>
          <motion.div
            key={current.entityId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className='w-full h-full'
          >
            <CameraFeed entityId={current.entityId} className='w-full h-full' />
          </motion.div>
        </AnimatePresence>

        {/* Camera name overlay */}
        <div className='absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none'>
          <span className='text-xs text-white/60 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full'>{current.name}</span>
        </div>
      </div>

      {/* ── Camera list ── */}
      <div className='w-[110px] flex flex-col gap-1.5 justify-center shrink-0'>
        {cameras.map((cam, i) => {
          const isActive = cam.name === selected;
          return (
            <motion.button
              key={cam.name}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => select(cam.name)}
              className={cn(
                'w-full text-center px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'gc-inner text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                  : 'text-white/45 hover:text-white/75 hover:bg-white/5'
              )}
            >
              {cam.name}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
