import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X, Compass, Hand, LayoutGrid, Layers, Palette, Play, Radio, Sparkles, ChevronRight } from 'lucide-react';
import { DURATION_FAST } from '@/lib/motion-tokens';
import { useI18n } from '@/i18n';
import { startTour, type TourId } from './TourOverlay';
import { showReleaseNotes } from './ReleaseNotesModal';
import { EventsDoc } from './EventsDoc';
import { GesturesDoc } from './GesturesDoc';

const TOUR_SECTIONS: { id: TourId; Icon: typeof Compass }[] = [
  { id: 'basics', Icon: Compass },
  { id: 'widgets', Icon: LayoutGrid },
  { id: 'panels', Icon: Layers },
  { id: 'appearance', Icon: Palette },
];

/**
 * Rubrique documentaire, dépliable sur place.
 *
 * Certaines choses n'ont rien à mettre en avant à l'écran — un événement arrive
 * de Home Assistant, un geste n'existe que dans l'écran de veille. Une visite
 * guidée n'aurait rien à éclairer : c'est une doc, pas un parcours.
 */
function DocSection({ id, Icon, tint, children }: { id: string; Icon: typeof Radio; tint: string; children: ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className='rounded-xl bg-white/[0.04] border border-white/8 p-4'>
      <button
        onClick={() => setOpen(v => !v)}
        data-testid={`help-${id}-toggle`}
        aria-expanded={open}
        className='flex items-start gap-3 w-full text-left'
      >
        <div className={`p-2 rounded-lg flex-shrink-0 ${tint}`}>
          <Icon size={15} />
        </div>
        <div className='min-w-0 flex-1'>
          <h3 className='text-white text-sm font-semibold'>{t(`help.sections.${id}.title`)}</h3>
          <p className='text-white/45 text-xs mt-1 leading-relaxed'>{t(`help.sections.${id}.body`)}</p>
        </div>
        <ChevronRight size={15} className={`text-white/30 flex-shrink-0 mt-2 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <div className='mt-4'>{children}</div>}
    </div>
  );
}

export function HelpModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();

  const launch = (id: TourId) => {
    // Fermer d'abord : le projecteur de la visite éclairerait sinon le dos de
    // cette modale au lieu de l'élément visé.
    onClose();
    startTour(id);
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
        onClick={onClose}
      />
      <motion.div
        className='fixed inset-0 z-[61] flex items-center justify-center pointer-events-none p-4'
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: DURATION_FAST }}
      >
        <div
          data-testid='help-modal'
          className='gc-overlay pointer-events-auto w-full max-w-lg rounded-2xl overflow-hidden flex flex-col'
          style={{ maxHeight: 'min(85vh, 660px)' }}
        >
          <div className='flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/8 flex-shrink-0'>
            <div>
              <h2 className='text-white font-semibold text-base'>{t('help.title')}</h2>
              <p className='text-white/40 text-xs mt-0.5'>{t('help.subtitle')}</p>
            </div>
            <button
              onClick={onClose}
              aria-label={t('common.close')}
              className='p-1.5 rounded-lg text-white/35 hover:text-white/70 hover:bg-white/10 transition-colors'
            >
              <X size={16} />
            </button>
          </div>

          <div className='flex-1 overflow-y-auto p-4 flex flex-col gap-2'>
            {TOUR_SECTIONS.map(({ id, Icon }) => (
              <div key={id} className='rounded-xl bg-white/[0.04] border border-white/8 p-4'>
                <div className='flex items-start gap-3'>
                  <div className='p-2 rounded-lg bg-blue-500/15 text-blue-300 flex-shrink-0'>
                    <Icon size={15} />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <h3 className='text-white text-sm font-semibold'>{t(`help.sections.${id}.title`)}</h3>
                    <p className='text-white/45 text-xs mt-1 leading-relaxed'>{t(`help.sections.${id}.body`)}</p>
                    <button
                      onClick={() => launch(id)}
                      data-testid={`help-launch-${id}`}
                      className='mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 transition-colors text-xs font-semibold'
                    >
                      <Play size={11} /> {t('help.launch')}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* ── Gestes de l'écran de veille ── */}
            <DocSection id='gestures' Icon={Hand} tint='bg-teal-500/15 text-teal-300'>
              <GesturesDoc />
            </DocSection>

            {/* ── Événements Home Assistant ── */}
            <DocSection id='events' Icon={Radio} tint='bg-violet-500/15 text-violet-300'>
              <EventsDoc />
            </DocSection>

            {/* ── Nouveautés ── */}
            <button
              onClick={() => {
                onClose();
                showReleaseNotes();
              }}
              data-testid='help-release-notes'
              className='rounded-xl bg-white/[0.04] border border-white/8 p-4 flex items-start gap-3 text-left hover:bg-white/[0.07] transition-colors'
            >
              <div className='p-2 rounded-lg bg-amber-500/15 text-amber-300 flex-shrink-0'>
                <Sparkles size={15} />
              </div>
              <div className='min-w-0 flex-1'>
                <h3 className='text-white text-sm font-semibold'>{t('help.sections.releaseNotes.title')}</h3>
                <p className='text-white/45 text-xs mt-1 leading-relaxed'>{t('help.sections.releaseNotes.body')}</p>
              </div>
              <ChevronRight size={15} className='text-white/30 flex-shrink-0 mt-2' />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
