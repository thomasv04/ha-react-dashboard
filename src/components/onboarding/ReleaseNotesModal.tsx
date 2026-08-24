import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Play } from 'lucide-react';
import { DURATION_FAST } from '@/lib/motion-tokens';
import { useI18n } from '@/i18n';
import { RELEASE_NOTES } from '@/data/release-notes';
import { startTour, type TourId } from './TourOverlay';

const SEEN_VERSION_KEY = 'ha-dashboard-seen-version';

export const SHOW_RELEASE_NOTES_EVENT = 'ha-dashboard:show-release-notes';

/** Rouvrir les nouveautés à la demande (bouton de l'aide). */
export function showReleaseNotes() {
  window.dispatchEvent(new Event(SHOW_RELEASE_NOTES_EVENT));
}

function markSeen(version: string) {
  try {
    localStorage.setItem(SEEN_VERSION_KEY, version);
  } catch {
    // ignore
  }
}

function lastSeenVersion(): string | null {
  try {
    return localStorage.getItem(SEEN_VERSION_KEY);
  } catch {
    // Sans stockage, on considère la version vue : mieux vaut ne rien annoncer
    // que de rejouer l'annonce à chaque chargement.
    return RELEASE_NOTES[0]?.version ?? null;
  }
}

export function ReleaseNotesModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const note = RELEASE_NOTES[0];

  if (!note) return null;

  const close = () => {
    markSeen(note.version);
    onClose();
  };

  const launch = (tour: TourId) => {
    // Fermer d'abord : le projecteur de la visite éclairerait le dos de cette
    // fenêtre au lieu de l'élément visé.
    close();
    startTour(tour);
  };

  return (
    <>
      <motion.div
        data-overlay
        className='fixed inset-0 z-[60] bg-black/60'
        style={{ backdropFilter: 'blur(4px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
      />
      <motion.div
        className='fixed inset-0 z-[61] flex items-center justify-center pointer-events-none p-4'
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: DURATION_FAST }}
      >
        <div
          data-testid='release-notes-modal'
          className='gc-overlay pointer-events-auto w-full max-w-lg rounded-2xl overflow-hidden flex flex-col'
          style={{ maxHeight: 'min(85vh, 640px)' }}
        >
          <div className='flex items-start justify-between px-6 pt-5 pb-4 border-b border-white/8 flex-shrink-0'>
            <div className='min-w-0'>
              <div className='flex items-center gap-2'>
                <Sparkles size={15} className='text-blue-300 flex-shrink-0' />
                <h2 className='text-white font-semibold text-base truncate'>{note.title}</h2>
              </div>
              <p className='text-white/40 text-xs mt-1'>
                {t('releaseNotes.version', { version: note.version })} · {note.date}
              </p>
            </div>
            <button
              onClick={close}
              aria-label={t('common.close')}
              className='p-1.5 rounded-lg text-white/35 hover:text-white/70 hover:bg-white/10 transition-colors flex-shrink-0'
            >
              <X size={16} />
            </button>
          </div>

          <div className='flex-1 overflow-y-auto p-5 flex flex-col gap-3'>
            {note.items.map((item, i) => (
              <div key={i} className='rounded-xl bg-white/[0.04] border border-white/8 p-4'>
                <p className='text-white/70 text-sm leading-relaxed'>{item.text}</p>
                {item.image && <img src={item.image} alt='' className='mt-3 w-full rounded-lg border border-white/10' loading='lazy' />}
                {item.tour && (
                  <button
                    onClick={() => launch(item.tour!)}
                    data-testid={`release-tour-${item.tour}`}
                    className='mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 transition-colors text-xs font-semibold'
                  >
                    <Play size={11} /> {t('help.launch')}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className='px-5 py-4 border-t border-white/8 flex justify-end flex-shrink-0'>
            <button
              onClick={close}
              data-testid='release-notes-done'
              className='px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold transition-colors'
            >
              {t('releaseNotes.done')}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

/**
 * Affiche les nouveautés quand la version des notes diffère de celle déjà vue
 * sur cet appareil, puis à la demande.
 *
 * Le délai laisse la visite guidée passer devant au tout premier lancement :
 * annoncer des « nouveautés » à quelqu'un qui découvre l'outil n'a aucun sens.
 */
export function ReleaseNotesHost() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(SHOW_RELEASE_NOTES_EVENT, show);

    const latest = RELEASE_NOTES[0]?.version;
    const seen = lastSeenVersion();
    // Premier lancement (rien de vu) : c'est la visite guidée qui accueille.
    // On note la version pour ne pas annoncer une mise à jour jamais faite.
    if (latest && seen === null) markSeen(latest);
    const isUpdate = !!latest && seen !== null && seen !== latest;
    const timer = isUpdate ? window.setTimeout(show, 800) : undefined;

    return () => {
      window.removeEventListener(SHOW_RELEASE_NOTES_EVENT, show);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return <AnimatePresence>{open && <ReleaseNotesModal onClose={() => setOpen(false)} />}</AnimatePresence>;
}
