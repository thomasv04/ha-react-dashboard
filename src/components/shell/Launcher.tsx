import { useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@hakit/core';
import { Compass, Layers, LayoutGrid, Pin, PinOff, Settings, Sparkles, X, type LucideIcon } from 'lucide-react';
import { usePages } from '@/context/PageContext';
import { useCustomPanels } from '@/context/CustomPanelContext';
import { usePanel } from '@/context/PanelContext';
import { useEditMode } from '@/context/DashboardLayoutContext';
import { resolveIcon, useIconCatalog } from '@/lib/lucide-icon-map';
import { DURATION_FAST } from '@/lib/motion-tokens';
import { START_TOUR_EVENT } from '@/components/onboarding/TourOverlay';
import { SHOW_RELEASE_NOTES_EVENT } from '@/components/onboarding/ReleaseNotesModal';
import { CustomPanelEditorModal } from '@/components/custom-panels';
import { ThemeControlsModal } from '@/components/layout/ThemeControlsModal';
import { cn } from '@/lib/utils';
import { pageIcon, sortPages } from './page-icon';
import { useI18n } from '@/i18n';

type Dialog = 'settings' | 'panels' | null;

/**
 * Lanceur d'apps : une feuille qui recouvre l'écran, les pages en favoris à
 * gauche, les panneaux et les outils à droite. C'est aussi la seule porte vers
 * les réglages — la barre du haut ne garde que le bouton qui l'ouvre.
 */
export function Launcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  useIconCatalog();
  const { t } = useI18n();
  const isAdmin = !!useUser()?.is_admin;
  const { pages, setCurrentPage } = usePages();
  const { panels, dock, setDock } = useCustomPanels();
  const { openPanel } = usePanel();
  const { isEditMode } = useEditMode();
  const [dialog, setDialog] = useState<Dialog>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const sorted = sortPages(pages);
  const togglePin = (id: string) =>
    setDock({ ...dock, panels: dock.panels.includes(id) ? dock.panels.filter(p => p !== id) : [...dock.panels, id] });

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
                {sorted.map(page => {
                  const Icon = pageIcon(page);
                  return (
                    <LauncherItem key={page.id} Icon={Icon} color='var(--ds-app-home)' onClick={run(() => setCurrentPage(page.id))}>
                      {page.label}
                    </LauncherItem>
                  );
                })}
              </section>

              <section className='flex-1 overflow-y-auto p-7'>
                <h2 className='sr-only'>{t('layout.shell.apps')}</h2>
                <div className='grid gap-x-10 sm:grid-cols-2'>
                  {panels.map(panel => {
                    const pinned = dock.panels.includes(panel.id);
                    return (
                      <div key={panel.id} className='flex items-center gap-2'>
                        <LauncherItem
                          Icon={resolveIcon(panel.icon) ?? LayoutGrid}
                          color='var(--ds-accent)'
                          onClick={run(() => openPanel(`custom:${panel.id}`))}
                        >
                          {panel.name}
                        </LauncherItem>
                        {/* Épingler au rail : réglage de la disposition, comme le dock d'avant. */}
                        {isEditMode && (
                          <button
                            onClick={() => togglePin(panel.id)}
                            title={pinned ? t('layout.shell.unpinFromRail') : t('layout.shell.pinToRail')}
                            aria-label={pinned ? t('layout.shell.unpinFromRail') : t('layout.shell.pinToRail')}
                            aria-pressed={pinned}
                            className='flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-black/15'
                          >
                            {pinned ? <PinOff size={18} /> : <Pin size={18} />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {panels.length === 0 && <p className='py-4 text-[var(--ds-ink-muted)]'>{t('layout.shell.noPanels')}</p>}

                  <LauncherItem Icon={Settings} color='var(--ds-control)' onClick={run(() => setDialog('settings'))}>
                    {t('layout.shell.settings')}
                  </LauncherItem>
                  {isAdmin && (
                    <LauncherItem Icon={Layers} color='var(--ds-app-music)' onClick={run(() => setDialog('panels'))} tour='panels-button'>
                      {t('layout.shell.customPanels')}
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

              <button
                onClick={onClose}
                title={t('layout.shell.closeLauncher')}
                aria-label={t('layout.shell.closeLauncher')}
                className='absolute right-5 top-5 flex size-11 items-center justify-center rounded-full hover:bg-black/15'
              >
                <X size={22} />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ThemeControlsModal open={dialog === 'settings'} onClose={() => setDialog(null)} />
      <AnimatePresence>{dialog === 'panels' && <CustomPanelEditorModal onClose={() => setDialog(null)} />}</AnimatePresence>
    </>
  );
}

function LauncherItem({
  Icon,
  color,
  onClick,
  tour,
  children,
}: {
  Icon: LucideIcon;
  color: string;
  onClick: () => void;
  tour?: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      data-tour={tour}
      className={cn('flex min-h-[62px] flex-1 items-center gap-4 rounded-2xl px-2 text-left text-xl font-semibold hover:bg-black/10')}
    >
      <span
        className='flex size-11 shrink-0 items-center justify-center rounded-[var(--ds-radius-sm)] text-white'
        style={{ background: color }}
      >
        <Icon size={22} />
      </span>
      <span className='truncate'>{children}</span>
    </button>
  );
}
