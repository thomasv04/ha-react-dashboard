import { motion } from 'framer-motion';
import { useHass } from '@hakit/core';
import { resolveIcon } from '@/lib/lucide-icon-map';
import type { ButtonBlock } from '@/types/custom-panel';

export function ButtonBlockRenderer({ block }: { block: ButtonBlock }) {
  const { helpers } = useHass();
  // eslint-disable-next-line react-hooks/static-components
  const Icon = block.icon ? resolveIcon(block.icon) : undefined;

  function call() {
    if (!block.domain || !block.service) return;
    const target = block.targetEntityIds.length > 0 ? { entity_id: block.targetEntityIds } : undefined;
    helpers.callService({ domain: block.domain as never, service: block.service as never, target });
  }

  const isPrimary = block.variant === 'primary';

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={call}
      className={`w-full py-2.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 ${
        isPrimary ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400' : 'gc-btn text-white/60 hover:text-white/80'
      }`}
    >
      {/* eslint-disable-next-line react-hooks/static-components */}
      {Icon && <Icon size={16} />}
      {block.label}
    </motion.button>
  );
}
