import { Suspense, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useMoreInfo } from '@/context/MoreInfoContext';
import { MoreInfoReadyContext } from '@/context/MoreInfoReadyContext';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { MORE_INFO_APPS, MORE_INFO_COMPONENTS, MORE_INFO_FULLSCREEN } from './more-info-registry';

/**
 * Le panneau d'appareil de l'Echo Show : une feuille qui glisse depuis la
 * droite, haute comme l'écran, le reste de la page visible à côté.
 */
export function MoreInfoModal() {
  const { t } = useI18n();
  const { state, closeMoreInfo } = useMoreInfo();
  const [contentReady, setContentReady] = useState(false);

  // Reset contentReady when modal closes
  useEffect(() => {
    if (!state) setContentReady(false);
  }, [state]);

  const app = !!state && MORE_INFO_APPS.has(state.widgetType);

  return (
    <AnimatePresence onExitComplete={() => setContentReady(false)}>
      {state && MORE_INFO_COMPONENTS[state.widgetType] && (
        <motion.div
          key='more-info-overlay'
          data-overlay
          className='fixed inset-0 z-50 bg-black/40'
          onClick={closeMoreInfo}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Les applis plein écran (Musique, lecteur) partagent une seule surface : passer de l'une à
              l'autre se fait sur place, comme une navigation, au lieu de rejouer la glissade d'une fiche. */}
          <motion.div
            key={app ? 'app' : state.widgetId}
            data-testid='more-info-modal'
            role='dialog'
            aria-modal='true'
            className={cn(
              'absolute flex flex-col overflow-hidden text-[var(--ds-ink)] shadow-[var(--ds-shadow-sheet)]',
              app
                ? 'inset-0 bg-[var(--ds-ground)]'
                : MORE_INFO_FULLSCREEN.has(state.widgetType)
                  ? 'inset-4 rounded-[var(--ds-radius-2xl)] bg-[var(--ds-sheet)] sm:inset-8'
                  : 'bottom-4 right-4 top-4 w-[min(calc(100vw-2rem),560px)] rounded-[var(--ds-radius-2xl)] bg-[var(--ds-sheet)] sm:bottom-10 sm:right-12 sm:top-10'
            )}
            onClick={e => e.stopPropagation()}
            initial={app ? { opacity: 0, scale: 0.985 } : { x: '110%' }}
            animate={app ? { opacity: 1, scale: 1 } : { x: 0 }}
            exit={app ? { opacity: 0, scale: 0.985 } : { x: '110%' }}
            transition={app ? { duration: 0.2, ease: 'easeOut' } : { type: 'spring', stiffness: 380, damping: 38 }}
            onAnimationComplete={() => setContentReady(true)}
          >
            {!MORE_INFO_APPS.has(state.widgetType) && (
              <button
                onClick={closeMoreInfo}
                aria-label={t('common.close')}
                title={t('common.close')}
                className='absolute right-6 top-6 z-10 flex size-11 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            )}

            <div
              className={cn(
                'flex-1 overflow-y-auto overflow-x-hidden pt-4',
                MORE_INFO_APPS.has(state.widgetType) && '[scrollbar-width:none]'
              )}
              style={{ overscrollBehavior: 'contain' }}
            >
              <MoreInfoReadyContext.Provider value={contentReady}>
                <Suspense
                  fallback={
                    <div className='flex min-h-[400px] items-center justify-center'>
                      <Loader2 size={28} className='animate-spin text-[var(--ds-ink-muted)]' />
                    </div>
                  }
                >
                  {(() => {
                    const Content = MORE_INFO_COMPONENTS[state.widgetType];
                    return <Content entityId={state.entityId} widgetId={state.widgetId} />;
                  })()}
                </Suspense>
              </MoreInfoReadyContext.Provider>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
