import { useState, type ReactNode } from 'react';
import { Compass, Hand, LayoutGrid, Layers, Map as MapIcon, Palette, Play, Radio, Sparkles, ChevronRight } from 'lucide-react';
import { Sheet } from '@/components/ds/Sheet';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { startTour, type TourId } from './TourOverlay';
import { showReleaseNotes } from './ReleaseNotesModal';
import { EventsDoc } from './EventsDoc';
import { GesturesDoc } from './GesturesDoc';

const TOUR_SECTIONS: { id: TourId; Icon: typeof Compass }[] = [
  { id: 'basics', Icon: Compass },
  { id: 'widgets', Icon: LayoutGrid },
  { id: 'panels', Icon: Layers },
  { id: 'appearance', Icon: Palette },
  { id: 'floorplan', Icon: MapIcon },
];

/** Une rangée de l'aide, au gabarit des sections des Paramètres. */
const ROW = 'rounded-[var(--ds-radius-lg)] bg-[var(--ds-sheet-section)] p-4';

/** Pastille d'icône carrée, comme les apps du lanceur. */
function AppIcon({ Icon, color }: { Icon: typeof Compass; color: string }) {
  return (
    <span
      className='flex size-11 shrink-0 items-center justify-center rounded-[var(--ds-radius-sm)] text-white'
      style={{ background: color }}
    >
      <Icon size={20} />
    </span>
  );
}

function RowText({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <span className='min-w-0 flex-1'>
      <span className='block text-[17px] font-semibold'>{t(`help.sections.${id}.title`)}</span>
      <span className='mt-0.5 block text-sm leading-relaxed text-[var(--ds-ink-muted)]'>{t(`help.sections.${id}.body`)}</span>
    </span>
  );
}

/**
 * Rubrique documentaire, dépliable sur place.
 *
 * Certaines choses n'ont rien à mettre en avant à l'écran — un événement arrive
 * de Home Assistant, un geste n'existe que dans l'écran de veille. Une visite
 * guidée n'aurait rien à éclairer : c'est une doc, pas un parcours.
 */
function DocSection({ id, Icon, color, children }: { id: string; Icon: typeof Radio; color: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={ROW}>
      <button
        onClick={() => setOpen(v => !v)}
        data-testid={`help-${id}-toggle`}
        aria-expanded={open}
        className='flex w-full items-center gap-4 text-left'
      >
        <AppIcon Icon={Icon} color={color} />
        <RowText id={id} />
        <ChevronRight size={20} className={cn('shrink-0 text-[var(--ds-ink-muted)] transition-transform', open && 'rotate-90')} />
      </button>
      {open && <div className='mt-4'>{children}</div>}
    </div>
  );
}

/** Aide : une feuille sur le côté, comme Assist — les visites guidées et la doc. */
export function HelpModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();

  const launch = (id: TourId) => {
    // Fermer d'abord : le projecteur de la visite éclairerait sinon le dos de
    // cette feuille au lieu de l'élément visé.
    onClose();
    startTour(id);
  };

  return (
    <Sheet open onClose={onClose} title={t('help.title')} subtitle={t('help.subtitle')} closeLabel={t('common.close')}>
      <div data-testid='help-modal' className='flex flex-col gap-3'>
        {TOUR_SECTIONS.map(({ id, Icon }) => (
          <div key={id} className={ROW}>
            <div className='flex items-start gap-4'>
              <AppIcon Icon={Icon} color='var(--ds-tile-on)' />
              <div className='min-w-0 flex-1'>
                <RowText id={id} />
                <button
                  onClick={() => launch(id)}
                  data-testid={`help-launch-${id}`}
                  className='mt-3 flex h-11 items-center gap-2 rounded-full bg-[var(--ds-tile-on)] px-5 text-[15px] font-semibold text-[var(--ds-tile-on-ink)]'
                >
                  <Play size={16} /> {t('help.launch')}
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* ── Gestes de l'écran de veille ── */}
        <DocSection id='gestures' Icon={Hand} color='var(--ds-good)'>
          <GesturesDoc />
        </DocSection>

        {/* ── Événements Home Assistant ── */}
        <DocSection id='events' Icon={Radio} color='var(--ds-app-music)'>
          <EventsDoc />
        </DocSection>

        {/* ── Nouveautés ── */}
        <button
          onClick={() => {
            onClose();
            showReleaseNotes();
          }}
          data-testid='help-release-notes'
          className={cn(ROW, 'flex items-center gap-4 text-left')}
        >
          <AppIcon Icon={Sparkles} color='var(--ds-app-calendar)' />
          <RowText id='releaseNotes' />
          <ChevronRight size={20} className='shrink-0 text-[var(--ds-ink-muted)]' />
        </button>
      </div>
    </Sheet>
  );
}
