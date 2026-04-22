# More Info Modals — Spécification complète

> Popups "Plus d'info" au clic sur un widget, inspirées de Tunet.
> Un panneau droit optionnel (Timeline / Historique / Attributs) configurable par widget.

---

## Résumé

Chaque widget du dashboard peut ouvrir un **modal "More Info"** au clic. Le modal affiche :
- **Panneau gauche** : contrôles spécifiques au widget (graphique, commandes, visuel)
- **Panneau droit** (optionnel) : Timeline, historique avec sélecteur de durée, attributs de l'entité

Le panneau droit est **configurable** dans les settings de chaque widget :
```typescript
showInfoPanel?: boolean;  // Afficher le panneau droit (défaut: true)
```

---

## Architecture globale

### Layout commun

```
┌──────────────────────────────────────────────────────────┐
│  ┌─────────────────────────┬──────────────────────────┐  │
│  │   PANNEAU GAUCHE (3/5)  │  PANNEAU DROIT (2/5)     │  │
│  │                         │                           │  │
│  │  Icône + Nom + État     │  TIMELINE                │  │
│  │                         │  • Last Changed           │  │
│  │  [Contenu spécifique]   │  • Last Updated           │  │
│  │  (graphique, contrôles, │                           │  │
│  │   visualisation)        │  HISTORY (HOURS)          │  │
│  │                         │  [6H] [12H] [24H] [48H]  │  │
│  │                         │                           │  │
│  │                         │  ATTRIBUTES               │  │
│  │                         │  state_class: measurement │  │
│  │                         │  device_class: battery    │  │
│  │                         │  platform: mqtt           │  │
│  │                         │  ...                      │  │
│  │                         │                           │  │
│  │                         │  entity.sensor.xxx        │  │
│  └─────────────────────────┴──────────────────────────┘  │
│                                                    [✕]   │
└──────────────────────────────────────────────────────────┘
```

- **Desktop** : `grid grid-cols-5` → 3 cols gauche + 2 cols droite
- **Mobile** : Stack vertical (gauche au-dessus, droite en dessous)
- Si `showInfoPanel === false` : panneau gauche pleine largeur

### Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `src/components/modals/MoreInfoModal.tsx` | Shell commune : overlay + layout 5 cols + close |
| `src/components/modals/InfoPanel.tsx` | Panneau droit réutilisable (Timeline + History + Attributs) |
| `src/components/modals/MoreInfoHeader.tsx` | En-tête commun : icône + nom + badge état |
| `src/components/charts/HistoryGraph.tsx` | Graphique SVG historique (évolution de `SparkLine`) |
| `src/components/charts/BinaryTimeline.tsx` | Timeline pour entités binaires (on/off) |
| `src/hooks/useEntityHistory.ts` | Hook historique étendu (timestamps + fallback REST) |
| `src/context/MoreInfoContext.tsx` | Contexte pour ouvrir/fermer les modals More Info |
| **Modals par widget (10 fichiers)** | Contenu spécifique de chaque modal |

### Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/types/widget-types.ts` | Ajouter `showInfoPanel?: boolean` à chaque config |
| `src/types/widget-fields.ts` | Ajouter champ `showInfoPanel` aux field defs |
| `src/components/layout/DashboardGrid.tsx` | Ajouter handler clic → ouvre MoreInfoModal |
| `src/App.tsx` | Ajouter `<MoreInfoProvider>` + `<MoreInfoModal />` |

---

## Étape 1 : Contexte MoreInfo

### `src/context/MoreInfoContext.tsx`

```typescript
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface MoreInfoState {
  /** ID du widget cliqué (GridWidget.id) */
  widgetId: string;
  /** Type du widget (pour choisir le contenu du modal) */
  widgetType: string;
  /** Entity ID principal */
  entityId: string;
}

interface MoreInfoContextValue {
  state: MoreInfoState | null;
  openMoreInfo: (widgetId: string, widgetType: string, entityId: string) => void;
  closeMoreInfo: () => void;
}

const MoreInfoContext = createContext<MoreInfoContextValue | null>(null);

export function MoreInfoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MoreInfoState | null>(null);

  const openMoreInfo = useCallback((widgetId: string, widgetType: string, entityId: string) => {
    setState({ widgetId, widgetType, entityId });
  }, []);

  const closeMoreInfo = useCallback(() => setState(null), []);

  return (
    <MoreInfoContext.Provider value={{ state, openMoreInfo, closeMoreInfo }}>
      {children}
    </MoreInfoContext.Provider>
  );
}

export function useMoreInfo() {
  const ctx = useContext(MoreInfoContext);
  if (!ctx) throw new Error('useMoreInfo must be used within MoreInfoProvider');
  return ctx;
}
```

---

## Étape 2 : Hook useEntityHistory (étendu)

### `src/hooks/useEntityHistory.ts`

Évolution de `useSensorHistory` avec :
- Retour des **timestamps** (pas juste les valeurs)
- Support du **range selector** (6h, 12h, 24h, 48h, 72h)
- Fallback **REST API** si WebSocket échoue
- Support des **entités binaires** (on/off timeline)

```typescript
export interface HistoryPoint {
  value: number;
  time: Date;
  state: string; // état brut pour les binaires
}

export interface EntityHistoryResult {
  data: HistoryPoint[];
  loading: boolean;
  error: string | null;
  lastChanged: Date | null;
  lastUpdated: Date | null;
}

export function useEntityHistory(
  entityId: string,
  hours: number = 24,
  refreshInterval: number = 5 * 60 * 1000,
): EntityHistoryResult
```

---

## Étape 3 : Composants partagés

### `src/components/modals/MoreInfoHeader.tsx`

En-tête commun à tous les modals More Info :
```
┌──────────────────────────────────────────┐
│  [Icône]  NOM DE L'ENTITÉ               │
│           ● État  |  Valeur             │
└──────────────────────────────────────────┘
```

Props :
- `icon` : Lucide icon component ou nom MDI
- `name` : friendly_name ou override
- `state` : état formaté (avec unité)
- `stateColor` : couleur du dot (vert, gris, rouge…)

### `src/components/modals/InfoPanel.tsx`

Panneau droit réutilisable :

```typescript
interface InfoPanelProps {
  entityId: string;
  /** Attributs à exclure de la liste */
  excludeAttributes?: string[];
  /** Durée sélectionnée pour l'historique */
  historyHours: number;
  onHistoryHoursChange: (hours: number) => void;
  /** Contenu additionnel avant les attributs */
  children?: ReactNode;
}
```

Sections :
1. **TIMELINE** — `last_changed` et `last_updated` avec dot-timeline
2. **HISTORY (HOURS)** — Boutons [6H] [12H] [24H] [48H] [72H]
3. **ATTRIBUTES** — Tous les attributs sauf `friendly_name`, `unit_of_measurement`, `entity_picture`, `icon`
4. **Entity ID** — Monospace en bas, sélectionnable

### `src/components/charts/HistoryGraph.tsx`

Extension de `SparkLine` avec :
- **Axes X et Y** avec labels
- **Hauteur configurable** (350px par défaut)
- **Courbe Bézier** lissée
- **Zone remplie** avec gradient
- **Tooltips** au hover (optionnel)

### `src/components/charts/BinaryTimeline.tsx`

Pour les entités binaires (switch, automation, binary_sensor) :
- Barre horizontale colorée (vert = on, gris = off)
- Journal des 8 derniers événements avec dot + heure relative

---

## Étape 4 : Shell du modal More Info

### `src/components/modals/MoreInfoModal.tsx`

```typescript
export function MoreInfoModal() {
  const { state, closeMoreInfo } = useMoreInfo();
  if (!state) return null;

  // Route vers le contenu spécifique selon widgetType
  const ContentComponent = MORE_INFO_COMPONENTS[state.widgetType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
         style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
         onClick={closeMoreInfo}>
      <div className="relative w-full max-w-5xl rounded-3xl p-8 md:p-12"
           style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}
           onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button onClick={closeMoreInfo} className="absolute top-6 right-6 ...">✕</button>
        {/* Content */}
        <ContentComponent entityId={state.entityId} widgetId={state.widgetId} />
      </div>
    </div>
  );
}
```

---

## Étape 5 : Modals par type de widget

---

### 5.1 — SensorCard More Info

**Fichier** : `src/components/modals/SensorMoreInfo.tsx`

**Layout** : 5 cols (3+2) — ou pleine largeur si `showInfoPanel === false`

**Panneau gauche** :
- `MoreInfoHeader` : icône (Lucide), nom, badge état + unité
- **Si entité numérique** : `HistoryGraph` (h=350) avec données de `useEntityHistory`
- **Si entité binaire** : `BinaryTimeline` + journal des derniers événements

**Panneau droit** : `InfoPanel` standard (Timeline + History range + Attributs)

**Données Tunet de référence** :
| Section | Contenu |
|---------|---------|
| Header | Icône MDI, friendly_name, état + unité dans badge coloré |
| Graph (numérique) | SVG Bézier, hauteur 350px, couleur `var(--text-primary)` |
| Timeline (binaire) | Barre segmentée vert/gris + log des 8 derniers changements |
| Attributs affichés | `state_class`, `device_class`, `platform`, `integration`, `manufacturer`, `device_manufacturer`, `model`, `device_model`, `device_name` |
| Attributs exclus | `friendly_name`, `unit_of_measurement`, `entity_picture`, `icon` |

**HA APIs** :
- `history/history_during_period` (WebSocket)
- Fallback REST : `GET /api/history/period/{start}?filter_entity_id=...`
- Fallback stats : `recorder/statistics_during_period`

---

### 5.2 — LightCard More Info

**Fichier** : `src/components/modals/LightMoreInfo.tsx`

**Layout** : 5 cols (3+2) si dimmable, sinon pleine largeur

**Panneau gauche** :
- `MoreInfoHeader` : icône Lightbulb, nom, badge ON/OFF coloré
- **Gros bouton toggle** au centre : `light.toggle`
- **Onglets** (segmented control) :
  - **Luminosité** (☀️) : Slider 0–255 → `light.turn_on { brightness }`
  - **Température** (🌡️) : Slider min_kelvin–max_kelvin → `light.turn_on { color_temp_kelvin }`
  - **Couleur** (🎨) : Slider 0–360 hue → `light.turn_on { hs_color: [hue, 100] }`

**Panneau droit** :
- Slider actif (brightness / color temp / hue)
- **Sous-entités** (si light group) : liste des lumières du groupe avec mini-slider + toggle chacune

**Feature detection** :
```typescript
const colorModes = entity.attributes.supported_color_modes || [];
const isDimmable = colorModes.some(m => m !== 'onoff');
const supportsColorTemp = colorModes.includes('color_temp');
const supportsColor = colorModes.some(m => ['hs', 'rgb', 'xy'].includes(m));
```

**HA Services** :
| Service | Paramètres |
|---------|-----------|
| `light.toggle` | `{ entity_id }` |
| `light.turn_on` | `{ entity_id, brightness }` (0–255) |
| `light.turn_on` | `{ entity_id, color_temp_kelvin }` |
| `light.turn_on` | `{ entity_id, hs_color: [hue, 100] }` |

**Attributs lus** : `supported_color_modes`, `brightness`, `color_temp_kelvin`, `min_color_temp_kelvin`, `max_color_temp_kelvin`, `hs_color`, `entity_id` (sub-entities)

---

### 5.3 — CoverCard More Info

**Fichier** : `src/components/modals/CoverMoreInfo.tsx`

**Layout** : 5 cols (3+2)

**Panneau gauche** :
- `MoreInfoHeader` : icône ArrowUpDown, nom, badge état (Open/Closed/Moving)
- **Visualisation interactive du volet** : rectangle avec lamelles animées, drag vertical pour position
- **Position %** : label centré sous le visuel
- **Boutons de contrôle** : [▲ OPEN] [■ STOP] [▼ CLOSED]

**Panneau droit** :
- **PRESETS** : boutons [CLOSE] [25%] [50%] [75%] [OPEN]
- **INFORMATION** :
  - State : Open / Closed / Moving
  - Position : 0–100%
  - Tilt : 0–100% (si supporté)
  - Device type : Shutter / Blind / Awning / etc.
- **Tilt control** (si supporté) : mini visuel inclinaison + presets

**Feature detection** :
```typescript
const features = entity.attributes.supported_features || 0;
const supportsPosition = !!(features & 4);
const supportsOpenClose = !!(features & 3);
const supportsStop = !!(features & 8);
const supportsTilt = !!(features & 128);
```

**HA Services** :
| Service | Paramètres |
|---------|-----------|
| `cover.open_cover` | `{ entity_id }` |
| `cover.close_cover` | `{ entity_id }` |
| `cover.stop_cover` | `{ entity_id }` |
| `cover.set_cover_position` | `{ entity_id, position: 0–100 }` |
| `cover.set_cover_tilt_position` | `{ entity_id, tilt_position: 0–100 }` |

**Attributs lus** : `current_position`, `current_tilt_position`, `supported_features`, `device_class`

---

### 5.4 — WeatherCard More Info

**Fichier** : `src/components/modals/WeatherMoreInfo.tsx`

**Layout** : Panneau unique, `grid grid-cols-1 md:grid-cols-3`
- Gauche (2 cols) : Température actuelle + graphique + prévisions
- Droite (1 col) : Détails météo

**Panneau gauche** :
- `MoreInfoHeader` : icône Cloud, nom, badge condition (Cloudy, Sunny, etc.)
- **TEMPERATURE** : valeur géante + unité
- **Toggle** : [HOURLY] [DAILY] pour basculer le graphique
- **Graphique** : `HistoryGraph` — historique de température si capteur lié, sinon courbe de prévisions
- **Prévisions** : scroll horizontal de cards avec icône météo + température + heure

**Panneau droit (détails)** :
| Donnée | Icône | Exemple |
|--------|-------|---------|
| Humidity | 💧 | 79% |
| Pressure | 🌀 | 1021.9 hPa |
| Wind / Gust | 💨 | 10.1 km/h |
| Dew Point | 🌡️ | 10.3 °C |
| Precipitation | 🌧️ | -- mm |

**HA Services** :
| Service | Paramètres |
|---------|-----------|
| `weather.get_forecasts` | `{ entity_id, type: 'hourly'\|'daily' }` via WS call_service |

**Attributs lus** : `temperature`, `humidity`, `pressure`, `wind_speed`, `wind_gust_speed`, `dew_point`, `precipitation`, toutes les unités (`temperature_unit`, `wind_speed_unit`, `pressure_unit`, `precipitation_unit`)

**Couleur dynamique du graphique** basée sur la température :
- ≤ 0°C → bleu, ≤ 10°C → cyan, ≤ 20°C → vert, ≤ 28°C → jaune, > 28°C → rouge

---

### 5.5 — ThermostatCard More Info

**Fichier** : `src/components/modals/ThermostatMoreInfo.tsx`

**Layout** : 5 cols (3+2)

**Panneau gauche** :
- `MoreInfoHeader` : icône Thermometer, nom, badge mode HVAC
- **Température cible** : affichage géant (6xl–9xl) en italique
- **Température intérieure** : label plus petit au-dessus
- **Boutons ±** : incrément de 0.5°C
- **Slider** : contrôle continu min_temp → max_temp

**Panneau droit** :
- **HVAC Mode** : Dropdown avec modes disponibles (heat, cool, auto, off, dry, fan_only)
- **Fan Mode** : Dropdown (si supporté)
- **Swing Mode** : Dropdown (si supporté)

**Couleur dynamique** selon `hvac_action` :
- heating → orange, cooling → bleu, idle → gris, drying → jaune

**HA Services** :
| Service | Paramètres |
|---------|-----------|
| `climate.set_temperature` | `{ entity_id, temperature }` (step 0.5) |
| `climate.set_hvac_mode` | `{ entity_id, hvac_mode }` |
| `climate.set_fan_mode` | `{ entity_id, fan_mode }` |
| `climate.set_swing_mode` | `{ entity_id, swing_mode }` |

**Attributs lus** : `current_temperature`, `temperature`, `min_temp`, `max_temp`, `hvac_action`, `hvac_modes`, `fan_modes`, `swing_modes`, `fan_mode`, `swing_mode`

---

### 5.6 — CameraCard More Info

**Fichier** : `src/components/modals/CameraMoreInfo.tsx`

**Layout** : Panneau unique pleine largeur (max-w-6xl)

**Contenu** :
- `MoreInfoHeader` : icône Camera, nom
- **Toggle** : [STREAM] [SNAPSHOT]
- **Zone vidéo** : pleine largeur
  - Mode Stream : `<img>` vers `/api/camera_proxy_stream/{entity_id}?token=...`
  - Mode Snapshot : `<img>` vers `/api/camera_proxy/{entity_id}?token=...`
- **Bouton Refresh** pour recharger le snapshot

**Sources vidéo** (par priorité) :
1. WebRTC URL customisable (template `{entity_id}`)
2. HA stream proxy : `/api/camera_proxy_stream/{entity_id}?token={access_token}`
3. Snapshot fallback : `/api/camera_proxy/{entity_id}?token={access_token}`

**Attributs lus** : `access_token`, `entity_picture`, `friendly_name`

**Pas de panneau droit** — le flux vidéo occupe toute la largeur.

---

### 5.7 — PersonStatusCard More Info

**Fichier** : `src/components/modals/PersonMoreInfo.tsx`

**Layout** : 5 cols (3+2) — ou pleine largeur si pas de capteurs associés

**Panneau gauche** :
- `MoreInfoHeader` : photo de profil (cercle), nom, badge Home/Away
- **Carte Leaflet** : 
  - Fond CartoDB (dark/light selon thème)
  - Marqueur bleu à la position GPS
  - Label "Last seen here"
  - Hauteur responsive : `clamp(20rem, 35vw, 30rem)`

**Panneau droit** (si capteurs disponibles) :
- **Batterie téléphone** : valeur + barre de progression
- **Batterie montre** : compact
- **Capteurs additionnels** : grille de cards valeur

**Résolution du device tracker** (priorité) :
1. Override manuel dans les settings du widget
2. Attribut `source` de l'entité person
3. Auto-découverte par correspondance de nom

**Résolution de la batterie** (priorité) :
1. Override manuel `batteryEntity` dans settings
2. Attribut `battery_level` de l'entité person
3. Attribut `battery_level` du device tracker source
4. Auto-découverte : sensor avec `device_class: battery` matchant le nom

**Attributs lus** : `latitude`, `longitude`, `entity_picture`, `friendly_name`, `battery_level`, `source`

**Dépendance** : `leaflet` (si pas déjà installé)

---

### 5.8 — AutomationCard More Info

**Fichier** : `src/components/modals/AutomationMoreInfo.tsx`

**Layout** : 5 cols (3+2)

**Panneau gauche** :
- `MoreInfoHeader` : icône Workflow, nom, badge Actif/Inactif
- **Gros bouton toggle** : `automation.toggle`
- **Dernière exécution** : timestamp `last_triggered`
- **Mode** : `single`, `restart`, `queued`, `parallel`

**Panneau droit** : `InfoPanel` standard avec `BinaryTimeline`
- Timeline des activations/désactivations
- Attributs : `last_triggered`, `mode`, `current`

**HA Services** :
| Service | Paramètres |
|---------|-----------|
| `automation.toggle` | `{ entity_id }` |
| `automation.turn_on` | `{ entity_id }` |
| `automation.turn_off` | `{ entity_id }` |
| `automation.trigger` | `{ entity_id }` |

**Attributs lus** : `last_triggered`, `mode`, `current`, `friendly_name`, `icon`

---

### 5.9 — EnergyCard More Info

**Fichier** : `src/components/modals/EnergyMoreInfo.tsx`

**Layout** : Panneau unique (pas de split 3+2)

**Contenu** :
- `MoreInfoHeader` : icône Zap, nom
- **Graphique de consommation** : `HistoryGraph` avec les données d'énergie
- **Statistiques** : production solaire, consommation, coût

**Note** : L'EnergyCard utilise souvent plusieurs entités. Le modal agrège les données de toutes les entités configurées.

---

### 5.10 — TemplateCard More Info

**Fichier** : `src/components/modals/TemplateMoreInfo.tsx`

**Layout** : 5 cols (3+2) — utilise le `InfoPanel` standard

**Panneau gauche** :
- `MoreInfoHeader` : icône résolue depuis le template, nom résolu
- **Contenu résolu** : affichage de `primaryInfo` et `secondaryInfo` en grand format
- **Graphique** (si entité numérique liée) : `HistoryGraph`

**Panneau droit** : `InfoPanel` avec attributs de l'entité liée (si `entityId` configuré)

---

## Étape 6 : Settings widget — `showInfoPanel`

### Modification de `src/types/widget-types.ts`

Ajouter à **chaque** interface de config :

```typescript
/** Afficher le panneau droit (Timeline / Historique / Attributs) dans le modal More Info */
showInfoPanel?: boolean; // défaut: true
```

**Widgets concernés** : `SensorCardConfig`, `LightCardConfig`, `CoverCardConfig`, `WeatherCardConfig`, `ThermostatCardConfig`, `CameraCardConfig`, `PersonStatusConfig`, `AutomationCardConfig`, `EnergyCardConfig`, `TemplateCardConfig`

**Widgets exclus** (pas de More Info) : `GreetingCardConfig`, `ShortcutsCardConfig`, `RoomsGridConfig`, `ActivityBarConfig`, `TempoCardConfig`

### Modification de `src/types/widget-fields.ts`

Ajouter le champ dans les field defs de chaque widget :

```typescript
{ key: 'showInfoPanel', label: 'Panneau info', fieldType: 'boolean', defaultValue: true },
```

---

## Étape 7 : Intégration au clic

### Modification de `src/components/layout/DashboardGrid.tsx`

Quand l'utilisateur clique sur un widget **en mode non-édition** :

```typescript
const { openMoreInfo } = useMoreInfo();

const handleWidgetClick = (widget: GridWidget) => {
  // Ne pas ouvrir en mode édition
  if (isEditing) return;
  // Ne pas ouvrir pour les widgets sans More Info
  if (['greeting', 'shortcuts', 'rooms', 'activity', 'tempo'].includes(widget.type)) return;
  // Récupérer l'entityId principal depuis la config du widget
  const config = getWidgetConfig(widget.id);
  const entityId = config?.entityId || '';
  if (!entityId) return;
  openMoreInfo(widget.id, widget.type, entityId);
};
```

### Modification de `src/App.tsx`

```tsx
import { MoreInfoProvider } from '@/context/MoreInfoContext';
import { MoreInfoModal } from '@/components/modals/MoreInfoModal';

// Dans le render :
<MoreInfoProvider>
  {/* ... existing providers ... */}
  <MoreInfoModal />
</MoreInfoProvider>
```

---

## Étape 8 : Registre des composants More Info

### `src/components/modals/more-info-registry.ts`

```typescript
import { lazy } from 'react';

export const MORE_INFO_COMPONENTS: Record<string, React.LazyExoticComponent<any>> = {
  sensor:      lazy(() => import('./SensorMoreInfo')),
  light:       lazy(() => import('./LightMoreInfo')),
  cover:       lazy(() => import('./CoverMoreInfo')),
  weather:     lazy(() => import('./WeatherMoreInfo')),
  thermostat:  lazy(() => import('./ThermostatMoreInfo')),
  camera:      lazy(() => import('./CameraMoreInfo')),
  person:      lazy(() => import('./PersonMoreInfo')),
  automation:  lazy(() => import('./AutomationMoreInfo')),
  energy:      lazy(() => import('./EnergyMoreInfo')),
  template:    lazy(() => import('./TemplateMoreInfo')),
};

/** Types de widgets qui supportent le More Info modal */
export const MORE_INFO_WIDGET_TYPES = Object.keys(MORE_INFO_COMPONENTS);
```

---

## Résumé des services HA utilisés

| Widget | Services |
|--------|----------|
| Sensor | Lecture seule (historique) |
| Light | `light.toggle`, `light.turn_on` |
| Cover | `cover.open_cover`, `close_cover`, `stop_cover`, `set_cover_position`, `set_cover_tilt_position` |
| Weather | `weather.get_forecasts` |
| Thermostat | `climate.set_temperature`, `set_hvac_mode`, `set_fan_mode`, `set_swing_mode` |
| Camera | Lecture seule (proxy URLs) |
| Person | Lecture seule (carte + capteurs) |
| Automation | `automation.toggle`, `turn_on`, `turn_off`, `trigger` |
| Energy | Lecture seule (historique) |
| Template | Selon entité liée |

---

## Résumé des attributs par widget

### Sensor
`state_class`, `device_class`, `unit_of_measurement`, `platform`, `integration`, `manufacturer`, `device_manufacturer`, `model`, `device_model`, `device_name`

### Light
`supported_color_modes`, `brightness`, `color_temp_kelvin`, `min_color_temp_kelvin`, `max_color_temp_kelvin`, `hs_color`, `entity_id` (sous-entités)

### Cover
`current_position`, `current_tilt_position`, `supported_features`, `device_class`

### Weather
`temperature`, `humidity`, `pressure`, `wind_speed`, `wind_gust_speed`, `dew_point`, `precipitation`, `*_unit`

### Thermostat
`current_temperature`, `temperature`, `min_temp`, `max_temp`, `hvac_action`, `hvac_modes`, `fan_modes`, `swing_modes`

### Camera
`access_token`, `entity_picture`

### Person
`latitude`, `longitude`, `entity_picture`, `battery_level`, `source`

### Automation
`last_triggered`, `mode`, `current`

---

## Composants de Tunet non repris (et pourquoi)

| Composant Tunet | Raison de non-reprise |
|-----------------|----------------------|
| `MediaModal` | Pas de widget MediaPlayer dans ha-dashboard actuellement |
| `GenericFanModal` | Pas de widget Fan |
| `NordpoolModal` | Spécifique Nordpool (Norvège) |
| `CostModal` | Spécifique coût énergie Nordpool |
| `CalendarModal` | Pas de widget Calendar |
| `TodoModal` | Pas de widget Todo |
| `RoomModal` | ha-dashboard a RoomsGrid mais pas de modal type Tunet |
| `GenericAndroidTVModal` | Pas de widget Android TV |
| `LeafModal` | Pas de widget voiture électrique |
| `AlarmModal (PIN)` | ha-dashboard a SecurityPanel mais pas de widget Alarm avec PIN dédié |

---

## Ordre d'implémentation recommandé

1. **Infra** : MoreInfoContext + MoreInfoModal shell + InfoPanel + MoreInfoHeader
2. **SensorMoreInfo** — le plus générique, teste toute l'infra
3. **CoverMoreInfo** — contrôles interactifs simples
4. **LightMoreInfo** — sliders + tabs
5. **WeatherMoreInfo** — graphique + prévisions
6. **ThermostatMoreInfo** — slider température
7. **AutomationMoreInfo** — toggle simple
8. **CameraMoreInfo** — flux vidéo
9. **PersonMoreInfo** — carte Leaflet
10. **EnergyMoreInfo** — graphiques multiples
11. **TemplateMoreInfo** — générique
12. **Settings** : ajout `showInfoPanel` à tous les widgets
