import { useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import {
  ChevronRight,
  Compass,
  Layers,
  LayoutGrid,
  MessageCircle,
  Music,
  Settings,
  Sparkles,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useHass, useUser } from '@hakit/core';
import { useIsPhone } from '@/hooks/useIsMobile';
import { useMoreInfo } from '@/context/MoreInfoContext';
import { pickMassPlayer, rememberedPlayer } from '@/lib/music-assistant';
import { usePages } from '@/context/PageContext';
import { useCustomPanels } from '@/context/CustomPanelContext';
import { usePanel } from '@/context/PanelContext';
import { resolveIcon, useIconCatalog } from '@/lib/lucide-icon-map';
import { DURATION_FAST } from '@/lib/motion-tokens';
import { START_TOUR_EVENT } from '@/components/onboarding/TourOverlay';
import { SHOW_RELEASE_NOTES_EVENT } from '@/components/onboarding/ReleaseNotesModal';
import { CustomPanelEditorModal } from '@/components/custom-panels';
import { AssistSheet } from '@/components/assist/AssistSheet';
import { DevToolsSheet } from '@/components/devtools/DevToolsSheet';
import { AddWidgetModal } from '@/components/layout/AddWidgetModal';
import { ThemeControlsModal } from '@/components/layout/ThemeControlsModal';
import { cn } from '@/lib/utils';
import { pageColor, pageIcon, sortPages } from './page-icon';
import { useI18n } from '@/i18n';

type Dialog = 'settings' | 'panels' | 'gallery' | 'assist' | 'devtools' | null;

/**
 * Lanceur d'apps : une feuille qui recouvre l'écran, les pages en favoris à
 * gauche, les panneaux et les outils à droite. C'est aussi la seule porte vers
 * les réglages — la barre du haut ne garde que le bouton qui l'ouvre.
 */
export function Launcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  useIconCatalog();
  const { t } = useI18n();
  const isAdmin = useIsAdmin();
  const { pages, setCurrentPage } = usePages();
  const { panels } = useCustomPanels();
  const { openPanel } = usePanel();
  const { openMoreInfo } = useMoreInfo();
  // L'appli Musique s'ouvre sur le lecteur Music Assistant qui joue ; sans MA, pas d'entrée.
  const musicPlayer = useHass(s => pickMassPlayer(s.entities, rememberedPlayer()));
  const [dialog, setDialog] = useState<Dialog>(null);
  // Téléphone (maquette « Menu ») : un écran plein, une seule liste. Les pages ont la pilule,
  // Musique et Assist leurs boutons ; l'édition et la visite guidée restent sur la tablette.
  const phone = useIsPhone();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const sorted = sortPages(pages);

  /** Ferme la feuille avant d'agir : l'action ouvre un écran qui la remplace. */
  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key='launcher-backdrop'
              data-overlay
              className='fixed inset-0 z-[60] bg-black/50'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            {phone ? (
              <motion.div
                key='launcher'
                role='dialog'
                aria-modal='true'
                aria-label={t('layout.phone.menu')}
                className='fixed inset-0 z-[61] flex flex-col gap-5 overflow-y-auto bg-[var(--ds-ground)] px-4 pb-8 pt-[calc(env(safe-area-inset-top)+16px)] text-[var(--ds-ink)]'
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: DURATION_FAST }}
              >
                <div className='flex h-11 shrink-0 items-center gap-3'>
                  <button
                    onClick={onClose}
                    aria-label={t('layout.shell.closeLauncher')}
                    title={t('layout.shell.closeLauncher')}
                    className='flex size-11 items-center justify-center rounded-full bg-[var(--ds-surface-2)]'
                  >
                    <X size={20} aria-hidden='true' />
                  </button>
                  <h1 className='text-[22px] font-bold'>{t('layout.phone.menu')}</h1>
                </div>
                <PhoneUserCard onClick={run(() => setDialog('settings'))} />
                <div className='flex flex-col'>
                  {panels.map(panel => (
                    <LauncherItem
                      key={panel.id}
                      phone
                      Icon={resolveIcon(panel.icon) ?? LayoutGrid}
                      color='var(--ds-accent)'
                      onClick={run(() => openPanel(`custom:${panel.id}`))}
                    >
                      {panel.name}
                    </LauncherItem>
                  ))}
                  <LauncherItem phone Icon={Settings} color='var(--ds-control)' onClick={run(() => setDialog('settings'))}>
                    {t('layout.shell.settings')}
                  </LauncherItem>
                  <LauncherItem
                    phone
                    Icon={Sparkles}
                    color='var(--ds-app-calendar)'
                    onClick={run(() => window.dispatchEvent(new Event(SHOW_RELEASE_NOTES_EVENT)))}
                  >
                    {t('layout.shell.releaseNotes')}
                  </LauncherItem>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key='launcher'
                role='dialog'
                aria-modal='true'
                aria-label={t('layout.shell.apps')}
                className='fixed z-[61] left-4 right-4 top-[104px] sm:left-[60px] sm:right-auto sm:w-[min(1240px,calc(100vw-120px))] max-h-[calc(100dvh-140px)] flex flex-col sm:flex-row overflow-hidden rounded-[36px] bg-[var(--ds-sheet)] text-[var(--ds-ink)] shadow-[var(--ds-shadow-sheet)]'
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: DURATION_FAST }}
              >
                <section className='sm:w-[340px] shrink-0 overflow-y-auto bg-black/15 p-7 flex flex-col gap-1'>
                  <h2 className='mb-3 text-2xl font-semibold'>{t('layout.shell.favorites')}</h2>
                  {sorted.map((page, index) => {
                    const Icon = pageIcon(page);
                    return (
                      <LauncherItem
                        key={page.id}
                        Icon={Icon}
                        color={page.color || pageColor(index)}
                        onClick={run(() => setCurrentPage(page.id))}
                      >
                        {page.label}
                      </LauncherItem>
                    );
                  })}
                </section>

                <section className='flex-1 overflow-y-auto p-7'>
                  <h2 className='sr-only'>{t('layout.shell.apps')}</h2>
                  <div className='grid gap-x-10 sm:grid-cols-2'>
                    {panels.map(panel => (
                      <LauncherItem
                        key={panel.id}
                        Icon={resolveIcon(panel.icon) ?? LayoutGrid}
                        color='var(--ds-accent)'
                        onClick={run(() => openPanel(`custom:${panel.id}`))}
                      >
                        {panel.name}
                      </LauncherItem>
                    ))}
                    {panels.length === 0 && <p className='py-4 text-[var(--ds-ink-muted)]'>{t('layout.shell.noPanels')}</p>}

                    {musicPlayer && (
                      <LauncherItem
                        Icon={Music}
                        color='var(--ds-app-music)'
                        onClick={run(() => openMoreInfo('music', 'music', musicPlayer))}
                      >
                        {t('layout.shell.music')}
                      </LauncherItem>
                    )}
                    <LauncherItem Icon={MessageCircle} color='var(--ds-app-photo)' onClick={run(() => setDialog('assist'))}>
                      {t('layout.shell.assist')}
                    </LauncherItem>
                    {isAdmin && (
                      <LauncherItem Icon={LayoutGrid} color='var(--ds-app-home)' onClick={run(() => setDialog('gallery'))}>
                        {t('layout.shell.widgetGallery')}
                      </LauncherItem>
                    )}
                    <LauncherItem Icon={Settings} color='var(--ds-control)' onClick={run(() => setDialog('settings'))}>
                      {t('layout.shell.settings')}
                    </LauncherItem>
                    {isAdmin && (
                      <LauncherItem Icon={Layers} color='var(--ds-app-music)' onClick={run(() => setDialog('panels'))} tour='panels-button'>
                        {t('layout.shell.customPanels')}
                      </LauncherItem>
                    )}
                    {isAdmin && (
                      <LauncherItem Icon={Wrench} color='var(--ds-app-tv)' onClick={run(() => setDialog('devtools'))}>
                        {t('layout.shell.devTools')}
                      </LauncherItem>
                    )}
                    <LauncherItem
                      Icon={Compass}
                      color='var(--ds-good)'
                      onClick={run(() => window.dispatchEvent(new Event(START_TOUR_EVENT)))}
                    >
                      {t('layout.shell.tour')}
                    </LauncherItem>
                    <LauncherItem
                      Icon={Sparkles}
                      color='var(--ds-app-calendar)'
                      onClick={run(() => window.dispatchEvent(new Event(SHOW_RELEASE_NOTES_EVENT)))}
                    >
                      {t('layout.shell.releaseNotes')}
                    </LauncherItem>
                  </div>
                </section>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      <AssistSheet open={dialog === 'assist'} onClose={() => setDialog(null)} />
      {isAdmin && <DevToolsSheet open={dialog === 'devtools'} onClose={() => setDialog(null)} />}
      <ThemeControlsModal open={dialog === 'settings'} onClose={() => setDialog(null)} />
      <AnimatePresence>{dialog === 'gallery' && <AddWidgetModal onClose={() => setDialog(null)} />}</AnimatePresence>
      <AnimatePresence>{dialog === 'panels' && <CustomPanelEditorModal onClose={() => setDialog(null)} />}</AnimatePresence>
    </>
  );
}

/** La carte de l'utilisateur en tête du menu du téléphone : son initiale, son nom, la maison. */
function PhoneUserCard({ onClick }: { onClick: () => void }) {
  const user = useUser();
  const home = useHass(s => (s.config as { location_name?: string } | undefined)?.location_name);
  if (!user?.name) return null;
  return (
    <button
      onClick={onClick}
      className='flex h-[72px] shrink-0 items-center gap-3.5 rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] px-4 text-left'
    >
      <span className='flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)] text-xl font-bold'>
        {user.name.charAt(0).toUpperCase()}
      </span>
      <span className='min-w-0 flex-1'>
        <span className='block truncate text-[17px] font-bold'>{user.name}</span>
        {home && <span className='block truncate text-sm text-[var(--ds-ink-muted)]'>{home}</span>}
      </span>
      <ChevronRight size={20} aria-hidden='true' className='shrink-0 text-[var(--ds-ink-muted)]' />
    </button>
  );
}

function LauncherItem({
  Icon,
  color,
  onClick,
  tour,
  phone = false,
  children,
}: {
  Icon: LucideIcon;
  color: string;
  onClick: () => void;
  tour?: string;
  /** La ligne du menu du téléphone : plus basse, sans survol. */
  phone?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      data-tour={tour}
      className={cn(
        'flex flex-1 items-center gap-4 text-left font-semibold',
        phone ? 'min-h-[58px] text-lg' : 'min-h-[62px] rounded-2xl px-2 text-xl hover:bg-black/10'
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center text-white',
          phone ? 'size-10 rounded-[13px]' : 'size-11 rounded-[var(--ds-radius-sm)]'
        )}
        style={{ background: color }}
      >
        <Icon size={phone ? 20 : 22} />
      </span>
      <span className='truncate'>{children}</span>
    </button>
  );
}
