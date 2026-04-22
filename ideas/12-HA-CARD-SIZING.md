# 12 — HA-Style Card Sizing : Redimensionnement libre avec sliders

## Problème actuel

Aujourd'hui les widgets ont des **tailles prédéfinies** (Compact / Normal / Large) via `SIZE_PRESETS`. On cycle entre elles avec un bouton. C'est limité :
- Pas de taille intermédiaire (ex: 5 colonnes)
- Pas de contrôle fin hauteur/largeur indépendamment
- Les presets sont définis par le développeur, pas l'utilisateur

## Modèle Home Assistant (cible)

HA a un système en deux parties (visible dans les screenshots) :

1. **Disposition du contenu** — L'utilisateur choisit une disposition (Horizontale/Verticale) qui définit **les dimensions minimum** de la card
2. **Redimensionnement libre** — L'utilisateur ajuste la largeur (en colonnes) et la hauteur (en lignes) via des **sliders visuels** sur la grille, avec un minimum imposé par la disposition choisie

HA montre une **prévisualisation en temps réel** dans le modal de configuration avec :
- Un slider horizontal en haut pour la largeur (colonnes)
- Un slider vertical à gauche pour la hauteur (lignes)
- La carte prévisualisée dans la grille de fond

## Résultat attendu

- Les `SIZE_PRESETS` deviennent des **dispositions** (layout variants) avec des tailles min
- L'utilisateur peut librement agrandir au-delà du minimum
- Un modal "Mise en page" avec sliders colonnes/lignes interactifs
- Le widget sur la grille a un **handle de resize** dans le coin bas-droite (en mode édition)
- Aucun widget ne peut être plus petit que sa taille minimum

---

## Architecture

### Nouveau modèle de données

```typescript
// Avant : SIZE_PRESETS → tailles fixes
// Après : WIDGET_DISPOSITIONS → tailles MINIMUM

interface WidgetDisposition {
  id: string;                    // 'horizontal' | 'vertical' | 'compact' | etc.
  label: string;                 // 'Horizontale' | 'Verticale'
  /** Taille minimum en colonnes/lignes par breakpoint */
  minSize: Record<'lg' | 'md' | 'sm', { w: number; h: number }>;
  /** Taille par défaut (celle qu'on utilise si l'user ne resize pas) */
  defaultSize: Record<'lg' | 'md' | 'sm', { w: number; h: number }>;
}

// Le GridWidget gagne un champ `disposition` :
interface GridWidget {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;      // Largeur actuelle (>= minSize.w de la disposition choisie)
  h: number;      // Hauteur actuelle (>= minSize.h de la disposition choisie)
  static?: boolean;
  disposition?: string; // ID de la disposition choisie ('horizontal', 'vertical', etc.)
}
```

---

## Étape 1 : Définir les dispositions par type de widget

### `src/config/widget-dispositions.ts`

```typescript
export interface WidgetDisposition {
  id: string;
  label: string;
  description?: string;
  /** Taille minimum (on ne peut pas aller en dessous) */
  minSize: Record<'lg' | 'md' | 'sm', { w: number; h: number }>;
  /** Taille par défaut pour un nouveau widget */
  defaultSize: Record<'lg' | 'md' | 'sm', { w: number; h: number }>;
}

export type WidgetDispositions = Record<string, WidgetDisposition[]>;

/**
 * Dispositions disponibles par type de widget.
 * Chaque type a au moins une disposition.
 * Les tailles min garantissent que le contenu reste lisible.
 */
export const WIDGET_DISPOSITIONS: WidgetDispositions = {
  // ── Weather ────────────────────────────────────
  weather: [
    {
      id: 'horizontal',
      label: 'Horizontale',
      description: 'Température + prévisions côte à côte',
      minSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
      defaultSize: { lg: { w: 3, h: 3 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
    },
    {
      id: 'vertical',
      label: 'Verticale',
      description: 'Température au-dessus, prévisions en dessous',
      minSize: { lg: { w: 2, h: 3 }, md: { w: 2, h: 3 }, sm: { w: 2, h: 3 } },
      defaultSize: { lg: { w: 2, h: 4 }, md: { w: 2, h: 4 }, sm: { w: 2, h: 4 } },
    },
  ],

  // ── Thermostat ─────────────────────────────────
  thermostat: [
    {
      id: 'horizontal',
      label: 'Horizontale',
      minSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
      defaultSize: { lg: { w: 3, h: 3 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
    },
    {
      id: 'vertical',
      label: 'Verticale',
      minSize: { lg: { w: 2, h: 3 }, md: { w: 2, h: 3 }, sm: { w: 2, h: 3 } },
      defaultSize: { lg: { w: 2, h: 4 }, md: { w: 2, h: 4 }, sm: { w: 2, h: 4 } },
    },
  ],

  // ── Camera ─────────────────────────────────────
  camera: [
    {
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
      defaultSize: { lg: { w: 6, h: 3 }, md: { w: 8, h: 3 }, sm: { w: 4, h: 2 } },
    },
  ],

  // ── Sensor ─────────────────────────────────────
  sensor: [
    {
      id: 'horizontal',
      label: 'Horizontale',
      description: 'Icône + valeur côte à côte',
      minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },
      defaultSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 2, h: 2 } },
    },
    {
      id: 'vertical',
      label: 'Verticale',
      description: 'Icône au-dessus, valeur en dessous',
      minSize: { lg: { w: 1, h: 2 }, md: { w: 1, h: 2 }, sm: { w: 1, h: 2 } },
      defaultSize: { lg: { w: 2, h: 2 }, md: { w: 2, h: 2 }, sm: { w: 2, h: 2 } },
    },
  ],

  // ── Light ──────────────────────────────────────
  light: [
    {
      id: 'horizontal',
      label: 'Horizontale',
      minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },
      defaultSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 2, h: 2 } },
    },
    {
      id: 'vertical',
      label: 'Verticale',
      minSize: { lg: { w: 1, h: 2 }, md: { w: 1, h: 2 }, sm: { w: 1, h: 2 } },
      defaultSize: { lg: { w: 2, h: 3 }, md: { w: 2, h: 3 }, sm: { w: 2, h: 3 } },
    },
  ],

  // ── Media Player ───────────────────────────────
  media_player: [
    {
      id: 'horizontal',
      label: 'Horizontale',
      description: 'Cover + infos côte à côte',
      minSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
      defaultSize: { lg: { w: 4, h: 3 }, md: { w: 4, h: 3 }, sm: { w: 4, h: 3 } },
    },
    {
      id: 'vertical',
      label: 'Verticale',
      description: 'Cover au-dessus, contrôles en dessous',
      minSize: { lg: { w: 2, h: 3 }, md: { w: 2, h: 3 }, sm: { w: 2, h: 3 } },
      defaultSize: { lg: { w: 3, h: 4 }, md: { w: 3, h: 4 }, sm: { w: 4, h: 4 } },
    },
  ],

  // ── Rooms, Shortcuts, etc. — disposition unique ────────
  rooms: [{
    id: 'default', label: 'Standard',
    minSize: { lg: { w: 3, h: 3 }, md: { w: 4, h: 3 }, sm: { w: 4, h: 2 } },
    defaultSize: { lg: { w: 4, h: 5 }, md: { w: 8, h: 4 }, sm: { w: 4, h: 4 } },
  }],
  shortcuts: [{
    id: 'default', label: 'Standard',
    minSize: { lg: { w: 2, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
    defaultSize: { lg: { w: 4, h: 3 }, md: { w: 8, h: 3 }, sm: { w: 4, h: 3 } },
  }],
  tempo: [{
    id: 'default', label: 'Standard',
    minSize: { lg: { w: 2, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 4, h: 1 } },
    defaultSize: { lg: { w: 4, h: 2 }, md: { w: 8, h: 2 }, sm: { w: 4, h: 2 } },
  }],
  energy: [{
    id: 'default', label: 'Standard',
    minSize: { lg: { w: 2, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 4, h: 1 } },
    defaultSize: { lg: { w: 4, h: 2 }, md: { w: 8, h: 2 }, sm: { w: 4, h: 2 } },
  }],
  activity: [{
    id: 'default', label: 'Standard',
    minSize: { lg: { w: 6, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 3, h: 1 } },
    defaultSize: { lg: { w: 11, h: 1 }, md: { w: 7, h: 1 }, sm: { w: 3, h: 1 } },
  }],
  greeting: [{
    id: 'default', label: 'Standard',
    minSize: { lg: { w: 1, h: 1 }, md: { w: 1, h: 1 }, sm: { w: 1, h: 1 } },
    defaultSize: { lg: { w: 1, h: 1 }, md: { w: 1, h: 1 }, sm: { w: 1, h: 1 } },
  }],
};

/**
 * Récupère la disposition active d'un widget.
 * Fallback sur la première disposition du type.
 */
export function getDisposition(
  widgetType: string,
  dispositionId?: string,
): WidgetDisposition | undefined {
  const dispositions = WIDGET_DISPOSITIONS[widgetType];
  if (!dispositions?.length) return undefined;
  if (dispositionId) {
    return dispositions.find(d => d.id === dispositionId) ?? dispositions[0];
  }
  return dispositions[0];
}

/**
 * Retourne la taille minimum pour un widget à un breakpoint donné.
 */
export function getMinSize(
  widgetType: string,
  breakpoint: 'lg' | 'md' | 'sm',
  dispositionId?: string,
): { w: number; h: number } {
  const disposition = getDisposition(widgetType, dispositionId);
  return disposition?.minSize[breakpoint] ?? { w: 1, h: 1 };
}
```

---

## Étape 2 : Ajouter `disposition` au GridWidget

Fichier : `src/context/DashboardLayoutContext.tsx`

```typescript
export interface GridWidget {
  id: string;
  type: '...';
  x: number;
  y: number;
  w: number;
  h: number;
  static?: boolean;
  /** ID de la disposition choisie (ex: 'horizontal', 'vertical') */
  disposition?: string;
}
```

Modifier `addWidgetByType` pour utiliser `defaultSize` au lieu de `WIDGET_CATALOG` :

```typescript
import { WIDGET_DISPOSITIONS, getDisposition } from '@/config/widget-dispositions';

const addWidgetByType = useCallback((type: GridWidget['type']) => {
  const dispositions = WIDGET_DISPOSITIONS[type];
  if (!dispositions?.length) return;
  
  const disposition = dispositions[0]; // Disposition par défaut
  
  setLayout(prev => {
    const maxY = (ws: GridWidget[]) => (ws.length ? Math.max(...ws.map(w => w.y + w.h)) : 0);
    const make = (bp: 'lg' | 'md' | 'sm', y: number): GridWidget => ({
      id: type,
      type,
      x: 0,
      y,
      w: disposition.defaultSize[bp].w,
      h: disposition.defaultSize[bp].h,
      disposition: disposition.id,
    });
    return {
      ...prev,
      widgets: {
        lg: [...prev.widgets.lg, make('lg', maxY(prev.widgets.lg))],
        md: [...prev.widgets.md, make('md', maxY(prev.widgets.md))],
        sm: [...prev.widgets.sm, make('sm', maxY(prev.widgets.sm))],
      },
    };
  });
}, []);
```

---

## Étape 3 : Onglet "Mise en page" dans le WidgetEditModal

Ajouter un onglet "Mise en page" (comme dans HA) dans le modal d'édition existant :

### `src/components/layout/CardLayoutTab.tsx`

```typescript
import { useState, useMemo } from 'react';
import { useDashboardLayout, type GridWidget } from '@/context/DashboardLayoutContext';
import { WIDGET_DISPOSITIONS, getDisposition, getMinSize } from '@/config/widget-dispositions';
import { cn } from '@/lib/utils';

interface CardLayoutTabProps {
  widgetId: string;
  breakpoint: 'lg' | 'md' | 'sm';
}

export function CardLayoutTab({ widgetId, breakpoint }: CardLayoutTabProps) {
  const { layout, updateWidget } = useDashboardLayout();
  const widget = layout.widgets[breakpoint]?.find(w => w.id === widgetId);
  
  if (!widget) return null;

  const cols = layout.cols[breakpoint];
  const dispositions = WIDGET_DISPOSITIONS[widget.type] ?? [];
  const currentDisposition = getDisposition(widget.type, widget.disposition);
  const minSize = getMinSize(widget.type, breakpoint, widget.disposition);
  
  // Limites
  const maxW = cols; // Largeur max = toutes les colonnes
  const maxH = 12;   // Hauteur max arbitraire (12 lignes)

  // Handlers
  const setWidth = (w: number) => {
    const clamped = Math.max(minSize.w, Math.min(maxW, w));
    updateWidget(widgetId, { w: clamped }, breakpoint);
  };

  const setHeight = (h: number) => {
    const clamped = Math.max(minSize.h, Math.min(maxH, h));
    updateWidget(widgetId, { h: clamped }, breakpoint);
  };

  const setDisposition = (dispositionId: string) => {
    const newDisposition = dispositions.find(d => d.id === dispositionId);
    if (!newDisposition) return;
    
    const newMin = newDisposition.minSize[breakpoint];
    const newDefault = newDisposition.defaultSize[breakpoint];
    
    // Si la taille actuelle est en dessous du nouveau minimum, ajuster
    updateWidget(widgetId, {
      disposition: dispositionId,
      w: Math.max(newMin.w, Math.min(widget.w, maxW)),
      h: Math.max(newMin.h, widget.h),
    }, breakpoint);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Disposition du contenu ──────────────────────────── */}
      {dispositions.length > 1 && (
        <div>
          <h4 className="text-white/60 text-sm mb-3">Disposition du contenu</h4>
          <div className="grid grid-cols-2 gap-3">
            {dispositions.map(disp => (
              <button
                key={disp.id}
                onClick={() => setDisposition(disp.id)}
                className={cn(
                  'p-4 rounded-2xl border text-left transition-all',
                  widget.disposition === disp.id || (!widget.disposition && disp === dispositions[0])
                    ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30'
                    : 'border-white/10 bg-white/5 hover:bg-white/8',
                )}
              >
                {/* Preview visuelle de la disposition */}
                <div className="flex items-center justify-center mb-3 h-12">
                  {disp.id === 'horizontal' ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10">
                      <div className="w-6 h-6 rounded-full bg-white/20" />
                      <div className="flex flex-col gap-1">
                        <div className="w-12 h-1.5 rounded bg-white/30" />
                        <div className="w-8 h-1 rounded bg-white/15" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10">
                      <div className="w-6 h-6 rounded-full bg-white/20" />
                      <div className="w-10 h-1.5 rounded bg-white/30" />
                    </div>
                  )}
                </div>
                <div className="text-sm font-medium text-white/80">{disp.label}</div>
                {disp.description && (
                  <div className="text-[11px] text-white/30 mt-1">{disp.description}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Prévisualisation grille + sliders ────────────────── */}
      <div>
        <h4 className="text-white/60 text-sm mb-3">Taille sur la grille</h4>
        
        <div className="flex gap-3">
          {/* Slider vertical (hauteur) à gauche */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-white/30">{widget.h}</span>
            <input
              type="range"
              min={minSize.h}
              max={maxH}
              value={widget.h}
              onChange={(e) => setHeight(parseInt(e.target.value))}
              className="h-32 appearance-none cursor-pointer
                [writing-mode:vertical-lr] [direction:rtl]
                [&::-webkit-slider-track]:rounded-full
                [&::-webkit-slider-track]:bg-white/10
                [&::-webkit-slider-track]:w-2
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-blue-500"
            />
          </div>

          {/* Grille de preview */}
          <div className="flex flex-col gap-1 flex-1">
            {/* Slider horizontal (largeur) au-dessus */}
            <div className="flex items-center gap-2 mb-1">
              <input
                type="range"
                min={minSize.w}
                max={maxW}
                value={widget.w}
                onChange={(e) => setWidth(parseInt(e.target.value))}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-white/10
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-blue-500"
              />
              <span className="text-[10px] text-white/30 min-w-[2ch]">{widget.w}</span>
            </div>

            {/* Grille miniature */}
            <GridPreview
              cols={cols}
              widgetW={widget.w}
              widgetH={widget.h}
              widgetX={widget.x}
            />
          </div>
        </div>
      </div>

      {/* ── Info taille min ──────────────────────────────────── */}
      <div className="text-[11px] text-white/20">
        Taille minimum : {minSize.w} colonnes × {minSize.h} lignes
        ({breakpoint === 'lg' ? 'Desktop' : breakpoint === 'md' ? 'Tablette' : 'Mobile'})
      </div>
    </div>
  );
}

// ── Mini-grille de prévisualisation ─────────────────────────────────────────
function GridPreview({ cols, widgetW, widgetH, widgetX }: {
  cols: number; widgetW: number; widgetH: number; widgetX: number;
}) {
  const displayRows = Math.max(widgetH + 1, 4);

  return (
    <div
      className="grid gap-1 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridAutoRows: '12px',
      }}
    >
      {Array.from({ length: displayRows * cols }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const isWidget = col >= widgetX && col < widgetX + widgetW
          && row >= 0 && row < widgetH;

        return (
          <div
            key={i}
            className={cn(
              'rounded-sm transition-colors',
              isWidget
                ? 'bg-blue-500/40 border border-blue-500/50'
                : 'bg-white/[0.04] border border-white/[0.03]',
            )}
          />
        );
      })}
    </div>
  );
}
```

---

## Étape 4 : Handle de resize sur la grille (drag corner)

Ajouter un handle de resize dans le coin bas-droit de chaque widget en mode édition :

Dans `DashboardGrid.tsx`, dans le composant `EditOverlay` :

```typescript
// Ajouter dans EditOverlay, en bas à droite :
<div
  className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-20
    flex items-center justify-center"
  onMouseDown={(e) => {
    e.stopPropagation(); // Ne pas trigger le drag du widget
    e.preventDefault();
    startResize(id, breakpoint, e.clientX, e.clientY);
  }}
  onTouchStart={(e) => {
    e.stopPropagation();
    const touch = e.touches[0];
    if (touch) startResize(id, breakpoint, touch.clientX, touch.clientY);
  }}
>
  {/* Icône resize (3 lignes diagonales) */}
  <svg width="10" height="10" viewBox="0 0 10 10" className="text-white/30">
    <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" />
    <line x1="9" y1="4" x2="4" y2="9" stroke="currentColor" strokeWidth="1.5" />
    <line x1="9" y1="7" x2="7" y2="9" stroke="currentColor" strokeWidth="1.5" />
  </svg>
</div>
```

### Logique de resize (dans DashboardGrid)

```typescript
// État de resize
const resizeRef = useRef<{
  widgetId: string;
  breakpoint: 'lg' | 'md' | 'sm';
  startX: number;
  startY: number;
  startW: number;
  startH: number;
} | null>(null);

const startResize = useCallback((
  widgetId: string, breakpoint: 'lg' | 'md' | 'sm',
  clientX: number, clientY: number,
) => {
  const widget = widgets.find(w => w.id === widgetId);
  if (!widget) return;
  resizeRef.current = {
    widgetId, breakpoint,
    startX: clientX, startY: clientY,
    startW: widget.w, startH: widget.h,
  };

  const onMove = (moveX: number, moveY: number) => {
    if (!resizeRef.current || !outerRef.current) return;
    const containerRect = outerRef.current.getBoundingClientRect();
    const cellWidth = (containerRect.width - (cols - 1) * GAP) / cols;
    const cellHeight = ROW_HEIGHT;

    // Calcul du delta en cellules
    const deltaW = Math.round((moveX - resizeRef.current.startX) / (cellWidth + GAP));
    const deltaH = Math.round((moveY - resizeRef.current.startY) / (cellHeight + GAP));

    const minSize = getMinSize(widget.type, breakpoint, widget.disposition);
    const newW = Math.max(minSize.w, Math.min(cols - widget.x, resizeRef.current.startW + deltaW));
    const newH = Math.max(minSize.h, resizeRef.current.startH + deltaH);

    updateWidget(widgetId, { w: newW, h: newH }, breakpoint);
  };

  const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
  const onTouchMove = (e: TouchEvent) => {
    const t = e.touches[0];
    if (t) onMove(t.clientX, t.clientY);
  };
  const onEnd = () => {
    resizeRef.current = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onEnd);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onEnd);
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onEnd);
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onEnd);
}, [widgets, cols, updateWidget]);
```

---

## Étape 5 : Intégrer l'onglet "Mise en page" dans WidgetEditModal

Dans `WidgetEditModal.tsx`, ajouter un système d'onglets :

```typescript
import { CardLayoutTab } from './CardLayoutTab';

// Dans le modal, ajouter des onglets comme HA :
const [activeTab, setActiveTab] = useState<'config' | 'layout'>('config');

// Render :
<div className="flex border-b border-white/10 mb-4">
  <button
    onClick={() => setActiveTab('config')}
    className={cn(
      'px-4 py-2 text-sm font-medium transition-colors',
      activeTab === 'config'
        ? 'text-blue-400 border-b-2 border-blue-400'
        : 'text-white/40 hover:text-white/60',
    )}
  >
    Configuration
  </button>
  <button
    onClick={() => setActiveTab('layout')}
    className={cn(
      'px-4 py-2 text-sm font-medium transition-colors',
      activeTab === 'layout'
        ? 'text-blue-400 border-b-2 border-blue-400'
        : 'text-white/40 hover:text-white/60',
    )}
  >
    Mise en page
  </button>
</div>

{activeTab === 'config' && (
  /* ... contenu existant (entity picker, etc.) ... */
)}

{activeTab === 'layout' && (
  <CardLayoutTab widgetId={editingWidgetId} breakpoint={breakpoint} />
)}
```

---

## Étape 6 : Migration — supprimer SIZE_PRESETS progressivement

Le `cycleSize` et `getCurrentPresetName` peuvent rester temporairement pour les widgets qui n'ont pas encore de dispositions. Migration progressive :

1. Si le widget a une `disposition` → utiliser le nouveau système (min/max + sliders)
2. Si le widget n'a pas de `disposition` → fallback sur l'ancien `SIZE_PRESETS`
3. Quand tous les types sont migrés → supprimer `SIZE_PRESETS` et `cycleSize`

```typescript
// Dans EditOverlay, remplacer le bouton cycleSize par :
{WIDGET_DISPOSITIONS[widget.type]?.length ? (
  <button onClick={() => setEditingWidgetId(id)}
    className="... cursor-pointer"
    title="Mise en page">
    <MoveDiagonal size={11} />
    <span className="text-[10px]">{widget.w}×{widget.h}</span>
  </button>
) : (
  // Ancien système (fallback)
  <button onClick={() => cycleSize(id, breakpoint)} ...>
    <MoveDiagonal size={11} />
    <span className="text-[10px]">{presetName ?? 'Normal'}</span>
  </button>
)}
```

---

## Vérification

- [ ] Le sélecteur de disposition (Horizontale/Verticale) change la taille min du widget
- [ ] Les sliders largeur/hauteur dans "Mise en page" fonctionnent
- [ ] On ne peut pas réduire en dessous de la taille minimum
- [ ] On peut agrandir librement au-delà de la taille par défaut
- [ ] La mini-grille de preview montre le widget en bleu à la bonne position
- [ ] Le handle de resize en bas-droite fonctionne à la souris et au touch
- [ ] Le resize respecte le minimum de la disposition active
- [ ] Le resize ne fait pas sortir le widget de la grille (clamp horizontal)
- [ ] Les anciens widgets sans `disposition` continuent de fonctionner (fallback SIZE_PRESETS)
- [ ] `npx tsc --noEmit` passe

## Améliorations futures

- [ ] Onglet "Visibilité" comme HA (conditions d'affichage)
- [ ] Toggle "Pleine largeur" qui set w = cols automatiquement
- [ ] "Mode précis" toggle (comme HA) qui affiche les valeurs exactes
- [ ] Chaque disposition adapte le rendu interne du widget (layout horizontal vs vertical)
- [ ] Sync des tailles cross-breakpoints (modifier lg → auto-ajuster md/sm proportionnellement)
