# Widget AutomationCard — Spécification

> Widget pour activer/désactiver des automatisations Home Assistant.
> Inspiré du projet [Tunet](https://github.com/) — adapté à l'architecture ha-dashboard.

---

## Résumé

Un widget compact affichant une automatisation HA avec :
- Icône colorée (vert quand active, gris quand inactive)
- Nom de l'automatisation
- État (Actif / Inactif)
- Toggle switch intégré ou boutons ON/OFF
- Clic sur la carte entière = toggle

---

## Rendu visuel attendu

```
┌─────────────────────────────────────────┐
│  🤖  ARROSAGE JARDIN        ● ──── ○   │
│      Actif                              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  🤖  DÉTECTION MOUVEMENT    ○ ──── ●   │
│      Inactif                            │
└─────────────────────────────────────────┘
```

**Disposition horizontale (défaut)** — icône à gauche, nom + état au centre, toggle à droite.
Le fond de la carte change légèrement de teinte selon l'état (accent color quand ON, neutre quand OFF).

---

## Référence Tunet

Le projet Tunet implémente ce widget dans `src/rendering/cards/automationRenderer.jsx` :

```jsx
// Pattern simplifié de Tunet
const isOn = entities[cardId]?.state === 'on';
callService('automation', 'toggle', { entity_id: cardId });
```

**Points clés à reprendre :**
- Service HA : `automation.toggle` (un seul appel, pas besoin de turn_on/turn_off séparés)
- L'état est lu depuis `entity.state` (`'on'` ou `'off'`)
- L'icône vient de `entity.attributes.icon` (MDI) avec fallback sur une icône par défaut
- Le nom vient de `entity.attributes.friendly_name` avec override configurable

---

## Architecture — Fichiers à créer/modifier

### Fichiers à CRÉER

| Fichier | Description |
|---------|-------------|
| `src/components/cards/AutomationCard/AutomationCard.tsx` | Composant principal |
| `src/components/cards/AutomationCard/index.ts` | Barrel export |

### Fichiers à MODIFIER

| Fichier | Modification |
|---------|-------------|
| `src/types/widget-configs.ts` | Ajouter `AutomationCardConfig` + l'inclure dans l'union `WidgetConfig` + ajouter field defs + default config |
| `src/config/widget-dispositions.ts` | Ajouter les dispositions `automation` |
| `src/context/DashboardLayoutContext.tsx` | Ajouter `'automation'` au type `GridWidget['type']` + entrée dans `WIDGET_CATALOG` |
| `src/context/DashboardLayoutContext.tsx` | Ajouter dans `SIZE_PRESETS` (si encore utilisé) |
| Widget registry (là où le mapping type→composant est défini) | Ajouter `automation: AutomationCard` |

---

## 1. Config TypeScript

```typescript
// Dans src/types/widget-configs.ts

export interface AutomationCardConfig {
  type: 'automation';
  /** Entity ID de l'automatisation (domain: automation) */
  entityId: string;
  /** Nom affiché (override du friendly_name) */
  name?: string;
  /** Icône Lucide personnalisée */
  icon?: string;
}
```

### Default config

```typescript
automation: {
  type: 'automation',
  entityId: 'automation.example',
},
```

### Field definitions (pour le modal d'édition)

```typescript
automation: [
  { key: 'entityId', label: 'Automatisation', fieldType: 'entity', domain: 'automation' },
  { key: 'name', label: 'Nom affiché', fieldType: 'text' },
  { key: 'icon', label: 'Icône', fieldType: 'icon' },
],
```

---

## 2. Dispositions & Tailles

```typescript
// Dans src/config/widget-dispositions.ts

automation: [
  {
    id: 'horizontal',
    label: 'Horizontale',
    minSize:     { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },
    defaultSize: { lg: { w: 3, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 4, h: 1 } },
  },
],
```

> Ce widget est naturellement compact (1 row de haut). Il peut s'étirer en largeur mais n'a pas besoin de disposition verticale.

### WIDGET_CATALOG

```typescript
{ type: 'automation', label: 'Automatisation', lg: { w: 3, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 4, h: 1 } },
```

### SIZE_PRESETS (si encore utilisé)

```typescript
automation: {
  lg: [
    { name: 'Compact', w: 2, h: 1 },
    { name: 'Normal', w: 3, h: 1 },
    { name: 'Large', w: 4, h: 1 },
  ],
  md: [
    { name: 'Compact', w: 2, h: 1 },
    { name: 'Normal', w: 4, h: 1 },
    { name: 'Large', w: 6, h: 1 },
  ],
  sm: [
    { name: 'Compact', w: 2, h: 1 },
    { name: 'Normal', w: 4, h: 1 },
    { name: 'Large', w: 4, h: 1 },
  ],
},
```

---

## 3. Composant AutomationCard

```tsx
// src/components/cards/AutomationCard/AutomationCard.tsx

import { motion } from 'framer-motion';
import { Workflow } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { cn } from '@/lib/utils';
import { resolveIcon } from '@/lib/lucide-icon-map';
import type { AutomationCardConfig } from '@/types/widget-configs';

export function AutomationCard() {
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<AutomationCardConfig>(widgetId || 'automation');
  const entityId = config?.entityId ?? 'automation.example';

  const entity = useSafeEntity(entityId);
  const { callService } = useHass();

  if (!entity) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="gc rounded-3xl p-4 flex items-center justify-center h-full"
      >
        <span className="text-white/30 text-sm">Automatisation introuvable</span>
      </motion.div>
    );
  }

  const isOn = entity.state === 'on';
  const name = config?.name ?? entity.attributes.friendly_name ?? entityId;

  // Résoudre l'icône : config > attribut HA > fallback Workflow
  const IconComponent = config?.icon
    ? resolveIcon(config.icon) ?? Workflow
    : Workflow;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    callService({
      domain: 'automation',
      service: 'toggle',
      serviceData: { entity_id: entityId },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onClick={handleToggle}
      className={cn(
        'gc rounded-3xl p-4 h-full flex items-center justify-between gap-4 cursor-pointer',
        'transition-all duration-300',
        isOn
          ? 'border border-emerald-500/20 bg-emerald-500/5'
          : 'border border-white/5',
      )}
    >
      {/* Icône + infos */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            'rounded-2xl p-2.5 transition-colors shrink-0',
            isOn
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-white/5 text-white/30',
          )}
        >
          <IconComponent size={20} />
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-white truncate">
            {name}
          </span>
          <span
            className={cn(
              'text-[10px] font-bold uppercase tracking-widest',
              isOn ? 'text-emerald-400' : 'text-white/30',
            )}
          >
            {isOn ? 'Actif' : 'Inactif'}
          </span>
        </div>
      </div>

      {/* Toggle switch */}
      <div
        className={cn(
          'relative h-6 w-10 rounded-full shrink-0 transition-colors',
          isOn ? 'bg-emerald-500/60' : 'bg-white/10',
        )}
      >
        <div
          className={cn(
            'absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all',
            isOn ? 'left-[calc(100%-20px)]' : 'left-1',
          )}
        />
      </div>
    </motion.div>
  );
}
```

### Barrel export

```typescript
// src/components/cards/AutomationCard/index.ts
export { AutomationCard } from './AutomationCard';
```

---

## 4. Appel de service Home Assistant

| Action | Service | Payload |
|--------|---------|---------|
| Toggle | `automation.toggle` | `{ entity_id: 'automation.xxx' }` |

Un seul service `toggle` suffit — il inverse l'état actuel. Pas besoin de `turn_on` / `turn_off` séparés.

> **Note :** `callService` dans `@hakit/core` utilise le format objet :
> ```typescript
> callService({
>   domain: 'automation',
>   service: 'toggle',
>   serviceData: { entity_id: entityId },
> });
> ```
> Vérifier le format exact utilisé dans les autres cards du projet (ex: `AlarmCard`, `CoverCard`) et s'aligner.

---

## 5. Checklist d'implémentation

### Création
- [ ] Créer `src/components/cards/AutomationCard/AutomationCard.tsx`
- [ ] Créer `src/components/cards/AutomationCard/index.ts`

### Types & config
- [ ] Ajouter `AutomationCardConfig` dans `src/types/widget-configs.ts`
- [ ] Ajouter `'automation'` à l'union `WidgetConfig`
- [ ] Ajouter le default config dans `DEFAULT_WIDGET_CONFIGS`
- [ ] Ajouter les field defs dans `WIDGET_FIELD_DEFS`

### Registre & grid
- [ ] Ajouter `'automation'` au type union `GridWidget['type']` dans `DashboardLayoutContext.tsx`
- [ ] Ajouter l'entrée dans `WIDGET_CATALOG`
- [ ] Ajouter dans `SIZE_PRESETS` (si utilisé)
- [ ] Ajouter dans le widget registry (mapping type → composant)

### Dispositions
- [ ] Ajouter `automation` dans `src/config/widget-dispositions.ts`

### Validation
- [ ] `tsc --noEmit` passe sans erreur
- [ ] Le widget apparaît dans le modal "Ajouter un widget"
- [ ] Le widget se configure via le modal d'édition (entity picker filtre `automation.*`)
- [ ] Le toggle fonctionne (clic → `automation.toggle`)
- [ ] L'état visuel reflète `entity.state` en temps réel
- [ ] Le widget fonctionne dans les 3 breakpoints (lg, md, sm)
- [ ] Sauvegarde et rechargement conservent la config

---

## 6. Évolutions futures possibles

| Idée | Description |
|------|-------------|
| **Multi-automations** | Un widget qui affiche une liste de N automatisations (comme une grille) |
| **Last triggered** | Afficher `entity.attributes.last_triggered` en sous-titre |
| **Icône MDI** | Résoudre les icônes MDI de HA (`mdi:robot`) vers Lucide |
| **Couleur personnalisable** | Champ `color` dans la config (gradient picker) au lieu du vert fixe |
| **Mode "boutons AV/PÅ"** | Variante avec 2 boutons explicites au lieu du toggle switch |
