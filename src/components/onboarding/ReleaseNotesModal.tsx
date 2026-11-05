import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Play } from 'lucide-react';
import { Sheet } from '@/components/ds/Sheet';
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

  // Une feuille sur le côté, comme l'aide et Assist.
  return (
    <Sheet
      open
      onClose={close}
      title={note.title}
      subtitle={`${t('releaseNotes.version', { version: note.version })} · ${note.date}`}
      closeLabel={t('common.close')}
    >
      <div data-testid='release-notes-modal' className='flex flex-col gap-3'>
        {note.items.map((item, i) => (
          <div key={i} className='rounded-[var(--ds-radius-lg)] bg-[var(--ds-sheet-section)] p-4'>
            <p className='text-base leading-relaxed'>{item.text}</p>
            {item.image && <img src={item.image} alt='' className='mt-3 w-full rounded-[var(--ds-radius-md)]' loading='lazy' />}
            {item.tour && (
              <button
                onClick={() => launch(item.tour!)}
                data-testid={`release-tour-${item.tour}`}
                className='mt-3 flex h-11 items-center gap-2 rounded-full bg-[var(--ds-tile-on)] px-5 text-[15px] font-semibold text-[var(--ds-tile-on-ink)]'
              >
                <Play size={16} /> {t('help.launch')}
              </button>
            )}
          </div>
        ))}

        <button
          onClick={close}
          data-testid='release-notes-done'
          className='mt-1 h-12 rounded-full bg-[var(--ds-tile-on)] text-base font-bold text-[var(--ds-tile-on-ink)]'
        >
          {t('releaseNotes.done')}
        </button>
      </div>
    </Sheet>
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
