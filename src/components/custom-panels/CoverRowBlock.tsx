import { useRef } from 'react';
import { motion } from 'framer-motion';
import { DURATION_HERO } from '@/lib/motion-tokens';
import { ChevronsUp, ChevronsDown, Square } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useMoreInfo } from '@/context/MoreInfoContext';
import { cn } from '@/lib/utils';
import type { CoverRowBlock } from '@/types/custom-panel';

export function CoverRowBlockRenderer({ block }: { block: CoverRowBlock }) {
  const cover = useSafeEntity(block.entityId);
  const { helpers } = useHass();
  const { openMoreInfo } = useMoreInfo();
  const rowRef = useRef<HTMLDivElement>(null);

  if (!cover) return null;

  const pos = cover.attributes.current_position as number | undefined;
  const label = block.label ?? (cover.attributes.friendly_name as string) ?? block.entityId;
  const isOpen = cover.state === 'open';

  function call(service: string) {
    helpers.callService({ domain: 'cover', service: service as never, target: { entity_id: block.entityId } });
  }

  return (
    // La ligne entière ouvre la fiche détaillée, comme une carte de la grille —
    // les trois boutons restent des raccourcis. Sans ça, un volet listé dans un
    // panneau était le seul endroit du dashboard d'où sa fiche était
    // inatteignable : position exacte, historique et réglages fins compris.
    <div
      ref={rowRef}
      role='button'
      tabIndex={0}
      onClick={() => openMoreInfo(block.entityId, 'cover', block.entityId, rowRef.current?.getBoundingClientRect() ?? null)}
      onKeyDown={e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        openMoreInfo(block.entityId, 'cover', block.entityId, rowRef.current?.getBoundingClientRect() ?? null);
      }}
      className='flex items-center justify-between gc-inner rounded-2xl px-4 py-3 cursor-pointer transition-colors hover:bg-white/5'
    >
      <div>
        <div className='text-white font-medium text-sm'>{label}</div>
        <div className='text-white/40 text-xs mt-0.5'>{pos !== undefined ? `${pos}%` : cover.state}</div>
      </div>
      {/* `stopPropagation` : monter, stopper ou fermer ne doit pas *aussi*
          ouvrir la fiche par-dessus. */}
      <div className='flex items-center gap-3' onClick={e => e.stopPropagation()}>
        <div className='w-16 h-1.5 bg-white/8 rounded-full overflow-hidden'>
          <motion.div
            animate={{ width: `${pos ?? 0}%` }}
            transition={{ duration: DURATION_HERO }}
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
