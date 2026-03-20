# Drag & Drop - Comment ça fonctionne (GlassHome)

## 🎯 La question : Comment GlassHome fait le drag-and-drop ?

Cette est **LA** fonctionnalité clé qui rend GlassHome spécial. Voici comment cela fonctionne techniquement.

---

## 📐 Architecture du Drag-and-Drop

### 1. Système de layout

Le dashboard est divisé en **grille virtuelle** (ex: 12 colonnes × N lignes) ou **CSS Grid** responsive. Chaque widget a :
- Position (colonne, ligne)
- Taille (largeur, hauteur)
- ID unique
- Configuration

### 2. Structure de données

```typescript
interface DashboardLayout {
  widgets: WidgetInstance[];
}

interface WidgetInstance {
  id: string;                    // unique widget ID
  type: 'light' | 'weather' | 'camera' | ...;
  x: number;                     // position X (colonne)
  y: number;                     // position Y (ligne)
  width: number;                 // largeur (en colonnes)
  height: number;                // hauteur (en lignes)
  config?: WidgetConfig;         // configuration spécifique
}
```

### 3. Librairie DnD

Les candidats:
- **react-beautiful-dnd** (par Atlassian) - mature, facile
- **dnd-kit** (moderne, léger)
- **react-grid-layout** (spécialisé grids)
- **dnd-core** (bas niveau)

**Choix probable** : `react-grid-layout` qui gère spécifiquement les grilles draggables + resizable.

---

## 💾 Persistance du layout

Il y a 2 approches :

### Approche 1: localStorage (local uniquement)
```typescript
// Sauvegarde locale dans le navigateur
const saveLayout = () => {
  localStorage.setItem(
    'dashboard-layout',
    JSON.stringify(layoutState)
  );
};

// Restaure au chargement
useEffect(() => {
  const saved = localStorage.getItem('dashboard-layout');
  if (saved) setLayout(JSON.parse(saved));
}, []);
```

**Avantages** : Rapide, pas de requête réseau
**Inconvénients** : Pas synchro multi-device

### Approche 2: Home Assistant (persistent + synchro)
```typescript
// Sauvegarde dans HA via input_text helper
const saveLayout = async () => {
  await callService('input_text', 'set_value', {
    entity_id: 'input_text.dashboard_layout',
    value: JSON.stringify(layoutState)
  });
};

// Restaure depuis HA
useEffect(() => {
  const layout = entities['input_text.dashboard_layout']?.state;
  if (layout) setLayout(JSON.parse(layout));
}, [entities]);
```

**Avantages** : Persiste dans HA, synchro multi-device, backup automatique
**Inconvénients** : Un peu plus lent (API calls)

**Hybride** (meilleur) :
- Sauvegarde locale dans localStorage (immédiatement)
- Synchro vers HA toutes les 5-10 secondes (ou au clic "Save")
- Restaure depuis HA au démarrage

---

## 🖱️ Implémentation avec react-grid-layout

### Template basique

```typescript
// Dashboard.tsx avec DnD activé
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

function Dashboard() {
  const [layout, setLayout] = useState<Layout[]>([
    { i: 'weather', x: 0, y: 0, w: 4, h: 3, static: false },
    { i: 'camera', x: 4, y: 0, w: 4, h: 3, static: false },
    { i: 'lights', x: 8, y: 0, w: 4, h: 3, static: false },
    { i: 'rooms', x: 0, y: 3, w: 12, h: 4, static: false },
  ]);

  return (
    <GridLayout
      className="layout"
      layout={layout}
      cols={12}
      rowHeight={60}
      width={1200}
      onLayoutChange={(newLayout) => setLayout(newLayout)}
    >
      <div key="weather"><WeatherCard /></div>
      <div key="camera"><CameraCard /></div>
      <div key="lights"><LightsCard /></div>
      <div key="rooms"><RoomsGrid /></div>
    </GridLayout>
  );
}
```

### Mode édition/visualisation

```typescript
const [isEditing, setIsEditing] = useState(false);

return (
  <>
    <button onClick={() => setIsEditing(!isEditing)}>
      {isEditing ? 'Done Editing' : 'Edit Layout'}
    </button>

    <GridLayout
      isDraggable={isEditing}
      isResizable={isEditing}
      // ... autres props
    >
      {/* widgets */}
    </GridLayout>
  </>
);
```

---

## 🌊 Flux complet (Drag + Save + Sync)

```
┌─────────────────────────────────────────────────────┐
│  Utilisateur glisse un widget                        │
└──────────────────┬──────────────────────────────────┘
                   │ onLayoutChange
                   ▼
┌─────────────────────────────────────────────────────┐
│  React met à jour l'état local (setLayout)          │
└──────────────────┬──────────────────────────────────┘
                   │ saveToLocalStorage()
                   ▼
┌─────────────────────────────────────────────────────┐
│  Sauvegarde immédiate dans localStorage             │
└──────────────────┬──────────────────────────────────┘
                   │ debounce 5s
                   ▼
┌─────────────────────────────────────────────────────┐
│  POST /api/dashboard-config (ou Home Assistant)     │
│  Sauvegarde dans input_text.dashboard_layout        │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Au chargement de la page:                          │
│  1. Restaure depuis HA (input_text)                 │
│  2. Fallback sur localStorage si absent             │
│  3. GridLayout réapplique le layout                 │
└─────────────────────────────────────────────────────┘
```

---

## 🔐 Considérations

### Responsive Design
```typescript
// react-grid-layout supporte multiple breakpoints
<GridLayout
  layouts={{
    lg: layoutLarge,    // desktop
    md: layoutMedium,   // tablet
    sm: layoutSmall,    // mobile
  }}
  breakpoints={{ lg: 1200, md: 768, sm: 480 }}
  cols={{ lg: 12, md: 8, sm: 4 }}
>
  {/* widgets */}
</GridLayout>
```

### Widgets statiques
Certains widgets ne doivent pas être bougés :
```typescript
{ i: 'clock', x: 0, y: 0, w: 3, h: 1, static: true }
```

### Import/Export du layout
```typescript
// Exporter la config
const exportConfig = () => {
  const data = JSON.stringify(layout);
  downloadAsJSON(data, 'dashboard-config.json');
};

// Importer la config
const importConfig = (file) => {
  const text = await file.text();
  setLayout(JSON.parse(text));
};
```

---

## 📦 Alternatives et libs

| Lib | Avantages | Inconvénients |
|---|---|---|
| **react-grid-layout** | Mature, DnD + resize, responsive | Un peu lourd (~30KB) |
| **dnd-kit** | Moderne, léger, performant | Moins de features pré-baked |
| **react-beautiful-dnd** | Très fluide, responsive | Pas de resize natif |
| **custom DnD** | Total control | Développement long |

**Recommandation** : `react-grid-layout` c'est le plus complète pour un dashboard.

---

## 🚀 Prochaines étapes pour HA-Dashboard

1. Installer `react-grid-layout`:
   ```bash
   npm install react-grid-layout @types/react-grid-layout
   ```

2. Créer `DashboardLayout.tsx` wrapper
3. Ajouter mode édition (toggle button)
4. Implémenter sauvegarde localStorage
5. Ajouter synchro Home Assistant (input_text)
6. Tests sur mobile/responsive

