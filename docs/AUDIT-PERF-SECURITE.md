# Audit performance & sécurité — 2026-08-20

Point de départ : **~30 fps sur la tablette murale**, au repos, sans interaction.

Contrainte posée : **on garde le verre dépoli et le fond aurora.** Les corrections
ci-dessous optimisent, elles ne suppriment pas l'effet.

Légende : `[ ]` à faire · `[~]` en cours · `[x]` fait · `[?]` à mesurer sur la tablette

---

## 0. Mesures — 2026-08-20

Faites sur l'instance réelle (dev server :5173, 2272 entités), pas estimées.
**Le PC n'est pas la tablette** : ce qui suit mesure le travail *CPU*, qui se
transpose par un facteur, pas le coût *GPU*, qui ne se transpose pas du tout.

### Débit réel du store

| | |
|---|---|
| Entités | 2272 |
| Mises à jour du store | **3,5 / seconde** (70 sur 20 s) |
| Entités distinctes concernées | 34 sur 20 s |
| Source dominante | `sensor.shellypro3em_*` (~10 entités, une salve toutes les 5 s) |

> J'avais annoncé « ~20 événements/s, ~600 rendus/s ». **C'est faux, d'un facteur 6.**
> Le vrai chiffre est 3,5/s.

### Avant / après, même page, même charge

Protocole : `git stash` du correctif, rechargement, on pousse 10 mises à jour du
store par seconde pendant 12 s, on mesure la contention du thread principal avec
une sonde `setTimeout(0)`. Page : 19 cases, 18 cards en verre, aurora active.

| | ancien | nouveau | repos |
|---|---|---|---|
| Tours de sonde / s | 144 | **189** | 191 |
| Délai moyen par macro-tâche | 6,95 ms | **5,30 ms** | 5,23 ms |
| Pire délai | 110 ms | **60 ms** | — |

Travail principal déduit, par mise à jour du store :
**~25 ms → ~1,2 ms**, soit un facteur ~20. Le nouveau code sous 10 maj/s est
au niveau du repos : les mises à jour ne coûtent plus rien de mesurable.

*(Build de développement : React en mode dev et code non minifié, comptez 2 à 4×
moins en production. Et à l'inverse 4 à 6× plus sur un CPU de tablette.)*

### Le canvas n'était pas le problème

Micro-benchmark dans le navigateur, 5 orbes, 300 images, médiane de 3 tours :

| | ancien (dégradé/orbe/image, DPR 1.5) | nouveau (sprite, DPR 1) |
|---|---|---|
| Par image | 0,042 ms | 0,023 ms |
| Par seconde | 1,25 ms (à 30 ips) | 0,45 ms (à 20 ips) |

**0,8 ms économisée par seconde.** Le travail sur les sprites est correct mais
sans effet mesurable sur les fps. Ce qui compte dans P4, c'est **uniquement la
cadence** — parce qu'elle multiplie les recalculs de `backdrop-filter`, pas
parce qu'elle allège le canvas. Conséquence directe : inutile de refaire les
sprites ailleurs (cf. P4).

### Ce qui reste à mesurer sur la tablette

Le PC tourne à 178 fps avec 0 long task : il ne peut rien révéler du GPU.
Un **30 fps stable** est d'ailleurs la signature du compositeur qui divise la
fréquence par deux, pas de à-coups CPU — les à-coups CPU donnent du *judder*
irrégulier. Cela désigne les 18 `backdrop-filter` recalculés à la cadence de
l'aurora, pas React. À confirmer avec le protocole ci-dessous.

---

## 1. Performance

### P1 — Tempête de re-renders : `useHass()` sans sélecteur `[x]`

**Le coupable principal.**

`useHass` est un store zustand. Appelé **sans sélecteur**, il s'abonne à l'état
entier, et `setEntities` renvoie un objet neuf à chaque `state_changed` :

```js
// @hakit/core, dist/index-BDZyTvOW.js
setEntities: (t) => e((n) => { … return o ? { entities: a, lastUpdated: Date.now(), ready: !0 } : n; })
```

Donc tout composant faisant `useHass()` nu se re-rend **à chaque changement d'état
de la maison entière**.

Le pire cas : `useCardActions()` (`src/hooks/useCardActions.ts`) est appelé par
`GridItem` (`src/components/layout/DashboardGrid.tsx`), donc par *chaque case de la
grille*. Sur cette installation : 19 cases + ~13 cards concernées, soit une
trentaine de sous-arbres re-rendus **à chaque mise à jour du store**, chacun
traversant un `motion.div`.

Mesuré (§0) : **~25 ms de thread principal par mise à jour → ~1,2 ms.** À 3,5
maj/s, cela retire une salve de ~25 ms toutes les 285 ms. Sur la tablette
(CPU 4 à 6× plus lent, mais build de production 2 à 4× plus rapide) la salve
devait tourner autour de 30 à 60 ms : de quoi rater une à quatre images à chaque
fois. C'est le **judder** qui disparaît, pas nécessairement le plancher à 30 fps.

Le correctif est trivial — `helpers` est un littéral figé dans l'état initial du
store, jamais remplacé, donc un sélecteur dessus ne re-rend **jamais** :

```ts
const helpers = useHass(s => s.helpers);   // au lieu de const { helpers } = useHass()
```

Le code connaissait déjà le problème : `AutomationListCard.tsx` porte le
commentaire exact et le corrige localement. `useEntities` / `useSafeEntity`
existent pour ça.

**28 fichiers** concernés :

- [x] `src/hooks/useCardActions.ts` ← **priorité absolue** (appelé par chaque `GridItem`)
- [x] `src/hooks/useAutoTheme.ts`
- [x] `src/hooks/useEntityHistory.ts`
- [x] `src/hooks/useSensorHistory.ts`
- [x] `src/components/cards/AlarmCard/AlarmCard.tsx`
- [x] `src/components/cards/AutomationCard/AutomationCard.tsx`
- [x] `src/components/cards/ButtonCard/ButtonCard.tsx`
- [x] `src/components/cards/CameraCard/CameraCard.tsx`
- [x] `src/components/cards/CoverCard/CoverCard.tsx`
- [x] `src/components/cards/LightCard/LightCard.tsx`
- [x] `src/components/cards/MediaPlayerCard/MediaPlayerCard.tsx`
- [x] `src/components/cards/PelletCard/PelletCard.tsx`
- [x] `src/components/cards/RoomCard/RoomCard.tsx` (×2)
- [x] `src/components/cards/RoomsGrid/RoomsGrid.tsx` (×2)
- [x] `src/components/cards/SensorCard/SensorCard.tsx`
- [x] `src/components/cards/ThermostatCard/ThermostatCard.tsx`
- [x] `src/components/cards/VacuumCard/VacuumCard.tsx` (×2)
- [x] `src/components/custom-panels/ButtonBlock.tsx`
- [x] `src/components/custom-panels/ButtonRowBlock.tsx`
- [x] `src/components/custom-panels/CoverRowBlock.tsx`
- [x] `src/components/modals/AutomationMoreInfo.tsx`
- [x] `src/components/modals/CameraMoreInfo.tsx`
- [x] `src/components/modals/CoverMoreInfo.tsx`
- [x] `src/components/modals/LightMoreInfo.tsx`
- [x] `src/components/modals/ThermostatMoreInfo.tsx`
- [x] `src/components/modals/WeatherMoreInfo.tsx`
- [x] `src/components/wallpanel/NotificationSheet.tsx`

### P2 — Abonnements à la carte complète des entités `[x]`

Même effet, autre forme : `useHass(s => s.entities)` renvoie un objet neuf dès
qu'une entité bouge.

- [x] `src/hooks/useTemplate.ts` (×2 : `useTemplate`, `useResolvedField`)
- [x] `src/hooks/useColor.ts` — `useColor` (champ unique) n'écoute plus que les
  entités citées ; un `#hex` littéral n'écoute rien du tout
- [~] `src/hooks/useColor.ts` — `useColorResolver` reste large **volontairement** :
  il sert des listes dont les templates ne sont pas connus au moment du hook.
  Seul `ActivityBar` en dépend. Marqué `ponytail:` sur place.
- [x] `src/components/dashboard/QuickBar.tsx` — **fausse alerte** : `QuickBar`
  rend `null` tant qu'il est fermé, `QuickBarPanel` n'est donc pas monté au repos
- [x] `src/components/layout/TemplateField.tsx` — **fausse alerte**, mode édition
  seulement (il reste un doublon `allEntities`/`entities`, cosmétique)
- [x] `src/components/layout/WidgetEditModal/EntityPicker.tsx` — idem, mode édition
- [x] `src/components/layout/AddWidgetModal/PreviewPanel.tsx` — idem, mode édition

**Comment on restreint** : `templateEntityIds()` (`src/lib/template-engine.ts`)
extrait du template les identifiants cités en toutes lettres, et renvoie `null`
quand ils sont calculés (`states('light.' ~ nom)`) — auquel cas on retombe sur
l'abonnement large plutôt que de rendre une valeur périmée.

**Corrigé au passage** : `templateEngine` est un singleton dont `bind()` était
appelé dans un `useEffect` alors que `render()` tourne *pendant* le rendu. Le
premier rendu lisait donc la liaison du rendu précédent — ou celle d'une autre
card. Les deux appels sont désormais dans le même bloc synchrone
(`renderWith()`). Cela referme aussi le point noté en P5.

### P3 — `backdrop-filter` : 20 surfaces × chaque image de l'aurora `[x]`

**On garde le verre.** Mais il faut comprendre le couplage :

`backdrop-filter` échantillonne tout ce qui est peint derrière l'élément. Avec un
fond **statique** (uni, dégradé, image), Chrome met en cache la texture floutée :
20 cards coûtent une passe, une fois. Avec un fond **animé** (aurora, lava lamp),
les 20 flous sont recalculés **à chaque image du canvas**. C'est cette combinaison
qui tue, pas le flou seul.

Trois leviers, du plus rentable au moins :

- [x] **(a) Baisser la cadence de l'aurora.** Multiplicateur direct sur les 20
  recalculs. 30 → 20 fps ≈ un tiers du coût de composition en moins. Les orbes se
  déplacent de ~0,4 px par image : sur des dégradés sans arête, c'est invisible.
  Les vitesses étant exprimées « par image », un facteur `STEP_SCALE` compense
  la cadence — sinon le fond aurait simplement ralenti d'un tiers et `config.speed`
  n'aurait plus voulu dire la même chose.
- [x] **(c) Rendre l'image du canvas moins chère** — voir P4.
- [x] **(b1) Rayon de flou** — sans objet : le thème réellement utilisé calcule
  déjà `blur(20px) saturate(1.8) brightness(1.05)` (relevé en `getComputedStyle`
  sur la page). Les 30px du défaut CSS ne sont pas ceux qui tournent.
- [ ] **(b2) Supprimer `brightness(105%)`** — une passe de filtre entière pour
  5 % que personne ne voit, sur 18 surfaces à chaque image de l'aurora.
  **Décision visuelle → à valider avant de toucher.**

Note : `perf-reduce-blur` met `blur(4px)` (`src/index.css`). La surface est
toujours allouée et la passe toujours exécutée — le rayon n'est pas le coût
dominant, le nombre de passes l'est. Ce mode devrait poser `none` + fond opaque,
comme le fait déjà `theme-clay`. Sans objet tant qu'on garde le flou, mais le
réglage ment à qui l'active.

### P4 — Le canvas aurora lui-même `[x]`

Trois gaspillages dans `src/components/effects/AuroraBackground.tsx` :

- [x] **`createRadialGradient` par orbe et par image** — 5 orbes × 20 fps = 100
  objets gradient créés et téléversés par seconde. Le rayon est constant (il ne
  dépend que de `minDim`), seule l'opacité varie. → pré-rendre chaque orbe en
  sprite hors écran une fois, puis un simple `drawImage` avec `globalAlpha`.
- [x] **`DPR_CAP = 1.5`** — on rend des dégradés radiaux flous à 1,5× la
  résolution physique. → 1.0 suffit largement (2,25× moins de pixels à remplir),
  et l'upscale ajoute même un lissage gratuit.
- [ ] **`mixBlendMode: 'screen'` en CSS** — force une passe de fusion plein écran
  du calque entier à chaque image. `globalCompositeOperation = 'lighter'` dans le
  canvas ferait la fusion une fois au lieu de mélanger tout le calque contre la
  page. **Écarté pour l'instant** : `lighter` est additif là où le rendu actuel
  empile les orbes en `source-over` — les recouvrements deviendraient plus clairs.
  C'est un changement d'aspect, pas une optimisation neutre, et le gain est
  incertain à côté des 20 flous. À reprendre seulement si la mesure le justifie.

Vérifié par `src/components/effects/AuroraBackground.draw.test.tsx` : 5 sprites
créés au montage, 0 de plus sur 10 images, 3 orbes × 10 images = 30 `drawImage`.

`LavaLampBackground.tsx` a exactement les mêmes défauts.

- [x] `LavaLampBackground.tsx` — **cadence uniquement** (30 → 20 ips + `STEP_SCALE`
  + `DPR_CAP` 1). Sprites volontairement **non faits** : §0 mesure le gain à
  0,8 ms/s, ce serait du travail pour rien.
- [x] `WeatherEffects.tsx` — **rien à faire** : ce canvas vit *dans* une card,
  donc au-dessus de son propre `backdrop-filter` et hors du champ des autres.
  Il n'invalide le fond de personne. Le seul coût est son propre dessin, mesuré
  négligeable.

### P5 — Divers, moins urgent `[ ]`

- [ ] `<LayoutGroup>` enveloppe tout le dashboard (`src/Dashboard.tsx`). Seuls 5
  composants utilisent la prop `layout`, mais le groupe force la mesure de tous.
  À restreindre aux sous-arbres concernés.
- [ ] `index-*.js` = 934 ko. Ne coûte pas de fps, mais coûte le premier affichage.
  Dont ~90 ko de nunjucks (voir S5).
- [x] `src/hooks/useTemplate.ts` : liaison du moteur pendant le rendu — voir P2.

### Comment mesurer sur la tablette `[?]`

Le compteur FPS intégré est dans **Apparence → Performances**. Pour isoler la
cause, à coller dans la console de la tablette (Chrome distant, ou
`chrome://inspect` depuis le PC) :

```js
// fps sur 6 s, dans quatre configurations
const css = document.createElement('style'); document.head.append(css);
const mesure = () => new Promise(r => { let n = 0; const t0 = performance.now();
  (function f(){ n++; performance.now() - t0 < 6000 ? requestAnimationFrame(f)
    : r(Math.round(n / ((performance.now()-t0)/1000))); })(); });
const canvas = document.querySelector('canvas');
const res = {};
res.tel_quel = await mesure();
css.textContent = '.gc,.gc-light,.gc-overlay{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}';
res.sans_flou = await mesure();
css.textContent = '';
if (canvas) canvas.style.display = 'none';
res.sans_aurora = await mesure();
css.textContent = '.gc,.gc-light,.gc-overlay{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}';
res.sans_les_deux = await mesure();
css.remove(); if (canvas) canvas.style.display = '';
console.table(res);
```

Lecture :

| Ce qui remonte les fps | Conclusion |
|---|---|
| `sans_flou` seul | le GPU sature sur les 18 `backdrop-filter` → P3(b), ou moins de cards en verre |
| `sans_aurora` seul | c'est le couplage fond animé × flou → baisser encore la cadence |
| `sans_les_deux` seulement | les deux se cumulent, aucun n'est seul coupable |
| rien ne remonte | ce n'est pas la composition — chercher côté CPU/réseau |

- [ ] Mesure sur la tablette, à noter ici :
  - avant (référence) : 30 fps
  - après P1+P2+P3+P4 : _à remplir_
  - `sans_flou` / `sans_aurora` / `sans_les_deux` : _à remplir_

---

## 1 bis. Robustesse — appels de service

### R1 — 46 appels à `callService`, aucun `catch` `[x]`

Un refus de Home Assistant ne laissait qu'un `Uncaught (in promise)` dans la
console. Sur une tablette murale personne ne la regarde : le geste semblait
pris en compte, et rien ne bougeait.

- [x] `useServiceErrorToast` (`src/hooks/useServiceErrorToast.ts`), branché dans
  `HAToastBridge`. Un écouteur global `unhandledrejection` plutôt qu'un `catch`
  par appel : c'est le seul endroit qui couvre les 46 sites **et** ceux qu'on
  écrira demain. Filtre étroit — seuls les objets ayant la forme d'une erreur
  de service HA sont convertis en toast ; un bug applicatif reste bruyant dans
  la console, là où on le corrige. Vérifié en conditions réelles.

### R2 — Consignes de température hors bornes `[x]`

Cause du `service_validation_error` / `temp_out_of_range` observé. Les cards
`climate` ignoraient `min_temp`, `max_temp` et `target_temp_step` de l'entité :
`minTemp`/`maxTemp` de la configuration décrivent la **jauge**, pas l'appareil.

Relevé sur l'installation :

| Entité | Bornes réelles | Pas | Jauge par défaut |
|---|---|---|---|
| `climate.pellet` | 12 – 23 | 0,1 | 10 – 30 ❌ |
| `climate.edilkamin_…` | 14 – 24 | (non publié) | 10 – 30 ❌ |

- [x] `climateRange` / `snapTemp` (`src/lib/climate.ts`) : la plage d'affichage
  est intersectée avec celle de l'entité, l'arrondi se fait au pas réel **puis**
  se pince — arrondir un maximum de 24,3 au demi-degré donnerait 24,5, soit
  exactement la valeur refusée. Utilisé par `ThermostatCard` et `PelletCard`.
- [x] Effet de bord agréable : `climate.pellet` accepte enfin le dixième de
  degré, que le pas figé à 0,5 rendait inatteignable.

### R3 — `todo.get_items` introuvable `[ ]`

Repéré en passant dans la console, **non corrigé** — hors sujet de ce lot :

```
[useServiceResponse] todo.get_items sur todo.liste_dachats : Service todo.get_items not found.
```

L'appel est bien rattrapé (pas de rejet non géré), mais la card Liste de tâches
ne peut rien afficher. `todo.get_items` existe depuis Home Assistant 2024.4 :
soit l'instance est plus ancienne, soit l'intégration `todo` n'expose pas ce
service.

---

## 2. Sécurité

### S1 — Le jeton HA de longue durée est servi à tout utilisateur authentifié `[x]`

`server/index.js`, route `GET /api/system/ha-config`.

La route vérifie `HA_AUTH` mais **pas `req.haUser.isAdmin`**. En mode
`standalone`, n'importe quel membre du foyer disposant d'un compte HA récupère le
jeton créé par l'administrateur — qui vaut accès complet à la maison.

Le mode ingress est couvert par `panel_admin: true` dans `config.yaml`. Le mode
standalone ne l'est pas.

- [x] `haTokenGuard` dans `server/haAuth.js`, monté sur la route. Répond 200 avec
      `{ hassToken: null, reason: 'not_admin' }` et non 403 : le dashboard retombe
      alors sur le flux d'authentification de HA, où l'utilisateur s'identifie
      avec **ses** droits. Un 403 laisserait croire à une panne.
      Couvert par `server/haAuth.test.js`.

### S2 — `x-ingress-path` est un en-tête, pas une preuve `[ ]`

`server/haAuth.js`, `haAuthMiddleware`, mode `ingress`.

La seule présence de l'en-tête donne `isAdmin: true`. `config.yaml` ne publie pas
de `ports:`, l'exposition se limite donc au réseau Docker `hassio` — mais **tout
autre add-on installé** peut appeler `http://ha-react-dashboard:8099/api/config`
avec cet en-tête forgé et réécrire la configuration partagée.

- [ ] Défense en profondeur : vérifier aussi que `req.ip` appartient au superviseur

### S3 — Le quota de débit se contourne d'un en-tête `[ ]`

`server/index.js`, `clientKey`.

La clé lit `x-remote-user-id` / `x-ha-user-id` / `device_id`, tous fournis par le
client. Un en-tête aléatoire par requête = quota neuf à chaque fois.

- [ ] Ne se fier à ces valeurs que lorsque le middleware d'auth les a posées
      lui-même (`req.haUser.id`)

### S4 — `/api/settings` n'est pas cloisonné `[ ]`

`server/routes/settings.js`.

`device_id` est assaini mais jamais rattaché à l'appelant : n'importe qui lit et
écrit les réglages de n'importe quel appareil. Faible gravité (thème, mode
kiosque) — sauf que `behaviourSettings` contient un code PIN.

- [ ] Au minimum, isoler le PIN du reste des réglages

### S5 — Nunjucks en `autoescape: false` `[ ]`

`src/lib/template-engine.ts`.

Aujourd'hui la sortie n'atterrit dans aucun `dangerouslySetInnerHTML` — le seul
est `RichText`, qui passe par DOMPurify. C'est donc une mine posée, pas une
faille : le jour où quelqu'un branche un template sur du HTML, c'est une XSS
stockée sur l'origine du dashboard.

- [ ] Passer `autoescape: true`, ou documenter l'interdit à côté du constructeur

Le reste du serveur est solide : uploads (extension imposée par MIME, quota,
purge des orphelins, assainissement SVG), CSP, `writeGuard`, `adminWrites`,
révisions optimistes, historique de configuration.

### S6 — Bug, pas faille : nunjucks vs CSP `[?]`

La CSP est `script-src 'self'` sans `'unsafe-eval'` (`server/index.js`), et
nunjucks compile ses templates par `new Function(source)` — on retrouve bien
`Function(t)()` dans `dist/assets/index-*.js`.

En **mode add-on**, les cards Template devraient donc afficher
`[Erreur template: …]`. En mode panneau HACS ça passe, puisque c'est Home
Assistant qui sert la page et impose sa propre CSP — ce qui explique que le
problème ait pu passer inaperçu.

- [ ] Confirmer dans la console de la tablette (non vérifié à l'exécution)
- [ ] Si confirmé : soit `'unsafe-eval'` dans la CSP (mauvais), soit passer à un
      évaluateur d'expressions sans `eval` (bon, et ça retire ~90 ko du bundle)

---

## 3. Widgets manquants

Les 30 manifestes couvrent bien les domaines classiques. Les trous réels, par
ordre d'utilité sur une tablette murale :

- [ ] **Card « contrôle » générique** — `input_select`, `input_number`,
  `input_datetime`, `number`, `select`, `counter`. Le plus gros manque :
  `SensorCard` sait basculer un `input_boolean` et rien d'autre. Les helpers HA
  sont partout et n'ont aucun moyen d'arriver sur le dashboard sauf par un
  template. Un seul widget qui rend un select / un slider / un stepper selon le
  domaine de l'entité.
- [ ] **Timer / compte à rebours** (`timer`) — machine à laver, four. Le cas
  d'usage tablette murale par excellence.
- [ ] **Jauge radiale** — pour n'importe quelle entité numérique. Peu de code,
  et `ThermostatCard` a déjà la jauge à extraire.
- [ ] **Qualité d'air** — CO₂ / PM2.5 / COV avec seuils colorés. `SensorCard`
  affiche le chiffre, pas la lecture.
- [ ] **Domaines HA récents sans card** : `humidifier`, `water_heater`,
  `valve` (arrosage), `lawn_mower`.
- [ ] **Prochaine collecte / prochain événement** — dérivé de `calendar`, avec
  compte à rebours en jours. Très demandé en Europe ; `CalendarCard` ne fait
  qu'une liste.
