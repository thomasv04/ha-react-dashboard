import { motion } from 'framer-motion';
import { useHass } from '@hakit/core';
import { resolveIcon, useIconCatalog } from '@/lib/lucide-icon-map';
import type { ButtonRowBlock, InlineButton } from '@/types/custom-panel';

export function InlineButtonRenderer({ btn, compact = false }: { btn: InlineButton; compact?: boolean }) {
  // Les icones hors du noyau arrivent avec le catalogue complet, charge a la
  // demande : sans cet abonnement elles resteraient sur leur icone de repli.
  useIconCatalog();
  const helpers = useHass(s => s.helpers);
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
      // `compact` : la version d'en-tête, qui partage sa ligne avec le titre et
      // la fermeture — elle se serre au lieu de prendre toute la largeur.
      className={`flex min-w-0 items-center justify-center gap-2 rounded-[var(--ds-radius-pill)] font-semibold ${
        compact ? 'h-11 px-4 text-sm' : 'h-[52px] flex-1 text-[15px]'
      } ${isPrimary ? 'bg-[var(--ds-accent)] text-white' : 'bg-[var(--ds-sheet-section)] text-[var(--ds-ink)]'}`}
    >
      {/* eslint-disable-next-line react-hooks/static-components */}
      {Icon && <Icon size={compact ? 18 : 20} className='flex-shrink-0' />}
      {btn.label && <span className='truncate'>{btn.label}</span>}
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
