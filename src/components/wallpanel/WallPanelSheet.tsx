import type { ReactNode } from 'react';
import { motion, useDragControls, type PanInfo } from 'framer-motion';
import { bottomSheet, topSheet, modalScrim, staggerContainer } from '@/lib/motion-variants';
import { cn } from '@/lib/utils';

/** Tirée d'autant vers son bord, la feuille se ferme. */
const DISMISS_DISTANCE = 80;
const DISMISS_VELOCITY = 400;

interface WallPanelSheetProps {
  side: 'top' | 'bottom';
  title: string;
  icon?: ReactNode;
  /** Rendu à droite du titre — bouton « tout effacer », compteur… */
  action?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

/** Feuille de l'écran de veille, ancrée en haut ou en bas, sur fond opaque. */
export function WallPanelSheet({ side, title, icon, action, onClose, children }: WallPanelSheetProps) {
  const isBottom = side === 'bottom';
  const dragControls = useDragControls();

  const handleDragEnd = (_: PointerEvent, info: PanInfo) => {
    // « Vers l'extérieur » change de signe selon le bord d'ancrage.
    const away = isBottom ? info.offset.y : -info.offset.y;
    const fling = isBottom ? info.velocity.y : -info.velocity.y;
    if (away > DISMISS_DISTANCE || fling > DISMISS_VELOCITY) onClose();
  };

  // Le glissement ne part que de la poignée et de l'en-tête : posé sur toute la
  // feuille, il volait chaque geste destiné au défilement du contenu.
  const startDrag = (e: React.PointerEvent) => dragControls.start(e);

  const handle = (
    <div className='flex justify-center py-3 shrink-0 cursor-grab active:cursor-grabbing' onPointerDown={startDrag}>
      <div className='h-1.5 w-12 rounded-full bg-[var(--ds-ink-muted)] opacity-50' />
    </div>
  );

  return (
    <>
      <motion.div
        variants={modalScrim}
        initial='hidden'
        animate='visible'
        exit='exit'
        onClick={e => {
          // L'overlay parent ferme l'écran de veille au clic : sans cette
          // coupure, refermer une feuille ferait sortir de la veille.
          e.stopPropagation();
          onClose();
        }}
        className='absolute inset-0 z-20 bg-black/55'
      />
      <motion.div
        variants={isBottom ? bottomSheet : topSheet}
        initial='hidden'
        animate='visible'
        exit='exit'
        drag='y'
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: isBottom ? 0 : 0.5, bottom: isBottom ? 0.5 : 0 }}
        onDragEnd={handleDragEnd}
        onClick={e => e.stopPropagation()}
        className={cn(
          'absolute inset-x-0 z-[21] mx-auto w-[min(96vw,720px)] max-h-[62vh] flex flex-col overflow-hidden',
          'bg-[var(--ds-sheet)] text-[var(--ds-ink)] shadow-[var(--ds-shadow-sheet)]',
          isBottom ? 'bottom-0 rounded-t-[var(--ds-radius-xl)]' : 'top-0 rounded-b-[var(--ds-radius-xl)]'
        )}
      >
        {isBottom && handle}

        <div className='flex shrink-0 items-center justify-between gap-3 px-6 py-3'>
          {/* Le titre est une zone de préhension, pas la rangée entière : sinon
              le bouton d'action verrait chaque appui démarrer un glissement. */}
          <div className='flex items-center gap-2.5 min-w-0 flex-1 cursor-grab active:cursor-grabbing' onPointerDown={startDrag}>
            {icon && <span className='shrink-0 text-[var(--ds-ink-muted)]'>{icon}</span>}
            <h2 className='truncate text-xl font-semibold'>{title}</h2>
          </div>
          {action}
        </div>

        <motion.div
          variants={staggerContainer}
          initial='hidden'
          animate='visible'
          className='flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-4 pt-1'
        >
          {children}
        </motion.div>

        {!isBottom && handle}
      </motion.div>
    </>
  );
}
