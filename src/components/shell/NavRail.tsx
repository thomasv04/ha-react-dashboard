import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, ChevronUp, Home, Layers, LayoutGrid, Map as MapIcon, Plus, Settings, X, type LucideIcon } from 'lucide-react';
import { usePages } from '@/context/PageContext';
import { CustomPanelEditorModal } from '@/components/custom-panels';
import { useEditMode } from '@/context/DashboardLayoutContext';
import { useCustomPanels } from '@/context/CustomPanelContext';
import { usePanel, type PanelId } from '@/context/PanelContext';
import { resolveIcon, useIconCatalog } from '@/lib/lucide-icon-map';
import { cn } from '@/lib/utils';
import { pageColor, pageIcon, sortPages } from './page-icon';
import { useI18n } from '@/i18n';
import { useHass } from '@hakit/core';
import type { CustomPanel } from '@/types/custom-panel';
import { railStatus } from './rail-status';

// 48 px + 6 px de marge de chaque côté : la pilule fait 60 px, la largeur du
// bouton des apps, et le rail tombe pile sous lui.
const RAIL_BUTTON = 'flex size-12 shrink-0 items-center justify-center rounded-[var(--ds-radius-md)] transition-colors';

/**
 * Rail de navigation à gauche : la première page (l'accueil) en tête, les
 * autres pages dans la pilule, puis les panneaux épinglés. En mode édition,
 * les pages s'ajoutent, se déplacent et se suppriment depuis le rail.
 */
export function NavRail() {
  // Les icônes hors du noyau arrivent avec le catalogue complet, chargé à la
  // demande : sans cet abonnement elles resteraient sur leur icône de repli.
  useIconCatalog();
  const { t } = useI18n();
  const { pages, currentPageId, setCurrentPage, addPage, deletePage, reorderPages } = usePages();
  const { isEditMode } = useEditMode();
  const { panels, dock, setDock } = useCustomPanels();
  const { activePanel, openPanel, closePanel } = usePanel();
  const [modalsMenu, setModalsMenu] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const menuOpen = modalsMenu && isEditMode;

  // Hauteur du milieu de l'entrée ouverte, mesurée dans le `<nav>` : suit le
  // défilement de la pilule et l'ajout de pages.
  const navRef = useRef<HTMLElement>(null);
  const [barTop, setBarTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active) return setBarTop(null);
      const a = active.getBoundingClientRect();
      setBarTop(a.top - nav.getBoundingClientRect().top + a.height / 2);
    };
    measure();
    const pill = nav.querySelector('[data-tour="pages"]');
    pill?.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);
    return () => {
      pill?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [currentPageId, pages.length, isEditMode]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setModalsMenu(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const togglePin = (id: string) =>
    setDock({ ...dock, panels: dock.panels.includes(id) ? dock.panels.filter(p => p !== id) : [...dock.panels, id] });

  const sorted = sortPages(pages);
  const [home, ...others] = sorted;
  // Un panneau supprimé disparaît du rail sans laisser de trou.
  const pinned = dock.panels.map(id => panels.find(p => p.id === id)).filter((p): p is (typeof panels)[number] => !!p);

  /** L'ordre compte : la première page est celle qui s'ouvre et où ramène l'inactivité. */
  const movePage = (id: string, step: -1 | 1) => {
    const ids = sorted.map(p => p.id);
    const i = ids.indexOf(id);
    const j = i + step;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderPages(ids);
  };

  if (!home) return null;

  return (
    <>
      <nav
        aria-label={t('layout.shell.pages')}
        className={cn(
          'fixed z-40 flex items-center gap-3',
          // Tablette : colonne à gauche. Téléphone : bande en bas, la largeur manque.
          'left-6 sm:left-10 top-[112px] flex-col',
          'max-sm:top-auto max-sm:bottom-3 max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:flex-row'
        )}
        ref={navRef}
      >
        {/* Le trait de la page ouverte, à gauche du rail, comme sur l'Echo Show.
            Posé sur le `<nav>` et non dans la pilule : celle-ci défile, et
            rognait tout ce qui dépassait d'elle — le trait n'apparaissait jamais. */}
        {barTop !== null && (
          <span
            aria-hidden='true'
            data-rail-bar
            className='absolute -left-[18px] h-12 w-1.5 rounded-full bg-[var(--ds-accent)] transition-[top] duration-300 max-sm:hidden'
            style={{ top: barTop - 24 }}
          />
        )}
        <button
          onClick={() => setCurrentPage(home.id)}
          title={home.label || t('layout.shell.home')}
          aria-label={home.label || t('layout.shell.home')}
          aria-current={home.id === currentPageId ? 'page' : undefined}
          className={cn(RAIL_BUTTON, 'size-[60px] bg-[var(--ds-home)] text-[var(--ds-home-ink)]')}
        >
          <Home size={26} />
        </button>

        <div
          data-tour='pages'
          className='flex max-h-[calc(100dvh-220px)] gap-2 overflow-auto scrollbar-none rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-1)] p-1.5 sm:flex-col max-sm:max-w-[calc(100vw-110px)]'
        >
          {others.map((page, index) => {
            const isActive = page.id === currentPageId;
            const Icon = pageIcon(page);
            return (
              <div key={page.id} className='relative'>
                <button
                  onClick={() => setCurrentPage(page.id)}
                  title={page.label}
                  aria-label={page.label}
                  aria-current={isActive ? 'page' : undefined}
                  // Une pastille de couleur par page, comme les apps du lanceur ; la page ouverte est cerclée.
                  style={{ background: pageColor(index + 1) }}
                  className={cn(RAIL_BUTTON, 'text-white', isActive && 'outline-[3px] outline-offset-2 outline-[var(--ds-ink)]')}
                >
                  <Icon size={22} />
                </button>

                {/* Actions de la page active : sur toutes, elles hérisseraient le rail. */}
                {isEditMode && isActive && (
                  <div className='absolute left-full top-1/2 ml-3 flex -translate-y-1/2 gap-1 rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)] p-1 max-sm:left-1/2 max-sm:top-auto max-sm:bottom-full max-sm:ml-0 max-sm:mb-3 max-sm:-translate-x-1/2 max-sm:translate-y-0'>
                    {index > 0 && (
                      <RailAction label={t('layout.shell.movePageUp')} onClick={() => movePage(page.id, -1)} Icon={ChevronUp} />
                    )}
                    {index < others.length - 1 && (
                      <RailAction label={t('layout.shell.movePageDown')} onClick={() => movePage(page.id, 1)} Icon={ChevronDown} />
                    )}
                    {page.id !== 'home' && (
                      <RailAction label={t('layout.shell.deletePage')} onClick={() => deletePage(page.id)} Icon={X} danger />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {pinned.length > 0 && others.length > 0 && (
            <div aria-hidden='true' className='mx-auto h-px w-8 bg-[var(--ds-surface-3)] max-sm:h-8 max-sm:w-px max-sm:my-auto' />
          )}

          {pinned.map(panel => {
            const target: PanelId = `custom:${panel.id}`;
            const isActive = target === activePanel;
            return (
              // Retaper le panneau ouvert le referme.
              <PinnedModal key={panel.id} panel={panel} active={isActive} onClick={() => (isActive ? closePanel() : openPanel(target))} />
            );
          })}

          {isEditMode && (
            <>
              <button
                onClick={() => addPage({ label: t('layout.newPage'), type: 'grid' })}
                data-tour='add-page'
                title={t('layout.newPage')}
                aria-label={t('layout.newPage')}
                className={cn(
                  RAIL_BUTTON,
                  'border-2 border-dashed border-[var(--ds-surface-3)] text-[var(--ds-ink-muted)] hover:text-[var(--ds-ink)]'
                )}
              >
                <Plus size={22} />
              </button>
              {/* Icône `Home` explicite plutôt que celle du type : elle est dans le
                noyau d'icônes, donc aussi dans les versions antérieures. */}
              <button
                onClick={() => addPage({ label: t('layout.floorplan.newPage'), type: 'floorplan', icon: 'Home' })}
                title={t('layout.floorplan.newPage')}
                aria-label={t('layout.floorplan.newPage')}
                className={cn(
                  RAIL_BUTTON,
                  'border-2 border-dashed border-[var(--ds-surface-3)] text-[var(--ds-ink-muted)] hover:text-[var(--ds-ink)]'
                )}
              >
                <MapIcon size={22} />
              </button>
              <button
                onClick={() => setModalsMenu(v => !v)}
                title={t('layout.shell.railModals')}
                aria-label={t('layout.shell.railModals')}
                aria-expanded={menuOpen}
                className={cn(
                  RAIL_BUTTON,
                  'border-2 border-dashed border-[var(--ds-surface-3)] text-[var(--ds-ink-muted)] hover:text-[var(--ds-ink)]',
                  menuOpen && 'border-solid text-[var(--ds-ink)]'
                )}
              >
                <Layers size={22} />
              </button>
            </>
          )}
        </div>

        {/* Hors de la pilule, qui défile : elle rognerait la liste. Alignée sur
            le bas du rail, où se trouve le bouton qui l'ouvre. */}
        {menuOpen && (
          <>
            <div className='fixed inset-0' onClick={() => setModalsMenu(false)} />
            <div
              role='menu'
              aria-label={t('layout.shell.railModals')}
              className='absolute bottom-0 left-full ml-4 flex w-72 flex-col gap-1 rounded-[var(--ds-radius-xl)] bg-[var(--ds-surface-1)] p-3 text-[var(--ds-ink)] shadow-[var(--ds-shadow-sheet)] max-sm:bottom-full max-sm:left-1/2 max-sm:mb-3 max-sm:ml-0 max-sm:-translate-x-1/2'
            >
              <p className='px-2 pb-1 text-[17px] font-semibold'>{t('layout.shell.railModals')}</p>
              {panels.map(panel => {
                const on = dock.panels.includes(panel.id);
                const Icon = resolveIcon(panel.icon) ?? LayoutGrid;
                return (
                  <button
                    key={panel.id}
                    role='menuitemcheckbox'
                    aria-checked={on}
                    onClick={() => togglePin(panel.id)}
                    className='flex min-h-[56px] items-center gap-3 rounded-2xl px-2 text-left font-semibold hover:bg-[var(--ds-surface-2)]'
                  >
                    <span className='flex size-10 shrink-0 items-center justify-center rounded-[var(--ds-radius-sm)] bg-[var(--ds-app-music)] text-white'>
                      <Icon size={20} />
                    </span>
                    <span className='min-w-0 flex-1 truncate'>{panel.name}</span>
                    {on && <Check size={20} className='shrink-0 text-[var(--ds-accent)]' />}
                  </button>
                );
              })}
              {panels.length === 0 && <p className='px-2 pb-1 text-sm text-[var(--ds-ink-muted)]'>{t('layout.shell.noPanels')}</p>}
              <button
                role='menuitem'
                onClick={() => {
                  setModalsMenu(false);
                  setEditorOpen(true);
                }}
                className='mt-1 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[var(--ds-surface-2)] font-semibold'
              >
                <Settings size={18} />
                {t('layout.shell.manageModals')}
              </button>
            </div>
          </>
        )}
      </nav>

      {/* Hors du `<nav>` : son `z-40` plafonnerait l'éditeur sous la barre d'édition. */}
      <AnimatePresence>{editorOpen && <CustomPanelEditorModal onClose={() => setEditorOpen(false)} />}</AnimatePresence>
    </>
  );
}

/**
 * Une modale épinglée. Avec une entité d'état, elle devient une pastille de
 * l'Echo Show : la température à la place de l'icône, ou l'icône allumée.
 */
function PinnedModal({ panel, active, onClick }: { panel: CustomPanel; active: boolean; onClick: () => void }) {
  const entity = useHass(s => (panel.railEntity ? s.entities?.[panel.railEntity] : undefined));
  const status = panel.railEntity ? railStatus(panel.railEntity, entity) : { on: false };
  const Icon = resolveIcon(panel.icon) ?? LayoutGrid;
  return (
    <button
      onClick={onClick}
      title={panel.name}
      aria-label={status.text ? `${panel.name} · ${status.text}` : panel.name}
      aria-pressed={active}
      data-rail-on={status.on || undefined}
      style={{ background: status.on ? 'var(--ds-tile-on)' : 'var(--ds-app-music)' }}
      className={cn(RAIL_BUTTON, 'text-white', active && 'outline-[3px] outline-offset-2 outline-[var(--ds-ink)]')}
    >
      {status.text ? (
        <span className='text-[15px] font-bold tabular-nums'>{status.text}</span>
      ) : (
        // `resolveIcon` rend une référence stable du catalogue, pas un composant neuf.
        // eslint-disable-next-line react-hooks/static-components
        <Icon size={22} />
      )}
    </button>
  );
}

function RailAction({ label, onClick, Icon, danger }: { label: string; onClick: () => void; Icon: LucideIcon; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'flex size-10 items-center justify-center rounded-full transition-colors hover:bg-[var(--ds-surface-2)]',
        danger ? 'text-[var(--ds-alert)]' : 'text-[var(--ds-ink)]'
      )}
    >
      <Icon size={18} />
    </button>
  );
}
