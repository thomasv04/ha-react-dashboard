import { motion } from 'framer-motion';
import { ChevronsUp, ChevronsDown, Square, Blinds } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { Panel } from '@/components/layout/Panel';
import { cn } from '@/lib/utils';

const COVERS = [
  { id: 'cover.kitchen', label: 'Cuisine' },
  { id: 'cover.storage', label: 'Cellier' },
  { id: 'cover.dining_room_1', label: 'Salle à manger 1' },
  { id: 'cover.dining_room_2', label: 'Salle à manger 2' },
  { id: 'cover.living_room', label: 'Salon' },
  { id: 'cover.living_room_bay', label: 'Baie salon' },
  { id: 'cover.guest_room', label: 'Ch. invités' },
  { id: 'cover.bedroom', label: 'Chambre' },
  { id: 'cover.office', label: 'Bureau' },
  { id: 'cover.bathroom', label: 'Salle de bain' },
];

const ALL_COVERS = COVERS.map(c => c.id);

function CoverRow({ entityId, label }: { entityId: string; label: string }) {
  const cover = useSafeEntity(entityId);
  const { helpers } = useHass();

  if (!cover) return null;

  const pos = cover.attributes.current_position as number | undefined;
  const isOpen = cover.state === 'open';

  function call(service: string) {
    helpers.callService({ domain: 'cover', service: service as never, target: { entity_id: entityId } });
  }

  return (
    <div className='flex items-center justify-between gc-inner rounded-2xl px-4 py-3'>
      <div>
        <div className='text-white font-medium text-sm'>{label}</div>
        <div className='text-white/40 text-xs mt-0.5'>{pos !== undefined ? `${pos}%` : cover.state}</div>
      </div>
      {/* Position bar */}
      <div className='flex items-center gap-3'>
        <div className='w-16 h-1.5 bg-white/8 rounded-full overflow-hidden'>
          <motion.div
            animate={{ width: `${pos ?? 0}%` }}
            transition={{ duration: 0.5 }}
            className={cn('h-full rounded-full', isOpen ? 'bg-blue-400' : 'bg-zinc-600')}
          />
        </div>
        <div className='flex gap-1'>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => call('open_cover')}
            className='w-8 h-8 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 flex items-center justify-center'
          >
            <ChevronsUp size={14} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => call('stop_cover')}
            className='w-8 h-8 rounded-xl gc-btn text-white/60 flex items-center justify-center'
          >
            <Square size={12} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => call('close_cover')}
            className='w-8 h-8 rounded-xl gc-btn text-white/60 flex items-center justify-center'
          >
            <ChevronsDown size={14} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export function ShuttersPanel() {
  const { helpers } = useHass();

  function callAll(service: string) {
    helpers.callService({ domain: 'cover', service: service as never, target: { entity_id: ALL_COVERS } });
  }

  return (
    <Panel title='Volets' icon={<Blinds size={18} />}>
      {/* Global controls */}
      <div className='flex gap-2 mb-2'>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => callAll('open_cover')}
          className='flex-1 py-2.5 rounded-2xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-semibold flex items-center justify-center gap-2'
        >
          <ChevronsUp size={16} /> Tout ouvrir
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => callAll('close_cover')}
          className='flex-1 py-2.5 rounded-2xl gc-btn text-white/60 text-sm font-semibold flex items-center justify-center gap-2'
        >
          <ChevronsDown size={16} /> Tout fermer
        </motion.button>
      </div>

      {/* Individual covers */}
      <div className='flex flex-col gap-2'>
        {COVERS.map(cover => (
          <CoverRow key={cover.id} entityId={cover.id} label={cover.label} />
        ))}
      </div>
    </Panel>
  );
}
