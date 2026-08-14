# Bloc « widget » dans les panneaux personnalisés

État : **proposition, non implémentée.** Écrit le 14/08/2026, à partir de la
reprise des popups `bubble-card` du dashboard Lovelace `/lovelace/home` vers le
dashboard React.

## Le problème

Un panneau personnalisé ne connaît que quatre blocs
(`src/types/custom-panel.ts`) :

| Bloc             | Rend                                            |
| ---------------- | ----------------------------------------------- |
| `cover-row`      | un volet : position, ouvrir / stop / fermer     |
| `button`         | un bouton pleine largeur → un appel de service   |
| `button-row`     | 2-3 boutons côte à côte → un appel de service    |
| `section-header` | un titre de séparation                          |

Tous **agissent** ; aucun n'**affiche**. Pas d'état, pas d'image, pas de courbe.
Sur les douze popups Lovelace, cinq passent (Volets, Lumières, Ventilateurs,
Aspirateur, Alarme — cf. § « Ce qui a été fait ») et sept sont hors d'atteinte :

| Popup Lovelace | Ce qu'il faudrait                                          |
| -------------- | ---------------------------------------------------------- |
| Sécurité       | 4 flux caméra Frigate + galerie d'événements                |
| Sonnette       | 1 flux caméra                                              |
| Serveur média  | 6 états de conteneurs Docker + 4 courbes CPU                |
| Production solaire | histogramme des gains sur 7 jours                      |
| Wifi           | un QR code                                                 |
| Plantes        | les 4 barres de `plant.orchidee`                           |
| Notifications  | liste dynamique filtrée sur `input_boolean.display_notification*` |

Écrire un bloc dédié par besoin, c'est sept nouveaux types de blocs, sept
formulaires d'édition, sept jeux de clés i18n — pour redévelopper des cards qui
existent déjà dans `src/components/cards/`.

## La proposition : un seul bloc de plus

Un bloc `widget` qui embarque **n'importe quelle card du registre** dans un
panneau. Les 24 cards existantes (`CameraCard`, `VacuumCard`, `LightCard`,
`AlarmCard`, `SensorCard`, `EnergyCard`, `TemplateCard`…) deviennent d'un coup
disponibles en popup, avec leur édition, leurs dispositions et leur i18n.

Le mécanisme existe déjà et tourne en production : **`GroupCard` fait
exactement ça** (`src/components/cards/GroupCard/GroupCard.tsx`) — elle rend un
type arbitraire via `WIDGET_COMPONENTS[type]` enveloppé dans un
`WidgetIdProvider`. Le bloc `widget` est le même patron, appliqué au rendu d'un
panneau.

### 1. Le type

```ts
// src/types/custom-panel.ts
export interface WidgetBlock {
  id: string;
  type: 'widget';
  widgetType: string;      // clé de WIDGET_COMPONENTS : 'camera', 'vacuum', …
  config: WidgetConfig;    // la config de la card, en ligne dans le panneau
  rows?: number;           // hauteur en rangées de grille (80 px), défaut 4
}

export type CustomBlock = CoverRowBlock | ButtonBlock | ButtonRowBlock | SectionHeaderBlock | WidgetBlock;
```

Config **en ligne dans le bloc**, et non dans `widgetConfigs[page]` : un
panneau est global, les configs de widgets sont par page. Les stocker dans la
page rendrait un panneau dépendant de la page depuis laquelle on l'ouvre.

### 2. Le seul point dur : alimenter la card en config

Les cards lisent leur config via `useWidgetConfig().getWidgetConfig(id)`, qui
tape dans `allWidgetConfigs[currentPageId]`. Il faut pouvoir la court-circuiter
pour le sous-arbre d'un panneau.

`getWidgetConfig` est un `useCallback` **du provider** : il ne peut pas lire un
contexte situé sous lui. La surcharge doit donc se faire dans le **hook**, qui
lui est appelé par le consommateur :

```tsx
// src/context/WidgetConfigContext.tsx
const OverrideCtx = createContext<WidgetConfigs | null>(null);

export function WidgetConfigOverride({ configs, children }: { configs: WidgetConfigs; children: ReactNode }) {
  return <OverrideCtx.Provider value={configs}>{children}</OverrideCtx.Provider>;
}

export function useWidgetConfig() {
  const ctx = useContext(WidgetConfigContext);
  const overrides = useContext(OverrideCtx);
  if (!ctx) throw new Error('useWidgetConfig must be used within WidgetConfigProvider');
  if (!overrides) return ctx;                    // chemin normal : inchangé, toujours mémoïsé
  return { ...ctx, getWidgetConfig: <T,>(id: string) => (overrides[id] as T) ?? ctx.getWidgetConfig<T>(id) };
}
```

Douze lignes, aucun impact sur la persistance ni sur le provider. Le chemin
sans surcharge rend l'objet mémoïsé d'origine ; seul le sous-arbre d'un panneau
reconstruit un objet à chaque rendu — un overlay éphémère, la différence n'est
pas mesurable.

### 3. Le rendu

```tsx
// src/components/custom-panels/WidgetBlock.tsx
export function WidgetBlockRenderer({ block }: { block: WidgetBlock }) {
  const Component = WIDGET_COMPONENTS[block.widgetType as keyof typeof WIDGET_COMPONENTS];
  if (!Component) return null;
  return (
    <WidgetConfigOverride configs={{ [block.id]: block.config }}>
      <WidgetIdProvider id={block.id}>
        <div style={{ height: (block.rows ?? 4) * 80 }} className='overflow-hidden rounded-2xl'>
          <Component />
        </div>
      </WidgetIdProvider>
    </WidgetConfigOverride>
  );
}
```

La hauteur explicite n'est pas décorative : les cards appellent
`useWidgetSize(cardRef)` et adaptent leur mise en page à la taille mesurée. Dans
un conteneur sans hauteur, elles se croient écrasées (`squat`) et masquent leur
contenu secondaire.

Puis un `case 'widget'` dans `CustomPanelRenderer.tsx`.

### 4. L'éditeur — obligatoire, pas optionnel

`CustomPanelEditorModal.tsx` fait `BLOCK_META[block.type]` puis lit
`meta.color`. **Un type inconnu plante l'éditeur** (`meta` vaut `undefined`).
Il faut donc au minimum, même pour des blocs créés à la main en JSON :

- une entrée dans `BLOCK_META` ;
- une entrée dans `BLOCK_TYPE_PICKER` ;
- un `case 'widget'` dans `blockSummary()` ;
- une branche dans `addBlock()`.

Le formulaire d'édition peut se dériver de l'existant : `WIDGET_FIELD_DEFS[type]`
donne déjà les champs de chaque card, c'est ce que consomme `WidgetEditModal`.

### 5. Clés i18n

`layout.customPanel.blockTypeWidget` + `…Desc`, dans `en/layout.json` **et**
`fr/layout.json`.

## Contrainte de déploiement

La prod sert un bundle compilé (`/ha_react_dashboard_static/`). Un nouveau type
de bloc **n'apparaît qu'après une release** (`npm run create-tag`). Une config
qui référence un bloc `widget` sur un build plus ancien tombe dans le
`default: return null` du renderer : le bloc disparaît silencieusement, sans
casser le panneau. Dégradation acceptable, mais il faut publier la version
avant de pousser une config qui s'en sert.

## Ce qui a été fait sans code (14/08/2026)

Cinq panneaux écrits directement dans `customPanels` via
`PUT /api/ha_react_dashboard/config`, avec les quatre blocs existants :

| Panneau        | id             | Contenu                                                        |
| -------------- | -------------- | -------------------------------------------------------------- |
| Volets         | `volets`       | tout ouvrir / stop / tout fermer + 10 `cover-row`               |
| Lumières       | `lumieres`     | 5 bascules (cuisine, salon, SàM, cellier, ambilight) + tout éteindre |
| Ventilateurs   | `ventilateurs` | bureau, chambre + tout arrêter                                  |
| Aspirateur     | `aspirateur`   | start/pause/stop, retour base, localiser, 9 pièces, lancer le lavage |
| Alarme         | `alarme`       | armer maison / absent / nuit + désarmer                         |

Limites constatées à l'usage, que le bloc `widget` lèverait :

- **aucun retour d'état.** Les 9 bascules « pièces à laver » ont toutes la même
  apparence, qu'elles soient à `on` ou à `off`. Idem pour les lumières et les
  ventilateurs : on ne voit pas ce qui est allumé. C'est la limite la plus
  gênante au quotidien.
- pas de variateur, pas de température de couleur, pas de vitesse de
  ventilateur — uniquement des bascules tout-ou-rien.
- pas de niveau de batterie ni d'état de l'aspirateur.

## Le bundle servi en prod ne correspond pas à la version annoncée

Constaté le 14/08/2026, après un redémarrage de Home Assistant qui n'y a rien
changé. HACS annonce `v2.1.0` installé (`update.ha_react_dashboard_update`),
mais les fichiers réellement servis sont antérieurs :

- `GET /ha_react_dashboard_static/ha-react-dashboard.js` (2 094 o, requêté avec
  `Cache-Control: no-cache`, et l'entrée est enregistrée avec
  `cache_headers=False` — c'est bien le fichier sur disque) référence
  `chunks/ha-panel-DtQraxyh.js` ;
- ce chunk contient encore la liste **codée en dur** des sept panneaux built-in
  (`panels.shutters`, `panels.flowers`…), supprimée par le commit `3d596a1` du
  14/08 à 16 h 06 ;
- le `?v=` de l'entrée vaut `1786703571`, soit un mtime au 14/08 à 12 h 32 —
  antérieur à ce commit, et donc aux publications de v2.1.0 (19 h 11) et
  v2.1.1 (20 h 21).

`www_dir = custom_components/ha_react_dashboard/www` (`__init__.py:56`) et ce
dossier n'est **pas suivi par git** : il est construit par la CI et empaqueté
dans l'asset `ha_react_dashboard.zip` de la release (`hacs.json` :
`zip_release: true`). v2.1.0 est la première release à porter cet asset.

Après un *Redownload* HACS (l'entité est passée à `v2.1.1` à 18 h 49 UTC), les
fichiers servis n'avaient **toujours pas bougé** :

```
ha-react-dashboard.js        Last-Modified: Fri, 14 Aug 2026 10:38:53 GMT
chunks/ha-panel-DtQraxyh.js  Last-Modified: Fri, 14 Aug 2026 10:38:53 GMT
assets/dashboard.css         Last-Modified: Fri, 14 Aug 2026 10:38:53 GMT
```

Or l'archive de v2.1.1 est saine : le run « Build & Publish Add-on » a réussi
sur le tag v2.1.1 à 18 h 15 UTC, et l'API GitHub confirme que ce tag contient
bien `3d596a1` (`compare/3d596a1...v2.1.1` → `behind_by: 0`). Un zip extrait
restitue les mtimes qu'il contient, donc ces fichiers devraient dater de la
construction CI (~18 h 15), pas de 10 h 38.

**HACS a donc mis à jour sa métadonnée de version sans réécrire
`custom_components/ha_react_dashboard/www/`.** Vérification en une commande,
sans redémarrer :

```bash
curl -sI -H "Authorization: Bearer $TOKEN" \
  http://homeassistant.local:8123/ha_react_dashboard_static/ha-react-dashboard.js | grep -i last-modified
```

Tant que la date reste au 14/08 10 h 38, l'extraction n'a pas eu lieu : purger
`custom_components/ha_react_dashboard/`, refaire le téléchargement depuis HACS,
redémarrer, puis vider le cache du navigateur.

Conséquence visible tant que ce n'est pas fait : la barre du bas expose les
sept emplacements built-in au lieu des panneaux personnalisés, et un panneau
custom n'est atteignable qu'en remappant un emplacement (`panelId`) depuis
l'éditeur de dock.

## Autre point à traiter, indépendant

Le contenu de la barre du bas vit dans le **`localStorage` de chaque
navigateur** (`ha-dashboard-dock-config` sur le build en prod,
`ha-dashboard-dock-panels` dans le code courant). Conséquence : un panneau créé
côté serveur n'apparaît sur aucun appareil tant que quelqu'un ne l'a pas ajouté
au dock, appareil par appareil.

`/api/settings/current?device_id=` (cf. `useSettingsSync`) existe déjà et sert
exactement à ça : des réglages par appareil, stockés côté serveur. Y déplacer la
composition du dock réglerait le problème.
