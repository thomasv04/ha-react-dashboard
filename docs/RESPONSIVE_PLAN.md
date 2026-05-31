# Plan — Refonte Responsive

> Statut de départ : le responsive est quasiment absent. La grille s'adapte techniquement (ResizeObserver + breakpoints `lg`/`md`/`sm`), mais les cartes, le shell et la navigation n'ont aucune adaptation visuelle.

---

## Référence : ce que fait Tunet

Le projet Tunet (référence UX jointe) utilise une **approche hybride** :

| Couche | Mécanisme |
|--------|-----------|
| Grille principale | JS pur — `window.innerWidth` + `resize` → `gridTemplateColumns` inline |
| Contenu interne des cartes | CSS `@container` queries (seuil à `248px`) |
| Pages spéciales (Battery, Lights) | Tailwind : `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` |
| Mode mobile (`< 480px`) | Prop `isMobile` propagée en cascade, branches JSX différentes |
| Mode compact (`480–639px`) | Classe CSS `.compact-cards` → `scale(0.92)` sur les cartes |
| Typographie | `clamp()` avec `vw` dans le header |

---

## Audit de l'état actuel (`ha-dashboard`)

### Ce qui fonctionne déjà ✅

- `DashboardGrid.tsx` utilise un `ResizeObserver` sur le **conteneur** (pas `window.innerWidth`) → breakpoint relatif au conteneur, pas au viewport.
- Les données de layout sont stockées en 3 breakpoints (`lg` / `md` / `sm`) avec positions distinctes.
- `addWidgetByType` peuple les 3 breakpoints simultanément.

### Problèmes identifiés ❌

#### P1 — `WidgetEditModal` : breakpoint figé au montage

```ts
// src/components/layout/WidgetEditModal/index.tsx — ligne ~31
const breakpoint = resolveBreakpoint(window.innerWidth); // ← snapshot unique, jamais mis à jour
```

Si l'utilisateur redimensionne la fenêtre après ouverture du modal, le breakpoint utilisé pour l'onglet "Disposition" est erroné.

#### P2 — `ActivityBar` : `window.innerWidth` incohérent

```tsx
// src/components/cards/ActivityBar/ActivityBar.tsx
setIsMobile(window.innerWidth < 768); // ← viewport, pas le conteneur de la carte
```

Une carte dans une petite cellule sur un grand écran sera traitée comme "desktop". La carte existe en **doublon** (`src/components/cards/ActivityBar.tsx` + `src/components/cards/ActivityBar/ActivityBar.tsx`).

#### P3 — Les cartes ne s'adaptent pas à leur taille réelle

Aucune carte ne lit ses propres dimensions (`widget.w`, `widget.h`) pour adapter son rendu. Une `WeatherCard` en `2×2` et en `6×4` est rendu identiquement.

#### P4 — Shell sans responsive padding

```tsx
// src/Dashboard.tsx
<div className='max-w-[1440px] mx-auto px-5 pt-5 pb-36'>
```

- `px-5` fixe sur tous les écrans (devrait diminuer sur mobile)
- `pb-36` (144px) fixe pour la barre de navigation du bas — trop grand sur mobile
- Aucun variant `sm:` / `md:`

#### P5 — Zéro `@media` query dans le CSS

`src/index.css` ne contient aucune règle `@media`. Les classes utilitaires (`.gc`, `.gc-pill`…) n'ont aucune adaptation pour les petits écrans.

#### P6 — Aucune classe Tailwind responsive sur les layouts

Quasi-aucun usage de `sm:`, `md:`, `lg:` dans les composants de layout (`Dashboard.tsx`, `DashboardGrid.tsx`, navigation, sidebar…).

---

## Plan d'action par priorité

### 🔴 Priorité 1 — Corrections critiques (données & logique)

#### T1 — Réparer le breakpoint dans `WidgetEditModal`

**Fichier :** `src/components/layout/WidgetEditModal/index.tsx`

Remplacer le snapshot unique par un état réactif :

```tsx
// Avant
const breakpoint = resolveBreakpoint(window.innerWidth);

// Après
const [breakpoint, setBreakpoint] = useState(() => resolveBreakpoint(window.innerWidth));

useEffect(() => {
  const handler = () => setBreakpoint(resolveBreakpoint(window.innerWidth));
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);
```

#### T2 — Supprimer le doublon `ActivityBar`

Supprimer `src/components/cards/ActivityBar.tsx` (le fichier plat, conserver le dossier `ActivityBar/`).

#### T3 — Remplacer `window.innerWidth` par container dans `ActivityBar`

**Fichier :** `src/components/cards/ActivityBar/ActivityBar.tsx`

Utiliser un `ResizeObserver` sur le `ref` du composant, ou lire le breakpoint depuis le contexte grille :

```tsx
// Option A : lire depuis le contexte (si disponible)
const { breakpoint } = useGridContext(); // 'sm' | 'md' | 'lg'
const isMobile = breakpoint === 'sm';

// Option B : ResizeObserver local
const ref = useRef<HTMLDivElement>(null);
const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
  const obs = new ResizeObserver(([entry]) => {
    setIsMobile(entry.contentRect.width < 480);
  });
  if (ref.current) obs.observe(ref.current);
  return () => obs.disconnect();
}, []);
```

---

### 🟠 Priorité 2 — Shell responsive

#### T4 — Padding adaptatif dans `Dashboard.tsx`

```tsx
// Avant
<div className='max-w-[1440px] mx-auto px-5 pt-5 pb-36'>

// Après
<div className='max-w-[1440px] mx-auto px-2 sm:px-4 md:px-5 pt-4 sm:pt-5 pb-24 sm:pb-32 md:pb-36'>
```

#### T5 — Ajouter un `useIsMobile` hook centralisé

Créer `src/hooks/useIsMobile.ts` pour éviter la prolifération de listeners `resize` :

```ts
// src/hooks/useIsMobile.ts
import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 640; // Tailwind sm

export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}
```

`matchMedia` est plus performant que `resize` (ne se déclenche qu'au franchissement du seuil).

---

### 🟡 Priorité 3 — Adaptation des cartes à leur taille

#### T6 — Hook `useWidgetSize` pour les cartes

Créer un hook qui expose les dimensions réelles d'un widget en pixels (ou catégories S/M/L) :

```ts
// src/hooks/useWidgetSize.ts
export type WidgetSizeClass = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export function useWidgetSize(ref: RefObject<HTMLElement>): WidgetSizeClass {
  const [size, setSize] = useState<WidgetSizeClass>('md');

  useEffect(() => {
    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w < 120) setSize('xs');
      else if (w < 200) setSize('sm');
      else if (w < 320) setSize('md');
      else if (w < 480) setSize('lg');
      else setSize('xl');
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return size;
}
```

Utilisation dans une carte :

```tsx
function WeatherCard({ ... }) {
  const ref = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(ref);

  return (
    <div ref={ref}>
      {size === 'xs' ? <CompactWeather /> : <FullWeather showForecast={size !== 'sm'} />}
    </div>
  );
}
```

#### T7 — Ajouter des `@container` queries dans le CSS

Inspiré de Tunet (`dashboard.css`) :

```css
/* src/index.css */

/* Les cartes doivent avoir container-type: inline-size */
.grid-card {
  container-type: inline-size;
  container-name: card;
}

/* Adaptation interne selon la largeur de la carte */
@container card (max-width: 200px) {
  .card-title { font-size: 0.7rem; }
  .card-value { font-size: 1.1rem; }
  .card-subtitle { display: none; }
}

@container card (min-width: 300px) {
  .card-controls {
    flex-direction: row;
  }
}
```

---

### 🟢 Priorité 4 — Mode mobile complet (< 640px)

Inspiré du mode `mobile-grid` de Tunet :

#### T8 — Classes CSS pour mobile

```css
/* src/index.css */

/* Mode mobile : cartes full-width, grille 2 colonnes max */
.mobile-layout .gc {
  /* Pas de scale, juste des ajustements */
  padding: 0.75rem;
}

/* Mode compact (640–768px) */
.compact-layout .gc {
  padding: 0.875rem;
}
```

#### T9 — Propagation `isMobile` depuis le layout

```tsx
// src/Dashboard.tsx
const isMobile = useIsMobile(640);

<DashboardGrid
  ...
  isMobile={isMobile}
  className={isMobile ? 'mobile-layout' : ''}
/>
```

---

### 🔵 Priorité 5 — Navigation et barre d'activité

#### T10 — Navigation bottom bar : labels cachés sur mobile

```tsx
// Inspiré de Tunet PageNavigation
<span className='hidden sm:inline'>{label}</span>
<span className='sm:hidden'>{shortLabel ?? label.slice(0, 3)}</span>
```

#### T11 — ActivityBar : adaptatif selon l'espace disponible

Utiliser `overflow: hidden` + `flex-shrink` plutôt que de masquer des éléments via `isMobile`, pour que la barre s'adapte organiquement à l'espace disponible.

---

## Ordre d'exécution recommandé

```
T2  → Supprimer le doublon ActivityBar                 (2 min)
T1  → WidgetEditModal breakpoint réactif               (15 min)
T5  → Hook useIsMobile centralisé                      (20 min)
T3  → ActivityBar utilise le hook/container            (20 min)
T4  → Shell responsive padding                         (10 min)
T7  → @container queries CSS sur .gc                   (30 min)
T6  → Hook useWidgetSize + intégration WeatherCard     (1h)
T8/T9 → Mode mobile-layout classes + propagation      (45 min)
T10/T11 → Navigation adaptive                          (30 min)
```

---

## Règles à adopter pour tout nouveau code

1. **Jamais `window.innerWidth` dans un composant** — utiliser `useIsMobile()` ou un `ResizeObserver` sur `ref`.
2. **Container queries plutôt que media queries** pour les cartes — elles peuvent être placées n'importe où dans la grille.
3. **Classes Tailwind responsive** pour les éléments de shell (`sm:px-4 md:px-6`).
4. **Pas de hauteurs/padding fixes en `px` hardcodés** dans les cartes — préférer `rem`, `em`, ou des classes utilitaires adaptatives.
5. **Tester à 360px, 640px, 768px, 1024px, 1440px** — ce sont les 5 points de rupture clés.

---

## Captures de référence Tunet

Les screenshots fournis montrent :
- **Mobile** (`< 480px`) : grille 2 colonnes, cartes compactes, labels de navigation cachés, header en colonne centrée
- **Desktop** (`≥ 1024px`) : grille 4–5 colonnes, cartes avec contenu riche, header horizontal avec horloge et personnes
- La différence de densité d'information entre les deux est gérée purement par CSS container queries + la prop `isMobile`
