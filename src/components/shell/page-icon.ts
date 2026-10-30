import { LayoutGrid, Map as MapIcon, Music, Settings, type LucideIcon } from 'lucide-react';
import type { Page, PageType } from '@/context/PageContext';
import { resolveIcon } from '@/lib/lucide-icon-map';

const DEFAULT_ICONS: Record<PageType, LucideIcon> = {
  grid: LayoutGrid,
  media: Music,
  settings: Settings,
  floorplan: MapIcon,
};

/** L'icône d'une page : la sienne, sinon celle de son type. Partagée par le rail et le lanceur. */
export const pageIcon = (page: Page): LucideIcon => (page.icon ? resolveIcon(page.icon) : undefined) ?? DEFAULT_ICONS[page.type];

/** Les pages dans l'ordre choisi par l'utilisateur. */
export const sortPages = (pages: Page[]): Page[] => [...pages].sort((a, b) => a.order - b.order);

/** Couleurs des pastilles de pages, reprises des apps du lanceur — la page `index` prend la sienne. */
const APP_COLORS = ['var(--ds-app-home)', 'var(--ds-app-music)', 'var(--ds-app-tv)', 'var(--ds-app-photo)', 'var(--ds-app-calendar)'];
export const pageColor = (index: number) => APP_COLORS[index % APP_COLORS.length];
