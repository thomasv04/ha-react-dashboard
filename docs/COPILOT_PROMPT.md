# Prompt Copilot — Refactoring HA-Dashboard

> Copie-colle ce prompt dans Copilot en joignant le fichier `docs/CODE_REVIEW.md` comme contexte.

---

## Prompt

Tu es un développeur React Senior spécialisé en TypeScript, React 19, et architecture frontend. Je te fournis un fichier `CODE_REVIEW.md` qui contient une analyse complète de mon projet **ha-dashboard** (un dashboard React pour Home Assistant).

Voici les règles à suivre pour toute intervention :

### Règles générales
- **Ne jamais modifier** les fonctionnalités existantes — refactoring uniquement
- **Ne jamais ajouter** de dépendances sans me demander d'abord
- **Conserver** le style existant (Tailwind, framer-motion, lucide-react, shadcn)
- **Conserver** le pattern existant des cards (`useWidgetConfig` + `useWidgetId` + `useSafeEntity`)
- **Tous les textes UI restent en français** tant que le système i18n n'est pas implémenté
- Les fichiers créés doivent suivre la structure existante (`src/components/`, `src/hooks/`, `src/context/`, etc.)
- Pas de commentaires superflus, pas de docstrings sauf si le code est complexe

### Ce que je veux que tu fasses

Réfère-toi au plan d'action (section 10 du CODE_REVIEW.md) et applique les tâches dans l'ordre de priorité. Avant chaque groupe de tâches, demande-moi confirmation.

#### Phase 1 — Sécurité open-source (P0)
- Remplacer tous les entity IDs personnels dans `src/types/widget-configs.ts` par des entity IDs génériques (ex: `sensor.battery_level`, `camera.front_door`, `person.user_1`)
- Scanner `docs/` et `ideas/` pour tout contenu sensible (entity IDs perso, tokens, noms, villes) et me lister ce que tu trouves
- Ne PAS toucher à `.env` ni à l'historique git (je le ferai moi-même)

#### Phase 2 — Découpage des gros fichiers (P1)
- **`AddWidgetModal.tsx`** (~750L) → Extraire en sous-composants dans un dossier `src/components/layout/AddWidgetModal/`
- **`WidgetEditModal.tsx`** (~700L) → Extraire en sous-composants dans un dossier `src/components/layout/WidgetEditModal/`
- **`ThemeControlsModal.tsx`** (~650L) → Extraire en sous-composants dans un dossier `src/components/layout/ThemeControlsModal/`
- **`widget-configs.ts`** (~550L) → Séparer en `src/types/widget-types.ts` (types/interfaces) + `src/types/widget-fields.ts` (field definitions + defaults)
- **`Dashboard.tsx`** → Extraire `EditButton`, `ActivePanel`, `IdleWatcher` dans `src/components/dashboard/`

Pour chaque découpage :
- Le fichier principal devient un barrel (re-export + assemblage)
- Les sous-composants sont dans leur propre fichier
- Les imports existants dans le reste du projet ne doivent PAS casser
- Faire un `tsc --noEmit` après chaque découpage pour valider

#### Phase 3 — ErrorBoundary & robustesse (P1)
- Créer `src/components/ui/ErrorBoundary.tsx` — un error boundary React qui affiche un fallback card élégant (icône erreur + message "Widget indisponible")
- L'intégrer dans `DashboardGrid.tsx` pour wrapper chaque widget individuellement
- Ajouter un state `error` dans `useDashboardConfig` et exposer les erreurs dans l'UI via un toast

#### Phase 4 — Performance (P2)
- Ajouter `React.memo()` sur tous les cards (`WeatherCard`, `CameraCard`, etc.) et sur `GridItem`
- Découper `DashboardLayoutContext` en 3 contextes séparés :
  - `LayoutContext` (CRUD widgets + positions)
  - `EditModeContext` (isEditMode + setEditMode)
  - `SizePresetsContext` (cycleSize + getCurrentPresetName)
- Assurer que les hooks existants (`useDashboardLayout`) continuent de fonctionner (facade pattern)

#### Phase 5 — Tests (P3)
- Créer des tests unitaires Vitest pour au minimum 5 cards (prendre les plus simples)
- Pattern de test : mock `useWidgetConfig`, `useSafeEntity`, `useHass`, vérifier le rendu
- Ajouter des tests pour `DashboardLayoutContext` (add/remove/update widget)
- Créer au moins 1 test E2E Playwright basique (le dashboard se charge sans erreur)

### Comment travailler
- **Une phase à la fois** — ne passe pas à la phase suivante sans ma validation
- **Montre-moi le plan** de chaque phase avant d'écrire du code
- **Vérifie** avec `tsc --noEmit` après chaque changement
- Si tu as un doute, demande plutôt que de deviner
- Si un fichier fait plus de 200 lignes après refactoring, signale-le
