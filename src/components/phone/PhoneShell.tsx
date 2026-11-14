import { createElement, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlignLeft, Check, ChevronDown, Home, Layers, LayoutGrid, Music, Sparkle, Webcam, type LucideIcon } from 'lucide-react';
import { useHass } from '@hakit/core';
import { usePages, type Page } from '@/context/PageContext';
import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import { DashboardGrid } from '@/components/layout/DashboardGrid';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { PageBadges } from '@/components/layout/PageBadges';
import { Launcher } from '@/components/shell/Launcher';
import { AssistSheet } from '@/components/assist/AssistSheet';
import { MusicMiniPlayer } from '@/components/music/MusicMiniPlayer';
import { WidgetErrorBoundary } from '@/components/ui/WidgetErrorBoundary';
import { pageIcon, sortPages } from '@/components/shell/page-icon';
import { pickMassPlayer, rememberedPlayer } from '@/lib/music-assistant';
import { layoutWidgets } from '@/lib/panel-grid';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { PhoneRooms } from './PhoneRooms';
import { PhoneCameras } from './PhoneCameras';

const FloorplanView = lazy(() => import('@/components/floorplan/FloorplanView').then(m => ({ default: m.FloorplanView })));
const MusicApp = lazy(() => import('@/components/music/MusicApp'));

export type PhoneTab = 'home' | 'rooms' | 'plan' | 'cameras' | 'music';

/** Bouton rond de 44 px des en-têtes de la maquette « Téléphone ». */
export const PHONE_ROUND =
  'flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-2)] text-[var(--ds-ink)] active:scale-95 transition-transform';

/** La marge du haut des écrans : la barre d'état du téléphone, puis 16 px. */
export const PHONE_TOP = 'pt-[calc(env(safe-area-inset-top)+16px)]';

/**
 * Le dashboard sur un téléphone (maquette « Téléphone ») : un écran par onglet
 * — Maison, Pièces, Plan, Caméras, Musique —, la barre d'onglets flottante en
 * bas et le mini-lecteur au-dessus d'elle.
 *
 * Maison montre la page d'accueil configurée (ou celle choisie dans la pilule),
 * ses tuiles sur la trame fluide du téléphone. Pièces et Caméras se déduisent
 * de Home Assistant. Pas d'édition ici : elle se fait sur la tablette.
 */
export function PhoneShell() {
  const { pages, setCurrentPage, currentPage } = usePages();
  const musicPlayer = useHass(s => pickMassPlayer(s.entities, rememberedPlayer()));
  const plan = sortPages(pages).find(p => p.type === 'floorplan');
  const [tab, setTabState] = useState<PhoneTab>(() => (currentPage?.type === 'floorplan' ? 'plan' : 'home'));
  const [menuOpen, setMenuOpen] = useState(false);
  const [assistOpen, setAssistOpen] = useState(false);

  // Un onglet qui disparaît (plus de plan, plus de Music Assistant) ramène à la maison.
  const active: PhoneTab = (tab === 'plan' && !plan) || (tab === 'music' && !musicPlayer) ? 'home' : tab;

  const setTab = (next: PhoneTab) => {
    // Le plan est une page : y aller, c'est l'ouvrir ; en revenir, retrouver une page à tuiles.
    if (next === 'plan' && plan) setCurrentPage(plan.id);
    else if (currentPage?.type === 'floorplan') setCurrentPage(sortPages(pages).find(p => p.type !== 'floorplan')?.id ?? 'home');
    setTabState(next);
    window.scrollTo?.({ top: 0 });
  };

  return (
    <div data-testid='phone-shell' className='min-h-dvh text-[var(--ds-ink)]'>
      {active === 'home' && <PhoneHome onMenu={() => setMenuOpen(true)} onAssist={() => setAssistOpen(true)} />}
      {active === 'rooms' && <PhoneRooms />}
      {active === 'cameras' && <PhoneCameras />}
      {active === 'plan' && (
        <div className={cn('flex h-dvh flex-col px-4 pb-[180px]', PHONE_TOP)}>
          <WidgetErrorBoundary messageKey='common.panelUnavailable'>
            <Suspense fallback={null}>
              <FloorplanView />
            </Suspense>
          </WidgetErrorBoundary>
        </div>
      )}
      {active === 'music' && musicPlayer && (
        <WidgetErrorBoundary messageKey='common.panelUnavailable'>
          <Suspense fallback={null}>
            <MusicApp entityId={musicPlayer} widgetId='music' />
          </Suspense>
        </WidgetErrorBoundary>
      )}

      {/* L'appli Musique a déjà le sien. */}
      {active !== 'music' && musicPlayer && (
        // `music-theme` : les couleurs du mini-lecteur.
        <div className='music-theme'>
          <MusicMiniPlayer entityId={musicPlayer} />
        </div>
      )}
      <PhoneTabBar active={active} onChange={setTab} hasPlan={!!plan} hasMusic={!!musicPlayer} />

      <Launcher open={menuOpen} onClose={() => setMenuOpen(false)} />
      <AssistSheet open={assistOpen} onClose={() => setAssistOpen(false)} />
    </div>
  );
}

/** Onglet Maison : la barre du haut, les pastilles d'état et les panneaux de la page. */
function PhoneHome({ onMenu, onAssist }: { onMenu: () => void; onAssist: () => void }) {
  const { t } = useI18n();
  const { layout } = useDashboardLayout();
  const empty = layoutWidgets(layout).length === 0;

  return (
    <div className={cn('flex flex-col gap-3.5 px-4 pb-[180px]', PHONE_TOP)}>
      <div className='flex items-center gap-2.5'>
        <button onClick={onMenu} aria-label={t('layout.phone.menu')} title={t('layout.phone.menu')} className={PHONE_ROUND}>
          <AlignLeft size={18} aria-hidden='true' />
        </button>
        <PagePill />
        <button
          onClick={onAssist}
          aria-label={t('layout.shell.assist')}
          title={t('layout.shell.assist')}
          className={cn(PHONE_ROUND, 'ml-auto text-[var(--ds-cool)]')}
        >
          <Sparkle size={20} aria-hidden='true' />
        </button>
      </div>
      <PageBadges />
      {layout.panels.length > 0 && <DashboardGrid />}
      {empty && <DashboardEmptyState />}
    </div>
  );
}

/** L'icône d'une page — hors rendu : `pageIcon` peut fabriquer un composant. */
const renderPageIcon = (page: Page, className: string, size: number) =>
  createElement(pageIcon(page), { size, className, 'aria-hidden': true });

/**
 * La pilule « Maison principale » de la maquette : la page affichée, et la
 * liste des autres d'un appui. Le plan a son onglet, il n'y figure pas.
 */
function PagePill() {
  const { t } = useI18n();
  const { pages, currentPage, setCurrentPage } = usePages();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const choices = sortPages(pages).filter(p => p.type !== 'floorplan');

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  if (!currentPage) return null;
  const label = currentPage.label || t('layout.shell.home');

  return (
    <div ref={ref} className='relative min-w-0'>
      <button
        onClick={() => choices.length > 1 && setOpen(o => !o)}
        aria-haspopup='listbox'
        aria-expanded={open}
        className='flex h-11 min-w-0 items-center gap-2 rounded-full bg-[var(--ds-surface-2)] pl-1.5 pr-3.5 text-[15px] font-semibold'
      >
        <span className='flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--ds-home)] text-[var(--ds-home-ink)]'>
          {renderPageIcon(currentPage, '', 16)}
        </span>
        <span className='truncate'>{label}</span>
        {choices.length > 1 && <ChevronDown size={14} strokeWidth={2.5} aria-hidden='true' className='shrink-0' />}
      </button>
      {open && (
        <div
          role='listbox'
          aria-label={t('layout.shell.pages')}
          className='absolute left-0 top-[52px] z-30 flex max-h-[60dvh] w-[min(280px,calc(100vw-32px))] flex-col gap-1 overflow-y-auto rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] p-2 shadow-[var(--ds-shadow-sheet)]'
        >
          {choices.map(page => {
            const selected = page.id === currentPage.id;
            return (
              <button
                key={page.id}
                role='option'
                aria-selected={selected}
                onClick={() => {
                  setCurrentPage(page.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex h-12 items-center gap-3 rounded-[var(--ds-radius-md)] px-3 text-left text-[15px] font-semibold',
                  selected && 'bg-[var(--ds-surface-3)]'
                )}
              >
                {renderPageIcon(page, 'shrink-0 text-[var(--ds-ink-muted)]', 18)}
                <span className='min-w-0 flex-1 truncate'>{page.label}</span>
                {selected && <Check size={18} aria-hidden='true' className='shrink-0 text-[var(--ds-cool)]' />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** La barre d'onglets flottante : l'onglet ouvert en pilule titrée, les autres en icône. */
function PhoneTabBar({
  active,
  onChange,
  hasPlan,
  hasMusic,
}: {
  active: PhoneTab;
  onChange: (tab: PhoneTab) => void;
  hasPlan: boolean;
  hasMusic: boolean;
}) {
  const { t } = useI18n();
  const tabs: { id: PhoneTab; Icon: LucideIcon; show: boolean }[] = [
    { id: 'home', Icon: Home, show: true },
    { id: 'rooms', Icon: LayoutGrid, show: true },
    { id: 'plan', Icon: Layers, show: hasPlan },
    { id: 'cameras', Icon: Webcam, show: true },
    { id: 'music', Icon: Music, show: hasMusic },
  ];
  return (
    <nav
      aria-label={t('layout.phone.navigation')}
      className='fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+24px)] z-30 flex h-16 items-center justify-between rounded-[32px] bg-[var(--ds-surface-1)] px-2 shadow-[0_12px_32px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.08)]'
    >
      {tabs
        .filter(tab => tab.show)
        .map(({ id, Icon }) => {
          const label = t(`layout.phone.tabs.${id}`);
          const current = id === active;
          return (
            <TabButton key={id} current={current} label={label} onClick={() => onChange(id)}>
              <Icon size={22} aria-hidden='true' className={cn(current && id === 'home' && 'fill-current')} />
            </TabButton>
          );
        })}
    </nav>
  );
}

function TabButton({ current, label, onClick, children }: { current: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-current={current ? 'page' : undefined}
      aria-label={current ? undefined : label}
      title={label}
      className={cn(
        'flex h-12 shrink-0 items-center justify-center rounded-full',
        current
          ? 'gap-2 bg-[var(--ds-tile-on)] pl-3.5 pr-[18px] text-[15px] font-semibold text-[var(--ds-tile-on-ink)]'
          : 'w-12 text-[var(--ds-ink-muted)]'
      )}
    >
      {children}
      {current && <span className='whitespace-nowrap'>{label}</span>}
    </button>
  );
}
