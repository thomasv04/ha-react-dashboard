import { useRef } from 'react';
import { motion } from 'framer-motion';
import { DURATION_HERO } from '@/lib/motion-tokens';
import { ChevronsUp, ChevronsDown, Square, Blinds } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useMoreInfo } from '@/context/MoreInfoContext';
import { useI18n } from '@/i18n';
import { useLowPowerMotion } from '@/hooks/useLowPowerMotion';
import { coverArrowMotion, type CoverDirection } from '@/lib/cover-motion';
import { cn } from '@/lib/utils';
import type { CoverRowBlock } from '@/types/custom-panel';
import { friendlyName } from '@/lib/ha-service';

export function CoverRowBlockRenderer({ block, card = false }: { block: CoverRowBlock; card?: boolean }) {
  const cover = useSafeEntity(block.entityId);
  const helpers = useHass(s => s.helpers);
  const { openMoreInfo } = useMoreInfo();
  const { t } = useI18n();
  const motionAllowed = useLowPowerMotion();
  const rowRef = useRef<HTMLDivElement>(null);

  if (!cover) return null;

  const pos = cover.attributes.current_position as number | undefined;
  const label = block.label ?? friendlyName(cover) ?? block.entityId;
  const isOpen = cover.state === 'open';

  function call(service: string) {
    helpers.callService({ domain: 'cover', service: service as never, target: { entity_id: block.entityId } });
  }

  const open = () => openMoreInfo(block.entityId, 'cover', block.entityId, rowRef.current?.getBoundingClientRect() ?? null);

  // La ligne entière ouvre la fiche détaillée, comme une carte de la grille —
  // les trois boutons restent des raccourcis. Sans ça, un volet listé dans un
  // panneau était le seul endroit du dashboard d'où sa fiche était
  // inatteignable : position exacte, historique et réglages fins compris.
  const openProps = {
    ref: rowRef,
    role: 'button',
    tabIndex: 0,
    onClick: open,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      open();
    },
  };

  // `stopPropagation` : monter, stopper ou fermer ne doit pas *aussi* ouvrir la
  // fiche par-dessus.
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  if (card) {
    // Mise en page de Home Assistant : identité en haut, commandes pleine
    // largeur en dessous. Sur une colonne étroite — et sur une tablette au
    // doigt — trois pastilles de 32 px alignées à droite étaient trop petites.
    const fullyOpen = pos !== undefined ? pos === 100 : isOpen;
    const fullyClosed = pos !== undefined ? pos === 0 : cover.state === 'closed';
    const stateLabel = isOpen
      ? `${t('widgets.cover.open')}${pos !== undefined ? ` · ${pos} %` : ''}`
      : cover.state === 'closed'
        ? t('widgets.cover.closed')
        : cover.state === 'opening'
          ? t('widgets.cover.opening')
          : cover.state === 'closing'
            ? t('widgets.cover.closing')
            : cover.state;

    const controls: Array<{
      icon: typeof ChevronsUp;
      service: string;
      disabled: boolean;
      label: string;
      direction?: CoverDirection;
    }> = [
      { icon: ChevronsUp, service: 'open_cover', disabled: fullyOpen, label: t('widgets.cover.openAction'), direction: 'up' },
      { icon: Square, service: 'stop_cover', disabled: false, label: t('common.stop') },
      { icon: ChevronsDown, service: 'close_cover', disabled: fullyClosed, label: t('widgets.cover.closeAction'), direction: 'down' },
    ];

    return (
      <div {...openProps} className='cursor-pointer rounded-[var(--ds-radius-xl)] bg-[var(--ds-sheet-section)] p-4'>
        <div className='flex items-center gap-3'>
          <div
            className={cn(
              'flex size-11 flex-shrink-0 items-center justify-center rounded-full',
              isOpen ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-3)]'
            )}
          >
            <Blinds size={20} />
          </div>
          <div className='min-w-0'>
            <div className='truncate text-[17px] font-semibold'>{label}</div>
            <div className='text-sm text-[var(--ds-ink-muted)]'>{stateLabel}</div>
          </div>
        </div>

        <div className='grid grid-cols-3 gap-2 mt-3' onClick={stop}>
          {controls.map(c => (
            <motion.button
              key={c.service}
              whileTap={{ scale: 0.95 }}
              {...(c.direction ? coverArrowMotion(cover.state, c.direction, motionAllowed) : {})}
              onClick={() => call(c.service)}
              disabled={c.disabled}
              aria-label={c.label}
              className='flex h-[52px] items-center justify-center rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)] disabled:pointer-events-none disabled:opacity-30'
            >
              <c.icon size={18} />
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      {...openProps}
      className='flex cursor-pointer items-center justify-between rounded-[var(--ds-radius-xl)] bg-[var(--ds-sheet-section)] px-5 py-4'
    >
      <div>
        <div className='text-[17px] font-semibold'>{label}</div>
        <div className='text-sm text-[var(--ds-ink-muted)]'>{pos !== undefined ? `${pos} %` : cover.state}</div>
      </div>
      <div className='flex items-center gap-3' onClick={stop}>
        <div className='h-2 w-16 overflow-hidden rounded-full bg-[var(--ds-surface-3)]'>
          <motion.div
            animate={{ width: `${pos ?? 0}%` }}
            transition={{ duration: DURATION_HERO }}
            className={cn('h-full rounded-full', isOpen ? 'bg-[var(--ds-tile-on)]' : 'bg-[var(--ds-ink-muted)]')}
          />
        </div>
        <div className='flex gap-1'>
          <motion.button
            whileTap={{ scale: 0.9 }}
            {...coverArrowMotion(cover.state, 'up', motionAllowed)}
            onClick={() => call('open_cover')}
            aria-label={t('widgets.cover.openAction')}
            className='flex size-11 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'
          >
            <ChevronsUp size={18} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => call('stop_cover')}
            aria-label={t('common.stop')}
            className='flex size-11 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'
          >
            <Square size={16} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            {...coverArrowMotion(cover.state, 'down', motionAllowed)}
            onClick={() => call('close_cover')}
            aria-label={t('widgets.cover.closeAction')}
            className='flex size-11 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'
          >
            <ChevronsDown size={18} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
