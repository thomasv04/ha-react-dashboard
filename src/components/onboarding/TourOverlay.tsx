import { useState, useLayoutEffect, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useUser } from '@hakit/core';
import { useEditMode } from '@/context/DashboardLayoutContext';

const TOUR_DONE_KEY = 'ha-dashboard-tour-done';

/** Ce qu'une étape peut demander à l'application avant de pointer son ancre. */
interface TourContext {
  setEditMode: (v: boolean) => void;
}

interface TourStep {
  /** Sélecteur de l'ancre. Une ancre jamais trouvée fait passer à la suivante. */
  anchor: string;
  /** Suffixe de la clé i18n : `tour.steps.<key>.title` / `.body`. */
  key: string;
  /** Met l'interface dans l'état où l'ancre existe (ouvrir le mode édition…). */
  setup?: (ctx: TourContext) => void;
  /**
   * Étape qui suppose le mode édition. Il est réservé aux administrateurs
   * (`EditButton` ne s'affiche pas pour les autres) : sans ce drapeau, la
   * visite l'ouvrait pour n'importe qui via son `setup`.
   */
  adminOnly?: boolean;
}

const enterEdit = (ctx: TourContext) => ctx.setEditMode(true);
const leaveEdit = (ctx: TourContext) => ctx.setEditMode(false);

export const TOURS: Record<string, TourStep[]> = {
  basics: [
    { anchor: '[data-tour="pages"]', key: 'pages' },
    { anchor: '[data-tour="edit"]', key: 'edit', adminOnly: true },
    { anchor: '[data-tour="add"]', key: 'add', setup: enterEdit, adminOnly: true },
    { anchor: '[data-tour="add-page"]', key: 'addPage', adminOnly: true },
    { anchor: '[data-tour="save"]', key: 'save', adminOnly: true },
    { anchor: '[data-tour="dock"]', key: 'dock' },
    { anchor: '[data-tour="settings"]', key: 'settings', setup: leaveEdit },
  ],
  widgets: [
    { anchor: '[data-tour="add"]', key: 'widgetsAdd', setup: enterEdit, adminOnly: true },
    { anchor: '[data-tour="pages"]', key: 'widgetsResize', adminOnly: true },
    { anchor: '[data-tour="save"]', key: 'widgetsSave', adminOnly: true },
  ],
  panels: [
    { anchor: '[data-tour="panels-button"]', key: 'panelsCreate', setup: enterEdit, adminOnly: true },
    { anchor: '[data-tour="dock"]', key: 'panelsDock', adminOnly: true },
    { anchor: '[data-tour="save"]', key: 'panelsSave', adminOnly: true },
  ],
  appearance: [
    { anchor: '[data-tour="settings"]', key: 'appearanceOpen', setup: leaveEdit },
    { anchor: '[data-tour="wallpanel"]', key: 'appearanceWallpanel', setup: enterEdit, adminOnly: true },
  ],
};

export type TourId = keyof typeof TOURS;

const PAD = 8;
const CARD_W = 300;
const CARD_H = 176;
/** Nombre de frames d'attente avant de déclarer une ancre absente. */
const MAX_FRAMES = 40;

export const START_TOUR_EVENT = 'ha-dashboard:start-tour';

/** Relancer un tour depuis n'importe où (bouton d'aide, réglages). */
export function startTour(id: TourId = 'basics') {
  window.dispatchEvent(new CustomEvent(START_TOUR_EVENT, { detail: id }));
}

export function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(TOUR_DONE_KEY) === 'true';
  } catch {
    return true; // pas de stockage → ne pas harceler à chaque chargement
  }
}

export function markTourSeen() {
  try {
    localStorage.setItem(TOUR_DONE_KEY, 'true');
  } catch {
    // ignore
  }
}

type Box = { top: number; left: number; width: number; height: number };

function measure(selector: string): Box | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/** Place la carte sous la cible, ou au-dessus si elle déborderait en bas. */
function cardPosition(box: Box): { top: number; left: number } {
  const below = box.top + box.height + PAD + 12;
  const fitsBelow = below + CARD_H < window.innerHeight;
  const top = fitsBelow ? below : Math.max(12, box.top - PAD - 12 - CARD_H);
  const left = Math.min(Math.max(12, box.left + box.width / 2 - CARD_W / 2), window.innerWidth - CARD_W - 12);
  return { top, left };
}

export function TourOverlay({ tourId, onClose }: { tourId: TourId; onClose: () => void }) {
  const { t } = useI18n();
  const { isEditMode, setEditMode } = useEditMode();
  const user = useUser();
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);

  // Un non-administrateur n'a pas de mode édition : les étapes qui en dépendent
  // sont retirées, sinon leur `setup` le lui ouvrirait.
  const isAdmin = !!user?.is_admin;
  const steps = (TOURS[tourId] ?? TOURS.basics).filter(s => isAdmin || !s.adminOnly);
  const step = steps[index];

  // Un tour qui a ouvert le mode édition le referme en partant — sauf si
  // l'utilisateur y était déjà avant de le lancer.
  const wasEditing = useRef(isEditMode);

  const finish = useCallback(() => {
    markTourSeen();
    if (!wasEditing.current) setEditMode(false);
    onClose();
  }, [onClose, setEditMode]);

  const next = useCallback(() => {
    setIndex(i => {
      if (i >= steps.length - 1) {
        finish();
        return i;
      }
      return i + 1;
    });
  }, [steps.length, finish]);

  // Chaque étape prépare l'interface puis attend que son ancre apparaisse :
  // `setup` déclenche un rendu, l'ancre n'existe pas encore à la frame courante.
  // Après MAX_FRAMES sans ancre, l'étape est sautée plutôt que de bloquer.
  useLayoutEffect(() => {
    if (!step) return;
    step.setup?.({ setEditMode });

    let raf = 0;
    let frames = 0;
    let cancelled = false;

    const poll = () => {
      if (cancelled) return;
      const m = measure(step.anchor);
      if (m) setBox(m);
      else if (frames++ < MAX_FRAMES) raf = requestAnimationFrame(poll);
      else next();
    };
    poll();

    // Une ancre mesurée une seule fois se désaligne au premier resize.
    const sync = () => {
      const m = measure(step.anchor);
      if (m) setBox(m);
    };
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync, true);
    };
  }, [step, next, setEditMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish, next]);

  if (!step || !box) return null;

  const card = cardPosition(box);
  const isLast = index === steps.length - 1;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key='tour'
        data-testid='tour-overlay'
        className='fixed inset-0 z-[200]'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        role='dialog'
        aria-modal='true'
        aria-label={t('tour.title')}
      >
        {/* Découpe : le trou est l'élément lui-même, l'assombrissement vient de
            l'ombre portée étalée — un seul nœud plutôt que quatre volets. */}
        <motion.div
          className='absolute rounded-2xl pointer-events-none'
          animate={{ top: box.top - PAD, left: box.left - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)', border: '2px solid rgba(255,255,255,0.55)' }}
        />

        {/* Capteur de clic : cliquer hors de la cible avance le tour. */}
        <div className='absolute inset-0' onClick={next} />

        <motion.div
          className='gc-overlay absolute rounded-2xl p-5'
          data-testid='tour-card'
          animate={{ top: card.top, left: card.left }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          style={{ width: CARD_W }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={finish}
            className='absolute top-3 right-3 p-1 rounded-lg text-white/35 hover:text-white/80 hover:bg-white/10 transition-colors'
            aria-label={t('common.close')}
          >
            <X size={14} />
          </button>

          <p className='text-[10px] font-semibold uppercase tracking-widest text-blue-300/70' data-testid='tour-progress'>
            {index + 1}/{steps.length}
          </p>
          <h3 className='mt-2 text-white font-semibold text-sm'>{t(`tour.steps.${step.key}.title`)}</h3>
          <p className='mt-1.5 text-white/55 text-xs leading-relaxed'>{t(`tour.steps.${step.key}.body`)}</p>

          <div className='mt-4 flex items-center gap-2'>
            <button onClick={finish} className='text-white/35 hover:text-white/70 text-xs transition-colors'>
              {t('tour.skip')}
            </button>
            <div className='flex-1' />
            {index > 0 && (
              <button
                onClick={() => setIndex(i => i - 1)}
                className='px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors'
              >
                {t('tour.previous')}
              </button>
            )}
            <button
              onClick={next}
              data-testid='tour-next'
              className='px-3.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold transition-colors'
            >
              {isLast ? t('tour.done') : t('tour.next')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

/**
 * Monte le tour : automatiquement au premier lancement, puis à la demande.
 * Le délai laisse le dashboard peindre — les ancres n'existent pas avant.
 */
export function TourHost() {
  const [active, setActive] = useState<TourId | null>(null);

  useEffect(() => {
    const start = (e: Event) => setActive(((e as CustomEvent).detail as TourId) ?? 'basics');
    window.addEventListener(START_TOUR_EVENT, start);
    const timer = hasSeenTour() ? undefined : window.setTimeout(() => setActive('basics'), 1200);
    return () => {
      window.removeEventListener(START_TOUR_EVENT, start);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // `key` : relancer un tour depuis le début même s'il tourne déjà.
  return active ? <TourOverlay key={active} tourId={active} onClose={() => setActive(null)} /> : null;
}
