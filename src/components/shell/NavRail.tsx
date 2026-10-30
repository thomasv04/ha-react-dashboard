import { ChevronDown, ChevronUp, Home, LayoutGrid, Map as MapIcon, Plus, X, type LucideIcon } from 'lucide-react';
import { usePages } from '@/context/PageContext';
import { useEditMode } from '@/context/DashboardLayoutContext';
import { useCustomPanels } from '@/context/CustomPanelContext';
import { usePanel, type PanelId } from '@/context/PanelContext';
import { resolveIcon, useIconCatalog } from '@/lib/lucide-icon-map';
import { cn } from '@/lib/utils';
import { pageIcon, sortPages } from './page-icon';
import { useI18n } from '@/i18n';

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
  const { panels, dock } = useCustomPanels();
  const { activePanel, openPanel, closePanel } = usePanel();

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
    <nav
      aria-label={t('layout.shell.pages')}
      className={cn(
        'fixed z-40 flex items-center gap-3',
        // Tablette : colonne à gauche. Téléphone : bande en bas, la largeur manque.
        'left-6 sm:left-10 top-[112px] flex-col',
        'max-sm:top-auto max-sm:bottom-3 max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:flex-row'
      )}
    >
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
                className={cn(
                  RAIL_BUTTON,
                  isActive ? 'bg-[var(--ds-surface-3)] text-[var(--ds-ink)]' : 'text-[var(--ds-ink-muted)] hover:text-[var(--ds-ink)]'
                )}
              >
                <Icon size={22} />
              </button>

              {/* Actions de la page active : sur toutes, elles hérisseraient le rail. */}
              {isEditMode && isActive && (
                <div className='absolute left-full top-1/2 ml-3 flex -translate-y-1/2 gap-1 rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)] p-1 max-sm:left-1/2 max-sm:top-auto max-sm:bottom-full max-sm:ml-0 max-sm:mb-3 max-sm:-translate-x-1/2 max-sm:translate-y-0'>
                  {index > 0 && <RailAction label={t('layout.shell.movePageUp')} onClick={() => movePage(page.id, -1)} Icon={ChevronUp} />}
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
          const Icon = resolveIcon(panel.icon) ?? LayoutGrid;
          return (
            <button
              key={panel.id}
              // Retaper le panneau ouvert le referme.
              onClick={() => (isActive ? closePanel() : openPanel(target))}
              title={panel.name}
              aria-label={panel.name}
              aria-pressed={isActive}
              className={cn(
                RAIL_BUTTON,
                isActive ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'text-[var(--ds-ink-muted)] hover:text-[var(--ds-ink)]'
              )}
            >
              <Icon size={22} />
            </button>
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
          </>
        )}
      </div>
    </nav>
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
