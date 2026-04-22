# 06 — Multi-Pages & Navigation par onglets

## Objectif

Transformer le dashboard single-page en un système multi-pages avec des onglets (HOME, LUMIÈRES, SONOS, CALENDRIER, SETTINGS...) comme dans Tunet. C'est un changement structurel majeur qui touche le contexte, le layout, et la persistance.

## Résultat attendu

- Barre d'onglets en haut sous le header (comme les screenshots Tunet)
- Chaque page a son propre grid layout avec ses propres widgets
- Possibilité d'ajouter/supprimer/renommer des pages en mode édition
- Types de pages : `grid` (dashboard normal), `media` (page multimédia spéciale), `settings`
- Persistance du layout par page dans le backend
- URL routing optionnel (hash ou searchParams)

---

## Architecture

```
PageContext (NOUVEAU)
  ├── pages: Page[]           // Liste des pages
  ├── currentPageId: string   // Page active
  ├── setCurrentPage(id)      // Naviguer
  ├── addPage(...)            // Créer
  ├── deletePage(id)          // Supprimer
  └── updatePage(id, ...)     // Renommer/modifier

DashboardLayoutContext (MODIFIÉ)
  ├── layout deviens layouts: Record<pageId, DashboardLayout>
  ├── widgetConfigs deviens widgetConfigs: Record<pageId, WidgetConfigs>
  └── Toutes les fonctions prennent pageId en paramètre implicite (page courante)
```

---

## Étape 1 : Créer le PageContext

### `src/context/PageContext.tsx`

```typescript
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type PageType = 'grid' | 'media' | 'settings';

export interface Page {
  id: string;
  label: string;
  icon?: string;     // nom d'icône lucide
  type: PageType;
  /** Ordre d'affichage dans les onglets */
  order: number;
}

interface PageContextValue {
  pages: Page[];
  currentPageId: string;
  currentPage: Page | undefined;
  setCurrentPage: (id: string) => void;
  addPage: (page: Omit<Page, 'id' | 'order'>) => string; // retourne l'id
  deletePage: (id: string) => void;
  updatePage: (id: string, updates: Partial<Page>) => void;
  reorderPages: (ids: string[]) => void;
}

const PageContext = createContext<PageContextValue | null>(null);

// ── Slug generator (inspiré de Tunet usePageManagement) ───────────────────────
function generateSlug(label: string, existingIds: string[]): string {
  const base = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // supprime les accents
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

// ── Default pages ─────────────────────────────────────────────────────────────
const DEFAULT_PAGES: Page[] = [
  { id: 'home', label: 'Accueil', icon: 'LayoutGrid', type: 'grid', order: 0 },
];

interface PageProviderProps {
  children: ReactNode;
  initialPages?: Page[];
}

export function PageProvider({ children, initialPages }: PageProviderProps) {
  const [pages, setPages] = useState<Page[]>(initialPages ?? DEFAULT_PAGES);
  const [currentPageId, setCurrentPageId] = useState<string>(pages[0]?.id ?? 'home');

  const currentPage = pages.find(p => p.id === currentPageId);

  const setCurrentPage = useCallback((id: string) => {
    const exists = pages.some(p => p.id === id);
    if (exists) setCurrentPageId(id);
  }, [pages]);

  const addPage = useCallback((page: Omit<Page, 'id' | 'order'>) => {
    const existingIds = pages.map(p => p.id);
    const id = generateSlug(page.label, existingIds);
    const order = Math.max(...pages.map(p => p.order), -1) + 1;
    setPages(prev => [...prev, { ...page, id, order }]);
    return id;
  }, [pages]);

  const deletePage = useCallback((id: string) => {
    if (id === 'home') return; // On ne supprime jamais l'accueil
    setPages(prev => prev.filter(p => p.id !== id));
    if (currentPageId === id) setCurrentPageId('home');
  }, [currentPageId]);

  const updatePage = useCallback((id: string, updates: Partial<Page>) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const reorderPages = useCallback((ids: string[]) => {
    setPages(prev => ids.map((id, i) => {
      const page = prev.find(p => p.id === id);
      return page ? { ...page, order: i } : null;
    }).filter(Boolean) as Page[]);
  }, []);

  return (
    <PageContext.Provider value={{
      pages,
      currentPageId,
      currentPage,
      setCurrentPage,
      addPage,
      deletePage,
      updatePage,
      reorderPages,
    }}>
      {children}
    </PageContext.Provider>
  );
}

export function usePages() {
  const ctx = useContext(PageContext);
  if (!ctx) throw new Error('usePages must be used within PageProvider');
  return ctx;
}
```

---

## Étape 2 : Créer le composant PageTabs

### `src/components/layout/PageTabs.tsx`

```typescript
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Lightbulb, Music, Calendar, Settings, Plus, X } from 'lucide-react';
import { usePages, type PageType } from '@/context/PageContext';
import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import { cn } from '@/lib/utils';
import { resolveIcon } from '@/lib/lucide-icon-map';

const DEFAULT_ICONS: Record<string, typeof LayoutGrid> = {
  grid: LayoutGrid,
  media: Music,
  settings: Settings,
};

export function PageTabs() {
  const { pages, currentPageId, setCurrentPage, addPage, deletePage } = usePages();
  const { isEditMode } = useDashboardLayout();

  const sortedPages = [...pages].sort((a, b) => a.order - b.order);

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-2">
      {sortedPages.map(page => {
        const isActive = page.id === currentPageId;
        const IconComponent = page.icon
          ? resolveIcon(page.icon) ?? DEFAULT_ICONS[page.type]
          : DEFAULT_ICONS[page.type];

        return (
          <button
            key={page.id}
            onClick={() => setCurrentPage(page.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
              isActive
                ? 'bg-white/10 text-white border border-white/20'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5',
            )}
          >
            {IconComponent && <IconComponent size={16} />}
            <span className="uppercase tracking-wider text-xs">{page.label}</span>

            {/* Bouton supprimer en mode édition (sauf page home) */}
            {isEditMode && page.id !== 'home' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deletePage(page.id);
                }}
                className="ml-1 text-red-400/60 hover:text-red-400"
              >
                <X size={12} />
              </button>
            )}
          </button>
        );
      })}

      {/* Bouton ajouter une page en mode édition */}
      {isEditMode && (
        <button
          onClick={() => addPage({ label: 'Nouvelle page', type: 'grid' })}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
        >
          <Plus size={14} />
          <span className="text-xs">Page</span>
        </button>
      )}
    </div>
  );
}
```

---

## Étape 3 : Modifier DashboardLayoutContext pour le multi-pages

Les modifications clés dans `DashboardLayoutContext.tsx` :

```typescript
// Le layout et les widgetConfigs deviennent multi-pages
// Le state interne utilise un Record<pageId, Layout>

interface DashboardLayoutContextValue {
  // ... toutes les fonctions existantes restent identiques
  // MAIS elles opèrent sur la page courante via currentPageId du PageContext
  
  /** Récupérer le layout d'une page spécifique */
  getPageLayout: (pageId: string) => DashboardLayout;
  /** Définir le layout d'une page spécifique */
  setPageLayout: (pageId: string, layout: DashboardLayout) => void;
}
```

**Important** : Cette modification doit être **rétrocompatible**. Le pattern recommandé :

1. Stocker les layouts de toutes les pages dans un `Record<string, DashboardLayout>`
2. Les fonctions existantes (`addWidget`, `removeWidget`, etc.) lisent la page courante depuis `PageContext`
3. La config serveur passe de `{ layout, widgetConfigs }` à `{ pages, layouts, widgetConfigs }` (avec migration)

---

## Étape 4 : Modifier Dashboard.tsx pour afficher les onglets

```typescript
import { PageProvider, usePages } from '@/context/PageContext';
import { PageTabs } from '@/components/layout/PageTabs';

// Wrapper le contenu avec PageProvider dans App.tsx ou Dashboard.tsx
// Puis dans le render :

function DashboardContent() {
  const { currentPage } = usePages();
  
  return (
    <div>
      {/* Header : GreetingCard + ActivityBar */}
      {/* ... existant ... */}

      {/* Onglets de pages */}
      <PageTabs />

      {/* Contenu de la page courante */}
      {currentPage?.type === 'grid' && (
        <DashboardGrid>
          {/* Rendu des widgets pour cette page */}
        </DashboardGrid>
      )}
      
      {currentPage?.type === 'settings' && (
        <SettingsPage />  {/* À créer */}
      )}
    </div>
  );
}
```

---

## Étape 5 : Modifier la persistance (server.js + useDashboardConfig)

### Format de config v2

```json
{
  "version": 2,
  "pages": [
    { "id": "home", "label": "Accueil", "icon": "LayoutGrid", "type": "grid", "order": 0 },
    { "id": "lumieres", "label": "Lumières", "icon": "Lightbulb", "type": "grid", "order": 1 },
    { "id": "settings", "label": "Paramètres", "icon": "Settings", "type": "settings", "order": 99 }
  ],
  "layouts": {
    "home": {
      "widgets": { "lg": [...], "md": [...], "sm": [...] },
      "cols": { "lg": 12, "md": 8, "sm": 4 }
    },
    "lumieres": {
      "widgets": { "lg": [...], "md": [...], "sm": [...] },
      "cols": { "lg": 12, "md": 8, "sm": 4 }
    }
  },
  "widgetConfigs": {
    "home": { "weather": { ... }, "camera": { ... } },
    "lumieres": { "light-salon": { ... }, "light-chambre": { ... } }
  }
}
```

### Migration v1 → v2 dans `useDashboardConfig.ts`

```typescript
function migrateConfig(data: unknown): DashboardConfigV2 {
  // Si c'est déjà v2
  if (data && typeof data === 'object' && 'version' in data && (data as any).version === 2) {
    return data as DashboardConfigV2;
  }
  
  // Migration depuis v1 : tout mettre dans la page "home"
  const v1 = data as DashboardConfig;
  return {
    version: 2,
    pages: [{ id: 'home', label: 'Accueil', icon: 'LayoutGrid', type: 'grid', order: 0 }],
    layouts: {
      home: v1.layout ?? DEFAULT_LAYOUT,
    },
    widgetConfigs: {
      home: v1.widgetConfigs ?? DEFAULT_WIDGET_CONFIGS,
    },
  };
}
```

---

## Étape 6 : URL Routing (optionnel)

Pour synchroniser la page active avec l'URL (utile pour le bookmarking) :

### `src/hooks/usePageRouting.ts`

```typescript
import { useEffect } from 'react';
import { usePages } from '@/context/PageContext';

export function usePageRouting() {
  const { currentPageId, setCurrentPage, pages } = usePages();

  // Lire la page depuis le hash au montage
  useEffect(() => {
    const hash = window.location.hash.slice(1); // #lumieres → "lumieres"
    if (hash && pages.some(p => p.id === hash)) {
      setCurrentPage(hash);
    }
  }, []);

  // Mettre à jour le hash quand la page change
  useEffect(() => {
    if (currentPageId !== 'home') {
      window.location.hash = currentPageId;
    } else {
      // Supprimer le hash pour la page d'accueil
      history.replaceState(null, '', window.location.pathname);
    }
  }, [currentPageId]);

  // Écouter les changements de hash (bouton back du navigateur)
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && pages.some(p => p.id === hash)) {
        setCurrentPage(hash);
      } else {
        setCurrentPage('home');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [pages, setCurrentPage]);
}
```

---

## Vérification

- [ ] Les onglets s'affichent correctement sous le header
- [ ] Cliquer sur un onglet change la page affichée
- [ ] Chaque page a son propre set de widgets indépendant
- [ ] Le mode édition permet d'ajouter/supprimer des pages
- [ ] La config est sauvegardée/chargée au format v2
- [ ] La migration v1 → v2 fonctionne transparemment
- [ ] Le hash dans l'URL reflète la page active

## Améliorations futures

- [ ] Réorganisation des onglets par drag-and-drop
- [ ] Pages spéciales (MediaPage, SonosPage avec layout custom)
- [ ] Page Settings intégrée avec toute la config du dashboard
- [ ] Icône custom par page dans le modal d'édition
