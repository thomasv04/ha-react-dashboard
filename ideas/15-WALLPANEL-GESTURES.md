# 15 — WallPanel : gestes tactiles (swipe photos, menu rapide, notifications)

> **Implémenté.** Ce document reste la note de conception ; les écarts entre le
> plan et le code livré sont listés en fin de page.
> Suite de [14-WALLPANEL-SCREENSAVER.md](./14-WALLPANEL-SCREENSAVER.md).

## Objectif

Rendre l'écran de veille manipulable au doigt sur une tablette murale, sans jamais
quitter l'overlay :

| Geste | Action |
|---|---|
| Swipe **gauche / droite** | photo suivante / précédente du diaporama |
| Swipe **bas → haut** | feuille « menu rapide » (panneau custom au choix) |
| Swipe **haut → bas** | feuille « notifications » (persistent_notification HA) |
| Tap simple | quitte l'écran de veille (comportement actuel, conservé) |

Le tout en verre dépoli, cohérent avec le reste du dashboard, avec des transitions
ressort et un rubber-band au doigt.

---

## État des lieux (ce qui existe déjà)

Recensé avant d'écrire une ligne — l'essentiel est déjà là.

### Le WallPanel actuel

| Fichier | Rôle |
|---|---|
| [`src/context/WallPanelContext.tsx`](../src/context/WallPanelContext.tsx) | `config`, `isActive`, `activate/deactivate`, `wallPanelLayout`, mode édition |
| [`src/components/wallpanel/WallPanelOverlay.tsx`](../src/components/wallpanel/WallPanelOverlay.tsx) | overlay `fixed inset-0 z-[200]`, dim en `z-[199]`, tap → `deactivate()` |
| [`src/components/wallpanel/BackgroundSlideshow.tsx`](../src/components/wallpanel/BackgroundSlideshow.tsx) | diaporama, crossfade CSS 1000 ms, `setInterval` sur `image_duration` |
| [`src/components/wallpanel/WallPanelEditShell.tsx`](../src/components/wallpanel/WallPanelEditShell.tsx) | shells édition / lecture seule (providers isolés) |
| [`src/components/wallpanel/WallPanelConfigModal.tsx`](../src/components/wallpanel/WallPanelConfigModal.tsx) | modale de config, onglets Activation / Fond / Widgets / Style |
| [`src/types/wallpanel.ts`](../src/types/wallpanel.ts) | `WallPanelConfig` + `DEFAULT_WALLPANEL_CONFIG` |

Persistance : `WallPanelConfig` transite déjà par `DashboardConfigV2.wallPanel.config`
([`DashboardLayoutContext.tsx:95`](../src/context/DashboardLayoutContext.tsx:95)), lu dans
[`useDashboardConfig.ts:190`](../src/hooks/useDashboardConfig.ts:190) et écrit dans
[`EditButton.tsx:73`](../src/components/dashboard/EditButton.tsx:73).
**Ajouter un champ à `WallPanelConfig` suffit : il est sauvegardé et rechargé sans autre modification.**

### Ce qui est réutilisable tel quel

- **framer-motion 12** est déjà une dépendance → `onPan` / `onPanEnd` / `drag` / `AnimatePresence`.
  **Aucune librairie de gestes à ajouter.**
- **`.gc`** ([`index.css:394`](../src/index.css:394)) — la classe verre du projet :
  `backdrop-filter: blur(var(--dash-glass-blur))`, `--dash-elev-card`, réagit aux thèmes.
- **`bottomSheet`** ([`motion-variants.ts`](../src/lib/motion-variants.ts)) — variante feuille du bas déjà écrite,
  utilisée par [`Panel.tsx`](../src/components/layout/Panel.tsx). Il manque juste son miroir `topSheet`.
- **`modalScrim`**, **`staggerContainer`**, **`staggerGridItem`**, **`EASE_SPRING`** (stiffness 400 / damping 25).
- **`CustomPanelRenderer`** ([`CustomPanelRenderer.tsx`](../src/components/custom-panels/CustomPanelRenderer.tsx)) —
  rend n'importe quel panneau custom (button-row, cover-row, widget…) avec ses garde-fous d'erreur.
  → **le « menu rapide » n'a aucune UI à inventer.**
- **`PanelSelectField`** — sélecteur de panneau imposé par le CLAUDE.md, prêt pour la modale de config.
- **`useLongPress`** ([`useLongPress.ts`](../src/hooks/useLongPress.ts)) — précédent maison du filtre
  « geste vs clic » via un ref `moved`. Le même motif résout le conflit swipe/tap.

### Ce qui manque vraiment

1. Un **routeur de gestes** sur l'overlay (2 axes, 4 directions).
2. Un moyen de **piloter le diaporama de l'extérieur** — `BackgroundSlideshow` enferme ses index.
3. Une **feuille du haut** (`topSheet`) — le projet n'a que la feuille du bas.
4. Une **source de notifications** : rien dans le code ne touche `persistent_notification`. C'est le
   seul morceau réellement neuf.

### Contraintes découvertes

- **L'overlay fait `onClick={deactivate}` sur toute sa surface.** Un swipe se termine par un `click` :
  sans garde, chaque geste ferait sortir de l'écran de veille.
- **Les widgets interceptent le pointeur.** `WallPanelReadonlyShell` pose un
  `div.pointer-events-auto` sur toute la largeur (`max-w-[1440px] px-5 pt-8`), pas seulement sur les
  cards. Un geste démarré dans cette bande ne remontera pas jusqu'au routeur.
  → soit passer ce conteneur en `pointer-events-none` et remonter `pointer-events-auto` sur les
  `GridItem`, soit accepter que la zone des widgets ne soit pas gestuelle (le doc retient la 1re option,
  une ligne de diff).
- **`useIdleDetector` écoute `touchstart` sur `window`.** Il continue de tourner pendant l'overlay :
  aucun effet secondaire, mais penser à ne pas le réarmer à tort quand une feuille est ouverte.
- **`backdrop-filter` plein écran coûte cher sur tablette.** `index.css:27` le neutralise déjà en mode
  édition « for GPU perf ». Ne pas empiler un `.gc` dans un scrim lui-même flouté.

---

## Décisions de conception

| Question | Décision | Pourquoi |
|---|---|---|
| Librairie de gestes ? | Non — `onPan`/`onPanEnd` de framer-motion | déjà installé, donne offset + vélocité |
| Contenu du menu rapide ? | Un **panneau custom existant**, choisi en config | zéro UI neuve, l'éditeur de panneaux fait déjà le travail |
| Contenu des notifications ? | tiroir propre au dashboard, alimenté par l'événement `ha_dashboard_notification` | même mécanique que `ha_dashboard_modal` / `ha_dashboard_toast`, déjà en place ; les `persistent_notification` de HA servent surtout ses propres alertes système |
| Animation du swipe photo ? | rubber-band au doigt + crossfade existant | le push-slide complet demande de réécrire le slideshow ; à faire seulement si le crossfade déçoit |
| Nouveau contexte React ? | Non — un `useState` local à l'overlay | une seule feuille ouverte à la fois, personne d'autre n'en a besoin |

---

## Architecture

```
WallPanelOverlay
  ├── dim layer (z-199, inchangé)
  └── overlay (z-200)
       ├── BackgroundSlideshow        ← expose maintenant go(delta) via ref
       ├── GestureLayer (z-5)         ← NOUVEAU : onPan/onPanEnd plein écran, sous les widgets
       ├── widgets (z-10)             ← pointer-events-none sur le conteneur, auto sur les GridItem
       ├── EdgeHints (z-15)           ← NOUVEAU : poignées verre, 4 bords, fade après 4 s
       ├── WallPanelSheet 'quick'     ← NOUVEAU : feuille du bas, CustomPanelRenderer
       └── WallPanelSheet 'notif'     ← NOUVEAU : feuille du haut, persistent_notification
```

Un seul état ajouté dans l'overlay : `const [sheet, setSheet] = useState<'quick' | 'notif' | null>(null)`.

### Machine à états des gestes

```
                 ┌──────────── onPan (|Δ| > 12 px) ────────────┐
                 │                                              │
  idle ──────────┤ axe dominant = X → suit le doigt (rubber)     │
                 │ axe dominant = Y → suit le doigt (peek feuille)│
                 └──────────── onPanEnd ────────────────────────┘
                                    │
      |Δ| > 90 px  OU  |v| > 500 px/s  ?
             ├── oui, X<0 → go(+1)      ├── oui, Y<0 → sheet='quick'
             ├── oui, X>0 → go(-1)      ├── oui, Y>0 → sheet='notif'
             └── non → retour élastique à 0
```

Seuils : `SWIPE_DISTANCE = 90` px, `SWIPE_VELOCITY = 500` px/s, `TAP_TOLERANCE = 12` px.
La vélocité couvre le flick rapide et court ; la distance couvre le glissement lent et long.

---

## Étape 1 — Config : `WallPanelGestures`

### `src/types/wallpanel.ts`

Champ **optionnel** : les configs déjà enregistrées restent valides.

```typescript
export interface WallPanelGestures {
  /** Interrupteur global des gestes */
  enabled: boolean;
  /** Swipe horizontal → photo précédente / suivante */
  photos: boolean;
  /** Panneau custom ouvert par le swipe vers le haut. '' = geste désactivé */
  quickPanelId: string;          // format PanelId : 'custom:<id>' ou ''
  /** Swipe vers le bas → notifications HA */
  notifications: boolean;
  /** Poignées de bord affichées quelques secondes à l'activation */
  hints: boolean;
}

export interface WallPanelConfig {
  // … champs existants inchangés
  /** Gestes tactiles (optionnel — absent = valeurs par défaut) */
  gestures?: WallPanelGestures;
}

export const DEFAULT_GESTURES: WallPanelGestures = {
  enabled: true,
  photos: true,
  quickPanelId: '',
  notifications: true,
  hints: true,
};
```

Et dans `DEFAULT_WALLPANEL_CONFIG` : `gestures: DEFAULT_GESTURES`.

Côté lecture, un helper unique — pas de `??` disséminé dans les composants :

```typescript
export const gesturesOf = (c: WallPanelConfig): WallPanelGestures => ({ ...DEFAULT_GESTURES, ...c.gestures });
```

> Rien à toucher côté serveur ni dans `useDashboardConfig` : `wallPanel.config` est sérialisé tel quel.

---

## Étape 2 — Piloter le diaporama depuis l'extérieur

### `src/components/wallpanel/BackgroundSlideshow.tsx` (modifié)

Le composant garde ses index ; il expose `go(delta)` par `useImperativeHandle`. Bonus : en faisant
dépendre l'intervalle de `currentIdx`, le timer se **réarme automatiquement** après un swipe manuel —
ce que le code actuel ne fait pas.

```typescript
export interface SlideshowHandle {
  /** +1 = suivante, -1 = précédente. Ne fait rien pendant un crossfade. */
  go: (delta: number) => void;
}

const CROSSFADE_MS = 1000;

export const BackgroundSlideshow = forwardRef<SlideshowHandle, BackgroundSlideshowProps>(
  function BackgroundSlideshow({ config }, ref) {
    // … resolvedUrls / orderedUrls / currentIdx / nextIdx / transitioning inchangés

    const go = useCallback(
      (delta: number) => {
        const n = orderedUrls.length;
        if (n <= 1 || transitioning) return;
        setNextIdx(((currentIdx + delta) % n + n) % n);   // modulo positif : delta = -1 doit boucler
        setTransitioning(true);
        setTimeout(() => {
          setCurrentIdx(i => ((i + delta) % n + n) % n);
          setTransitioning(false);
        }, CROSSFADE_MS);
      },
      [currentIdx, orderedUrls.length, transitioning]
    );

    useImperativeHandle(ref, () => ({ go }), [go]);

    // Timer : dépend de currentIdx → un swipe redonne image_duration secondes complètes
    useEffect(() => {
      if (orderedUrls.length <= 1 || config.image_duration <= 0) return;
      const id = setTimeout(() => go(1), config.image_duration * 1000);
      return () => clearTimeout(id);
    }, [currentIdx, orderedUrls.length, config.image_duration, go]);

    // … rendu inchangé
  }
);
```

> `setInterval` devient `setTimeout` : l'effet se rejoue à chaque changement d'image, l'intervalle
> répété n'a plus de raison d'être et le décalage d'un cran disparaît.

---

## Étape 3 — Le routeur de gestes

### `src/components/wallpanel/GestureLayer.tsx` (NOUVEAU)

Une couche plein écran **sous les widgets**. Elle porte le `onPan`, restitue le rubber-band au doigt
et signale à l'overlay qu'un geste a eu lieu (pour annuler le `click` qui suit).

```typescript
import { motion, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { useRef, type RefObject } from 'react';
import { EASE_SPRING } from '@/lib/motion-tokens';

const SWIPE_DISTANCE = 90;
const SWIPE_VELOCITY = 500;
const TAP_TOLERANCE = 12;
/** Au-delà, le doigt ne déplace plus qu'un tiers : la résistance dit « il y a une limite ». */
const RUBBER = 0.35;

interface Props {
  /** Vrai pendant qu'une feuille est ouverte : le routeur se met en retrait. */
  disabled: boolean;
  onSwipeX: (dir: 1 | -1) => void;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  /** Passé à vrai dès qu'un geste dépasse TAP_TOLERANCE ; lu puis remis à faux par l'overlay. */
  movedRef: RefObject<boolean>;
}

export function GestureLayer({ disabled, onSwipeX, onSwipeUp, onSwipeDown, movedRef }: Props) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const axis = useRef<'x' | 'y' | null>(null);

  const settle = () => {
    axis.current = null;
    animate(x, 0, EASE_SPRING);
    animate(y, 0, EASE_SPRING);
  };

  const handlePan = (_: PointerEvent, info: PanInfo) => {
    const { x: dx, y: dy } = info.offset;
    if (Math.hypot(dx, dy) > TAP_TOLERANCE) movedRef.current = true;
    // L'axe est verrouillé au premier mouvement franc : un swipe horizontal
    // légèrement oblique ne doit pas commencer à ouvrir une feuille.
    if (!axis.current && Math.hypot(dx, dy) > TAP_TOLERANCE) {
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (axis.current === 'x') x.set(dx * RUBBER);
    if (axis.current === 'y') y.set(dy * RUBBER);
  };

  const handlePanEnd = (_: PointerEvent, info: PanInfo) => {
    const a = axis.current;
    const d = a === 'x' ? info.offset.x : info.offset.y;
    const v = a === 'x' ? info.velocity.x : info.velocity.y;
    const passed = Math.abs(d) > SWIPE_DISTANCE || Math.abs(v) > SWIPE_VELOCITY;

    if (passed && a === 'x') onSwipeX(d < 0 ? 1 : -1);   // vers la gauche = image suivante
    if (passed && a === 'y') (d < 0 ? onSwipeUp : onSwipeDown)();
    settle();
  };

  if (disabled) return null;

  return (
    <motion.div
      className='absolute inset-0 z-[5]'
      style={{ x, y, touchAction: 'none' }}   // sans touch-action, le navigateur préempte le scroll
      onPan={handlePan}
      onPanEnd={handlePanEnd}
    />
  );
}
```

> Le `x`/`y` de cette couche ne déplace rien de visible (elle est transparente). Le rubber-band
> **visuel** s'obtient en appliquant les mêmes `MotionValue` au conteneur du slideshow — cf. étape 6.

---

## Étape 4 — La feuille, du haut ou du bas

### `src/lib/motion-variants.ts` (ajout)

```typescript
/** Miroir de bottomSheet — feuille descendant du haut de l'écran. */
export const topSheet: Variants = {
  hidden: { y: '-100%' },
  visible: { y: 0, transition: { duration: DURATION_SLOW, ease: EASE_OUT } },
  exit: { y: '-100%', transition: { duration: DURATION_SLOW, ease: EASE_OUT } },
};
```

### `src/components/wallpanel/WallPanelSheet.tsx` (NOUVEAU)

Coquille commune aux deux feuilles : scrim flouté, verre `.gc`, poignée, drag-to-dismiss,
`Escape`, fermeture au tap sur le scrim.

```typescript
import { motion } from 'framer-motion';
import { bottomSheet, topSheet, modalScrim } from '@/lib/motion-variants';
import type { PanInfo } from 'framer-motion';
import type { ReactNode } from 'react';

const DISMISS_DISTANCE = 80;
const DISMISS_VELOCITY = 400;

export function WallPanelSheet({
  side, title, icon, onClose, children,
}: { side: 'top' | 'bottom'; title: string; icon?: ReactNode; onClose: () => void; children: ReactNode }) {
  const isBottom = side === 'bottom';

  const onDragEnd = (_: PointerEvent, info: PanInfo) => {
    const away = isBottom ? info.offset.y : -info.offset.y;
    const fling = isBottom ? info.velocity.y : -info.velocity.y;
    if (away > DISMISS_DISTANCE || fling > DISMISS_VELOCITY) onClose();
  };

  return (
    <>
      {/* Scrim : un seul plan flouté, jamais imbriqué dans un autre backdrop-filter */}
      <motion.div
        variants={modalScrim} initial='hidden' animate='visible' exit='exit'
        onClick={onClose}
        className='absolute inset-0 z-[20] bg-black/40 backdrop-blur-md'
      />
      <motion.div
        variants={isBottom ? bottomSheet : topSheet}
        initial='hidden' animate='visible' exit='exit'
        drag='y'
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: isBottom ? 0 : 0.4, bottom: isBottom ? 0.4 : 0 }}
        onDragEnd={onDragEnd}
        className={[
          'gc absolute inset-x-0 z-[21] mx-auto w-[min(96vw,720px)] max-h-[62vh] flex flex-col overflow-hidden',
          isBottom ? 'bottom-0 rounded-b-none rounded-t-[28px]' : 'top-0 rounded-t-none rounded-b-[28px]',
        ].join(' ')}
      >
        {!isBottom && <SheetHeader title={title} icon={icon} />}
        <div className='flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3'>{children}</div>
        {/* Poignée du côté du bord libre — repère de préhension, pas un bouton */}
        <div className={`flex justify-center py-3 ${isBottom ? 'order-first' : ''}`}>
          <div className='w-10 h-1 rounded-full bg-white/25' />
        </div>
        {isBottom && <SheetHeader title={title} icon={icon} />}
      </motion.div>
    </>
  );
}
```

**Chorégraphie** (les tokens existent déjà, rien à inventer) :

| Élément | Animation |
|---|---|
| Scrim | `modalScrim`, opacité 0 → 1 en `DURATION_SLOW` |
| Feuille | `bottomSheet` / `topSheet`, puis ressort `EASE_SPRING` à la fin du drag |
| Contenu | `staggerContainer` + `staggerGridItem` (0.08 s entre tuiles) |
| Poignée | `whileDrag={{ scaleX: 1.4, opacity: 0.6 }}` |
| Fond | le diaporama passe à `scale: 1.04` + `brightness(0.75)` pendant l'ouverture — la profondeur vient de là, pas d'un blur supplémentaire |

---

## Étape 5 — Contenu des deux feuilles

### 5a. Menu rapide — aucune UI neuve

```typescript
// dans WallPanelOverlay, feuille 'quick'
const { panels } = useCustomPanels();
const panel = panels.find(p => `custom:${p.id}` === gestures.quickPanelId);

<WallPanelSheet side='bottom' title={panel?.name ?? ''} onClose={() => setSheet(null)}>
  {panel ? panel.blocks.map(b => <SafeBlock key={b.id} block={b} />) : <EmptyHint />}
</WallPanelSheet>
```

`CustomPanelRenderer` enveloppe déjà les blocs dans `WidgetErrorBoundary` — exporter son `SafeBlock`
(actuellement interne) plutôt que le réécrire. Boutons, rangées de volets, widgets : tout ce que
l'éditeur de panneaux sait produire s'affiche ici.

> Choisir le panneau dans la modale de config avec `PanelSelectField` (imposé par le CLAUDE.md).

### 5b. Notifications — un tiroir propre au dashboard

Le dashboard écoutait déjà `ha_dashboard_modal` et `ha_dashboard_toast`. Un troisième événement
suit la même mécanique, mais **persiste** au lieu de s'afficher puis disparaître :

```yaml
action:
  - event: ha_dashboard_notification
    event_data:
      id: update-2.3.0           # même id = remplace ; absent = nouvelle entrée
      title: "Mise à jour disponible"
      message: "Une nouvelle version est prête à être installée."
      content_type: plain        # plain | html (assaini) | markdown (brut)
      level: info                # info | success | warning | error
      icon: Download             # nom d'icône lucide
      actions:
        - label: "Installer"
          variant: primary
          service: hassio.addon_update
          service_data:
            addon: ha-react-dashboard
        - label: "Plus tard"
```

Retrait depuis une automatisation : `event_data: { id: update-2.3.0, dismiss: true }`, ou sans `id`
pour vider le tiroir. Appuyer sur une action efface aussi la notification, sauf `keep: true` — un
« Installer » sur lequel on a appuyé n'a plus rien à dire.

Trois choix qui méritent d'être notés :

- **`NotificationProvider` vit au niveau de l'application**, pas dans l'écran de veille : un
  événement reçu pendant l'usage normal du dashboard doit être là quand la veille s'allume.
- **Le tiroir est sauvegardé dans le stockage local.** Une tablette murale se recharge (redémarrage
  de HA, mise à jour de l'add-on) et un « mise à jour disponible » qui disparaîtrait au passage
  n'aurait servi à rien. Plafonné à 50 entrées, et le contenu relu est filtré : il est modifiable à
  la main.
- **Une pastille compte les notifications sur le bord haut**, et elle reste (contrairement aux
  poignées, qui s'effacent). Sans elle, une notification arrivée par événement est invisible tant
  que personne ne balaie vers le bas — ce qui vide la fonctionnalité de son intérêt.

L'assainissement du HTML est passé dans `RichText`, partagé avec la modale : la décision de sécurité
ne doit exister qu'à un seul endroit, sinon le prochain afficheur l'oubliera.

---

## Étape 6 — Câblage dans `WallPanelOverlay`

```typescript
const [sheet, setSheet] = useState<'quick' | 'notif' | null>(null);
const slideshowRef = useRef<SlideshowHandle>(null);
const movedRef = useRef(false);
const gestures = gesturesOf(config);
const gesturesOn = gestures.enabled && !isWallPanelEditMode;

// Un swipe se termine par un click : sans ce filtre, chaque geste ferait
// sortir de l'écran de veille. Même motif que useLongPress.moved.
const handleClick = () => {
  if (movedRef.current) return (movedRef.current = false, undefined);
  if (sheet) return setSheet(null);
  deactivate();
};
```

Clavier, en miroir des gestes (une tablette murale n'a pas de clavier, mais l'accessibilité si) :

| Touche | Effet |
|---|---|
| `Escape` | ferme la feuille si ouverte, sinon quitte (comportement actuel, à conditionner) |
| `←` / `→` | photo précédente / suivante |
| `↑` / `↓` | menu rapide / notifications |

### Le point de détail qui décide de tout

`WallPanelReadonlyShell` pose `pointer-events-auto` sur un conteneur pleine largeur. Tant qu'il est
là, aucun geste ne remonte au `GestureLayer` dans cette bande :

```diff
- <div className='pointer-events-auto max-w-[1440px] mx-auto px-5 pt-8'>
+ <div className='pointer-events-none max-w-[1440px] mx-auto px-5 pt-8'>
```

…et `pointer-events-auto` remonte sur les `GridItem` (via `DashboardGrid readonly`). Les cards restent
cliquables, l'espace entre elles redevient gestuel.

---

## Étape 7 — Poignées de bord (`EdgeHints`)

Sans indice visuel, personne ne devinera les gestes. Quatre pastilles verre le long des bords,
visibles 4 s à chaque activation puis effacées :

```typescript
// pastille : w-9 h-1 rounded-full bg-white/30, dans un conteneur .gc à faible opacité
// animation : opacity [0, 0.7, 0.7, 0], scale [0.9, 1, 1, 0.96] sur 4 s, ease EASE_OUT
// respiration : chevron interne y: [0, -4, 0], repeat 3, DURATION_CINEMATIC
```

Chevron vers l'intérieur sur chaque bord, chevrons gauche/droite seulement si le diaporama a plus
d'une image. Masquées si `gestures.hints === false` ou `prefers-reduced-motion`.

---

## Étape 8 — Onglet « Gestes » dans la modale de config

`WallPanelConfigModal` a déjà quatre onglets (`Activation`, `Fond`, `Widgets`, `Style`). En ajouter un
cinquième, `Gestes` (icône `Hand` de lucide) :

- interrupteur global
- interrupteur « swipe photos » (grisé si `image_urls.length < 2`)
- `PanelSelectField` « Panneau du menu rapide » (vide = geste désactivé)
- interrupteur « notifications »
- interrupteur « afficher les poignées »
- un mini-schéma statique des 4 gestes, en SVG inline

---

## Étape 9 — i18n

Toutes les chaînes sous `layout.wallPanel.gestures.*`, dans **`en/layout.json` et `fr/layout.json`** :

| Clé | fr | en |
|---|---|---|
| `gestures.tab` | Gestes | Gestures |
| `gestures.enable` | Activer les gestes tactiles | Enable touch gestures |
| `gestures.photos` | Balayer pour changer de photo | Swipe to change photo |
| `gestures.quickPanel` | Panneau du menu rapide | Quick menu panel |
| `gestures.quickPanelDesc` | Balayage vers le haut. Vide = désactivé | Swipe up. Empty = disabled |
| `gestures.notifications` | Notifications Home Assistant | Home Assistant notifications |
| `gestures.notificationsDesc` | Balayage vers le bas — événement `ha_dashboard_notification` | Swipe down — `ha_dashboard_notification` event |
| `gestures.hints` | Afficher les poignées au démarrage | Show edge hints on start |
| `gestures.noNotifications` | Aucune notification | No notifications |
| `gestures.noQuickPanel` | Aucun panneau sélectionné | No panel selected |
| `gestures.dismissAll` | Tout effacer | Dismiss all |

---

## Fichiers touchés

| Fichier | Nature |
|---|---|
| `src/types/wallpanel.ts` | + `WallPanelGestures`, `DEFAULT_GESTURES`, `gesturesOf` |
| `src/lib/motion-variants.ts` | + `topSheet` |
| `src/components/wallpanel/GestureLayer.tsx` | **nouveau** |
| `src/components/wallpanel/WallPanelSheet.tsx` | **nouveau** |
| `src/components/wallpanel/QuickPanelSheet.tsx` | **nouveau** |
| `src/components/wallpanel/NotificationSheet.tsx` | **nouveau** |
| `src/components/wallpanel/NotificationBadge.tsx` | **nouveau** — pastille du bord haut |
| `src/components/wallpanel/EdgeHints.tsx` | **nouveau** |
| `src/context/NotificationContext.tsx` | **nouveau** — tiroir, stockage local |
| `src/hooks/useHANotification.ts` | **nouveau** — abonnement `ha_dashboard_notification` |
| `src/components/ui/RichText.tsx` | **nouveau** — rendu plain/html assaini/markdown, partagé |
| `src/components/wallpanel/BackgroundSlideshow.tsx` | `ref` + `go(delta)`, timer réarmé |
| `src/components/wallpanel/WallPanelOverlay.tsx` | état `sheet`, filtre du clic, câblage |
| `src/components/wallpanel/WallPanelEditShell.tsx` | 1 ligne : `pointer-events-none` sur le conteneur readonly |
| `src/components/wallpanel/WallPanelConfigModal.tsx` | onglet Gestes |
| `src/components/custom-panels/CustomPanelRenderer.tsx` | exporter `SafeBlock` |
| `src/components/ui/Modal/components/Modal.tsx` | délègue son rendu de contenu à `RichText` |
| `src/components/onboarding/EventsDoc.tsx` | 3ᵉ événement documenté + aperçu |
| `src/App.tsx`, `src/ha-panel.tsx` | `NotificationProvider` + `useHANotification` |
| `src/i18n/locales/{en,fr}/{layout,help}.json` | clés `wallPanel.gestures.*` et `help.events.*` |

Aucune modification serveur, aucune migration de config, aucune dépendance ajoutée.

---

## Écarts entre le plan et le code livré

| Point | Plan | Livré | Raison |
|---|---|---|---|
| Ref du diaporama | `forwardRef` | `ref` en prop simple | React 19 l'accepte directement |
| Nombre d'images | déduit de `image_urls.length` | prop `onCountChange` | une seule URL `media-source://` peut désigner un album entier : le balayage horizontal n'a de sens qu'après résolution |
| Fond de la feuille | classe `.gc` | fond opaque | le voile est déjà flouté ; imbriquer deux `backdrop-filter` coûte une passe de composition par image, ce qu'une tablette murale ne tient pas |
| Filtre du clic | remis à zéro dans le `onClick` | remis à zéro sur `onPointerDownCapture` | un balayage dont le `click` ne remonte pas (relâché hors fenêtre) avalait sinon l'appui suivant |
| Feuille rouverte | `useEffect` sur `isActive` | `AnimatePresence onExitComplete` | même effet sans `setState` dans un effet |
| Cards cliquables | non prévu | `pointer-events-auto` sur `GridItem` | contrepartie du `pointer-events-none` posé sur le conteneur de la grille |
| Poignées de bord | drapeau `prefers-reduced-motion` | `useLowPowerMotion()` | le hook du projet couvre déjà l'écran lent et l'onglet caché |
| Source des notifications | `persistent_notification` de HA | tiroir propre, événement `ha_dashboard_notification` | les notifications de HA servent surtout ses alertes système ; un tiroir maison accepte titre, niveau, icône et boutons d'action, et suit la mécanique déjà en place pour les modales et les toasts |
| Découvrabilité | poignée de bord seule | pastille compteur permanente | une notification arrivée par événement est invisible tant que personne ne balaie vers le bas |
| Assainissement HTML | dans le rendu de la modale | extrait dans `RichText` | deux afficheurs, une seule décision de sécurité |
| Tests | non prévus | 8 cas | le modulo négatif de `go()` et le magasin de notifications (remplacement par `id`, survie au rechargement, stockage corrompu) sont les endroits où une régression passerait inaperçue |

Fichiers de test : [`BackgroundSlideshow.test.tsx`](../src/components/wallpanel/BackgroundSlideshow.test.tsx),
[`NotificationContext.test.tsx`](../src/context/NotificationContext.test.tsx).

## Vérification

- [ ] Swipe gauche → image suivante ; swipe droite → précédente ; boucle aux extrémités
- [ ] Après un swipe, le timer repart sur `image_duration` complet (pas de saut immédiat)
- [ ] Une seule image → les swipes horizontaux ne font rien, pas de poignées gauche/droite
- [ ] Swipe vers le haut → feuille du bas avec le panneau configuré ; boutons opérants
- [ ] `ha_dashboard_notification` émis depuis Outils de développement → la pastille apparaît
      (type et données sont **deux champs séparés** : le champ Données ne prend que le contenu de
      `event_data`, jamais le bloc `action:` entier — voir la bascule « Outils de dév. » dans l'aide)
- [ ] Swipe vers le bas → la notification est là, avec son niveau, son icône et ses boutons
- [ ] Un bouton d'action appelle son service **et** efface la notification (sauf `keep: true`)
- [ ] Le même `id` réémis remplace l'entrée au lieu de l'empiler
- [ ] `dismiss: true` avec l'`id` retire l'entrée ; sans `id`, vide le tiroir
- [ ] Après un rechargement de la page, le tiroir et les effacements sont conservés
- [ ] `content_type: html` avec `<script>` n'exécute rien
- [ ] Tirer une feuille vers son bord la ferme ; la relâcher à mi-course la fait revenir en place
- [ ] Un swipe ne quitte **jamais** l'écran de veille ; un tap net le quitte toujours
- [ ] Tap sur le scrim ferme la feuille sans quitter l'écran de veille
- [ ] Un geste démarré sur un widget ne déclenche rien ; le widget reste cliquable
- [ ] `Escape` ferme la feuille d'abord, l'overlay ensuite
- [ ] Gestes inertes en mode édition WallPanel
- [ ] `gestures.enabled: false` → aucun geste, aucune poignée
- [ ] Config rechargée après un rafraîchissement (via `wallPanel.config`)
- [ ] Une config enregistrée **avant** cette fonctionnalité se charge sans erreur (`gestures` absent)
- [ ] `prefers-reduced-motion` : transitions réduites, poignées masquées
- [ ] Tablette : 60 fps pendant l'ouverture de feuille (un seul plan `backdrop-filter`)

## Hors périmètre (et quand y revenir)

- **Push-slide complet des photos** (l'image sort, la suivante entre) — le crossfade existant plus le
  rubber-band suffisent. À faire si le retour utilisateur trouve la transition molle : cela demande de
  passer le slideshow en `AnimatePresence` avec `custom={direction}`.
- **Feuille latérale (swipe depuis le bord gauche/droit)** — l'horizontal est pris par les photos.
- **Menu rapide composable spécifique au WallPanel** — les panneaux custom couvrent le besoin. À
  revoir seulement si un panneau du dashboard s'avère inadapté au plein écran.
- **Gestes multi-doigts, pinch-to-zoom sur la photo** — YAGNI sur une tablette murale.
- **Pont vers les `persistent_notification` de Home Assistant** — l'abonnement
  `persistent_notification/subscribe` existe et tiendrait en trente lignes qui alimenteraient le même
  tiroir. À faire si les alertes système de HA doivent remonter jusqu'à la tablette.
- **Tiroir accessible hors écran de veille** (une cloche dans la barre du dashboard) — le magasin
  est déjà au niveau de l'application, il ne manque qu'un déclencheur.
- **Expiration automatique d'une notification** (`ttl`) — tout est persistant pour l'instant ; à
  ajouter le jour où un tiroir se remplit d'entrées que personne n'efface.
