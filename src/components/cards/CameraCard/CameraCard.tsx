import { useState } from 'react';
import { motion } from 'framer-motion';
import { useHass } from '@hakit/core';
import { CameraFeed } from '@/components/ui/CameraFeed/components/CameraFeed';
import type { StreamProtocol } from '@/components/ui/CameraFeed/components/CameraFeed';
import { cn } from '@/lib/utils';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { CameraCardConfig } from '@/types/widget-configs';

interface Cam {
  entityId: string;
  name: string;
}

const DEFAULT_CAMERAS: Cam[] = [
  { entityId: 'camera.front_door', name: 'Entrée' },
  { entityId: 'camera.kitchen', name: 'Cuisine' },
  { entityId: 'camera.living_room', name: 'Salon' },
  { entityId: 'camera.hallway', name: 'Couloir' },
];

export function CameraCard() {
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<CameraCardConfig>(widgetId || 'camera');
  const cameras: Cam[] = config?.cameras?.length ? config.cameras : DEFAULT_CAMERAS;
  const selectorEntity = config?.selectorEntity ?? 'input_select.camera_selector';

  const { helpers } = useHass();
  const entities = useHass(s => s.entities);

  const haSelected = entities?.[selectorEntity]?.state as string | undefined;
  const [localSelected, setLocalSelected] = useState<string>(cameras[0].name);
  const [protocol, setProtocol] = useState<StreamProtocol>(null);
  const selected = haSelected ?? localSelected;

  function select(name: string) {
    setProtocol(null);
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
      {/* ── Single camera feed ── */}
      <div className='flex-1 min-w-0 relative rounded-2xl overflow-hidden bg-black/50'>
        <CameraFeed
          key={current.entityId}
          entityId={current.entityId}
          className='w-full h-full'
          onProtocol={setProtocol}
        />

        {/* Camera name overlay */}
        <div className='absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 pointer-events-none'>
          <span className='text-xs text-white/60 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full'>{current.name}</span>
          {protocol && (
            <span className={cn(
              'text-xs font-medium backdrop-blur-sm px-2 py-1 rounded-full',
              protocol === 'HLS' ? 'bg-blue-500/30 text-blue-200' : 'bg-amber-500/30 text-amber-200'
            )}>{protocol}</span>
          )}
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
