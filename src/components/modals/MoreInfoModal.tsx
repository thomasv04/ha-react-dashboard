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
          <motion.div
            key={state.widgetId}
            data-testid='more-info-modal'
            role='dialog'
            aria-modal='true'
            className={cn(
              'absolute flex flex-col overflow-hidden rounded-[var(--ds-radius-2xl)] bg-[var(--ds-sheet)] text-[var(--ds-ink)] shadow-[var(--ds-shadow-sheet)]',
              MORE_INFO_APPS.has(state.widgetType)
                ? 'inset-0 rounded-none'
                : MORE_INFO_FULLSCREEN.has(state.widgetType)
                  ? 'inset-4 sm:inset-8'
                  : 'bottom-4 right-4 top-4 w-[min(calc(100vw-2rem),560px)] sm:bottom-10 sm:right-12 sm:top-10'
            )}
            onClick={e => e.stopPropagation()}
            initial={{ x: '110%' }}
            animate={{ x: 0 }}
            exit={{ x: '110%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
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
