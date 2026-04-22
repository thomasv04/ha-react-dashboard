import { Suspense, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useMoreInfo } from '@/context/MoreInfoContext';
import { MoreInfoReadyContext } from '@/context/MoreInfoReadyContext';
import { MORE_INFO_COMPONENTS } from './more-info-registry';

export function MoreInfoModal() {
  const { state, closeMoreInfo } = useMoreInfo();
  const [contentReady, setContentReady] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  // Reset contentReady when modal closes
  useEffect(() => {
    if (!state) setContentReady(false);
  }, [state]);

  // Compute initial transform from cardRect → modal center
  // We animate the shell from the card's position/size to its final centered position
  const getInitialStyle = () => {
    if (!state?.cardRect) return { scale: 0.92, opacity: 0 };
    const { top, left, width, height } = state.cardRect;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Center of the card
    const cardCx = left + width / 2;
    const cardCy = top + height / 2;

    // Center of the viewport
    const vpCx = vw / 2;
    const vpCy = vh / 2;

    // The modal max-width is min(vw - 48px, 1024px), height = auto ~≥400px
    // We approximate the modal width to compute scale
    const modalW = Math.min(vw - 48, 1024);

    const scaleX = width / modalW;
    // Use scaleX for both axes to keep aspect ratio
    const scale = Math.max(0.05, Math.min(scaleX, 0.95));

    const dx = cardCx - vpCx;
    const dy = cardCy - vpCy;

    return { x: dx, y: dy, scale, opacity: 0.6 };
  };

  return (
    <AnimatePresence onExitComplete={() => setContentReady(false)}>
      {state && MORE_INFO_COMPONENTS[state.widgetType] && (
        <motion.div
          key='more-info-overlay'
          className='fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6'
          onClick={closeMoreInfo}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Backdrop blur on a separate layer — doesn't repaint during shell animation */}
          <div className='absolute inset-0 -z-[1]' style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.35)' }} />

          {/* Shell: animates from card position → center */}
          <motion.div
            ref={shellRef}
            key={state.widgetId}
            className='relative w-full max-w-5xl rounded-3xl md:rounded-[2rem]'
            style={{
              background: 'linear-gradient(135deg, rgba(15,23,42,0.97), rgba(10,15,30,0.99))',
              border: '1px solid rgba(255,255,255,0.08)',
              willChange: 'transform, opacity',
              originX: '50%',
              originY: '50%',
            }}
            onClick={e => e.stopPropagation()}
            initial={getInitialStyle()}
            animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            transition={{
              type: 'spring',
              stiffness: 360,
              damping: 32,
              mass: 0.85,
              opacity: { duration: 0.18, ease: 'easeOut' },
            }}
            onAnimationComplete={() => setContentReady(true)}
          >
            {/* Scrollable content */}
            <div
              className='max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-3xl md:rounded-[2rem]'
              style={{ overscrollBehavior: 'contain' }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: contentReady ? 1 : 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
              >
                {/* Close button */}
                <button
                  onClick={closeMoreInfo}
                  className='absolute top-6 right-6 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors'
                >
                  <X size={18} />
                </button>

                <MoreInfoReadyContext.Provider value={contentReady}>
                  <Suspense
                    fallback={
                      <div className='flex items-center justify-center min-h-[400px]'>
                        <Loader2 size={28} className='animate-spin text-white/40' />
                      </div>
                    }
                  >
                    {(() => {
                      const Content = MORE_INFO_COMPONENTS[state.widgetType];
                      return <Content entityId={state.entityId} widgetId={state.widgetId} />;
                    })()}
                  </Suspense>
                </MoreInfoReadyContext.Provider>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
