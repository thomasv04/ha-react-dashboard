# Code Review — HA-Dashboard

> Revue de code complète par un développeur React Senior.
> Date : Avril 2026 — Stack : React 19 + TypeScript + Vite + Express

---

## Verdict global

**Le projet est bien structuré pour sa taille.** L'architecture est lisible, les composants sont cohérents entre eux, et les séparations de responsabilités sont globalement bonnes. Cependant, plusieurs points bloquants doivent être traités avant une mise en open-source, et des améliorations structurelles permettraient d'améliorer la maintenabilité à mesure que le projet grandit.

| Catégorie | Note | Commentaire |
|-----------|------|-------------|
| Structure des fichiers | ⭐⭐⭐⭐ | Bon découpage, quelques fichiers trop gros |
| Cohérence des composants | ⭐⭐⭐⭐⭐ | Pattern identique sur les 15 cards et 7 panels |
| Gestion d'état (Context) | ⭐⭐⭐ | Fonctionnel mais trop couplé, re-renders inutiles |
| TypeScript | ⭐⭐⭐⭐ | Bon usage, peu de `any`, types bien définis |
| Tests | ⭐⭐ | Bonne couverture utils/server, aucun test UI |
| Sécurité open-source | ⭐ | Données personnelles dans l'historique git |
| Performance | ⭐⭐⭐ | Manque de memoization sur les widgets |
| i18n | ⭐ | Tout est hardcodé en français |

---

## 1. Sécurité & Open-Source — BLOQUANT

### Données sensibles dans l'historique git

Les fichiers suivants ont été commités dans le passé (commits `ccfa08f`, `523b7c8`) :

| Fichier | Contenu exposé | Risque |
|---------|----------------|--------|
| `.env` | URL personnelle HA (`thomas-vigneron.ovh`) | Domaine perso exposé |
| `.env.development` | Token JWT Home Assistant (`eyJhbGci...`) | Accès potentiel à l'instance HA |
| `dashboard_config.json` | Noms de personnes, caméras, ville (Menneville), NAS Synology | Profil complet du foyer |

**Actions immédiates :**
- [ ] **Révoquer le token HA** (Profil → Jetons d'accès longue durée)
- [ ] **Nettoyer l'historique git** avec `git filter-repo` avant de publier
- [ ] **Vérifier `dashboard_config.json`** : le `.gitignore` l'exclut ✅ mais il est dans l'historique

```bash
# Installer git-filter-repo
pip install git-filter-repo

# Supprimer les fichiers sensibles de tout l'historique
git filter-repo --path .env --path .env.development --path dashboard_config.json --invert-paths
```

### Entity IDs personnels dans le code source

Des entity IDs spécifiques à ton installation apparaissent dans le code :

| Fichier | Exemples |
|---------|----------|
| `src/types/widget-configs.ts` | `sensor.solarflow_2400_ac_electric_level`, `sensor.rte_tempo_couleur_actuelle` |
| Tous les panels (`LightsPanel`, `ShuttersPanel`, etc.) | Listes d'entités hardcodées (`cover.volet_salon`, `camera.sonnette_frigate`) |

**Action :** Remplacer par des entity IDs génériques (`sensor.battery_level`, `camera.front_door`) ou rendre ces listes configurables.

---

## 2. Fichiers trop gros — À découper

| Fichier | Lignes | Problème | Découpage proposé |
|---------|--------|----------|-------------------|
| `AddWidgetModal.tsx` | ~750 | Catalogue + preview + calculs de taille | Extraire `WidgetPreviewPanel`, `WidgetListRow`, `PreviewDimensions` |
| `WidgetEditModal.tsx` | ~700 | Formulaire + preview + éditeurs de champs | Extraire `EntityPickerField`, `ListEditorField`, `ConfigForm` |
| `ThemeControlsModal.tsx` | ~650 | Theme + performance + FPS ensemble | Extraire `PerformanceSection`, `AppearanceSection`, `FPSMeter` |
| `widget-configs.ts` | ~550 | Types + field definitions + defaults | Séparer en `widget-types.ts` (types) + `widget-fields.ts` (field defs + defaults) |
| `DashboardLayoutContext.tsx` | ~450 | 6 responsabilités dans un seul contexte | Voir section "Gestion d'état" ci-dessous |

**Fichiers de taille acceptable :** `DashboardGrid.tsx` (~300), `Dashboard.tsx` (~280), `grid-utils.ts` (~200), `useGridDragDrop.ts` (~200), `CardLayoutTab.tsx` (~175).

---

## 3. Architecture des Contexts — Re-renders & couplage

### Problème : DashboardLayoutContext fait trop de choses

Ce contexte gère **6 responsabilités** :
1. Layout state (widgets par breakpoint)
2. CRUD widgets (add, remove, update)
3. Cycle des presets de taille
4. Toggle edit mode
5. Suivi de tous les layouts (allLayouts)
6. Synchronisation avec WidgetConfigContext

**Conséquence :** Chaque changement (déplacer un widget, changer de mode édition, cycler une taille) re-render TOUS les consommateurs du contexte.

**Refactoring recommandé — Découper en 3 :**

```typescript
// 1. LayoutContext — CRUD et positions
const LayoutContext = createContext<{
  layout: DashboardLayout;
  addWidget: (w: GridWidget) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<GridWidget>) => void;
}>();

// 2. EditModeContext — état d'édition isolé
const EditModeContext = createContext<{
  isEditMode: boolean;
  setEditMode: (v: boolean) => void;
}>();

// 3. SizePresetsContext — logique de presets
const SizePresetsContext = createContext<{
  cycleSize: (id: string, bp: Breakpoint) => void;
  getCurrentPresetName: (id: string, bp: Breakpoint) => string | null;
}>();
```

### Problème : Nesting profond des providers

```
HassConnect → ThemeProvider → ThemeContextProvider → BackgroundLayer
  → MotionConfigBridge → ToastProvider → ModalProvider → Dashboard
    → PageProvider → WidgetConfigProvider → DashboardLayoutProvider
      → WallPanelProvider → PanelProvider → [composants]
```

**~11 niveaux de nesting.** Chaque mise à jour d'un provider parent provoque un re-render en cascade.

**Solutions possibles :**
- **Court terme :** Séparer les contextes lecture/écriture (pattern read/dispatch)
- **Moyen terme :** Migrer `DashboardLayout` + `WidgetConfig` vers **Zustand** (~2.7KB) pour du re-render granulaire
- **Complémentaire :** `React.memo()` sur les widgets du grid pour couper la propagation

### Problème : Couplage entre contextes

`DashboardLayoutContext` importe et appelle directement `useWidgetConfig()` :

```typescript
// DashboardLayoutContext.tsx L8
import { useWidgetConfig } from '@/context/WidgetConfigContext';
```

**Recommandation :** Inverser la dépendance. `WidgetConfigContext` devrait observer les changements de layout via un effet, pas l'inverse.

---

## 4. Composants — Cohérence & patterns

### Cards (15 widgets) — Excellente cohérence ✅

Tous les cards suivent le même pattern :
```tsx
const { getWidgetConfig } = useWidgetConfig();
const widgetId = useWidgetId();
const config = getWidgetConfig<XxxConfig>(widgetId || 'default');
const entity = useSafeEntity(entityId);
const { helpers } = useHass();
```

| Aspect | Status |
|--------|--------|
| Pattern d'import | ✅ Identique partout |
| Accès config widget | ✅ `useWidgetConfig()` + `useWidgetId()` |
| Accès entités HA | ✅ `useSafeEntity()` partout |
| Actions HA | ✅ `useHass().helpers.callService()` |
| Animations | ✅ framer-motion sur tous |
| Taille | ✅ 40-200 lignes (raisonnable) |

### Panels (7 modaux) — Pattern cohérent mais pas configurable

Tous wrappent dans `<Panel>` avec titre + icône. Mais les listes d'entités sont **hardcodées** :

```typescript
// LightsPanel.tsx
const LIGHTS = [
  { entityId: 'light.bandeau_led_cuisine', label: 'Cuisine' },
  // ... spécifique à ton installation
];
```

**Recommandation :** Rendre les panels configurables via `dashboard_config.json` ou `widget-configs`.

### Dashboard.tsx — Trop de responsabilités

- Appelle **11 hooks** différents
- Contient 3 sous-composants inline (`IdleWatcher`, `ScreensaverEntityWatcher`, `EditButton`)
- Gère grid, edit mode, panels, wall panel, idle detection

**Recommandation :** Extraire `EditButton`, `IdleWatcher`, `ActivePanel` dans des fichiers séparés. `Dashboard.tsx` devrait se limiter à assembler les providers et le grid.

---

## 5. Performance

### Memoization manquante sur les widgets

Quand un widget bouge dans le grid, TOUS les widgets re-render :

```tsx
// DashboardGrid.tsx
{widgets.map(widget => (
  <GridItem key={widget.id}>
    <WeatherCard />  {/* ❌ Pas memoizé */}
  </GridItem>
))}
```

**Fix :**
```tsx
const MemoizedWeatherCard = memo(WeatherCard);
// + memo sur GridItem avec comparaison custom
export const GridItem = memo(GridItem, (prev, next) =>
  prev.id === next.id && prev.readonly === next.readonly
);
```

### SIZE_PRESETS verbeux

~100 lignes de données répétitives (`{ name: 'Compact', w: X, h: Y }` × 13 types × 3 breakpoints). Peut être réduit à ~30 lignes avec une fonction de génération.

---

## 6. Tests — Couverture insuffisante

| Couche | Couverture | Détail |
|--------|-----------|--------|
| Utilitaires (`lib/`) | ✅ Bonne | grid-utils, template-engine, utils, sounds |
| Contextes | ⚠️ Partielle | Seul `WIDGET_CATALOG` testé |
| Server (Express) | ✅ Bonne | Routes API couvertes |
| Cards (15 composants) | ❌ Aucun test | 0 test unitaire |
| Panels (7 composants) | ❌ Aucun test | 0 test unitaire |
| Layout (DashboardGrid, modals) | ❌ Aucun test | 0 test unitaire |
| E2E (Playwright) | ❌ Aucun test | Config existe mais aucun test écrit |

**Recommandations prioritaires :**
1. Ajouter des tests unitaires pour les cards (même pattern → facile à batcher)
2. Tester les contextes (DashboardLayout, WidgetConfig, PageContext)
3. Écrire au minimum 3 tests E2E Playwright (navigation, drag-drop, sauvegarde config)

---

## 7. i18n — Non implémenté

Tous les textes UI sont **hardcodés en français** :
- `WeatherCard` : map `CONDITION_FR`
- `ThermostatCard` : `CHAUFFER À`, `REFROIDIR À`, `EN VEILLE`
- `AlarmCard` : `Armé — domicile`, `ALERTE !`
- `GreetingCard` : `Bonjour`, `Bonsoir`, `Bonne nuit`

Un design existe dans `ideas/08-I18N.md` mais n'est pas implémenté.

**Impact :** Blocage pour les contributeurs non-francophones et l'adoption internationale.

---

## 8. Gestion d'erreurs

### Pas d'Error Boundary

Si un seul card crash (entité indisponible, erreur de rendu), **tout le dashboard tombe**.

**Fix minimal :**
```tsx
// src/components/ui/ErrorBoundary.tsx
class WidgetErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <FallbackCard />;
    return this.props.children;
  }
}

// Dans DashboardGrid.tsx, wrapper chaque widget
<WidgetErrorBoundary>
  <WeatherCard />
</WidgetErrorBoundary>
```

### Error states non exposées

`useDashboardConfig` avale les erreurs (console.error seulement). L'UI ne sait pas qu'un chargement a échoué.

```typescript
// Actuel
.catch(err => console.error("Erreur de chargement:", err))

// Recommandé
.catch(err => {
  setError(err);
  addToast({ title: "Erreur", description: "Impossible de charger la config", variant: "error" });
})
```

---

## 9. Points positifs

| Aspect | Détail |
|--------|--------|
| **Cohérence des cards** | 15 cards avec pattern identique — très maintenable |
| **Hooks customs** | `useSafeEntity`, `useTemplate`, `usePageRouting` — bien isolés |
| **Grid system** | CSS Grid responsive (12/8/4 cols) + utilitaires bien testés |
| **Widget config system** | Architecture propre (types, edit modal, live preview) |
| **Template engine** | Nunjucks intégré avec fonctions HA — extensible |
| **Server** | Express bien structuré (routes séparées, auth middleware, rate limiting, helmet) |
| **Storybook** | Setup fonctionnel avec mocks HA — chaque composant a au moins une story |
| **CI/CD** | GitHub Actions configuré, secrets bien gérés |
| **gitignore** | Bien configuré pour exclure les données sensibles |

---

## 10. Plan d'action — Priorités

### P0 — Avant publication GitHub
- [ ] Révoquer le token HA
- [ ] `git filter-repo` pour supprimer `.env`, `.env.development`, `dashboard_config.json` de l'historique
- [ ] Remplacer les entity IDs personnels dans `widget-configs.ts` par des génériques
- [ ] Vérifier et nettoyer `docs/` et `ideas/` (entity IDs, tokens, infos perso)

### P1 — Qualité de code
- [ ] Découper `AddWidgetModal.tsx` (~750L → 3-4 fichiers)
- [ ] Découper `WidgetEditModal.tsx` (~700L → 3-4 fichiers)
- [ ] Découper `ThemeControlsModal.tsx` (~650L → 2-3 fichiers)
- [ ] Séparer `widget-configs.ts` en types + field definitions
- [ ] Extraire sous-composants de `Dashboard.tsx` (`EditButton`, `ActivePanel`)
- [ ] Ajouter `ErrorBoundary` autour des widgets

### P2 — Performance
- [ ] `React.memo()` sur tous les cards et `GridItem`
- [ ] Découper `DashboardLayoutContext` en 3 contextes (Layout, EditMode, SizePresets)
- [ ] Découper le contexte ThemeContext en lecture/écriture
- [ ] Évaluer migration vers Zustand pour layout + widget config

### P3 — Tests
- [ ] Tests unitaires pour les 15 cards
- [ ] Tests unitaires pour les contextes critiques
- [ ] Au moins 3 tests E2E Playwright
- [ ] Exposer les error states dans les hooks (pas juste console.error)

### P4 — Fonctionnalités
- [ ] Implémenter le système i18n (design dans `ideas/08-I18N.md`)
- [ ] Rendre les entity lists des panels configurables
- [ ] Enrichir les stories Storybook (args, controls, variantes)
