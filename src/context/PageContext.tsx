import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { FloorplanCable, FloorplanPart, FloorplanRoom, FloorplanSolar } from '@/lib/floorplan';
import type { FloorplanOpenings } from '@/lib/floorplan-openings';

export type PageType = 'grid' | 'media' | 'settings' | 'floorplan';

/** Page `floorplan` : l'image du plan, sur laquelle les widgets sont posés via `GridWidget.pos`. */
export interface FloorplanConfig {
  /** URL de l'image — `/uploads/…` une fois téléversée, ou adresse externe */
  image: string;
  /** Assombrir le plan quand le soleil est couché (`sun.sun`). Actif par défaut. */
  dimAtNight?: boolean;
  /**
   * Maquette 3D (`.glb`, `.gltf`). Renseignée, elle remplace l'image : la page
   * devient une maison qu'on fait tourner, éclairée par le soleil et les lampes.
   */
  model?: string;
  /** Vue d'accueil de la maquette, réglée en édition. */
  camera?: { position: [number, number, number]; target: [number, number, number] };
  /** Orientation du nord dans la maquette, en degrés — pour placer le soleil. */
  north?: number;
  /** Murs en coupe : le côté caméra est abaissé à environ un mètre. Actif par défaut. */
  cutaway?: boolean;
  /** La maison tourne lentement après une minute sans geste. */
  idleRotate?: boolean;
  /** Un ciel qui suit le soleil derrière la maquette, plutôt que le fond du thème. Actif par défaut. */
  sky?: boolean;
  /** Une lueur autour de chaque lampe allumée, de sa couleur. */
  lampGlow?: boolean;
  /**
   * Clarté de la maquette la nuit, de 0 (seules les lampes éclairent) à 1 : un
   * clair de lune, pour les pièces sans lampe reliée. Absente : `DEFAULT_NIGHT_LIGHT`.
   */
  nightLight?: number;
  /** Entité `weather` qui voile le soleil et grise le ciel — absente, la première trouvée. */
  weather?: string;
  /** Entité `alarm_control_panel` qu'arme le bouclier — absente, la première trouvée. */
  alarm?: string;
  /** Portes, fenêtres et volets dessinés sur la maquette, mus par leur entité. */
  parts?: FloorplanPart[];
  /** Pièces dessinées au sol de la maquette. */
  rooms?: FloorplanRoom[];
  /** Câbles d'énergie tracés sur la maquette, animés par leur entité. */
  cables?: FloorplanCable[];
  /** Portes, fenêtres et baies de la maquette elle-même (export ExportToHASS), mues par leur entité. */
  openings?: FloorplanOpenings;
  /** Champs de panneaux solaires posés sur la maquette, éclairés par leur production. */
  solar?: FloorplanSolar[];
}

export interface Page {
  id: string;
  label: string;
  icon?: string; // nom d'icône lucide
  type: PageType;
  /** Ordre d'affichage dans les onglets */
  order: number;
  /**
   * Entités affichées en pastilles au-dessus de la grille.
   *
   * Portées par la page et non par un widget : elles suivent l'export,
   * l'historique et la restauration comme le reste de la configuration.
   */
  badges?: string[];
  /** Pages `floorplan` uniquement. Portée par la page pour la même raison que `badges`. */
  floorplan?: FloorplanConfig;
}

interface PageContextValue {
  pages: Page[];
  /** La page affichée : celle où l'on a navigué, ou celle que montre l'écran de veille. */
  currentPageId: string;
  currentPage: Page | undefined;
  /** La page où l'on a navigué — l'URL la suit, pas l'écran de veille. */
  navigatedPageId: string;
  setCurrentPage: (id: string) => void;
  /**
   * Montre une page sans y naviguer — `null` : de nouveau celle où l'on est.
   * L'écran de veille sur une maquette : ce qui navigue pendant ce temps (le
   * retour à l'accueil) change la page d'en dessous, sans toucher à celle-ci.
   */
  showPage: (id: string | null) => void;
  addPage: (page: Omit<Page, 'id' | 'order'>) => string; // retourne l'id
  deletePage: (id: string) => void;
  updatePage: (id: string, updates: Partial<Page>) => void;
  reorderPages: (ids: string[]) => void;
}

const PageContext = createContext<PageContextValue | null>(null);

// ── Slug generator ─────────────────────────────────────────────────────────────
function generateSlug(label: string, existingIds: string[]): string {
  const base = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime les accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const reserved = new Set(['settings', 'edit', 'admin']);
  let slug = reserved.has(base) ? `page-${base}` : base;

  if (existingIds.includes(slug)) {
    let counter = 2;
    while (existingIds.includes(`${slug}-${counter}`)) counter++;
    slug = `${slug}-${counter}`;
  }

  return slug;
}

// ── Default pages ──────────────────────────────────────────────────────────────
export const DEFAULT_PAGES: Page[] = [{ id: 'home', label: 'Accueil', icon: 'LayoutGrid', type: 'grid', order: 0 }];

interface PageProviderProps {
  children: ReactNode;
  initialPages?: Page[];
}

export function PageProvider({ children, initialPages }: PageProviderProps) {
  const [pages, setPages] = useState<Page[]>(initialPages && initialPages.length > 0 ? initialPages : DEFAULT_PAGES);
  const [currentPageId, setCurrentPageId] = useState<string>(
    initialPages && initialPages.length > 0 ? (initialPages[0]?.id ?? 'home') : 'home'
  );

  const [shownPageId, showPage] = useState<string | null>(null);
  const visiblePageId = shownPageId && pages.some(p => p.id === shownPageId) ? shownPageId : currentPageId;
  const currentPage = pages.find(p => p.id === visiblePageId);

  const setCurrentPage = useCallback(
    (id: string) => {
      const exists = pages.some(p => p.id === id);
      if (exists) setCurrentPageId(id);
    },
    [pages]
  );

  const addPage = useCallback(
    (page: Omit<Page, 'id' | 'order'>) => {
      const existingIds = pages.map(p => p.id);
      const id = generateSlug(page.label, existingIds);
      const order = Math.max(...pages.map(p => p.order), -1) + 1;
      setPages(prev => [...prev, { ...page, id, order }]);
      return id;
    },
    [pages]
  );

  const deletePage = useCallback(
    (id: string) => {
      if (id === 'home') return; // On ne supprime jamais l'accueil
      setPages(prev => prev.filter(p => p.id !== id));
      if (currentPageId === id) setCurrentPageId('home');
    },
    [currentPageId]
  );

  const updatePage = useCallback((id: string, updates: Partial<Page>) => {
    setPages(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const reorderPages = useCallback((ids: string[]) => {
    setPages(prev =>
      ids
        .map((id, i) => {
          const page = prev.find(p => p.id === id);
          return page ? { ...page, order: i } : null;
        })
        .filter((p): p is Page => p !== null)
    );
  }, []);

  return (
    <PageContext.Provider
      value={{
        pages,
        currentPageId: visiblePageId,
        currentPage,
        navigatedPageId: currentPageId,
        setCurrentPage,
        showPage,
        addPage,
        deletePage,
        updatePage,
        reorderPages,
      }}
    >
      {children}
    </PageContext.Provider>
  );
}

export function usePages() {
  const ctx = useContext(PageContext);
  if (!ctx) throw new Error('usePages must be used within PageProvider');
  return ctx;
}
