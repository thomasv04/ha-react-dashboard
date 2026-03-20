# 📐 Grille Dashboard - Guide d'utilisation

## 🎯 Comment ça marche

Votre dashboard fonctionne maintenant avec une **grille CSS flexible** inspirée par l'image que vous avez montré.

### Architecture

```
DashboardLayoutContext (contexte global)
  └─ Stocke la configuration de tous les widgets
     ├─ Position (x, y)
     ├─ Taille (w, h)
     └─ ID unique pour chaque widget

DashboardGrid (composant)
  └─ CSS Grid responsive
     ├─ Desktop:  12 colonnes
     ├─ Tablet:   8 colonnes
     └─ Mobile:   4 colonnes

GridItem (wrapper)
  └─ Positionne chaque widget sur la grille
```

---

## 📊 Configuration de la grille

Chaque widget a 4 paramètres:

```typescript
interface GridWidget {
  id: string;              // Identifiant unique
  type: 'camera' | 'weather' | ...;  // Type de widget
  x: number;               // Position colonne (0-11 sur desktop)
  y: number;               // Position ligne (0-N)
  w: number;               // Largeur (1-12 colonnes)
  h: number;               // Hauteur (1-N lignes)
}
```

### Exemple (Desktop - 12 colonnes)

```
┌────────────────────────────────────────────────┐
│  Activity (x:0, y:0, w:12, h:1) - ligne entière  │
├────────────────────────────────────────────────┤
│ Camera     │ Camera │ Weather    │ Thermo │ Thermo │
│ (x:0,w:6)  │        │ (x:6, w:3) │(x:9,w:3)│        │
│            │        │            │         │        │
│            │        │  y:1, h:3  │  y:1    │        │
│            │        │            │ h:3     │        │
├────────────────────────────────────────────────┤
│ Rooms      │ Rooms  │ Shortcuts  │ Greeting│ Greeting│
│ (x:0, w:4) │        │ (x:4, w:4) │(x:8, w:4)│        │
│            │        │ (y:4, h:3) │ y:4, h:3│        │
│ (y:4, h:3) │        │            │         │        │
├────────────────────────────────────────────────┤
│            │        │            │ Tempo  │ Energy  │
│            │        │            │ (x:8)  │ (x:10)  │
│            │        │            │ w:2,h:2│ w:2,h:2 │
└────────────────────────────────────────────────┘
```

---

## 🔧 Modifier la configuration

La config par défaut est dans `src/context/DashboardLayoutContext.tsx`:

```typescript
const DEFAULT_LAYOUT: DashboardLayout = {
  widgets: [
    // Modifiez ici
    { id: 'camera', type: 'camera', x: 0, y: 1, w: 6, h: 3 },
    { id: 'weather', type: 'weather', x: 6, y: 1, w: 3, h: 3 },
    // ...
  ],
  cols: {
    lg: 12,  // Desktop
    md: 8,   // Tablet
    sm: 4,   // Mobile
  },
};
```

### Exemple: Faire la caméra plus grande

**Avant:**
```typescript
{ id: 'camera', type: 'camera', x: 0, y: 1, w: 6, h: 3 }
```

**Après:**
```typescript
{ id: 'camera', type: 'camera', x: 0, y: 1, w: 8, h: 4 }  // Plus large + plus haute
```

---

## ➕ Ajouter un nouveau widget

### 1. Définir la position dans DEFAULT_LAYOUT

```typescript
// Ajouter une entrée
{ id: 'battery', type: 'battery', x: 0, y: 8, w: 4, h: 2 }
```

### 2. Importer le composant dans Dashboard.tsx

```typescript
import { BatteryCard } from '@/components/cards/BatteryCard';
```

### 3. Ajouter le GridItem dans DashboardContent

```typescript
function DashboardContent() {
  return (
    <DashboardGrid>
      {/* ... autres widgets */}
      <GridItem id="battery">
        <BatteryCard />
      </GridItem>
    </DashboardGrid>
  );
}
```

### 4. Ajouter le type dans DashboardLayoutContext

```typescript
export interface GridWidget {
  // ...
  type: 'camera' | 'weather' | ... | 'battery';  // ← Ajouter ici
}
```

---

## 📱 Responsive Breakpoints

Le système gère 3 breakpoints automatiquement:

| Breakpoint | Width | Colonnes | Cas d'usage |
|---|---|---|---|
| **lg** | ≥ 1200px | 12 | Desktop mon 27" |
| **md** | 768-1200px | 8 | iPad |
| **sm** | < 768px | 4 | iPhone |

### Comment ça marche

Le composant `DashboardGrid` écoute les changements de taille de fenêtre et réajuste automatiquement le nombre de colonnes.

Exemple: Sur tablette (8 colonnes), un widget avec `w: 6` prendra 6/8 de la largeur.

---

## 💾 Persistance

Actuellement, la config est sauvegardée dans **localStorage**:

```typescript
// Sauvegarde automatique
useEffect(() => {
  saveLayout(); // Appelé manuel, vous pouvez faire un debounce
}, [layoutChanges]);

// Restauration au démarrage
useEffect(() => {
  loadLayout();
}, []);
```

### Sauvegarde manuelle

Si vous modifiez la layout et voulez la sauvegarder:

```typescript
const { saveLayout } = useDashboardLayout();
saveLayout(); // Sauvegarde dans localStorage
```

---

## 🎁 Intégration futur avec react-grid-layout

Une fois que vous installerez `react-grid-layout`, ce système de configuration est déjà préparé pour être compatible!

Migration futuro très facile:

```bash
npm install react-grid-layout
```

Ensuite remplacer `DashboardGrid` et `GridItem` par la version `react-grid-layout` - votre contexte `DashboardLayoutContext` restera identique!

**Les positions x, y, w, h resteront exactement les mêmes** ✨

---

## 🖼️ Comparaison avec votre layout précédent

**Avant (hardcoded):**
```jsx
<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
  <CameraCard />
  <WeatherCard />
  <ThermostatCard />
</div>
```

**Après (flexible):**
```jsx
<DashboardGrid>
  <GridItem id="camera"><CameraCard /></GridItem>
  <GridItem id="weather"><WeatherCard /></GridItem>
  <GridItem id="thermostat"><ThermostatCard /></GridItem>
</DashboardGrid>
```

**Avantages:**
✅ Configuration centralisée dans DashboardLayoutContext
✅ Prêt pour drag-and-drop
✅ Responsive automatique
✅ Facile à modifier sans toucher au JSX
✅ Sauvegarde/restauration des layouts

---

## 📝 Prochain objectif

La grille est maintenant en place! Ensuite:

1. **Tester sur mobile/tablet** - vérifier qu'elle est bien responsive
2. **Installer react-grid-layout** - pour activer drag-and-drop
3. **Ajouter mode édition** - button pour basculer entre mode visualisation et édition
4. **Implémenter sauvegarde HA** - synchro vers Home Assistant

Tout cela sera très facile maintenant que la fondation est posée! 🚀
