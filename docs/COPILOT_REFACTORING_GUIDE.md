# Guide de refactoring — ha-dashboard

> **Contexte :** Ce guide a été rédigé par un développeur React senior (Claude Sonnet 4.6).  
> Il liste 5 problèmes concrets identifiés lors de la code review de la branche `feature/` par rapport à `main`.  
> Copilot doit suivre ces instructions **dans l'ordre** et **sans inventer de nouvelles abstractions** au-delà de ce qui est demandé.

---

## 1. `DashboardLayoutContext.tsx` — God-object à découper

### Problème
`src/context/DashboardLayoutContext.tsx` fait **488 lignes** et mélange trois responsabilités distinctes :
- Les **positions sur la grille** (`layout`, `addWidget`, `removeWidget`, `updateWidget`, `addWidgetByType`, `cycleSize`)
- Les **configs métier des widgets** (`widgetConfigs`, `getWidgetConfig`, `updateWidgetConfig`, `previewConfig`, `editingWidgetId`)
- Les **données transversales** partagées avec la sauvegarde (`allLayouts`, `allWidgetConfigsByPage`)

Ce couplage force **tous les consommateurs** à se re-rendre même quand seule une config de widget change.

### Objectif
Extraire la gestion des configs widget dans un `WidgetConfigContext` dédié, sans casser les composants existants.

### Étapes précises

**Étape 1 — Créer `src/context/WidgetConfigContext.tsx`**

```tsx
// Ce fichier gère UNIQUEMENT les configs métier des widgets
// (entities, labels, templates, etc.)

interface WidgetConfigContextValue {
  widgetConfigs: WidgetConfigs;
  getWidgetConfig: <T extends WidgetConfig>(id: string) => T | undefined;
  updateWidgetConfig: (id: string, config: WidgetConfig) => void;
  setPreviewConfig: (id: string, config: WidgetConfig) => void;
  clearPreviewConfig: () => void;
  editingWidgetId: string | null;
  setEditingWidgetId: (id: string | null) => void;
  /** All pages' widget configs — used for saving */
  allWidgetConfigsByPage: Record<string, WidgetConfigs>;
}
```

Le provider prend en props `initialAllWidgetConfigs` et `currentPageId` (lu depuis `usePages()`).

**Étape 2 — Nettoyer `DashboardLayoutContext.tsx`**

Supprimer de `DashboardLayoutContextValue` :
- `widgetConfigs`
- `getWidgetConfig`
- `updateWidgetConfig`
- `setPreviewConfig`
- `clearPreviewConfig`
- `editingWidgetId`
- `setEditingWidgetId`
- `allWidgetConfigsByPage`

Supprimer de `DashboardLayoutProvider` :
- `useState` pour `allWidgetConfigs`, `editingWidgetId`, `previewConfigEntry`
- Les `useCallback` correspondants
- Le `useEffect` de sync `initialAllWidgetConfigs`

**Étape 3 — Mettre à jour `Dashboard.tsx`**

Envelopper `DashboardLayoutProvider` avec `WidgetConfigProvider` :

```tsx
<WidgetConfigProvider
  initialAllWidgetConfigs={allWidgetConfigs}
  onSave={setAllWidgetConfigs}
>
  <DashboardLayoutProvider initialLayouts={allLayouts}>
    {children}
  </DashboardLayoutProvider>
</WidgetConfigProvider>
```

**Étape 4 — Mettre à jour tous les consommateurs**

Chercher tous les fichiers qui appellent `useDashboardLayout()` et qui utilisent :
`widgetConfigs | getWidgetConfig | updateWidgetConfig | setPreviewConfig | clearPreviewConfig | editingWidgetId | setEditingWidgetId`

Les migrer vers `useWidgetConfig()` (nouveau hook du `WidgetConfigContext`).

Fichiers concernés probables :
- `src/components/layout/WidgetEditModal.tsx`
- `src/components/layout/DashboardGrid.tsx`
- `src/components/cards/*.tsx` (qui lisent leur config via `getWidgetConfig`)

**Règle :** Ne pas toucher à la signature publique des hooks tant que tous les consommateurs ne sont pas migrés.

---

## 2. `dashboard_config.json` — Données personnelles dans le dépôt

### Problème
Le fichier `dashboard_config.json` à la racine contient la configuration réelle du dashboard (entités HA, pages, widgets configurés). Il est committé en clair dans le dépôt.

### Objectif
Retirer ce fichier du tracking Git et fournir un exemple vide à la place.

### Étapes précises

**Étape 1 — Ajouter au `.gitignore`**

Dans `.gitignore`, ajouter après la ligne `*.local` :

```gitignore
# Dashboard config — contient des données personnelles (entités HA, config maison)
dashboard_config.json
```

**Étape 2 — Créer `dashboard_config.example.json`** à la racine

```json
{
  "version": 2,
  "pages": [
    { "id": "home", "label": "Accueil", "icon": "LayoutGrid", "type": "grid", "order": 0 }
  ],
  "layouts": {
    "home": {
      "widgets": { "lg": [], "md": [], "sm": [] },
      "cols": { "lg": 12, "md": 8, "sm": 4 }
    }
  },
  "widgetConfigs": {
    "home": {}
  }
}
```

**Étape 3 — Retirer le fichier du tracking Git**

```bash
git rm --cached dashboard_config.json
git commit -m "chore: remove personal dashboard_config.json from tracking"
```

**Étape 4 — Mettre à jour `server/db.js`**

Dans `migrateFromJSON`, vérifier d'abord `dashboard_config.json`, puis en fallback `dashboard_config.example.json` :

```js
const configPath = process.env.OPTIONS_FILE
  || (fs.existsSync('./dashboard_config.json') ? './dashboard_config.json' : './dashboard_config.example.json');
```

---

## 3. `server/haAuth.js` — Bypass d'authentification via header forgeable

### Problème
Le middleware actuel bypasse **toute l'authentification** si le header `x-ingress-path` est présent :

```js
// PROBLÈME : n'importe qui peut envoyer ce header
if (req.headers['x-ingress-path']) {
  return next();
}
```

En production Docker derrière le reverse proxy de HA, ce header est contrôlé. En développement local (accès direct au port 8099), **il n'y a aucune protection**.

### Objectif
Restreindre le bypass ingress aux cas où l'origine est garantie, et ajouter un avertissement explicite en dev.

### Étapes précises

**Étape 1 — Lire la variable d'environnement `HA_AUTH_MODE`**

Modifier `server/haAuth.js` :

```js
export function haAuthMiddleware(req, res, next) {
  const authMode = process.env.HA_AUTH_MODE || 'standalone'; // 'ingress' | 'standalone' | 'disabled'

  // Mode ingress : on fait confiance au header seulement si le mode est explicitement configuré
  if (authMode === 'ingress') {
    if (req.headers['x-ingress-path']) {
      return next();
    }
    // Header ingress absent alors qu'on est en mode ingress = requête suspecte
    return res.status(401).json({ error: 'Missing ingress header' });
  }

  // Mode disabled : pas d'auth (dev local uniquement)
  if (authMode === 'disabled') {
    if (process.env.NODE_ENV === 'production') {
      // Erreur fatale : ne jamais désactiver l'auth en prod
      return res.status(500).json({ error: 'Auth disabled in production is not allowed' });
    }
    console.warn('[haAuth] WARNING: Authentication is disabled. Do not use in production.');
    return next();
  }

  // Mode standalone (défaut) : Bearer token HA
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  const haUrl = process.env.HA_URL || 'http://supervisor/core';

  fetch(`${haUrl}/api/`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(resp => {
      if (resp.ok) {
        req.headers['x-ha-user-id'] = req.headers['x-ha-user-id'] || 'default';
        next();
      } else {
        res.status(401).json({ error: 'Invalid token' });
      }
    })
    .catch(() => {
      res.status(502).json({ error: 'Cannot reach Home Assistant' });
    });
}
```

**Étape 2 — Mettre à jour `.env.example`** (ou le créer si absent) :

```dotenv
# 'ingress' = HA add-on derrière le reverse proxy HA
# 'standalone' = token Bearer HA (défaut)
# 'disabled' = pas d'auth (DEV UNIQUEMENT)
HA_AUTH_MODE=standalone
HA_URL=http://supervisor/core
HA_AUTH=true
```

**Étape 3 — Mettre à jour les tests dans `server.test.js`**

Ajouter un test pour le mode ingress avec header absent et un test pour le mode `disabled` en prod.

---

## 4. `dist/` — Build artifacts committés dans le dépôt

### Problème
Les fichiers `dist/assets/*.js` et `dist/index.html` apparaissent dans les diffs. Le `dist/` devrait être ignoré par Git — il est déjà dans le `.gitignore` (`dist` ligne 10) mais des fichiers ont été committés manuellement avant que la règle soit en place.

### Objectif
Retirer le dossier `dist/` du tracking Git sans le supprimer localement.

### Étapes précises

**Étape 1 — Vérifier ce qui est encore tracké**

```bash
git ls-files dist/
```

**Étape 2 — Retirer du tracking**

```bash
git rm -r --cached dist/
git commit -m "chore: untrack dist/ build artifacts"
```

**Étape 3 — Vérifier que `.gitignore` est correct**

Le `.gitignore` contient déjà `dist` — **ne pas modifier cette ligne**, elle est suffisante.

**Étape 4 — Faire de même pour `assets/` à la racine**

Le `.gitignore` contient déjà `/assets/` — vérifier que les fichiers dans `assets/` à la racine ne sont plus trackés :

```bash
git ls-files assets/
```

Si des résultats s'affichent : `git rm -r --cached assets/`

---

## 5. `DashboardGrid.tsx` — Composant monolithique à découper

### Problème
`src/components/layout/DashboardGrid.tsx` fait **507 lignes** et gère :
- Le rendu de la grille CSS
- Le drag & drop souris (events `dragstart`, `dragover`, `drop`, `dragend`)
- Le drag & drop tactile (events `touchstart`, `touchmove`, `touchend`)
- Le resize via poignée
- Les overlays d'édition inline (boutons edit/delete/resize)
- Le calcul de position de ghost (aperçu de placement)

### Objectif
Extraire la logique drag & drop dans un hook dédié, et les overlays dans un sous-composant, sans toucher au comportement.

### Étapes précises

**Étape 1 — Créer `src/hooks/useGridDragDrop.ts`**

Extraire de `DashboardGrid.tsx` toute la logique drag & drop (souris + tactile) :

```ts
// Tout ce qui concerne : draggingId, dropTargetId, ghostPosition
// + les handlers : onItemDragStart, onItemDragOver, onItemDragEnter,
//   onItemDragLeave, onItemDrop, onItemDragEnd
//   onItemTouchStart, onItemTouchMove, onItemTouchEnd

export function useGridDragDrop(params: {
  widgets: GridWidget[];
  cols: number;
  cellSize: { w: number; h: number };
  onWidgetMove: (id: string, x: number, y: number) => void;
}): {
  draggingId: string | null;
  dropTargetId: string | null;
  ghostPosition: GhostPosition | null;
  dragHandlers: DragHandlers;
}
```

Le hook ne doit contenir **aucun JSX**. Il retourne uniquement des valeurs d'état et des callbacks.

**Étape 2 — Créer `src/components/layout/GridItemOverlay.tsx`**

Extraire les overlays d'édition (boutons Pencil, Trash2, Settings, MoveDiagonal, poignée de resize) :

```tsx
interface GridItemOverlayProps {
  widgetId: string;
  isEditMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onResizeStart: (e: React.MouseEvent | React.TouchEvent) => void;
}

export const GridItemOverlay = memo(({ ... }: GridItemOverlayProps) => { ... });
```

**Étape 3 — Mettre à jour `DashboardGrid.tsx`**

Remplacer la logique extraite par les imports :

```tsx
import { useGridDragDrop } from '@/hooks/useGridDragDrop';
import { GridItemOverlay } from './GridItemOverlay';
```

`DashboardGrid.tsx` ne doit plus contenir ni les handlers drag/touch inline ni les boutons d'overlay directement.

**Règle :** La `GridContext` (context interne à `DashboardGrid`) reste dans `DashboardGrid.tsx` — elle est locale et ne mérite pas son propre fichier.

---

## Ordre d'exécution recommandé

| Priorité | Tâche | Risque |
|---|---|---|
| 1 (immédiat) | `.gitignore` pour `dashboard_config.json` + `git rm --cached` | Aucun |
| 2 (immédiat) | `git rm -r --cached dist/ assets/` | Aucun |
| 3 (sécurité) | Refactoring `haAuthMiddleware` + variable `HA_AUTH_MODE` | Faible |
| 4 (qualité) | Extraction `useGridDragDrop` + `GridItemOverlay` | Moyen |
| 5 (architecture) | Extraction `WidgetConfigContext` | Élevé — à faire en dernier, avec tests |

---

## Règles générales pour Copilot

1. **Ne pas ajouter de features.** Ces tâches sont purement du refactoring et de la correction.
2. **Conserver la signature publique des hooks** (`useDashboardLayout`, `usePages`, `useWidgetConfig`) : les composants existants ne doivent pas casser.
3. **Un fichier modifié = sa suite de tests mise à jour.** Si un composant est extrait, créer son test dans le dossier `tests/` correspondant.
4. **TypeScript strict.** Pas de `any`, pas de `// @ts-ignore`.
5. **Pas de migration de classe ou de réécriture complète.** Tout est déjà en hooks fonctionnels — rester dans ce paradigme.
