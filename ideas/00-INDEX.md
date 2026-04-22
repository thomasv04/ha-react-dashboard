# Roadmap d'implémentation — ha-dashboard

## Vue d'ensemble

Ce dossier contient des guides détaillés, étape par étape, pour implémenter les fonctionnalités manquantes dans ha-dashboard en s'inspirant de Tunet. Chaque fichier est autonome et peut être donné directement à Copilot comme prompt.

## Ordre recommandé

### Phase 1 — Nouveaux widgets essentiels (priorité haute)

| # | Guide | Difficulté | Temps estimé | Dépendances |
|---|-------|-----------|-------------|-------------|
| 01 | [SensorCard](./01-SENSOR-CARD.md) | 🟡 Moyen | — | Charts (07) optionnel |
| 02 | [LightCard + LightModal](./02-LIGHT-CARD.md) | 🟡 Moyen | — | Aucune |
| 03 | [PersonStatus](./03-PERSON-STATUS.md) | 🟢 Facile | — | Aucune |
| 04 | [MediaPlayerCard](./04-MEDIA-PLAYER-CARD.md) | 🔴 Complexe | — | Aucune |
| 05 | [CoverCard + CoverModal](./05-COVER-CARD.md) | 🟡 Moyen | — | Aucune |

### Phase 2 — Fonctionnalités structurelles

| # | Guide | Difficulté | Temps estimé | Dépendances |
|---|-------|-----------|-------------|-------------|
| 06 | [Multi-Pages & Navigation](./06-MULTI-PAGES.md) | 🔴 Complexe | — | Aucune |
| 07 | [Charts (SparkLine, Gauge, etc.)](./07-CHARTS.md) | 🟡 Moyen | — | Aucune |
| 08 | [Internationalisation (i18n)](./08-I18N.md) | 🟡 Moyen | — | Aucune |

### Phase 3 — Grille & UX avancée

| # | Guide | Difficulté | Temps estimé | Dépendances |
|---|-------|-----------|-------------|-------------|
| 11 | [Free Grid Placement (drag libre)](./11-FREE-GRID-PLACEMENT.md) | 🔴 Complexe | — | Aucune |
| 12 | [HA-Style Card Sizing (resize + dispositions)](./12-HA-CARD-SIZING.md) | 🔴 Complexe | — | 11 recommandé |

### Phase 4 — Polish & avancé

| # | Guide | Difficulté | Temps estimé | Dépendances |
|---|-------|-----------|-------------|-------------|
| 09 | [Thèmes & Apparence](./09-THEMES.md) | 🟡 Moyen | — | Aucune |
| 10 | [Backend avancé (SQLite, Profils, Auth)](./10-BACKEND.md) | 🔴 Complexe | — | Aucune |

### Phase 5 — Feature différenciante (exclusivité vs Tunet)

| # | Guide | Difficulté | Temps estimé | Dépendances |
|---|-------|-----------|-------------|-------------|
| 13 | [Template Engine (Jinja2/Nunjucks par champ)](./13-TEMPLATE-ENGINE.md) | 🔴 Complexe | — | SensorCard (01) en premier |

## Conventions du projet

Avant de commencer, rappel des patterns existants dans ha-dashboard :

### Structure d'un widget
```
src/components/cards/MonWidget/
├── MonWidget.tsx          // Composant principal
├── MonWidget.test.tsx     // Tests Vitest
├── MonWidget.stories.tsx  // Stories Storybook
└── index.ts               // Re-export
```

### Pattern de config widget
```typescript
// 1. Ajouter le type dans src/types/widget-configs.ts
export interface MonWidgetConfig {
  type: 'monwidget';
  entityId: string;
  // ...options
}

// 2. Ajouter à l'union WidgetConfig
export type WidgetConfig = ... | MonWidgetConfig;

// 3. Ajouter la valeur par défaut dans DEFAULT_WIDGET_CONFIGS

// 4. Dans le composant, lire la config :
const { getWidgetConfig } = useDashboardLayout();
const config = getWidgetConfig<MonWidgetConfig>('monwidget');
```

### Pattern d'enregistrement dans le système
```typescript
// Dans DashboardLayoutContext.tsx :
// 1. Ajouter le type à GridWidget['type']
// 2. Ajouter au WIDGET_CATALOG
// 3. Ajouter aux SIZE_PRESETS

// Dans Dashboard.tsx :
// 4. Importer le composant
// 5. Ajouter au switch/map de rendu

// Dans DashboardGrid.tsx :
// 6. Ajouter le label dans WIDGET_LABELS

// Dans WidgetEditModal.tsx :
// 7. Ajouter au WIDGET_COMPONENTS
// 8. Ajouter les champs dans WIDGET_FIELD_DEFS
```

### Hooks clés
- `useSafeEntity(entityId)` — Entity state null-safe
- `useHass()` → `helpers.callService(...)` — Appels de service HA
- `useDashboardLayout()` → `getWidgetConfig<T>(id)` — Config widget
- `useWeather()`, `useEntity()` — Hooks @hakit spécialisés

### Style
- Tailwind CSS 4 utility-first
- Classes `.gc` / `.gc-light` pour les glass cards
- `cn()` helper pour classes conditionnelles
- `framer-motion` pour les animations (opacity, y, scale)
- `lucide-react` pour les icônes
