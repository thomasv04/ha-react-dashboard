# 05 — CoverCard : Volets & Stores

## Objectif

Créer un widget **CoverCard** pour contrôler les volets, stores, portes de garage et autres covers Home Assistant. Interface visuelle avec slider de position et boutons open/close/stop.

## Résultat attendu

- Représentation visuelle de l'état du volet (barre de progression verticale ou horizontale)
- Boutons : Ouvrir / Stop / Fermer
- Slider de position (0-100%)
- Affichage du pourcentage de position
- Support des tilt (inclinaison) pour les stores vénitiens
- État : open, closed, opening, closing

---

## Étape 1 : Type de config

Fichier : `src/types/widget-configs.ts`

```typescript
// ── Cover (volets/stores) ─────────────────────────────────────────────────────
export interface CoverCardConfig {
  type: 'cover';
  entityId: string;        // cover.volet_salon
  name?: string;           // Nom custom
  icon?: string;           // Icône lucide (sinon Blinds par défaut)
  /** Afficher le contrôle de tilt (inclinaison) si supporté */
  showTilt?: boolean;
}
```

Ajouter à `WidgetConfig` union et `DEFAULT_WIDGET_CONFIGS`:
```typescript
cover: {
  type: 'cover',
  entityId: 'cover.volet_salon',
  name: 'Volet Salon',
},
```

---

## Étape 2 : Enregistrer dans le système de grille

```typescript
// GridWidget['type'] — ajouter 'cover'

// WIDGET_CATALOG
{ type: 'cover', label: 'Volet', lg: { w: 2, h: 3 }, md: { w: 2, h: 3 }, sm: { w: 2, h: 3 } },

// SIZE_PRESETS
cover: {
  lg: [{ name: 'Compact', w: 2, h: 2 }, { name: 'Normal', w: 2, h: 3 }, { name: 'Large', w: 3, h: 4 }],
  md: [{ name: 'Compact', w: 2, h: 2 }, { name: 'Normal', w: 2, h: 3 }, { name: 'Large', w: 4, h: 3 }],
  sm: [{ name: 'Compact', w: 2, h: 2 }, { name: 'Normal', w: 2, h: 3 }, { name: 'Large', w: 4, h: 3 }],
},

// WIDGET_LABELS
cover: 'Volet',
```

---

## Étape 3 : Composant CoverCard

### `src/components/cards/CoverCard/index.ts`
```typescript
export { CoverCard } from './CoverCard';
```

### `src/components/cards/CoverCard/CoverCard.tsx`

```typescript
import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Blinds, ChevronUp, ChevronDown, Square } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import type { CoverCardConfig } from '@/types/widget-configs';
import { cn } from '@/lib/utils';

export function CoverCard() {
  const { getWidgetConfig } = useDashboardLayout();
  const config = getWidgetConfig<CoverCardConfig>('cover');
  const entityId = config?.entityId ?? 'cover.volet_salon';

  const entity = useSafeEntity(entityId);
  const { helpers } = useHass();
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!entity) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="gc rounded-3xl p-5 flex items-center justify-center h-full"
      >
        <span className="text-white/30 text-sm">Volet introuvable</span>
      </motion.div>
    );
  }

  const name = config?.name ?? (entity.attributes.friendly_name as string) ?? entityId;
  const state = entity.state; // open, closed, opening, closing
  const position = (entity.attributes.current_position as number | undefined) ?? 0;
  const isOpen = state === 'open' || position > 0;
  const isMoving = state === 'opening' || state === 'closing';

  // Actions
  const openCover = () => {
    helpers.callService({
      domain: 'cover',
      service: 'open_cover',
      target: { entity_id: entityId },
    });
  };

  const closeCover = () => {
    helpers.callService({
      domain: 'cover',
      service: 'close_cover',
      target: { entity_id: entityId },
    });
  };

  const stopCover = () => {
    helpers.callService({
      domain: 'cover',
      service: 'stop_cover',
      target: { entity_id: entityId },
    });
  };

  const setPosition = (pos: number) => {
    helpers.callService({
      domain: 'cover',
      service: 'set_cover_position',
      target: { entity_id: entityId },
      serviceData: { position: Math.round(pos) },
    });
  };

  // ── Vertical slider via pointer events ────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    // En haut = 100% (ouvert), en bas = 0% (fermé)
    const pct = Math.max(0, Math.min(100, ((rect.bottom - e.clientY) / rect.height) * 100));
    setPosition(pct);
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // La barre de position : visuel du % fermé
  // HA: position 100 = ouvert, position 0 = fermé
  const closedPercent = 100 - position;

  // État en français
  const stateLabel =
    state === 'open' ? 'Ouvert' :
    state === 'closed' ? 'Fermé' :
    state === 'opening' ? 'Ouverture...' :
    state === 'closing' ? 'Fermeture...' : state;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="gc rounded-3xl p-5 flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Blinds size={20} className={cn(
          isOpen ? 'text-blue-400' : 'text-white/40',
          isMoving && 'animate-pulse',
        )} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          {stateLabel}
        </span>
      </div>

      {/* Vertical slider - représentation visuelle du volet */}
      <div
        ref={sliderRef}
        className="flex-1 relative mx-auto w-16 rounded-xl bg-white/5 overflow-hidden cursor-ns-resize min-h-[80px]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Partie "fermée" (depuis le haut) */}
        <div
          className="absolute top-0 left-0 right-0 bg-blue-500/30 transition-all duration-300 rounded-t-xl"
          style={{ height: `${closedPercent}%` }}
        >
          {/* Lignes horizontales = lames du volet */}
          {Array.from({ length: Math.max(1, Math.floor(closedPercent / 12)) }, (_, i) => (
            <div
              key={i}
              className="w-full h-px bg-blue-400/30 mt-3 first:mt-0"
            />
          ))}
        </div>

        {/* Label % au centre */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-lg drop-shadow-lg">
            {position}%
          </span>
        </div>
      </div>

      {/* Boutons open/stop/close */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <button
          onClick={openCover}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <ChevronUp size={18} className="text-white/60" />
        </button>
        <button
          onClick={stopCover}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <Square size={14} className="text-white/60" />
        </button>
        <button
          onClick={closeCover}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <ChevronDown size={18} className="text-white/60" />
        </button>
      </div>

      {/* Nom */}
      <div className="text-white/40 text-xs uppercase tracking-wider text-center mt-2">
        {name}
      </div>
    </motion.div>
  );
}
```

---

## Étape 4 : Enregistrer partout

Dashboard.tsx:
```typescript
import { CoverCard } from '@/components/cards/CoverCard/CoverCard';
case 'cover': return <CoverCard />;
```

WidgetEditModal.tsx → `WIDGET_COMPONENTS`:
```typescript
cover: CoverCard,
```

---

## Vérification

- [ ] `npx tsc --noEmit` passe
- [ ] Le slider vertical affiche correctement la position du volet
- [ ] Les boutons Ouvrir / Stop / Fermer fonctionnent
- [ ] Le drag sur le slider vertical change la position
- [ ] Le label % est bien centré sur le slider
- [ ] Les lames horizontales (lignes) représentent visuellement le volet fermé

## Améliorations futures

- [ ] Tilt control pour les stores vénitiens
- [ ] Animation de transition lors de l'ouverture/fermeture
- [ ] Preset positions (ex: 50%, favoris)
- [ ] CoverPanel / CoverModal pour un contrôle plus fin
