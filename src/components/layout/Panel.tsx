import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';
import { topSheet } from '@/lib/motion-variants';
import { X } from 'lucide-react';
import { useEffect, useRef, useCallback } from 'react';
import { usePanel } from '@/context/PanelContext';
import { useMoreInfo } from '@/context/MoreInfoContext';
import type { ReactNode } from 'react';
import { useI18n } from '@/i18n';

/** Remontée d'autant, ou lancée vers le haut, la feuille se ferme. */
const DISMISS_DISTANCE = 80;
const DISMISS_VELOCITY = 400;

interface PanelProps {
  children: ReactNode;
  title: string;
  /** Boutons de l'en-tête, posés avant la fermeture. */
  actions?: ReactNode;
}

/**
 * Une modale ouverte, façon Echo Show : une feuille qui descend du haut et
 * couvre l'écran, poignée et titre centrés. On la referme en la remontant par
 * la poignée, par la croix ou par Échap.
 */
export function Panel({ children, title, actions }: PanelProps) {
  const { t } = useI18n();
  const { closePanel, autoCloseMs } = usePanel();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragControls = useDragControls();

  const resetTimer = useCallback(() => {
    if (!autoCloseMs) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(closePanel, autoCloseMs);
  }, [autoCloseMs, closePanel]);

  // Start timer when panel mounts (or autoCloseMs changes)
  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  // Une fiche ouverte depuis un bloc est par-dessus : Échap la ferme, elle seule.
  const { state: moreInfo } = useMoreInfo();
  useEffect(() => {
    if (moreInfo) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closePanel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePanel, moreInfo]);

  const handleDragEnd = (_: PointerEvent, info: PanInfo) => {
    if (-info.offset.y > DISMISS_DISTANCE || -info.velocity.y > DISMISS_VELOCITY) closePanel();
  };

  // Le glissement ne part que de la poignée et du titre : posé sur toute la
  // feuille, il volerait chaque geste destiné au défilement du contenu.
  const startDrag = (e: React.PointerEvent) => dragControls.start(e);

  return (
    <motion.div
      role='dialog'
      aria-modal='true'
      aria-label={title}
      variants={topSheet}
      initial='hidden'
      animate='visible'
      exit='exit'
      drag='y'
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.5, bottom: 0 }}
      onDragEnd={handleDragEnd}
      onPointerDown={resetTimer}
      // `z-50` comme la barre d'édition et la fiche « plus d'infos » : l'ordre du
      // DOM tranche — la feuille couvre la barre, la fiche ouverte depuis un bloc
      // passe par-dessus la feuille.
      className='fixed inset-0 z-50 flex flex-col bg-[var(--ds-ground)] text-[var(--ds-ink)]'
    >
      <div className='shrink-0 cursor-grab touch-none active:cursor-grabbing' onPointerDown={startDrag}>
        <div aria-hidden='true' className='mx-auto mt-4 h-[5px] w-20 rounded-full bg-[var(--ds-ink-muted)]' />
        {/* Marges larges : la croix et les boutons d'en-tête sont posés en haut à droite. */}
        <h2 className='truncate px-20 pt-5 text-center text-2xl font-semibold sm:px-56'>{title}</h2>
      </div>

      <div className='absolute right-6 top-6 flex items-center gap-2'>
        {actions}
        {autoCloseMs && (
          <div className='h-1.5 w-16 overflow-hidden rounded-full bg-[var(--ds-surface-3)]'>
            <motion.div
              key={autoCloseMs}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: autoCloseMs / 1000, ease: 'linear' }}
              className='h-full rounded-full bg-[var(--ds-ink-muted)]'
            />
          </div>
        )}
        <button
          onClick={closePanel}
          aria-label={t('common.close')}
          title={t('common.close')}
          className='flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-6 sm:px-10'>
        <div className='mx-auto max-w-[1200px] rounded-[var(--ds-radius-xl)] bg-[var(--ds-surface-1)] p-[22px]'>{children}</div>
      </div>
    </motion.div>
  );
}

export function PanelOverlay({ children }: { children: ReactNode }) {
  const { activePanel } = usePanel();

  // Clé sur la modale active : passer de l'une à l'autre joue la sortie puis
  // l'entrée au lieu d'échanger le contenu d'un coup.
  return (
    <AnimatePresence mode='wait'>
      {activePanel !== null && (
        <motion.div key={activePanel} className='contents'>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
