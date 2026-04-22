# Analyse du Drag-and-Drop de Tunet vs ha-dashboard

## Conclusion principale

**Tunet n'utilise PAS react-grid-layout.** C'est une implémentation custom avec CSS Grid natif + HTML5 Drag API + Touch Events. C'est pour ça qu'il n'a pas de lag : il n'y a aucune compaction algorithmique, aucun setState par pixel, et le navigateur gère le layout via CSS Grid.

---

## Architecture comparée

| Aspect | Tunet | ha-dashboard (nous) |
|--------|-------|---------------------|
| Layout engine | **CSS Grid natif** (`display: grid`) | **react-grid-layout** (position: absolute + transform) |
| Drag library | **HTML5 Drag API** (desktop) + **Touch Events** (mobile) | **react-grid-layout** interne (DraggableCore) |
| Positionnement | `gridRowStart/gridColumnStart` (flow CSS) | `transform: translate(Xpx, Ypx)` (absolute) |
| Compaction | **Aucune** - l'ordre du tableau = l'ordre visuel | `compactType='vertical'` → algorithme `compact()` |
| Reorder pendant drag | **Swap de position dans un tableau** (array splice) | **RGL recalcule TOUT le layout** à chaque mousemove |
| State updates pendant drag | **Refs** (zéro re-render) sauf `draggingId` pour le style | **RGL fait setState** en interne à chaque pixel |
| Transitions | `transition: all 0.3s` en inline style (pas de conflit) | **RGL injecte `transition: transform 0.2s` en inline** |
| backdrop-filter | `blur(16px)` toujours actif (mais pas de transform sur les voisins) | `blur(30px)` sur `.gc` → rend CHAQUE repaint de transform 10× plus cher |

---

## Comment Tunet structure ses données

### Stockage du layout
```js
// Tunet : tableau simple = ordre d'affichage
pagesConfig = {
  home: ['light.bedroom', 'light.kitchen', 'climate.living_room', 'camera.front'],
  lights: ['light.bedroom', 'light.kitchen', 'light.bathroom'],
}

// ha-dashboard : objets avec positions x/y/w/h par breakpoint
layout.widgets = {
  lg: [
    { id: 'camera', type: 'camera', x: 0, y: 1, w: 6, h: 3 },
    { id: 'weather', type: 'weather', x: 6, y: 1, w: 3, h: 3 },
    ...
  ]
}
```

### Calcul des positions
```js
// Tunet : buildGridLayout() calcule row/col à partir de l'ordre du tableau
// Fonction pure, appelée UNE SEULE FOIS au render (pas pendant le drag)
const gridLayout = buildGridLayout(visibleIds, gridColCount, getCardGridSpan, getCardColSpan);
// → { 'light.bedroom': { row: 1, col: 1, span: 2, colSpan: 1 }, ... }

// Le layout CSS Grid fait le reste :
<div style={{
  display: 'grid',
  gridTemplateColumns: `repeat(${gridColCount}, minmax(0, 1fr))`,
  gridAutoRows: 'auto',
}}>
  <div style={{
    gridRowStart: placement.row,
    gridColumnStart: placement.col,
    gridRowEnd: `span ${span}`,
  }}>
    {card}
  </div>
</div>
```

---

## Comment Tunet gère le drag (Desktop)

### Fichier : `src/utils/dragAndDrop.js`

```js
// HTML5 Drag API - ZERO bibliothèque externe
const getDragProps = ({ cardId, index, colIndex }) => ({
  draggable: editMode,  // attribut HTML natif

  onDragStart: (e) => {
    // Stocke les données du drag dans le DataTransfer
    e.dataTransfer.setData('dragData', JSON.stringify({ index, cardId, colIndex }));
    e.dataTransfer.effectAllowed = 'move';
    // ★ setTimeout(0) pour que le browser capture le snapshot AVANT le style change
    setTimeout(() => setDraggingId(cardId), 0);
  },

  onDragEnd: () => setDraggingId(null),

  onDragOver: (e) => {
    e.preventDefault();  // Nécessaire pour autoriser le drop
    e.dataTransfer.dropEffect = 'move';
  },

  onDrop: (e) => {
    e.stopPropagation();
    const source = JSON.parse(e.dataTransfer.getData('dragData'));

    // ★ LE COEUR : simple array splice, pas de compaction algorithmique
    const currentList = [...(newConfig[activePage] || [])];
    const movedItem = currentList.splice(source.index, 1)[0];
    currentList.splice(index, 0, movedItem);
    newConfig[activePage] = currentList;

    saveConfig(newConfig);  // persist + setState
  },
});
```

**Pourquoi c'est performant :**
- Le navigateur gère le ghost image et le drag natif → ZERO JS pendant le mousemove
- L'événement `onDrop` arrive UNE SEULE FOIS à la fin
- Le reorder est un simple `Array.splice` → O(n) sur un tableau de ~12 éléments
- CSS Grid recalcule le layout automatiquement → pas de `compact()` maison

---

## Comment Tunet gère le drag (Mobile/Touch)

### Phase 1 : Start
```js
const startTouchDrag = (cardId, index, colIndex, x, y) => {
  safeVibrate(50);  // feedback haptique
  // ★ Tout dans des REFS, pas des states → zéro re-render
  dragSourceRef.current = { index, cardId, colIndex };
  touchTargetRef.current = null;
  // Copie de travail pour les swaps en cours
  touchWorkingConfigRef.current = {
    ...pagesConfig,
    [activePage]: [...(pagesConfig[activePage] || [])],
  };
  setTouchPath({ startX: x, startY: y, x, y });
  setDraggingId(cardId);  // seul setState → change le style uniquement
};
```

### Phase 2 : Move (avec cooldown 150ms)
```js
const updateTouchDrag = (x, y) => {
  setTouchPath((prev) => (prev ? { ...prev, x, y } : { ... }));

  // ★ Détection de la cible par elementFromPoint (natif browser, rapide)
  const el = document.elementFromPoint(x, y);
  const cardEl = el?.closest?.('[data-card-id]');
  if (!cardEl) return;

  const targetId = cardEl.getAttribute('data-card-id');
  if (targetId === dragSourceRef.current.cardId) return;

  // ★ COOLDOWN 150ms — empêche le swap spam
  const now = Date.now();
  if (now - touchSwapCooldownRef.current <= 150) return;
  touchSwapCooldownRef.current = now;

  // Swap dans le tableau de travail
  const { newConfig, source } = moveCard({ source: dragSourceRef.current, targetIndex });
  dragSourceRef.current = source;
  pendingTouchConfigRef.current = newConfig;
  setPagesConfig(newConfig);  // setState mais max 1 fois / 150ms
  safeVibrate(10);
};
```

### Phase 3 : Drop
```js
const performTouchDrop = (x, y) => {
  // 1. Hit test exact
  let cardElement = cards.find(card => {
    const rect = card.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  });

  // 2. Fallback : plus proche dans un rayon de 220px
  if (!cardElement) {
    cards.forEach(card => {
      const dist = Math.hypot(x - cx, y - cy);
      if (dist < 220 && dist < minDist) { cardElement = card; }
    });
  }

  // 3. Dernier recours : dernière cible touchée
  if (!cardElement && touchTargetRef.current) {
    cardElement = cards.find(c => c.getAttribute('data-card-id') === touchTargetRef.current.targetId);
  }

  const { newConfig } = moveCard({ source, targetIndex });
  saveConfig(newConfig);  // persist final
  safeVibrate(20);
};
```

---

## CSS et performances visuelles

### Pas de conflit de transition
```js
// Tunet applique la transition en INLINE STYLE directement
// Pas de conflit avec une lib qui injecte aussi des transitions
style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
```

### Animation jiggle en edit mode
```css
@keyframes editJiggle {
  0%   { transform: rotate(-0.15deg) scale(0.99); }
  50%  { transform: rotate(0.15deg) scale(0.99); }
  100% { transform: rotate(-0.15deg) scale(0.99); }
}
```

### Style conditionnel pendant le drag
```js
// Le widget dragué :
transform: isDragging ? 'scale(1.08)' : 'none',
boxShadow: isDragging ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : ...,
zIndex: isDragging ? 50 : 1,
pointerEvents: isDragging ? 'none' : 'auto',

// La cible potentielle (glow bleu) :
boxShadow: isTouchTarget ? '0 0 0 2px rgba(59,130,246,0.6), 0 0 30px rgba(59,130,246,0.35)' : ...,
```

### backdrop-filter toujours actif (mais pas un problème)
```js
backdropFilter: 'blur(16px)',  // 16px, pas 30px comme nous
```
**Pourquoi ça ne lag pas chez eux** : les cartes ne bougent pas via CSS `transform` pendant le drag. Le navigateur utilise le ghost image HTML5 natif. Les voisins ne se déplacent qu'au moment du swap (1× par 150ms max), et c'est CSS Grid qui recalcule le layout (une seule passe composite), pas 9× `transform: translate()` avec `backdrop-filter: blur()` sur chaque élément.

---

## Pourquoi ha-dashboard lag et pas Tunet

### Le problème fondamental : RGL + backdrop-filter

```
RGL mousemove (60fps)
  → setState interne RGL (nouveau layout)
    → React re-render 9 GridItems
      → Chaque GridItem : nouveau style.transform = translate(Xpx, Ypx)
        → Browser : 9 éléments avec transform qui change
          → Chaque élément a backdrop-filter: blur(30px)
            → GPU doit re-sampler + blurer les pixels derrière × 9
              → ~30ms par frame au lieu de ~2ms
                → LAG
```

### Chez Tunet :
```
HTML5 dragover (géré par le browser, pas de JS)
  → Le browser montre un ghost image natif (séparated compositor layer)
  → Aucun widget ne bouge → aucun transform ne change
  → backdrop-filter: blur(16px) est stable → 0 recomposition
  → Au moment du drop : 1 seul setState → CSS Grid recalcule → 1 frame

Touch drag avec cooldown :
  → touchmove (60fps) mais moveCard() appelé max 1×/150ms
  → setPagesConfig() → CSS Grid re-layout → 1 frame de reflow
  → backdrop-filter recomposé 1× (pas 60×)
```

---

## Options pour ha-dashboard

### Option A : Garder RGL mais patcher le lag (effort moyen)
1. **Killer les transitions RGL inline** avec `!important` pendant le drag
2. **Désactiver backdrop-filter** sur `.gc` pendant le drag (déjà fait via `.dashboard-editing`)
3. **Throttler onDrag** : RGL a un callback `onDrag` qu'on peut intercepter — mais c'est le setState INTERNE de RGL qui pose problème, pas notre code

⚠️ **Limite** : RGL fait `this.setState({ layout })` dans son code source à chaque mousemove. On ne peut PAS empêcher ça sans forker la lib.

### Option B : Remplacer RGL par CSS Grid + drag custom (à la Tunet) (gros refactor)
- Passer de `position: absolute + transform` à `display: grid + gridRow/gridCol`
- Implémenter le drag avec HTML5 Drag API (desktop) + Touch Events (mobile)
- Le layout devient un simple tableau ordonné
- Plus de compaction algorithmique

**Avantage** : contrôle total, lag impossible, mobile natif
**Coût** : réécrire DashboardGrid.tsx, changer le format de stockage du layout

### Option C : Hybride — RGL pour le layout, mais désactiver compaction ET throttler (effort léger)
1. `compactType={null}` en permanence (pas juste pendant le drag)
2. `preventCollision={true}` — les widgets ne se poussent jamais
3. L'utilisateur place manuellement ses widgets (comme un bureau Windows)
4. Tuer les transitions inline RGL via CSS `!important`
5. Désactiver backdrop-filter pendant le drag

**Avantage** : change minime, lag éliminé
**Coût** : UX différente — pas de compaction verticale automatique

### Option D : Forker RGL et patcher le setState (effort moyen-haut)
- Dans `ReactGridLayout.js`, remplacer le `setState` dans `onDrag` par une manipulation DOM directe
- Ou ajouter un option `throttleDragMs` pour limiter les updates

---

## Fichiers de référence Tunet

| Fichier | Rôle |
|---------|------|
| `src/utils/dragAndDrop.js` | Toute la logique drag desktop + mobile |
| `src/utils/gridLayout.js` | Calcul des positions grid depuis le tableau ordonné |
| `src/rendering/DashboardGrid.jsx` | Rendu du grid CSS natif |
| `src/hooks/useCardRendering.jsx` | Pipeline de rendu des cartes + injection des dragProps |
| `src/styles/dashboard.css` | Animations (jiggle, transitions) |
| `e2e/drag-and-drop.e2e.js` | Tests E2E du drag |
