import type { DashboardLayout, GridWidget, LayoutPanel } from '@/context/DashboardLayoutContext';
import { clamp } from '@/lib/utils';

/**
 * Trame des panneaux : colonnes et rangées de taille fixe, comme sur l'Echo
 * Show. Ce n'est plus un réglage — une tuile a la même taille partout, et les
 * cards règlent leurs seuils (`useWidgetSize`) sur cette trame.
 */
export const GRID_COL = 96;
export const GRID_ROW = 80;
export const GRID_GAP = 16;

/** Largeur d'un panneau, en colonnes de la trame. */
export const PANEL_COLS_MIN = 2;
export const PANEL_COLS_MAX = 12;
export const PANEL_COLS_DEFAULT = 6;

/** Largeur en px de `cols` colonnes de la trame. */
export const colsWidth = (cols: number) => cols * GRID_COL + (cols - 1) * GRID_GAP;

/** Combien de colonnes tiennent dans `width` px — au moins une. */
export const colsThatFit = (width: number) => Math.max(1, Math.floor((width + GRID_GAP) / (GRID_COL + GRID_GAP)));

/**
 * Demande d'édition d'un seul panneau (`detail` : son id). La barre d'édition
 * l'écoute : c'est elle qui garde le code d'accès et l'enregistrement.
 */
export const EDIT_PANEL_EVENT = 'ha-dashboard:edit-panel';

export const newPanelId = () => `panel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const newPanel = (cols = PANEL_COLS_DEFAULT): LayoutPanel => ({ id: newPanelId(), cols, widgets: [] });

/** Où lâcher un panneau par rapport à celui qu'on vise. */
export type PanelZone = 'left' | 'right' | 'above' | 'below';

/**
 * Déplace un panneau d'après l'endroit où on le lâche.
 *
 * - `left` / `right` : une colonne à lui, avant ou après celle du panneau visé ;
 * - `above` / `below` : dans la colonne du panneau visé, au-dessus ou en dessous.
 *
 * Une colonne est une suite de panneaux dont tous, sauf le premier, ont
 * `below` : retirer une tête de colonne passe donc la main à son suivant.
 */
export function placePanel(layout: DashboardLayout, id: string, targetId: string, zone: PanelZone): DashboardLayout {
  if (id === targetId) return layout;
  const from = layout.panels.findIndex(p => p.id === id);
  if (from < 0 || !layout.panels.some(p => p.id === targetId)) return layout;

  const moving = layout.panels[from];
  const rest = layout.panels.filter(p => p.id !== id).map(p => ({ ...p }));
  // Le panneau qui était sous lui devient tête de colonne.
  const successor = layout.panels[from + 1];
  if (!moving.below && successor?.below) rest.find(p => p.id === successor.id)!.below = undefined;

  const t = rest.findIndex(p => p.id === targetId);
  const head = (i: number) => {
    while (i > 0 && rest[i].below) i--;
    return i;
  };
  const tail = (i: number) => {
    while (rest[i + 1]?.below) i++;
    return i;
  };

  const placed: LayoutPanel = { ...moving, below: undefined };
  let at: number;
  if (zone === 'left') at = head(t);
  else if (zone === 'right') at = tail(t) + 1;
  else if (zone === 'above') {
    at = t;
    placed.below = rest[t].below;
    rest[t].below = true;
  } else {
    at = t + 1;
    placed.below = true;
  }
  rest.splice(at, 0, placed);
  rest[0].below = undefined;
  return { ...layout, panels: rest };
}

/** Un widget de la page et le panneau qui le porte. */
export function findWidget(layout: DashboardLayout, id: string): { panel: LayoutPanel; widget: GridWidget } | undefined {
  for (const panel of layout.panels) {
    const widget = panel.widgets.find(w => w.id === id);
    if (widget) return { panel, widget };
  }
  return undefined;
}

/** Tous les widgets d'une page, panneau après panneau. */
export const layoutWidgets = (layout: DashboardLayout): GridWidget[] => layout.panels.flatMap(p => p.widgets);

export const EMPTY_LAYOUT: DashboardLayout = { panels: [] };

/** Widget d'une disposition d'avant la 4.0, placé en coordonnées. */
interface LegacyWidget extends GridWidget {
  x?: number;
  y?: number;
}

/**
 * Disposition d'avant la 4.0 — trois grilles libres (`lg`, `md`, `sm`) en
 * coordonnées — convertie en un panneau.
 *
 * Seule la grille `lg` est reprise : c'est celle que tout le monde a arrangée,
 * les deux autres en dérivaient. Ses widgets passent dans l'ordre de lecture
 * (rangée puis colonne) : le placement automatique des panneaux reconstitue la
 * même page, à peu de chose près. La trame n'a pas changé de taille, `w` et `h`
 * se gardent tels quels.
 */
export function panelsFromLegacy(legacy: { widgets?: { lg?: LegacyWidget[] }; cols?: { lg?: number } }): LayoutPanel[] {
  // Une entrée illisible (null, chaîne…) n'a pas de place à trier ; le
  // chargement écarte de toute façon ce qui n'est pas un widget.
  const list = (legacy.widgets?.lg ?? []).filter(w => w && typeof w === 'object');
  if (list.length === 0) return [];
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const cols = clamp(legacy.cols?.lg ?? PANEL_COLS_MAX, PANEL_COLS_MIN, PANEL_COLS_MAX);
  const widgets = [...list]
    .sort((a, b) => num(a.y) - num(b.y) || num(a.x) - num(b.x))
    .map(({ x: _x, y: _y, ...w }) => (typeof w.w === 'number' ? { ...w, w: Math.min(w.w, cols) } : w));
  return [{ id: 'main', cols, widgets }];
}

/**
 * Une disposition telle que lue (serveur, cache, import), ramenée au format
 * des panneaux. Celle déjà en panneaux passe telle quelle.
 */
export function toPanelLayout(raw: unknown): DashboardLayout {
  if (!raw || typeof raw !== 'object') return { panels: [] };
  const r = raw as { panels?: unknown };
  if (Array.isArray(r.panels)) return raw as DashboardLayout;
  return { panels: panelsFromLegacy(raw as Parameters<typeof panelsFromLegacy>[0]) };
}
