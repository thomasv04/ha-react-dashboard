import { motion } from 'framer-motion';
import { useHass } from '@hakit/core';
import { resolveIcon, useIconCatalog } from '@/lib/lucide-icon-map';
import type { ButtonBlock } from '@/types/custom-panel';

export function ButtonBlockRenderer({ block }: { block: ButtonBlock }) {
  // Les icones hors du noyau arrivent avec le catalogue complet, charge a la
  // demande : sans cet abonnement elles resteraient sur leur icone de repli.
  useIconCatalog();
  const helpers = useHass(s => s.helpers);
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
      className={`flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--ds-radius-pill)] text-[15px] font-semibold ${
        isPrimary ? 'bg-[var(--ds-accent)] text-white' : 'bg-[var(--ds-sheet-section)] text-[var(--ds-ink)]'
      }`}
    >
      {/* eslint-disable-next-line react-hooks/static-components */}
      {Icon && <Icon size={20} />}
      {block.label}
    </motion.button>
  );
}
