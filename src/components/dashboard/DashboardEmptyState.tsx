import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Rocket } from 'lucide-react';
import { DURATION_HERO } from '@/lib/motion-tokens';
import { useEditMode } from '@/context/DashboardLayoutContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { AddWidgetModal } from '@/components/layout/AddWidgetModal';
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from '@/components/layout/ThemeControlsModal/controls';
import { START_ONBOARDING_EVENT } from '@/components/onboarding/Onboarding';
import { useI18n } from '@/i18n';

/**
 * Les tuiles fantômes : la page telle qu'elle sera, en creux. Largeur et
 * hauteur en cases, comme la vraie grille.
 */
const GHOSTS = [
  { w: 2, h: 2 },
  { w: 1, h: 1 },
  { w: 1, h: 1 },
  { w: 2, h: 1 },
];

/** Une page sans tuile : ce qu'elle deviendra, et les deux façons d'y arriver. */
export function DashboardEmptyState() {
  const { t } = useI18n();
  const isAdmin = useIsAdmin();
  const { setEditMode } = useEditMode();
  const [showAddModal, setShowAddModal] = useState(false);

  const addWidget = () => {
    setEditMode(true);
    setShowAddModal(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATION_HERO, ease: 'easeOut' }}
        data-testid='empty-state'
        className='flex min-h-[calc(100svh-14rem)] flex-col items-center justify-center gap-8 px-4 text-center'
      >
        <div className='grid grid-cols-3 grid-rows-2 gap-3' style={{ gridAutoFlow: 'dense' }} aria-hidden='true'>
          {GHOSTS.map((g, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * i }}
              className='rounded-[var(--ds-radius-lg)] border-2 border-dashed border-[var(--ds-surface-3)] bg-[var(--ds-surface-2)]'
              style={{ gridColumn: `span ${g.w}`, gridRow: `span ${g.h}`, minWidth: g.w * 72, minHeight: g.h * 72 }}
            />
          ))}
        </div>

        <div className='flex max-w-xl flex-col gap-3'>
          <h2 className='font-[family-name:var(--ds-font-display)] text-[32px] font-extrabold leading-tight text-[var(--ds-ink)]'>
            {t('dashboard.emptyState.title')}
          </h2>
          <p className='text-lg leading-relaxed text-[var(--ds-ink-muted)]'>
            {isAdmin ? t('dashboard.emptyState.subtitle') : t('dashboard.emptyState.viewer')}
          </p>
        </div>

        {isAdmin && (
          <div className='flex flex-wrap justify-center gap-3'>
            <button onClick={addWidget} className={BUTTON_PRIMARY}>
              <Plus size={20} /> {t('dashboard.addWidget')}
            </button>
            <button onClick={() => window.dispatchEvent(new Event(START_ONBOARDING_EVENT))} className={BUTTON_SECONDARY}>
              <Rocket size={20} /> {t('dashboard.emptyState.fromRooms')}
            </button>
          </div>
        )}
      </motion.div>

      <AnimatePresence>{showAddModal && <AddWidgetModal onClose={() => setShowAddModal(false)} />}</AnimatePresence>
    </>
  );
}
