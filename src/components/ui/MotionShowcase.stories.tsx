import type { Meta, StoryObj } from '@storybook/react';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  EASE_OUT,
  EASE_IN,
  EASE_IN_OUT,
  EASE_SINE,
  EASE_SPRING,
  DURATION_INSTANT,
  DURATION_MICRO,
  DURATION_FAST,
  DURATION_NORMAL,
  DURATION_MEDIUM,
  DURATION_SLOW,
  DURATION_ENTRANCE,
  DURATION_HERO,
  DURATION_CINEMATIC,
} from '@/lib/motion-tokens';
import {
  fadeInUp,
  scaleIn,
  groupFadeIn,
  staggerGridContainer,
  staggerGridItem,
  sectionStaggerContainer,
  sectionStaggerItem,
  modalEnter,
  modalScrim,
  bottomSheet,
  slidePushEnter,
  slidePopEnter,
  fadeCross,
  markerContainer,
  markerDrop,
  toastEnter,
  badgePop,
  errorShake,
  successRing,
  floatingIllustration,
  splashLogo,
  stepStaggerContainer,
  stepStaggerItem,
} from '@/lib/motion-variants';

/* ─── Helpers ─── */

function useReplay() {
  const [key, setKey] = useState(0);
  const replay = useCallback(() => setKey(k => k + 1), []);
  return { key, replay };
}

function ReplayButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className='mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors'
    >
      ↻ Rejouer
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className='text-sm font-semibold text-white/50 uppercase tracking-wider mb-3'>{children}</h3>;
}

function DemoBox({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-white/5 border border-white/10 p-4 ${className}`}>{children}</div>;
}

function Card({ label }: { label: string }) {
  return <div className='rounded-lg bg-white/10 border border-white/10 px-4 py-3 text-sm text-white/80'>{label}</div>;
}

/* ─── Meta ─── */

const meta = {
  title: 'Design System/Motion Showcase',
  parameters: { backgrounds: { disable: true }, layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ═══════════════════════════════════════════════════
   1. NAVIGATION & TRANSITIONS
   ═══════════════════════════════════════════════════ */

export const Navigation: Story = {
  name: '🧭 Navigation',
  render: () => {
    const slide = useReplay();
    const pop = useReplay();
    const fade = useReplay();

    return (
      <div className='flex flex-col gap-6 max-w-md'>
        <SectionTitle>Slide Push → Forward</SectionTitle>
        <DemoBox>
          <div className='overflow-hidden rounded-lg h-16 relative'>
            <AnimatePresence mode='wait'>
              <motion.div
                key={`push-${slide.key}`}
                variants={slidePushEnter}
                initial='hidden'
                animate='visible'
                exit='exit'
                className='absolute inset-0 flex items-center justify-center bg-blue-500/20 text-sm text-white/80'
              >
                Screen {slide.key + 1}
              </motion.div>
            </AnimatePresence>
          </div>
          <ReplayButton onClick={slide.replay} />
        </DemoBox>

        <SectionTitle>Slide Pop ← Back</SectionTitle>
        <DemoBox>
          <div className='overflow-hidden rounded-lg h-16 relative'>
            <AnimatePresence mode='wait'>
              <motion.div
                key={`pop-${pop.key}`}
                variants={slidePopEnter}
                initial='hidden'
                animate='visible'
                exit='exit'
                className='absolute inset-0 flex items-center justify-center bg-purple-500/20 text-sm text-white/80'
              >
                Screen {pop.key + 1}
              </motion.div>
            </AnimatePresence>
          </div>
          <ReplayButton onClick={pop.replay} />
        </DemoBox>

        <SectionTitle>Fade Cross — Tabs</SectionTitle>
        <DemoBox>
          <div className='overflow-hidden rounded-lg h-16 relative'>
            <AnimatePresence mode='wait'>
              <motion.div
                key={`fade-${fade.key}`}
                variants={fadeCross}
                initial='hidden'
                animate='visible'
                exit='exit'
                className='absolute inset-0 flex items-center justify-center bg-emerald-500/20 text-sm text-white/80'
              >
                Tab {(fade.key % 3) + 1}
              </motion.div>
            </AnimatePresence>
          </div>
          <ReplayButton onClick={fade.replay} />
        </DemoBox>
      </div>
    );
  },
};

/* ═══════════════════════════════════════════════════
   2. ENTRÉE & SORTIE
   ═══════════════════════════════════════════════════ */

export const EntreeSortie: Story = {
  name: '🎬 Entrée & Sortie',
  render: () => {
    const fadeUp = useReplay();
    const scale = useReplay();
    const group = useReplay();
    const grid = useReplay();
    const section = useReplay();

    return (
      <div className='flex flex-col gap-6 max-w-md'>
        <SectionTitle>Fade In Up</SectionTitle>
        <DemoBox>
          <AnimatePresence mode='wait'>
            <motion.div key={`fiu-${fadeUp.key}`} variants={fadeInUp} initial='hidden' animate='visible' exit='exit'>
              <Card label='fadeInUp — opacity + y: 10→0' />
            </motion.div>
          </AnimatePresence>
          <ReplayButton onClick={fadeUp.replay} />
        </DemoBox>

        <SectionTitle>Scale In</SectionTitle>
        <DemoBox>
          <AnimatePresence mode='wait'>
            <motion.div key={`si-${scale.key}`} variants={scaleIn} initial='hidden' animate='visible' exit='exit'>
              <Card label='scaleIn — scale 0.94→1 + fade' />
            </motion.div>
          </AnimatePresence>
          <ReplayButton onClick={scale.replay} />
        </DemoBox>

        <SectionTitle>Group Fade In</SectionTitle>
        <DemoBox>
          <motion.div key={`gfi-${group.key}`} variants={groupFadeIn} initial='hidden' animate='visible'>
            <div className='flex gap-2'>
              <Card label='A' />
              <Card label='B' />
              <Card label='C' />
            </div>
          </motion.div>
          <ReplayButton onClick={group.replay} />
        </DemoBox>

        <SectionTitle>Stagger Grid</SectionTitle>
        <DemoBox>
          <motion.div
            key={`sg-${grid.key}`}
            variants={staggerGridContainer}
            initial='hidden'
            animate='visible'
            className='grid grid-cols-3 gap-2'
          >
            {Array.from({ length: 6 }, (_, i) => (
              <motion.div key={i} variants={staggerGridItem}>
                <Card label={`${i + 1}`} />
              </motion.div>
            ))}
          </motion.div>
          <ReplayButton onClick={grid.replay} />
        </DemoBox>

        <SectionTitle>Section Stagger</SectionTitle>
        <DemoBox>
          <motion.div
            key={`ss-${section.key}`}
            variants={sectionStaggerContainer}
            initial='hidden'
            animate='visible'
            className='flex flex-col gap-2'
          >
            {['Header', 'Content', 'Footer'].map(label => (
              <motion.div key={label} variants={sectionStaggerItem}>
                <Card label={label} />
              </motion.div>
            ))}
          </motion.div>
          <ReplayButton onClick={section.replay} />
        </DemoBox>
      </div>
    );
  },
};

/* ═══════════════════════════════════════════════════
   3. MODAL & BOTTOM SHEET
   ═══════════════════════════════════════════════════ */

export const ModalBottomSheet: Story = {
  name: '📐 Modal & Bottom Sheet',
  render: () => {
    const [modalOpen, setModalOpen] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);

    return (
      <div className='flex flex-col gap-6 max-w-md'>
        <SectionTitle>Modal Center</SectionTitle>
        <DemoBox>
          <button
            onClick={() => setModalOpen(true)}
            className='px-4 py-2 rounded-lg bg-blue-500/20 text-sm text-white/80 hover:bg-blue-500/30 transition-colors'
          >
            Ouvrir Modal
          </button>
          <AnimatePresence>
            {modalOpen && (
              <div className='fixed inset-0 z-50 flex items-center justify-center'>
                <motion.div
                  variants={modalScrim}
                  initial='hidden'
                  animate='visible'
                  exit='exit'
                  className='absolute inset-0 bg-black/45'
                  onClick={() => setModalOpen(false)}
                />
                <motion.div
                  variants={modalEnter}
                  initial='hidden'
                  animate='visible'
                  exit='exit'
                  className='relative z-10 rounded-2xl bg-neutral-800 border border-white/10 p-6 w-72 text-center'
                >
                  <p className='text-sm text-white/80 mb-4'>Modal Center — scale 0.94 + y 8 + fade</p>
                  <button
                    onClick={() => setModalOpen(false)}
                    className='px-4 py-1.5 rounded-lg bg-white/10 text-xs text-white/70 hover:bg-white/20 transition-colors'
                  >
                    Fermer
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </DemoBox>

        <SectionTitle>Bottom Sheet</SectionTitle>
        <DemoBox>
          <button
            onClick={() => setSheetOpen(true)}
            className='px-4 py-2 rounded-lg bg-purple-500/20 text-sm text-white/80 hover:bg-purple-500/30 transition-colors'
          >
            Ouvrir Bottom Sheet
          </button>
          <AnimatePresence>
            {sheetOpen && (
              <div className='fixed inset-0 z-50 flex items-end'>
                <motion.div
                  variants={modalScrim}
                  initial='hidden'
                  animate='visible'
                  exit='exit'
                  className='absolute inset-0 bg-black/45'
                  onClick={() => setSheetOpen(false)}
                />
                <motion.div
                  variants={bottomSheet}
                  initial='hidden'
                  animate='visible'
                  exit='exit'
                  className='relative z-10 rounded-t-2xl bg-neutral-800 border border-white/10 p-6 w-full'
                >
                  <div className='w-10 h-1 rounded-full bg-white/20 mx-auto mb-4' />
                  <p className='text-sm text-white/80 mb-4'>Bottom Sheet — y: 100% → 0</p>
                  <button
                    onClick={() => setSheetOpen(false)}
                    className='px-4 py-1.5 rounded-lg bg-white/10 text-xs text-white/70 hover:bg-white/20 transition-colors'
                  >
                    Fermer
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </DemoBox>
      </div>
    );
  },
};

/* ═══════════════════════════════════════════════════
   4. MICRO-INTERACTIONS
   ═══════════════════════════════════════════════════ */

export const MicroInteractions: Story = {
  name: '👆 Micro-interactions',
  render: () => {
    const [isOn, setIsOn] = useState(false);
    const [isFav, setIsFav] = useState(false);
    const [checked, setChecked] = useState(false);
    const [count, setCount] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [direction, setDirection] = useState(1);

    return (
      <div className='flex flex-col gap-6 max-w-md'>
        <SectionTitle>Tap — CTA Button</SectionTitle>
        <DemoBox>
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className='px-6 py-2.5 rounded-xl bg-blue-500 text-sm text-white font-medium'
          >
            Appuyer ici
          </motion.button>
        </DemoBox>

        <SectionTitle>Toggle</SectionTitle>
        <DemoBox>
          <button onClick={() => setIsOn(!isOn)} className='flex items-center gap-3'>
            <motion.div
              className='w-12 h-7 rounded-full flex items-center px-1'
              animate={{ backgroundColor: isOn ? 'rgb(59 130 246)' : 'rgb(64 64 64)' }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
            >
              <motion.div
                className='w-5 h-5 rounded-full bg-white'
                animate={{ x: isOn ? 20 : 0 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
              />
            </motion.div>
            <span className='text-sm text-white/60'>{isOn ? 'ON' : 'OFF'}</span>
          </button>
        </DemoBox>

        <SectionTitle>Favoris — Cœur</SectionTitle>
        <DemoBox>
          <button onClick={() => setIsFav(!isFav)}>
            <motion.div
              animate={{ scale: isFav ? [1, 1.22, 1] : 1, color: isFav ? '#ef4444' : '#9ca3af' }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              className='text-3xl'
            >
              {isFav ? '❤️' : '🤍'}
            </motion.div>
          </button>
        </DemoBox>

        <SectionTitle>Checkbox</SectionTitle>
        <DemoBox>
          <button onClick={() => setChecked(!checked)} className='flex items-center gap-3'>
            <motion.div
              animate={{ scale: checked ? [1, 1.08, 1] : 1 }}
              transition={{ duration: 0.15, ease: EASE_OUT }}
              className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                checked ? 'bg-blue-500 border-blue-500' : 'border-white/30'
              }`}
            >
              {checked && <span className='text-white text-xs'>✓</span>}
            </motion.div>
            <span className='text-sm text-white/60'>Option</span>
          </button>
        </DemoBox>

        <SectionTitle>Badge — Compteur</SectionTitle>
        <DemoBox>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => setCount(c => c + 1)}
              className='px-4 py-2 rounded-lg bg-white/10 text-sm text-white/80 hover:bg-white/20 transition-colors'
            >
              +1
            </button>
            <motion.span
              key={count}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 0.33, ease: EASE_OUT }}
              className='inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white text-sm font-bold'
            >
              {count}
            </motion.span>
          </div>
        </DemoBox>

        <SectionTitle>Quantité — Drum Roll</SectionTitle>
        <DemoBox>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => {
                setDirection(-1);
                setQuantity(q => Math.max(0, q - 1));
              }}
              className='w-8 h-8 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 transition-colors'
            >
              −
            </button>
            <div className='w-8 h-8 flex items-center justify-center overflow-hidden'>
              <AnimatePresence mode='popLayout'>
                <motion.span
                  key={quantity}
                  initial={{ y: direction > 0 ? 8 : -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: direction > 0 ? -8 : 8, opacity: 0 }}
                  transition={{ duration: 0.18, ease: EASE_OUT }}
                  className='text-white text-lg font-semibold'
                >
                  {quantity}
                </motion.span>
              </AnimatePresence>
            </div>
            <button
              onClick={() => {
                setDirection(1);
                setQuantity(q => q + 1);
              }}
              className='w-8 h-8 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 transition-colors'
            >
              +
            </button>
          </div>
        </DemoBox>
      </div>
    );
  },
};

/* ═══════════════════════════════════════════════════
   5. FEEDBACK & ÉTATS
   ═══════════════════════════════════════════════════ */

export const Feedback: Story = {
  name: '✅ Feedback & États',
  render: () => {
    const success = useReplay();
    const [hasError, setHasError] = useState(false);
    const [rating, setRating] = useState(0);
    const [progress, setProgress] = useState(0);

    return (
      <div className='flex flex-col gap-6 max-w-md'>
        <SectionTitle>Succès — Ring + Checkmark</SectionTitle>
        <DemoBox>
          <motion.div
            key={`sr-${success.key}`}
            variants={successRing}
            initial='hidden'
            animate='visible'
            className='w-16 h-16 rounded-full border-2 border-green-500 flex items-center justify-center mx-auto'
          >
            <motion.svg viewBox='0 0 24 24' className='w-8 h-8 text-green-500'>
              <motion.path
                d='M5 13l4 4L19 7'
                fill='none'
                stroke='currentColor'
                strokeWidth={2.5}
                strokeLinecap='round'
                strokeLinejoin='round'
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.32 }}
              />
            </motion.svg>
          </motion.div>
          <ReplayButton onClick={success.replay} />
        </DemoBox>

        <SectionTitle>Erreur — Shake</SectionTitle>
        <DemoBox>
          <motion.div variants={errorShake} animate={hasError ? 'shake' : 'idle'} onAnimationComplete={() => setHasError(false)}>
            <div className='rounded-lg border-2 border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400'>Champ invalide</div>
          </motion.div>
          <button
            onClick={() => setHasError(true)}
            className='mt-3 px-3 py-1.5 rounded-lg text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors'
          >
            Déclencher l'erreur
          </button>
        </DemoBox>

        <SectionTitle>Étoiles — Notation</SectionTitle>
        <DemoBox>
          <div className='flex gap-1'>
            {[1, 2, 3, 4, 5].map((star, i) => (
              <motion.button
                key={star}
                onClick={() => setRating(star)}
                animate={{ scale: rating >= star ? [1, 1.18, 1] : 1 }}
                transition={{ duration: 0.2, ease: EASE_OUT, delay: i * 0.1 }}
                className='text-2xl'
              >
                {rating >= star ? '⭐' : '☆'}
              </motion.button>
            ))}
          </div>
          <button onClick={() => setRating(0)} className='mt-2 text-xs text-white/30 hover:text-white/60 transition-colors'>
            Reset
          </button>
        </DemoBox>

        <SectionTitle>Barre de progression</SectionTitle>
        <DemoBox>
          <div className='h-2 rounded-full bg-white/10 overflow-hidden'>
            <motion.div
              className='h-full rounded-full bg-blue-500'
              animate={{ width: `${progress}%` }}
              transition={{ duration: DURATION_ENTRANCE, ease: EASE_OUT }}
            />
          </div>
          <div className='flex gap-2 mt-3'>
            {[0, 25, 50, 75, 100].map(v => (
              <button
                key={v}
                onClick={() => setProgress(v)}
                className='px-2 py-1 rounded text-xs bg-white/10 text-white/60 hover:bg-white/20 transition-colors'
              >
                {v}%
              </button>
            ))}
          </div>
        </DemoBox>
      </div>
    );
  },
};

/* ═══════════════════════════════════════════════════
   6. CHARGEMENT
   ═══════════════════════════════════════════════════ */

export const Chargement: Story = {
  name: '⏳ Chargement',
  render: () => (
    <div className='flex flex-col gap-6 max-w-md'>
      <SectionTitle>Skeleton — Shimmer</SectionTitle>
      <DemoBox>
        <div className='space-y-3'>
          <div className='animate-pulse bg-white/10 rounded-xl h-10 w-full' />
          <div className='animate-pulse bg-white/10 rounded-xl h-10 w-3/4' />
          <div className='animate-pulse bg-white/10 rounded-xl h-10 w-1/2' />
        </div>
      </DemoBox>

      <SectionTitle>Shimmer Gradient (Framer Motion)</SectionTitle>
      <DemoBox>
        <motion.div
          className='h-10 rounded-xl'
          style={{
            background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)',
            backgroundSize: '200% 100%',
          }}
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
        />
      </DemoBox>

      <SectionTitle>Spinner</SectionTitle>
      <DemoBox className='flex items-center gap-6'>
        <div>
          <p className='text-xs text-white/40 mb-2'>Tailwind</p>
          <div className='animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full' />
        </div>
        <div>
          <p className='text-xs text-white/40 mb-2'>Framer Motion</p>
          <motion.div
            className='h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full'
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </DemoBox>

      <SectionTitle>Loading Dots</SectionTitle>
      <DemoBox>
        <div className='flex gap-1.5 items-center justify-center'>
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className='w-2.5 h-2.5 rounded-full bg-white/60'
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 1, repeat: Infinity, ease: EASE_SINE, delay: i * 0.07 }}
            />
          ))}
        </div>
      </DemoBox>
    </div>
  ),
};

/* ═══════════════════════════════════════════════════
   7. NOTIFICATIONS
   ═══════════════════════════════════════════════════ */

export const Notifications: Story = {
  name: '🔔 Notifications',
  render: () => {
    const toast = useReplay();
    const badge = useReplay();
    const highlight = useReplay();

    return (
      <div className='flex flex-col gap-6 max-w-md'>
        <SectionTitle>Toast</SectionTitle>
        <DemoBox>
          <AnimatePresence mode='wait'>
            <motion.div
              key={`toast-${toast.key}`}
              variants={toastEnter}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='rounded-xl bg-neutral-700 border border-white/10 px-4 py-3 text-sm text-white/80 flex items-center gap-2'
            >
              <span className='text-green-400'>✓</span> Action enregistrée
            </motion.div>
          </AnimatePresence>
          <ReplayButton onClick={toast.replay} />
        </DemoBox>

        <SectionTitle>Badge Pop</SectionTitle>
        <DemoBox>
          <div className='flex items-center gap-3'>
            <div className='relative'>
              <div className='w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg'>🔔</div>
              <motion.span
                key={`badge-${badge.key}`}
                variants={badgePop}
                initial='hidden'
                animate='visible'
                className='absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-[10px] text-white font-bold flex items-center justify-center'
              >
                3
              </motion.span>
            </div>
          </div>
          <ReplayButton onClick={badge.replay} />
        </DemoBox>

        <SectionTitle>Highlight Pulse</SectionTitle>
        <DemoBox>
          <motion.div
            key={`hl-${highlight.key}`}
            animate={{ backgroundColor: ['rgba(59,130,246,0.08)', 'rgba(59,130,246,0)'] }}
            transition={{ duration: 1.5, ease: EASE_SINE }}
            className='rounded-lg px-4 py-3 text-sm text-white/80'
          >
            Nouvelle notification non lue
          </motion.div>
          <ReplayButton onClick={highlight.replay} />
        </DemoBox>
      </div>
    );
  },
};

/* ═══════════════════════════════════════════════════
   8. PREMIUM
   ═══════════════════════════════════════════════════ */

export const Premium: Story = {
  name: '💎 Premium',
  render: () => {
    const splash = useReplay();
    const steps = useReplay();
    const markers = useReplay();
    const confetti = useReplay();

    return (
      <div className='flex flex-col gap-6 max-w-md'>
        <SectionTitle>Splash Logo</SectionTitle>
        <DemoBox>
          <motion.div
            key={`splash-${splash.key}`}
            variants={splashLogo}
            initial='hidden'
            animate='visible'
            className='w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto text-3xl'
          >
            🏠
          </motion.div>
          <ReplayButton onClick={splash.replay} />
        </DemoBox>

        <SectionTitle>Floating Illustration</SectionTitle>
        <DemoBox>
          <motion.div
            variants={floatingIllustration}
            animate='float'
            className='w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center mx-auto text-2xl'
          >
            🌿
          </motion.div>
        </DemoBox>

        <SectionTitle>Step Stagger (Activation)</SectionTitle>
        <DemoBox>
          <motion.div
            key={`steps-${steps.key}`}
            variants={stepStaggerContainer}
            initial='hidden'
            animate='visible'
            className='flex flex-col gap-2'
          >
            {['Connexion', 'Configuration', 'Personnalisation', 'Terminé'].map((label, i) => (
              <motion.div key={label} variants={stepStaggerItem} className='flex items-center gap-3'>
                <div className='w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xs text-blue-400 font-bold'>
                  {i + 1}
                </div>
                <span className='text-sm text-white/80'>{label}</span>
              </motion.div>
            ))}
          </motion.div>
          <ReplayButton onClick={steps.replay} />
        </DemoBox>

        <SectionTitle>Map Markers — Drop cascade</SectionTitle>
        <DemoBox>
          <motion.div
            key={`markers-${markers.key}`}
            variants={markerContainer}
            initial='hidden'
            animate='visible'
            className='flex gap-4 justify-center'
          >
            {['📍', '📍', '📍', '📍'].map((pin, i) => (
              <motion.div
                key={i}
                variants={markerDrop}
                className='w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-lg'
              >
                {pin}
              </motion.div>
            ))}
          </motion.div>
          <ReplayButton onClick={markers.replay} />
        </DemoBox>

        <SectionTitle>Confettis Celebration</SectionTitle>
        <DemoBox>
          <div className='relative h-32 overflow-hidden'>
            <motion.h2
              key={`conf-title-${confetti.key}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, ease: EASE_OUT }}
              className='text-center text-white font-semibold'
            >
              Félicitations ! 🎉
            </motion.h2>
            {Array.from({ length: 8 }, (_, i) => (
              <motion.div
                key={`c-${confetti.key}-${i}`}
                initial={{ y: -10, x: 30 + i * 35, opacity: 1, rotate: 0 }}
                animate={{ y: 140, opacity: 0, rotate: 360 }}
                transition={{ duration: DURATION_CINEMATIC, ease: EASE_OUT, delay: i * 0.05 }}
                className='absolute w-2.5 h-2.5 rounded-sm'
                style={{
                  backgroundColor: ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#a855f7', '#f97316', '#06b6d4', '#ec4899'][i],
                }}
              />
            ))}
          </div>
          <ReplayButton onClick={confetti.replay} />
        </DemoBox>
      </div>
    );
  },
};

/* ═══════════════════════════════════════════════════
   9. TOKENS REFERENCE
   ═══════════════════════════════════════════════════ */

export const TokensReference: Story = {
  name: '📋 Tokens Reference',
  render: () => {
    const easings = [
      { name: 'EASE_OUT', value: EASE_OUT, usage: 'Entrées' },
      { name: 'EASE_IN', value: EASE_IN, usage: 'Sorties' },
      { name: 'EASE_IN_OUT', value: EASE_IN_OUT, usage: 'Navigation pair' },
      { name: 'EASE_SINE', value: EASE_SINE, usage: 'Loops, spinners' },
    ];

    const durations = [
      { name: 'INSTANT', value: DURATION_INSTANT, usage: 'Tap feedback' },
      { name: 'MICRO', value: DURATION_MICRO, usage: 'Checkbox, toggle' },
      { name: 'FAST', value: DURATION_FAST, usage: 'Micro-interaction' },
      { name: 'NORMAL', value: DURATION_NORMAL, usage: 'Default' },
      { name: 'MEDIUM', value: DURATION_MEDIUM, usage: 'Navigation' },
      { name: 'SLOW', value: DURATION_SLOW, usage: 'Modal, sheet' },
      { name: 'ENTRANCE', value: DURATION_ENTRANCE, usage: 'Entrée clé' },
      { name: 'HERO', value: DURATION_HERO, usage: 'Splash, hero' },
      { name: 'CINEMATIC', value: DURATION_CINEMATIC, usage: 'Shared element' },
    ];

    return (
      <div className='flex flex-col gap-6 max-w-lg'>
        <SectionTitle>Easing Curves</SectionTitle>
        <div className='space-y-2'>
          {easings.map(e => (
            <div key={e.name} className='flex items-center gap-3'>
              <div className='overflow-hidden rounded h-6 flex-1 bg-white/5'>
                <motion.div
                  className='h-full bg-blue-500/50 rounded'
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.2, ease: e.value, repeat: Infinity, repeatType: 'reverse', repeatDelay: 0.5 }}
                />
              </div>
              <code className='text-xs text-white/50 w-28 shrink-0'>{e.name}</code>
              <span className='text-xs text-white/30 w-28 shrink-0'>{e.usage}</span>
            </div>
          ))}
        </div>

        <div className='mt-2'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='overflow-hidden rounded h-6 flex-1 bg-white/5'>
              <motion.div
                className='h-full w-6 bg-purple-500/50 rounded'
                initial={{ x: 0 }}
                animate={{ x: 200 }}
                transition={{ ...EASE_SPRING, repeat: Infinity, repeatType: 'reverse', repeatDelay: 0.5 }}
              />
            </div>
            <code className='text-xs text-white/50 w-28 shrink-0'>EASE_SPRING</code>
            <span className='text-xs text-white/30 w-28 shrink-0'>Micro, toggle</span>
          </div>
        </div>

        <SectionTitle>Duration Scale</SectionTitle>
        <div className='space-y-2'>
          {durations.map(d => (
            <div key={d.name} className='flex items-center gap-3'>
              <motion.div
                className='h-6 bg-emerald-500/40 rounded'
                style={{ width: `${d.value * 300}px` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: d.value, ease: EASE_OUT }}
              />
              <code className='text-xs text-white/50 w-24 shrink-0'>{d.value}s</code>
              <span className='text-xs text-white/30'>{d.usage}</span>
            </div>
          ))}
        </div>
      </div>
    );
  },
};
