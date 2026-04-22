import { motion } from 'framer-motion';
import { useHass } from '@hakit/core';
import { resolveIcon } from '@/lib/lucide-icon-map';
import type { ButtonRowBlock, InlineButton } from '@/types/custom-panel';

function InlineButtonRenderer({ btn }: { btn: InlineButton }) {
  const { helpers } = useHass();
  // eslint-disable-next-line react-hooks/static-components
  const Icon = btn.icon ? resolveIcon(btn.icon) : undefined;

  function call() {
    if (!btn.domain || !btn.service) return;
    const target = btn.targetEntityIds.length > 0 ? { entity_id: btn.targetEntityIds } : undefined;
    helpers.callService({ domain: btn.domain as never, service: btn.service as never, target });
  }

  const isPrimary = btn.variant === 'primary';

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={call}
      className={`flex-1 py-2.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 min-w-0 ${
        isPrimary ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400' : 'gc-btn text-white/60 hover:text-white/80'
      }`}
    >
      {/* eslint-disable-next-line react-hooks/static-components */}
      {Icon && <Icon size={16} className='flex-shrink-0' />}
      <span className='truncate'>{btn.label}</span>
    </motion.button>
  );
}

export function ButtonRowBlockRenderer({ block }: { block: ButtonRowBlock }) {
  if (!block.buttons.length) return null;
  return (
    <div className='flex gap-2'>
      {block.buttons.map(btn => (
        <InlineButtonRenderer key={btn.id} btn={btn} />
      ))}
    </div>
  );
}
