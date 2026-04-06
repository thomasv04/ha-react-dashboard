import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PencilLine } from 'lucide-react';
import { useWallPanel } from '@/context/WallPanelContext';
import { BackgroundSlideshow } from './BackgroundSlideshow';
import { WallPanelEditShell, WallPanelReadonlyShell } from './WallPanelEditShell';

export function WallPanelOverlay() {
  const {
    isActive,
    deactivate,
    wallPanelLayout,
    config,
    isWallPanelEditMode,
    enterWallPanelEditMode,
  } = useWallPanel();
  const hasWidgets = wallPanelLayout.widgets.lg.length > 0;

  // Désactiver avec Echap (sauf en mode édition)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isWallPanelEditMode) deactivate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deactivate, isWallPanelEditMode]);

  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* ── Phase 1 : dim layer — fades in first for a nice page transition ── */}
          <motion.div
            key='wallpanel-dim'
            className='fixed inset-0 z-[199] bg-black pointer-events-none'
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeIn' }}
          />

          {/* ── Phase 2 : full content (delayed) ── */}
          <motion.div
            key='wallpanel-overlay'
            className='fixed inset-0 z-[200] overflow-hidden select-none'
            style={{ cursor: isWallPanelEditMode ? 'default' : 'pointer' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            onClick={isWallPanelEditMode ? undefined : deactivate}
          >
            {/* Fond (slideshow ou dégradé) */}
            <BackgroundSlideshow config={config} />

            {/* ── Widgets ── */}
            <div
              className='absolute inset-0 z-10 pointer-events-none'
              onClick={e => e.stopPropagation()}
            >
              {isWallPanelEditMode ? (
                // Mode édition – layout provider isolé avec drag/resize/add
                <WallPanelEditShell />
              ) : (
                // Mode lecture seule – also needs its own provider so GridItem
                // can look up widget positions from the wallpanel layout
                hasWidgets && (
                  <WallPanelReadonlyShell />
                )
              )}
            </div>

            {/* ── Bouton d'édition (bas-droite) ── */}
            {!isWallPanelEditMode && (
              <button
                className='absolute bottom-6 right-6 z-[201] p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white/50 hover:text-white transition-colors backdrop-blur-sm'
                title='Modifier les widgets'
                onClick={e => {
                  e.stopPropagation();
                  enterWallPanelEditMode();
                }}
              >
                <PencilLine size={16} />
              </button>
            )}

            {/* ── Indicateur discret ── */}
            {!isWallPanelEditMode && (
              <div
                className='absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none'
                style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11, letterSpacing: '0.08em' }}
              >
                TOUCHER POUR QUITTER
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
