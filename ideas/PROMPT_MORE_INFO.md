# Prompt Copilot — Implémenter les Modals "More Info"

> Copier ce prompt entier et le donner à Copilot Agent dans un nouveau chat.

---

## Contexte

Tu travailles sur **ha-dashboard**, un dashboard React 19 + TypeScript + Vite pour Home Assistant. Le projet utilise `@hakit/core` pour la connexion HA, Tailwind CSS, Framer Motion, et Lucide icons.

La spec complète est dans `ideas/MORE_INFO_MODALS.md` — lis-la en entier avant de commencer.

Les screenshots Tunet attachés montrent le rendu visuel cible pour les modals (2 panneaux : gauche=contenu, droite=info).

## Objectif

Implémenter un système de **modal "More Info"** qui s'ouvre quand l'utilisateur clique sur un widget (en mode non-édition). Chaque widget affiche un modal spécifique avec :
- **Panneau gauche (3/5)** : contenu spécifique (graphique, contrôles, visualisation)
- **Panneau droit (2/5)** : Timeline + History range selector + Attributs de l'entité
- Le panneau droit est **optionnel** (configurable via `showInfoPanel` dans les settings du widget)

## Checklist d'implémentation

Implémente **dans cet ordre exact** :

### Phase 1 — Infrastructure

#### 1.1 `src/context/MoreInfoContext.tsx`
Créer un contexte simple (même pattern que `src/context/PanelContext.tsx`) :
```typescript
interface MoreInfoState {
  widgetId: string;
  widgetType: string;
  entityId: string;
}
interface MoreInfoContextValue {
  state: MoreInfoState | null;
  openMoreInfo: (widgetId: string, widgetType: string, entityId: string) => void;
  closeMoreInfo: () => void;
}
```

#### 1.2 `src/hooks/useEntityHistory.ts`
Évolution de l'existant `src/hooks/useSensorHistory.ts` — ajouter les timestamps et le support binaire :
```typescript
export interface HistoryPoint {
  value: number;
  time: Date;
  state: string; // état brut ('on'/'off'/valeur)
}
export interface EntityHistoryResult {
  data: HistoryPoint[];
  loading: boolean;
  error: string | null;
}
export function useEntityHistory(entityId: string, hours?: number): EntityHistoryResult
```
- Utilise `connection.sendMessagePromise` avec `history/history_during_period` (même pattern que `useSensorHistory`)
- Retourne des `HistoryPoint[]` avec `value` (parseFloat du state, NaN pour les non-numériques) + `time` (Date parsée depuis `last_changed`/`lc`) + `state` (brut)
- Support du format HA >= 2022.12 (`{ s, lc }`) ET ancien format (`{ state, last_changed }`)
- Refresh toutes les 5 minutes

#### 1.3 `src/components/modals/MoreInfoHeader.tsx`
En-tête réutilisable :
```
[Icône cercle coloré]  NOM_ENTITÉ
                       ● État | Valeur
```
Props : `icon: LucideIcon`, `name: string`, `state: string`, `unit?: string`, `stateColor?: string`

Style : fond glassmorphism, icône dans un cercle 56px avec fond coloré semi-transparent, nom en uppercase tracking-wide, état dans un badge pill avec dot coloré.

#### 1.4 `src/components/modals/InfoPanel.tsx`
Panneau droit réutilisable (le MÊME pour tous les widgets) :

```typescript
interface InfoPanelProps {
  entityId: string;
  historyHours: number;
  onHistoryHoursChange: (h: number) => void;
  excludeAttributes?: string[];
  children?: ReactNode; // contenu custom avant les attributs
}
```

Sections dans l'ordre :
1. **TIMELINE** — dot-timeline vertical avec `last_changed` et `last_updated` (dates formatées `DD/MM/YYYY HH:mm:ss`)
2. **HISTORY (HOURS)** — row de 5 boutons : [6H] [12H] [24H] [48H] [72H], le sélectionné a un fond `bg-white/20`
3. **ATTRIBUTES** — liste key-value de TOUS les attributs sauf `friendly_name`, `unit_of_measurement`, `entity_picture`, `icon`. Les keys sont affichées en UPPERCASE avec `_` → espace. Les valeurs en bold.
4. **Entity ID** — en bas, monospace, taille 10px, opacity 50%

Utilise `useSafeEntity(entityId)` pour lire les attributs.

#### 1.5 `src/components/charts/HistoryGraph.tsx`
Graphique SVG (étend le pattern de `src/components/charts/SparkLine.tsx`) :
- ViewBox `600×350`, responsive
- Courbe Bézier lissée (même algo que SparkLine)
- Zone remplie avec gradient vertical (couleur→transparent)
- **Axe Y** : 3 labels (min, mid, max) à gauche
- **Axe X** : 5 labels de temps en bas (formatés HH:mm)
- Props : `data: HistoryPoint[]`, `height?: number`, `color?: string`
- Pas de dépendance externe (pur SVG comme le SparkLine existant)

#### 1.6 `src/components/charts/BinaryTimeline.tsx`
Pour entités binaires (automation, switch, binary_sensor) :
- Barre horizontale : segments colorés (vert #10b981 = on, gris #6b7280 = off)
- En dessous : liste des 8 derniers événements avec dot coloré + état + heure relative ("il y a 2h")

#### 1.7 `src/components/modals/MoreInfoModal.tsx`
Shell du modal :
```typescript
export function MoreInfoModal() {
  const { state, closeMoreInfo } = useMoreInfo();
  if (!state) return null;

  const Content = MORE_INFO_COMPONENTS[state.widgetType];
  if (!Content) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
        style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
        onClick={closeMoreInfo} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="relative w-full max-w-5xl min-h-[550px] rounded-3xl md:rounded-[2rem] overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(10,15,30,0.98))', border: '1px solid rgba(255,255,255,0.08)' }}
          onClick={e => e.stopPropagation()} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
          {/* Close button */}
          <button onClick={closeMoreInfo} className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 ...">
            <X size={18} />
          </button>
          {/* Content */}
          <Suspense fallback={<Loader2 className="animate-spin" />}>
            <Content entityId={state.entityId} widgetId={state.widgetId} />
          </Suspense>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

#### 1.8 `src/components/modals/more-info-registry.ts`
```typescript
import { lazy } from 'react';
export const MORE_INFO_COMPONENTS: Record<string, React.LazyExoticComponent<any>> = {
  sensor:     lazy(() => import('./SensorMoreInfo')),
  light:      lazy(() => import('./LightMoreInfo')),
  cover:      lazy(() => import('./CoverMoreInfo')),
  weather:    lazy(() => import('./WeatherMoreInfo')),
  thermostat: lazy(() => import('./ThermostatMoreInfo')),
  camera:     lazy(() => import('./CameraMoreInfo')),
  person:     lazy(() => import('./PersonMoreInfo')),
  automation: lazy(() => import('./AutomationMoreInfo')),
  energy:     lazy(() => import('./EnergyMoreInfo')),
  template:   lazy(() => import('./TemplateMoreInfo')),
};
export const MORE_INFO_WIDGET_TYPES = Object.keys(MORE_INFO_COMPONENTS);
```

### Phase 2 — Intégration

#### 2.1 Modifier `src/components/layout/DashboardGrid.tsx`
Dans le composant `GridItem`, ajouter un `onClick` quand on n'est PAS en mode édition :
- Importer `useMoreInfo` depuis `MoreInfoContext`
- Récupérer le config du widget via `useWidgetConfig`
- Au clic : si pas en mode édition ET le widget a un type dans `MORE_INFO_WIDGET_TYPES` → `openMoreInfo(id, widget.type, config.entityId)`
- Les widgets sans entityId (greeting, shortcuts, rooms, activity, tempo) ne déclenchent PAS le modal
- Ajouter `cursor-pointer` au div du GridItem quand le modal est disponible

#### 2.2 Modifier `src/Dashboard.tsx`
- Importer `MoreInfoProvider` et `MoreInfoModal`
- Wrapper `DashboardContent` dans `<MoreInfoProvider>`
- Ajouter `<MoreInfoModal />` dans `DashboardContent` (après `<WallPanelOverlay />`)

#### 2.3 Modifier `src/types/widget-types.ts`
Ajouter `showInfoPanel?: boolean` à ces interfaces : `SensorCardConfig`, `LightCardConfig`, `CoverCardConfig`, `WeatherCardConfig`, `ThermostatCardConfig`, `CameraCardConfig`, `PersonStatusConfig`, `AutomationCardConfig`, `EnergyCardConfig`, `TemplateCardConfig`

#### 2.4 Modifier `src/types/widget-fields.ts`
Ajouter à chaque widget qui a un More Info :
```typescript
{ key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
```

### Phase 3 — Modals spécifiques (par widget)

**Important** : chaque modal est un composant avec `export default`. Props : `{ entityId: string; widgetId: string }`.

Chaque modal utilise le layout commun :
```tsx
const config = useWidgetConfig<XxxConfig>(widgetId);
const showInfoPanel = config?.showInfoPanel !== false; // défaut true
const [historyHours, setHistoryHours] = useState(24);

return (
  <div className={`p-8 md:p-12 ${showInfoPanel ? 'lg:grid lg:grid-cols-5 lg:gap-8' : ''}`}>
    <div className={showInfoPanel ? 'lg:col-span-3' : ''}>
      {/* Panneau gauche spécifique */}
    </div>
    {showInfoPanel && (
      <div className="lg:col-span-2 mt-8 lg:mt-0">
        <InfoPanel entityId={entityId} historyHours={historyHours} onHistoryHoursChange={setHistoryHours} />
      </div>
    )}
  </div>
);
```

#### 3.1 `src/components/modals/SensorMoreInfo.tsx`
- Header : icône depuis config ou `Activity`, nom, état + unité dans badge
- **Si numérique** : `HistoryGraph` avec données de `useEntityHistory(entityId, historyHours)`
- **Si binaire** (domain binary_sensor, switch, automation) : `BinaryTimeline`
- Panneau droit : `InfoPanel` standard

Déterminer si numérique : `!isNaN(parseFloat(entity.state))` ET domain n'est pas dans `['binary_sensor','switch','automation','cover','light']`

#### 3.2 `src/components/modals/CoverMoreInfo.tsx`
- Header : icône ArrowUpDown, nom, badge Open/Closed/Moving
- **Visuel volet** : rectangle 250×350 avec lamelles animées proportionnelles à `current_position`
- **Boutons** : [▲ OPEN] [■ STOP] [▼ CLOSED] dans une row
- Panneau droit : **PRESETS** [CLOSE] [25%] [50%] [75%] [OPEN] + **INFORMATION** (State, Position, Device type)
- Services : `cover.open_cover`, `cover.close_cover`, `cover.stop_cover`, `cover.set_cover_position`
- Pattern existant : voir `src/components/cards/CoverCard/CoverCard.tsx` pour `helpers.callService`

#### 3.3 `src/components/modals/LightMoreInfo.tsx`
- Header : icône Lightbulb, nom, badge ON/OFF
- **Toggle** : gros bouton rond → `light.toggle`
- **Tabs** : [Luminosité ☀️] [Température 🌡️] [Couleur 🎨]
  - Luminosité : slider 0–100% → `light.turn_on { brightness_pct }`
  - Température : slider min–max kelvin → `light.turn_on { color_temp_kelvin }` (si `supported_color_modes` inclut `color_temp`)
  - Couleur : slider 0–360 hue → `light.turn_on { hs_color: [hue, 100] }` (si modes inclut `hs`/`rgb`/`xy`)
- Panneau droit : slider actif + sous-entités du groupe (si `groupEntities`)
- Pattern existant : voir `src/components/cards/LightCard/LightCard.tsx`

#### 3.4 `src/components/modals/WeatherMoreInfo.tsx`
- Header : icône Cloud, nom, badge condition
- **Température** : affichage géant
- **Toggle** : [HOURLY] [DAILY]
- **Graphique** : `HistoryGraph` avec historique température
- **Prévisions** : scroll horizontal, cards avec icône météo + temp
- Panneau droit (pas InfoPanel standard, layout custom 3 cols) : Humidity, Pressure, Wind/Gust, Dew Point, Precipitation
- Forecast via `connection.sendMessagePromise` avec `{ type: 'call_service', domain: 'weather', service: 'get_forecasts', target: { entity_id }, service_data: { type: 'hourly'|'daily' }, return_response: true }`

#### 3.5 `src/components/modals/ThermostatMoreInfo.tsx`
- Header : icône Thermometer, nom, badge mode HVAC
- **Température cible** : géante (text-7xl italic) + température actuelle au-dessus
- **Boutons ±** : step 0.5°C + slider
- Panneau droit : dropdowns HVAC mode, Fan mode, Swing mode
- Couleur dynamique : heating→orange, cooling→bleu, idle→gris
- Services : `climate.set_temperature`, `climate.set_hvac_mode`, etc.
- Pattern existant : voir `src/components/cards/ThermostatCard/ThermostatCard.tsx`

#### 3.6 `src/components/modals/AutomationMoreInfo.tsx`
- Header : icône Workflow, nom, badge Actif/Inactif
- **Toggle** : gros bouton → `automation.toggle`
- **Last triggered** : timestamp formaté de `attributes.last_triggered`
- **Mode** : affichage de `attributes.mode` (single/restart/queued/parallel)
- Panneau droit : `InfoPanel` avec `BinaryTimeline`
- Pattern existant : voir `src/components/cards/AutomationCard/AutomationCard.tsx`

#### 3.7 `src/components/modals/CameraMoreInfo.tsx`
- Header : icône Camera, nom
- **Flux vidéo** : pleine largeur, `<img>` vers HA camera proxy
- **Toggle** : [STREAM] [SNAPSHOT] + bouton Refresh
- **PAS de panneau droit** (le flux occupe tout)
- URL : `/api/camera_proxy_stream/{entity_id}?token={access_token}`

#### 3.8 `src/components/modals/PersonMoreInfo.tsx`
- Header : photo profil, nom, badge Home/Away
- **Carte** : utiliser une image statique ou un `<iframe>` OpenStreetMap centré sur `latitude`/`longitude`
  - Alternative simple (sans Leaflet) : `<img src="https://staticmap...">` ou juste afficher lat/lon + zone
  - Si on veut Leaflet : `npm install leaflet react-leaflet` + import dynamique
- Panneau droit : Batterie + capteurs additionnels

#### 3.9 `src/components/modals/EnergyMoreInfo.tsx`
- Header : icône Zap, nom "Énergie"
- **Graphique** : `HistoryGraph` avec consommation
- Affiche les données des entités configurées dans `EnergyCardConfig`
- Panneau droit : `InfoPanel` de l'entité principale (`batteryLevelEntity`)

#### 3.10 `src/components/modals/TemplateMoreInfo.tsx`
- Header : icône résolue depuis config, nom résolu
- **Contenu** : `primaryInfo` et `secondaryInfo` affichés en grand (templates résolus via `useTemplate`)
- Si `entityId` configuré et numérique : `HistoryGraph`
- Panneau droit : `InfoPanel` (si entityId)

## Conventions du projet

- **Appels HA** : `const { helpers, connection } = useHass()` puis `helpers.callService({ domain, service, target: { entity_id }, serviceData })`
- **Entités** : `useSafeEntity(entityId)` retourne `{ state, attributes }` ou `null`
- **Historique existant** : `useSensorHistory(entityId, hours)` dans `src/hooks/useSensorHistory.ts` — s'en inspirer pour `useEntityHistory`
- **Config widget** : `const config = useWidgetConfig<T>(widgetId)` depuis `@/context/WidgetConfigContext`
- **Widget ID** : `const widgetId = useWidgetId()` depuis `@/components/layout/DashboardGrid`
- **Icônes** : Lucide React (`import { Activity, X, ... } from 'lucide-react'`)
- **Animations** : Framer Motion (`motion.div` + `AnimatePresence`)
- **Style** : Tailwind CSS, glassmorphism (bg-white/5, backdrop-blur, border-white/10)
- **Imports** : alias `@/` pour `src/`

## Règles

1. **Pas de bibliothèque externe** pour les graphiques — pur SVG comme `SparkLine.tsx`
2. **Lazy loading** de tous les modals spécifiques via `React.lazy()`
3. **`tsc --noEmit` doit passer** sans erreur après chaque phase
4. **Pas de refacto** des composants existants — on ajoute, on ne modifie pas le comportement actuel des widgets
5. Le clic sur un widget en **mode édition** continue d'ouvrir l'edit modal (pas le More Info)
6. Les widgets `greeting`, `shortcuts`, `rooms`, `activity`, `tempo` n'ont **PAS** de More Info
7. **Escape** ferme le modal, **clic sur l'overlay** ferme le modal
8. Le modal doit être **responsive** : 5-col grid sur desktop, stack sur mobile
