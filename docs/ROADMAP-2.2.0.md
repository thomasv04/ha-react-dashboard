# Roadmap 2.2.0

Fichier de suivi unique pour la version **2.2.0**. Chaque tâche a un identifiant
stable (`A1`, `S2`…) : dire « fais `S3` » suffit à reprendre le travail dans une
nouvelle session, sans contexte.

**Règles de tenue du fichier**

- Cocher `[x]` **au moment du commit**, pas avant.
- Si une tâche est abandonnée : `[~]` + une ligne « abandonné parce que … ».
- Si une tâche révèle un travail non prévu, l'ajouter en bas de sa phase avec
  l'identifiant suivant libre.
- Ne pas réécrire l'historique des tâches faites : c'est ce qui rend le fichier
  utile six mois plus tard.

**Ordre** — les phases A → F sont ordonnées par dépendance. À l'intérieur d'une
phase, les tâches sont indépendantes sauf mention contraire.

**État global** : **32 tâches sur 33.**

> **`F10` (sections repliables) n'est PAS faite** — c'est la seule, et c'est
> délibéré. Elle touche le format de configuration, là où tout le reste de cette
> version n'ajoute que des champs facultatifs. Voir [sa fiche](#-f10--sections-repliables--pas-fait-reporté-en-230)
> pour le raisonnement complet et ce qu'il faudra reprendre le jour venu.

> Le total a bougé : `E2` a été scindé (dupliquer ≠ presse-papier) et le compte
> initial de 26 était faux. C'est celui-ci qui fait foi.

## Où en est-on

**Fait et vérifié** (`npm run test:run` 341 ✓, `pytest` 44 ✓, `type-check` ✓,
`lint` 0 erreur, `check:widgets` ✓) :

| Phase | Tâches |
|---|---|
| A — Socle | `A1` `A2` |
| B — Stabilité | `B1` `B2` `B3` `B4` `B5` — **toute la phase** |
| C — Sécurité | `C1` `C2` `C3` `C4` `C5` — **toute la phase** |
| D — Maintenabilité | `D1` `D2` `D3` `D4` — **toute la phase** |
| E — Utilisation | `E1` `E2` `E3` `E4` `E5` |
| F — Personnalisation | `F1`–`F9`, `F11`, `F12` — tout sauf `F10` |

**Commité en 7 lots** sur `fix/plein-ecran-gouttiere-et-defilement` — serveur,
migration des widgets, effets, panneaux, édition, réglages, documentation.
Chacun se relit seul. **Rien n'est poussé.**

> Le découpage suit les fichiers, pas les identifiants de tâches : plusieurs
> tâches touchent les mêmes fichiers (`DashboardGrid.tsx` sert à `E3`, `F7`,
> `F8` et `F9`), et git ne sait pas les séparer. Chaque message de commit dit
> quelles tâches il porte.

**Avant de publier** : ajouter l'entrée `2.2.0` en tête de
[release-notes.ts](../src/data/release-notes.ts), et vérifier que `config.yaml`
(2.1.8) est bien à jour — les tags vont jusqu'à `v2.1.10`.

### Hors roadmap — signalé à l'usage

- **[x] Saut des bulles au bord de l'écran.** Aurora et Lave téléportaient leurs
  particules d'un bord à l'autre **à pleine opacité** : un orbe large et lent
  disparaissait d'un coup à gauche pour resurgir d'un coup à droite. Les deux
  effets portaient la même ligne, dupliquée — factorisée dans
  [background-motion.ts](../src/lib/background-motion.ts), testable sans canvas.
  Trois modes réglables dans Apparence : **Fondu** (défaut — la traversée a lieu
  à opacité nulle, donc invisible), **Aller-retour** (le trajet s'inverse
  indéfiniment) et **Traversée** (l'ancien comportement, conservé pour qui le
  préférait). Le défaut change délibérément : l'ancien était le défaut reproché.

- **[x] Fiche détaillée depuis un panneau.** Un volet listé dans un panneau
  n'ouvrait pas sa fiche au clic : les trois boutons agissaient, la ligne était
  inerte. C'était le seul endroit du dashboard d'où la fiche d'une entité était
  inatteignable. Corrigé dans `CoverRowBlock`, **et dans `WidgetBlock`** qui
  avait exactement le même défaut — il rend une vraie card mais sans passer par
  `GridItem`, donc sans le câblage du clic. `ButtonBlock` est laissé tel quel :
  appeler un service est sa raison d'être.

---

## Phase A — Socle (à faire en premier)

Ces deux tâches débloquent le reste. `A1` en particulier : toute tâche qui touche
au schéma SQLite en dépend.

### [x] A1 — Versionner le schéma SQLite

- **Où** : [server/db.js](../server/db.js)
- **Problème** : `initDB` empile des `CREATE TABLE IF NOT EXISTS`. Aucune notion
  de version : ajouter une colonne à une table existante est aujourd'hui
  impossible sans casser les installations déjà en service.
- **Quoi** : `PRAGMA user_version` + un tableau `MIGRATIONS = [fn0, fn1, …]`
  appliqué séquentiellement dans une transaction. Les `CREATE TABLE` actuels
  deviennent la migration 1.
- **Fait quand** : une DB vide et une DB 2.1.x arrivent toutes deux à
  `user_version = N`, vérifié par un test sur `:memory:` et sur une copie d'une
  DB réelle.

### [x] A2 — `/api/health` + `watchdog`

- **Où** : [server/index.js](../server/index.js), [ha-react-dashboard/config.yaml](../ha-react-dashboard/config.yaml)
- **Problème** : le superviseur ne redémarre jamais l'add-on s'il se fige.
- **Quoi** : endpoint public (hors `haAuthMiddleware`, avant le rate-limit)
  renvoyant `{ ok: true, version, db: 'up' }` après un `SELECT 1` sur la DB.
  Puis `watchdog: "http://[HOST]:[PORT:8099]/api/health"` dans `config.yaml`.
- **Attention** : si `/api/health` passe derrière le rate-limiter, un pic de
  trafic fait redémarrer l'add-on. Le monter **avant** `app.use('/api/', …)`.
- **Fait quand** : `curl` renvoie 200 sans jeton, et le watchdog apparaît dans
  l'onglet Info de l'add-on.

---

## Phase B — Stabilité

### [x] B1 — Historique et restauration de la configuration

**La tâche la plus importante de la 2.2.0.**

> **Fait.** Backend Express ([config.js](../server/routes/config.js)) *et* backend
> intégration ([api.py](../custom_components/ha_react_dashboard/api.py)) : le
> frontend ne sait pas lequel lui répond, les deux devaient bouger. UI dans
> [ConfigHistorySection.tsx](../src/components/layout/ThemeControlsModal/ConfigHistorySection.tsx).
>
> **Décision** : après restauration, la page est rechargée (`location.reload()`)
> plutôt que de repropager la config à chaud. Thème, pages, panneaux et configs
> de widgets en dérivent tous — les rejouer à la main referait le travail du
> démarrage, avec le risque de laisser un morceau d'écran sur l'ancienne version.

- **Où** : [server/routes/config.js:26](../server/routes/config.js), [server/db.js](../server/db.js)
- **Problème** : le `PUT` écrase la ligne `id = 1`. Un import raté, une
  manipulation en mode édition, un bug de sérialisation → disposition perdue,
  sans recours.
- **Quoi** :
  - migration (cf. `A1`) : table `config_history (id, data, version, created_at)`
  - avant chaque `UPDATE`, insérer l'ancienne valeur ; purger au-delà de 20 lignes
  - `GET /api/config/history` (liste : id + date + taille, sans les données)
  - `POST /api/config/history/:id/restore`
  - UI : Paramètres › Système, sous l'export/import existant
- **Fait quand** : on peut casser volontairement sa disposition et revenir à
  l'état d'avant en trois clics.

### [x] B2 — Détection de conflit sur `/api/config`

> **Fait.** Une différence assumée avec `settings.js` : la révision voyage par
> en-tête (`X-Config-Revision` / `X-Expected-Revision`) et non dans le corps.
> Le corps d'un `PUT /api/config` *est* la configuration — y glisser un champ de
> protocole finirait par être réenregistré comme s'il en faisait partie.

- **Où** : [server/routes/config.js](../server/routes/config.js) — copier le mécanisme de [server/routes/settings.js:38](../server/routes/settings.js)
- **Problème** : deux appareils en mode édition, le dernier `PUT` écrase l'autre
  en silence.
- **Quoi** : colonne `revision`, `expected_revision` dans le corps, `409` en cas
  de divergence. Côté client : toast « modifié depuis un autre appareil » +
  bouton recharger. Ne **pas** tenter de fusion automatique.
- **Fait quand** : deux onglets ouverts, le second reçoit un 409 au lieu d'écraser.

### [x] B3 — Checkpoint WAL

> Fait en même temps qu'`A1` : même fichier. `checkpoint()` est exporté par
> [server/db.js](../server/db.js) et appelé sur `SIGTERM`/`SIGINT` dans
> [server/index.js](../server/index.js). Reste à l'appeler après écriture de la
> config — fait dans `B1`.

- **Où** : [server/db.js:20](../server/db.js)
- **Problème** : `journal_mode = WAL` sans checkpoint explicite. Un backup HA de
  `/data` peut capturer une `dashboard.db` sans les dernières écritures, restées
  dans le fichier `-wal`.
- **Quoi** : `db.pragma('wal_checkpoint(TRUNCATE)')` sur `SIGTERM`/`SIGINT` et
  après chaque écriture de config (rare, coût négligeable).
- **Fait quand** : après un `PUT /api/config` puis un arrêt, une copie du seul
  fichier `.db` contient bien la config.

### [x] B4 — Frontières d'erreur au-delà des widgets

> **Fait** en réutilisant `WidgetErrorBoundary` (pas de second composant),
> étendu de deux choses : un message paramétrable (`messageKey`) pour
> distinguer « widget » de « panneau », et un bouton **Réessayer** qui refait le
> rendu — une exception passagère (entité absente le temps d'une reconnexion,
> flux vidéo coupé) ne condamne plus la case jusqu'au rechargement de la page.
> Posé autour de chaque bloc de panneau personnalisé, de `ActivePanel` et de
> `MoreInfoModal`. Le message était en français en dur : passé par i18n.

- **Où** : [src/components/ui/WidgetErrorBoundary.tsx](../src/components/ui/WidgetErrorBoundary.tsx) (existe déjà), à étendre
- **Problème** : un crash dans un custom-panel, une modale more-info ou
  l'ActivityBar démonte tout l'arbre React → écran blanc.
- **Quoi** : réutiliser le composant existant (ne pas en écrire un second)
  autour de `CustomPanelRenderer`, `MoreInfoModal` et `ActivityBar`, avec un
  repli « ce panneau n'a pas pu s'afficher » + bouton réessayer.
- **Fait quand** : un `throw` volontaire dans un panneau laisse le dashboard
  utilisable.

### [x] B5 — Validation de la configuration au chargement

> **Fait** — `sanitizeConfig` / `sanitizeWidget` dans
> [useDashboardConfig.ts](../src/hooks/useDashboardConfig.ts). Pas de `zod` :
> le schéma est petit et stable, une dépendance de plus dupliquerait la même
> forme.
>
> **Décision plus nuancée que le plan** : tout n'est pas écarté. `id` ou `type`
> manquant → la carte est retirée (rien à rendre). Coordonnée illisible → elle
> est **réparée** (0,0 / 2×2). Supprimer une carte que l'utilisateur a créée et
> configurée, pour un `x` corrompu, détruirait son travail là où un déplacement
> suffit. Effet de bord utile : les configs v1 sans coordonnées, qui
> traversaient la migration telles quelles, sont maintenant complétées.

- **Où** : [src/hooks/useDashboardConfig.ts](../src/hooks/useDashboardConfig.ts), [server/routes/config.js:10](../server/routes/config.js)
- **Problème** : `JSON.parse` puis confiance totale. Une config corrompue ou
  d'une version future = écran blanc sans message.
- **Quoi** : validation de forme (pages tableau, widgets avec `id`/`type` connus,
  positions numériques) ; les widgets invalides sont **écartés** avec un toast
  plutôt que de faire tomber la page. Pas de dépendance nouvelle : une fonction
  de garde suffit, `zod` n'est pas justifié pour un schéma.
- **Fait quand** : une config volontairement corrompue affiche un message et le
  reste du dashboard.

---

## Phase C — Sécurité

### [x] C1 — Faire respecter « écritures réservées aux administrateurs » côté serveur

> **Fait**, et l'écart était plus étroit qu'annoncé : l'intégration Python avait
> **déjà** son `require_admin` ([api.py:47](../custom_components/ha_react_dashboard/api.py)).
> C'est l'add-on Express qui était en retard. `adminWrites` dans
> [haAuth.js](../server/haAuth.js) reproduit exactement le même choix, y compris
> l'exemption de `/api/settings`.
>
> **Comment le rôle est obtenu** : `auth/current_user` par WebSocket — le seul
> point d'entrée HA qui rende `is_admin`, l'API REST n'a pas d'équivalent. La
> même connexion valide le jeton, ce qui remplace le `fetch` de vérification
> précédent au lieu de s'y ajouter. `globalThis.WebSocket` est natif depuis
> Node 22 (l'image Docker) : aucune dépendance ajoutée. Résultat mis en cache
> 5 min par jeton, sinon un chargement de dashboard ouvrirait dix sockets.
>
> **Mode ingress** : `isAdmin: true`, parce que `panel_admin: true` fait que le
> superviseur n'accorde une session d'ingress qu'à un administrateur. Ce n'est
> pas une nouvelle décision, c'est celle que documentait déjà `config.yaml` —
> **à revérifier de ton côté** si tu veux en avoir le cœur net (essayer
> d'ouvrir le panneau avec un compte non-admin).
>
> **Lectures laissées ouvertes**, délibérément : la config, les traductions et
> les icônes sont ce que tout le monde affiche. Les verrouiller rendrait le
> dashboard illisible pour les non-administrateurs.

**Écart entre l'annoncé et le réel.** La note de version 2.1.3 affirme que les
écritures partagées sont réservées aux administrateurs. En pratique le contrôle
est **uniquement côté client** : [src/components/dashboard/EditButton.tsx:39](../src/components/dashboard/EditButton.tsx)
masque le bouton, mais `haAuthMiddleware` ne vérifie que la validité du jeton,
jamais le rôle. N'importe quel membre de la maison peut écrire la config par un
`PUT` direct.

- **Où** : [server/haAuth.js](../server/haAuth.js), [server/index.js:79](../server/index.js)
- **Quoi** : en mode `standalone`, l'appel de validation interroge déjà HA —
  utiliser `GET /api/` puis résoudre le rôle et le poser dans `req.haUser`. En
  mode `ingress`, le superviseur ne transmet pas le rôle : c'est `panel_admin:
  true` qui protège, à documenter comme tel. Puis un middleware `requireAdmin`
  sur les `PUT`/`POST`/`DELETE` de `config`, `profiles`, `translations`,
  `uploads` — **pas** sur `settings` (réglages propres à l'appareil, ouverts à
  tous, c'est ce que dit déjà la note de version).
- **Fait quand** : un `curl` avec le jeton d'un utilisateur non-admin reçoit 403
  sur `PUT /api/config` et 200 sur `PUT /api/settings/current`.

### [x] C2 — Refuser les écritures non authentifiées en production

> **Fait** — `writeGuard` dans [haAuth.js](../server/haAuth.js). Lecture toujours
> permise : un dashboard mural derrière un pare-feu reste utilisable.

- **Où** : [server/index.js:79](../server/index.js)
- **Problème** : `HA_AUTH` est optionnel. S'il n'est pas à `'true'`,
  `PUT /api/config`, `/api/uploads`, `/api/profiles` sont ouverts à qui joint le
  port 8099. Le jeton HA est déjà protégé par ce cas ([index.js:104](../server/index.js)) —
  appliquer la même logique aux écritures.
- **Quoi** : si `isProduction && HA_AUTH !== 'true'` → 503 sur toute méthode
  autre que `GET`, avec un message d'erreur explicite au démarrage.
- **Fait quand** : démarrage en production sans `HA_AUTH` → lecture seule, log
  d'avertissement au boot.

### [x] C3 — Rate-limit par utilisateur, pas par IP

> **Fait.** Deux quotas comme prévu (300 lectures / 30 écritures par minute).
> Repli sur `ipKeyGenerator(req.ip)` et non `req.ip` nu : une IPv6 brute
> donnerait un quota par adresse d'un même /64, que n'importe quel client fait
> varier à volonté.

- **Où** : [server/index.js:66](../server/index.js)
- **Problème** : derrière l'ingress, toutes les requêtes portent l'IP du
  superviseur. Les 300 req/min sont donc partagées par toute la maison : une
  tablette bavarde bloque tout le monde.
- **Quoi** : `keyGenerator` sur `x-ha-user-id` ou `device_id` quand présent,
  repli sur l'IP. Limites distinctes : lectures généreuses, écritures serrées
  (~30/min).
- **Fait quand** : deux appareils, l'un saturé, l'autre répond toujours.

### [x] C4 — Quota et ménage des fichiers envoyés

> **Fait.** Quota total 200 Mo (507 au dépassement, fichier refusé effacé) et
> `pruneOrphanUploads` au démarrage. Deux garde-fous que le plan ne prévoyait
> pas et sans lesquels le ménage aurait détruit des données :
> - **l'historique de config compte** comme référence — sinon restaurer un état
>   archivé (`B1`) rendrait un dashboard aux cadres vides ;
> - **délai de grâce de 24 h** — un fond est téléversé avant d'être enregistré
>   en config ; un redémarrage entre les deux aurait supprimé l'image choisie.

- **Où** : [server/routes/uploads.js](../server/routes/uploads.js)
- **Note** : la validation est déjà solide (extension imposée par le type MIME,
  SVG passés à DOMPurify, redimensionnement par sharp). **Ne rien réécrire là.**
- **Problème** restant : aucun plafond de volume total et aucun ménage. Un fond
  d'écran remplacé dix fois laisse dix fichiers de 10 Mo dans `/data`, qui
  partent dans chaque backup HA.
- **Quoi** : plafond total (~200 Mo) refusant l'envoi au-delà, plus une purge des
  images non référencées par la config au démarrage.
- **Fait quand** : remplacer un fond dix fois laisse un seul fichier.

### [x] C5 — Audit de dépendances dans le CI

> **Fait.** Job `audit` dans [ci.yml](../.github/workflows/ci.yml) et
> [dependabot.yml](../.github/dependabot.yml) (groupé, hebdomadaire — dégroupé,
> les PR arrivent à la douzaine et finissent fusionnées sans être lues).
> `npm audit --audit-level=high` passe aujourd'hui : 0 vulnérabilité.

- **Où** : [.github/workflows/ci.yml](../.github/workflows/ci.yml)
- **Quoi** : un job `npm audit --audit-level=high` + activer Dependabot
  (`.github/dependabot.yml`, npm hebdomadaire, groupé).
- **Fait quand** : le CI échoue sur une vulnérabilité haute.

---

## Phase D — Maintenabilité

### [x] D1 — Verrouiller les registres historiques, puis migrer

> **Étape 1 faite — c'était la priorité annoncée.** `LEGACY_ALLOWLIST` dans
> [check-widget-registry.ts](../scripts/check-widget-registry.ts) : un type qui
> n'y figure pas et qui apparaît dans un `LEGACY_*` fait échouer le script, déjà
> branché dans le CI. Le script affiche aussi le décompte restant et signale un
> widget migré resté dans la liste.
>
> **Le verrou a immédiatement trouvé un vrai doublon** : `automation` avait un
> manifeste **et** quatre entrées historiques oubliées (méta, catalogue, champs,
> dispositions, composant). Supprimées — c'était exactement le genre de
> désynchronisation silencieuse que la liste blanche existe pour attraper.
>
> **Étape 2 faite — les 30 widgets passent désormais par un manifeste, et les
> sept registres `LEGACY_*` ont été supprimés**, ainsi que le fichier
> `src/config/widget-registry.tsx` devenu entièrement mort.
>
> Migré par **codemod** et non à la main : vingt widgets × six fichiers, c'était
> cent vingt éditions et autant d'occasions d'oublier une entrée — exactement la
> désynchronisation silencieuse que les manifestes existent pour supprimer. Le
> script découpait les entrées existantes et les recomposait ; il a été supprimé
> une fois le travail fait, il n'a aucune raison de rester.
>
> **Un second résidu trouvé au passage** : `automation` gardait une entrée dans
> `LEGACY_SIZE_PRESETS`, que le vérificateur ne couvrait pas — ce registre-là ne
> figurait pas dans sa liste. Corrigé.
>
> `check:widgets` a été réécrit : il n'a plus deux modèles à arbitrer, seulement
> deux invariants à tenir (tout type de l'union a un manifeste importé ; aucun
> manifeste ne traîne sans import). `CLAUDE.md` a été mis à jour en conséquence.

- **Où** : [scripts/check-widget-registry.ts](../scripts/check-widget-registry.ts), [src/widgets/registry.ts](../src/widgets/registry.ts)
- **État** : 10 widgets sur 31 déclarés par manifeste (`automation`,
  `automationList`, `energyFlow`, `chart`, `batteries`, `lock`, `calendar`,
  `todo`, `fan`, `clock`). Les 21 autres vivent dans les objets `LEGACY_*`.
- **Quoi** :
  1. d'abord **fermer la porte** : `check:widgets` échoue si un type absent
     d'une liste figée apparaît dans un registre `LEGACY_*`, et brancher le
     script dans le CI. Une heure de travail, plus aucune régression possible.
  2. ensuite migrer par lots de 5, en cochant ci-dessous.
- **Migration** : `[ ]` ButtonCard `[ ]` CameraCard `[ ]` ClockCard `[ ]`
  CoverCard `[ ]` EnergyCard `[ ]` GreetingCard `[ ]` GroupCard `[ ]` LightCard
  `[ ]` MediaPlayerCard `[ ]` PelletCard `[ ]` PersonStatus `[ ]` RoomCard `[ ]`
  RoomsGrid `[ ]` SensorCard `[ ]` ShortcutsCard `[ ]` TemplateCard `[ ]`
  TempoCard `[ ]` ThermostatCard `[ ]` VacuumCard `[ ]` WeatherCard `[ ]`
  AlarmCard `[ ]` ActivityBar
- **Fait quand** : les objets `LEGACY_*` sont supprimés et `check:widgets` passe.

### [x] D2 — Découper `CustomPanelEditorModal.tsx`

> **Fait**, découpé **par bloc** comme prévu et non par couche technique :
> `editor/block-meta.ts` (icônes, valeurs par défaut, résumé — lus par la liste
> et le sélecteur d'ajout, qui n'ont pas besoin des champs de saisie) et
> `editor/BlockForms.tsx` (les cinq formulaires + le sélecteur de service). La
> modale garde la coquille, la liste des panneaux et l'éditeur : **1 129 → 495
> lignes**.
>
> Le découpage a révélé un mauvais voisinage : `SERVICE_PRESETS` était placé
> parmi les métadonnées de bloc alors qu'il n'alimente que le sélecteur de
> service. Remis auprès du formulaire qui l'utilise.

- **Où** : [src/components/custom-panels/CustomPanelEditorModal.tsx](../src/components/custom-panels/CustomPanelEditorModal.tsx) — 45 Ko en un fichier
- **Quoi** : extraire un fichier par type de bloc éditable, garder la modale
  comme coquille. Découper **par bloc**, pas par couche technique.
- **Fait quand** : aucun fichier au-dessus de ~400 lignes dans ce dossier.

### [x] D3 — Élaguer `docs/`

> **Fait — 18 fichiers supprimés**, après lecture de chacun. Le critère : un
> fichier décrit-il le code **tel qu'il est** ?
>
> Partis : les revues et audits datés (`CODE_REVIEW`, `PERFORMANCE_SECURITY_AUDIT`,
> `AUDIT.md`), les prompts pour d'autres outils (`COPILOT_*`,
> `audit-prompt-opus`), les analyses de projets de référence dont
> l'implémentation est livrée depuis (`TUNET_*`, `gaps-vs-tunet`,
> `DRAG_DROP_EXPLANATION`, `HACS_INTEGRATION_ANALYSIS`), et les plans réalisés
> (`RESPONSIVE_PLAN`, `THERMOSTAT_APPLE_HOME_REDESIGN`, `GRID_IMPLEMENTATION`).
>
> Deux cas décidés à la lecture, pas au titre :
> - `camera-streaming-tunet.md` recommandait le MJPEG — le code est passé au HLS
>   depuis. La doc n'était pas obsolète, elle était **fausse**.
> - `PANELS_WIDGET_BLOCK.md` se déclarait « proposition, non implémentée » alors
>   que `WidgetBlock` existe.
>
> Restent 6 fichiers, tous exacts. Aucune référence pendante ailleurs dans le
> dépôt (vérifié). `config-string.md` a été mis à jour : il ignorait le
> téléchargement de fichier et l'historique de configuration ajoutés ici.

- **Où** : [docs/](.)
- **Problème** : 23 fichiers dont plusieurs audits datés présentés comme
  courants (`CODE_REVIEW.md`, `PERFORMANCE_SECURITY_AUDIT.md`, `COPILOT_*.md`,
  `AUDIT.md` à la racine, `TUNET_*`, `gaps-vs-tunet.md`). De la documentation
  fausse coûte plus cher que pas de documentation.
- **Quoi** : garder `PROJECT_OVERVIEW`, `DESIGN_LANGUAGE`, `GRID_SYSTEM_GUIDE`,
  `motion-design-system`, ce fichier. Supprimer le reste (git le conserve).
  `ideas/` : garder l'index en marquant ce qui est livré.
- **Fait quand** : chaque fichier restant décrit le code tel qu'il est.

### [x] D4 — Corriger la locale câblée en dur

> **Fait, et le défaut était plus large que signalé** : `ClockWidget` figeait
> bien `fr-FR`, mais `getGreeting()` renvoyait aussi les quatre salutations en
> français en dur — alors que `widgets.greeting.good*` existait déjà dans les
> deux langues, inutilisé. Les deux passent par `useI18n`, et la carte suit
> désormais la langue de l'interface quand aucune locale n'est choisie.

- **Où** : [src/components/cards/GreetingCard/GreetingCard.tsx:65](../src/components/cards/GreetingCard/GreetingCard.tsx)
- **Problème** : `'fr-FR'` en dur lignes 65 et 67 alors que le reste du fichier
  utilise `locale`. Un utilisateur en anglais voit une date en français.
- **Quoi** : une ligne. À faire en passant, pas besoin d'un commit dédié.

---

## Phase E — Utilisation

### [x] E1 — Annuler / rétablir en mode édition

> **Fait.** `pushHistory` posé sur les sept mutations du contexte — un seul
> point de passage, comme prévu.
>
> **Le piège, découvert en lisant les appelants** : `setLayout` est appelé à
> *chaque pixel* d'un redimensionnement et à chaque changement de cellule d'un
> glisser-déposer. Une pile naïve aurait enregistré des centaines d'états et
> « annuler » n'aurait reculé que d'un pixel. Les mutations espacées de moins de
> 400 ms sont donc regroupées en un seul point de retour ; un test vérifie que
> 50 déplacements d'affilée s'annulent d'un coup.
>
> `ponytail:` un geste très lent produit quand même quelques entrées. Bornes de
> geste explicites depuis `DashboardGrid` si ça gêne à l'usage.
>
> Raccourcis actifs **en mode édition seulement**, et jamais quand un champ de
> saisie a le focus — sinon Ctrl+Z ne corrigerait plus une frappe.

- **Où** : [src/context/DashboardLayoutContext.tsx](../src/context/DashboardLayoutContext.tsx)
- **Problème** : le manque le plus douloureux au quotidien — un déplacement raté
  est irréversible.
- **Quoi** : une pile des N (20) derniers layouts **en mémoire**, empilée à
  chaque mutation, `Ctrl+Z` / `Ctrl+Shift+Z` + deux boutons dans la barre
  d'édition. Pas de persistance : la pile meurt avec la session, et `B1` couvre
  le cas long terme.
- **Fait quand** : dix déplacements peuvent être annulés un par un.

### [x] E2 — Dupliquer un widget

> **Fait** — `duplicateWidget` recopie la configuration en plus de la carte, et
> place la copie au premier emplacement libre (aux coordonnées de l'original,
> elle se superposerait exactement).
>
> **Réduit volontairement** : pas de `Ctrl+C`/`Ctrl+V` entre pages. Dupliquer
> couvre le besoin réel — éviter de re-régler un thermostat — pour un bouton
> déjà à sa place dans l'overlay. Le presse-papier inter-pages demanderait un
> état supplémentaire et une cible visible ; à ajouter si le manque se fait
> sentir à l'usage.

- **Où** : [src/components/layout/DashboardGrid.tsx](../src/components/layout/DashboardGrid.tsx)
- **Quoi** : « Dupliquer » dans le menu contextuel du widget (nouvel `id`, même
  config, placé au premier emplacement libre) + `Ctrl+C`/`Ctrl+V` entre pages.
  Le presse-papier est un état React, pas l'API système.
- **Fait quand** : un thermostat configuré peut être recopié sur une autre page
  sans tout ressaisir.

### [x] E3 — Sélection multiple

> **Fait.** `Maj`/`Ctrl`+clic bascule l'appartenance d'une case à la sélection ;
> une barre d'actions groupées apparaît alors dans le bandeau d'édition.
>
> **`onClickCapture` et non `onClick`** : la case entière est un handle de
> glisser et l'overlay avale les clics. Intercepter à la descente était le seul
> moyen de voir le geste avant eux.
>
> `removeWidgets` n'appelle `pushHistory` **qu'une fois** : supprimer six cartes
> est *un* geste, et doit s'annuler d'un seul Ctrl+Z. Un test le vérifie.
>
> La sélection est vidée en quittant l'édition — un contour de sélection
> survivant en mode consultation n'aurait plus aucune action derrière lui.

- **Où** : [src/components/layout/DashboardGrid.tsx](../src/components/layout/DashboardGrid.tsx), [src/hooks/useGridDragDrop.ts](../src/hooks/useGridDragDrop.ts)
- **Quoi** : `Shift`+clic pour sélectionner plusieurs widgets, déplacement et
  suppression groupés.
- **Dépend de** : `E1` (annuler devient indispensable dès qu'on déplace en masse).

### [x] E4 — Barre de commande rapide

> **Fait** — [QuickBar.tsx](../src/components/dashboard/QuickBar.tsx). `e` cherche
> une entité et ouvre sa fiche, `c` va à une page ou ouvre un panneau.
>
> **Monté à l'ouverture seulement** : le panneau s'abonne à *toutes* les
> entités, il rendrait à chaque message du WebSocket s'il restait en place. Seul
> l'écouteur clavier vit en permanence.
>
> Une correspondance domaine HA → modale était nécessaire (`climate` →
> `thermostat`, `binary_sensor` → `sensor`…), avec repli sur `sensor`, qui
> affiche état et historique pour n'importe quelle entité.

- **Où** : nouveau, façon quick bar de HA
- **Quoi** : `e` → chercher une entité et ouvrir sa more-info ; `c` → aller à une
  page ou ouvrir un panneau. Toutes les données sont déjà là (`useEntities`,
  `PageContext`, `CustomPanelContext`) : c'est une modale de recherche, rien de
  plus.
- **Fait quand** : n'importe quelle entité est joignable en trois frappes.

### [x] E5 — Export/import par fichier

> **Fait** en même temps que `B1` : même fichier
> ([SystemSection.tsx](../src/components/layout/ThemeControlsModal/SystemSection.tsx)).
> Téléchargement `.hadash`, sélecteur de fichier et dépôt sur le textarea.

- **Où** : [src/components/layout/ThemeControlsModal/SettingsContent.tsx](../src/components/layout/ThemeControlsModal/SettingsContent.tsx), [src/lib/config-string.ts](../src/lib/config-string.ts)
- **Problème** : la chaîne `HADASH1:` fonctionne, mais un copier-coller de
  plusieurs dizaines de Ko dans un `textarea` est fragile (troncature, retours
  à la ligne ajoutés par le presse-papier).
- **Quoi** : bouton « Télécharger » (`Blob` + `<a download>`) et zone de dépôt de
  fichier à l'import, en gardant la chaîne pour les petits partages.
- **Fait quand** : une config de 500 Ko fait l'aller-retour sans perte.

---

## Phase F — Paramètres et personnalisation

### [x] F1 — Formats régionaux

> **Fait** — [useFormats.ts](../src/hooks/useFormats.ts), seul endroit qui lise
> ces réglages. Les cards ne connaissent que `formatTime` / `formatDate` /
> `formatTemperature`, plus leurs propres options `Intl`.
>
> **Le hook lit le contexte de thème par `useContext`, pas par `useTheme`** :
> ce dernier lève hors fournisseur, et formater une date ne devrait pas exiger
> tout le contexte de thème. Une card montée isolément — test, Storybook,
> aperçu de la modale d'édition — affiche donc ses dates au format par défaut
> au lieu de planter. C'est ce qui a cassé trois suites de tests avant
> correction : la contrainte était réelle, pas un artefact de test.
>
> `ClockCard` garde son `hour12` local, qui l'emporte sur le réglage global —
> les cards déjà configurées ne changent pas d'affichage.

- **Où** : [src/components/layout/ThemeControlsModal/SettingsContent.tsx](../src/components/layout/ThemeControlsModal/SettingsContent.tsx), i18n `settings.json` (fr + en)
- **Quoi** : 12 h / 24 h, format de date, unité de température, premier jour de
  la semaine. Un contexte de format lu par les cards, avec « Suivre Home
  Assistant » par défaut (HA expose ces préférences par utilisateur).
- **Note** : `ClockCard` a déjà son `hour12` local — le réglage global devient sa
  valeur par défaut, sans casser les configurations existantes.

### [x] F2 — Code PIN de verrouillage du mode édition

> **Fait** — saisie dans [EditButton.tsx](../src/components/dashboard/EditButton.tsx).
> L'avertissement prévu est bien dans l'UI, en ambre : « garde-fou contre les
> manipulations accidentelles, pas une mesure de sécurité — le code est lisible
> depuis le navigateur ». La sécurité réelle reste `adminWrites` (`C1`).

- **Où** : [src/components/dashboard/EditButton.tsx](../src/components/dashboard/EditButton.tsx), settings par appareil
- **Quoi** : PIN à 4 chiffres, propre à l'appareil, demandé avant d'entrer en
  édition. Le cas d'usage tablette murale : empêcher qu'on casse la disposition
  par accident.
- **Attention** : ce n'est **pas** une mesure de sécurité (le PIN vit côté
  client) — c'est un garde-fou. La sécurité, c'est `C1`. Le libellé dans l'UI
  doit le dire.

### [x] F3 — Retour automatique à l'accueil

> **Fait** — `ReturnHomeWatcher` dans [Dashboard.tsx](../src/Dashboard.tsx),
> qui réutilise `useIdleDetector` tel quel. Referme aussi la fiche détaillée et
> le panneau ouverts : revenir à l'accueil en laissant une modale par-dessus ne
> ramènerait rien de visible.

- **Où** : [src/hooks/useIdleDetector.ts](../src/hooks/useIdleDetector.ts) (existe déjà), [src/hooks/usePageRouting.ts](../src/hooks/usePageRouting.ts)
- **Quoi** : après N minutes d'inactivité, revenir à la première page et fermer
  les modales. Réglage par appareil, désactivé par défaut. Le détecteur existe :
  il ne manque que le réglage et le branchement.

### [x] F4 — Thème automatique piloté par un capteur

> **Fait** — [useAutoTheme.ts](../src/hooks/useAutoTheme.ts). Le capteur, quand
> il est renseigné, l'emporte sur `sun.sun` : c'est un choix explicite de
> l'utilisateur, et plus précis que l'astronomie (le soleil ignore un ciel
> couvert, des volets fermés, une pièce sans fenêtre).
>
> **Une valeur illisible ne bascule rien.** Une entité absente ou `unavailable`
> — le cas au démarrage de Home Assistant — ne dit rien sur la luminosité ;
> choisir un thème au hasard ferait changer l'écran sous les yeux de
> l'utilisateur. Deux tests couvrent ce cas.
>
> `illuminanceThreshold` est **facultatif** : une configuration exportée avant
> la 2.2.0 ne le contient pas, et l'exiger aurait fait échouer son import.

- **Où** : [src/hooks/useAutoTheme.ts](../src/hooks/useAutoTheme.ts)
- **Quoi** : en plus de `sun.sun`, accepter une entité `illuminance` avec un
  seuil. Réutiliser le mécanisme de bascule existant.

### [x] F5 — « Appliquer à tous les appareils »

> **Fait** sur les deux backends. `POST /api/settings/broadcast` est le **seul
> point d'entrée de `/api/settings` réservé aux administrateurs** : écrire ses
> propres réglages n'engage que soi, les imposer à toute la maison est une autre
> affaire. Un test vérifie qu'un non-administrateur peut toujours régler *son*
> appareil — c'était le point de l'exemption d'origine.
>
> **La révision de chaque appareil est incrémentée**, ce que le plan ne
> demandait pas mais sans quoi le mécanisme se retournait contre lui-même : un
> appareil resté ouvert aurait réimposé silencieusement ses anciens réglages à
> sa prochaine écriture. Il reçoit maintenant un 409 et recharge.
>
> Écriture en transaction : à mi-parcours, la maison se retrouverait avec deux
> moitiés de configuration différentes.

- **Où** : [server/routes/settings.js](../server/routes/settings.js), [src/hooks/useSettingsSync.ts](../src/hooks/useSettingsSync.ts)
- **Problème** : tout est par `device_id`. Reconfigurer quatre tablettes se fait
  à la main, quatre fois.
- **Quoi** : `POST /api/settings/broadcast` qui recopie les réglages courants sur
  tous les `device_id` connus, avec confirmation explicite (action destructrice).
  Réservé aux administrateurs (cf. `C1`).

### [x] F6 — Mode « ne pas déranger »

> **Fait.** Une nuance non prévue : seules les notifications **passagères** sont
> masquées. Une notification persistante attend une action de l'utilisateur —
> l'escamoter la ferait disparaître sans que personne ne l'ait vue ni traitée.
>
> La lecture passe par `isDoNotDisturb()` sur le localStorage, comme
> `isSoundEnabled` : le fournisseur de notifications est monté **au-dessus** de
> `ThemeContext` et ne peut donc pas l'interroger.

- **Où** : [src/context/ToastContext.tsx](../src/context/ToastContext.tsx)
- **Quoi** : un interrupteur par appareil qui supprime les toasts. Écran de salon.

### [x] F7 — `tap_action` / `hold_action`

**Le meilleur rapport valeur/effort de la 2.2.0.**

> **Fait**, et bien moins coûteux que prévu : la plomberie `onClick` /
> `onLongPress` existait déjà dans `GridItem`, câblée en dur sur « ouvrir la
> fiche ». Il suffisait de rendre configurable **ce qu'elle fait**. Résultat :
> un seul point de branchement, les trente composants de card n'ont pas bougé
> d'une ligne.
>
> - [card-actions.ts](../src/types/card-actions.ts) — le vocabulaire de HA
> - [useCardActions.ts](../src/hooks/useCardActions.ts) — l'exécution
> - [ActionsTab.tsx](../src/components/layout/WidgetEditModal/ActionsTab.tsx) — l'onglet
>
> **Rétrocompatibilité** : l'action implicite est `default`, qui rend la main au
> comportement historique. Sans ce niveau supplémentaire, ajouter ces champs
> aurait changé le comportement de toutes les cards déjà posées. Remettre
> « Défaut » dans l'UI *efface* l'entrée au lieu de figer le comportement actuel.
>
> **`double_tap_action` non fait** : `MemoChildren` n'a pas de gestionnaire de
> double-clic, et l'ajouter oblige à retarder l'appui simple de ~250 ms pour les
> distinguer. Payer ce délai sur le geste le plus courant, pour un geste que
> presque personne ne configure, est un mauvais échange. À reprendre si le
> besoin apparaît — le délai ne coûterait rien tant qu'aucune action double
> n'est configurée. C'est le standard Home
Assistant, et il n'existe nulle part dans le code aujourd'hui.

- **Où** : [src/widgets/define-widget.ts](../src/widgets/define-widget.ts), [src/hooks/useLongPress.ts](../src/hooks/useLongPress.ts) (existe déjà), [src/types/widget-types.ts](../src/types/widget-types.ts)
- **Quoi** : trois champs communs à toutes les cards — `more-info`, `navigate`
  (page ou panneau), `call-service`, `url`, `none`. Un hook `useCardActions`
  branché sur `useLongPress`, un onglet « Actions » dans la modale d'édition.
- **Ordre** : après `D1`, ou au moins après avoir verrouillé les registres —
  ajouter trois champs communs est bien plus simple sur des manifestes.
- **Fait quand** : un appui long sur une card peut lancer un scénario.

### [x] F8 — Visibilité conditionnelle par card

> **Fait** — [card-visibility.ts](../src/types/card-visibility.ts) (évaluateur
> pur, testé isolément) + [VisibilityTab.tsx](../src/components/layout/WidgetEditModal/VisibilityTab.tsx),
> lu par `GridItem` comme les actions de `F7`.
>
> **Pas le moteur de templates, finalement.** Le plan proposait de le réutiliser,
> mais une comparaison d'état est une comparaison d'état : une fonction pure de
> quinze lignes, testable sans rendu ni connexion HA. Passer par le rendu de
> templates aurait ajouté une évaluation de chaîne à chaque changement d'entité,
> pour exprimer la même chose.
>
> **Deux conditions** : état d'entité (égal / différent) et taille d'écran.
> Cumulées, comme chez HA — un « ou » s'obtient en dupliquant la card (`E2`),
> plus lisible qu'un éditeur de booléens imbriqués.
>
> **Trois décisions qui évitent de faire disparaître une card par accident** :
> en mode édition elle reste visible et atténuée (sinon impossible de corriger
> sa condition) ; une entité absente du store masque au lieu d'afficher ; une
> condition laissée vide n'a aucun effet. Les champs « égal » et « différent »
> s'excluent à la saisie — cohabitants, la card ne s'afficherait jamais.

- **Où** : [src/lib/template-engine.ts](../src/lib/template-engine.ts) (existe déjà), rendu de la grille
- **Quoi** : équivalent de `visibility:` de HA — afficher une card selon l'état
  d'une entité, l'utilisateur connecté ou la taille d'écran. Le moteur de
  templates est déjà là : c'est brancher une condition sur le rendu.
- **Attention** : en mode édition, les cards masquées doivent rester **visibles
  et grisées**, sinon elles deviennent impossibles à modifier.
- **Dépend de** : `F7` (même onglet de configuration, même mécanique de champs
  communs).

### [x] F9 — Icône et couleur selon l'état

> **Fait, une fois `D1` terminé — et l'attente était justifiée.**
>
> L'objection initiale tenait : seules 6 cards sur 30 lisent `config.icon`, et un
> réglage sans effet sur les 24 autres aurait été pire que pas de réglage. Les
> manifestes lèvent exactement ça : `WIDGET_FIELD_DEFS[type]` dit maintenant de
> façon fiable si une card expose un champ « icône », et **le réglage n'apparaît
> que là**. C'est ce que les registres historiques ne permettaient pas de savoir.
>
> Deux réemplois plutôt que deux inventions :
> - l'évaluateur de conditions de `F8`, tel quel — une comparaison d'état est une
>   comparaison d'état, qu'elle décide d'afficher une card ou de la colorer ;
> - `WidgetConfigOverride`, qui existait pour les blocs de panneau : la card
>   reçoit sa config avec l'icône et la couleur de la règle par-dessus. **Aucun
>   des trente composants n'a bougé.**
>
> Un seul abonnement aux entités sert la visibilité *et* les styles d'état : ce
> sont le plus souvent les mêmes, et deux abonnements doubleraient les rendus.
>
> **La première règle satisfaite l'emporte**, pas la dernière : l'ordre de la
> liste est l'ordre de priorité, comme une suite de `if`. Une règle sans
> condition est ignorée — toujours satisfaite, elle masquerait toutes les
> suivantes et figerait l'affichage.

- **Où** : manifestes de widgets, [src/lib/lucide-icon-map.ts](../src/lib/lucide-icon-map.ts)
- **Quoi** : « si l'entité est `on` → icône X, couleur Y ». Aujourd'hui il faut
  une card template complète pour ça.
- **Dépend de** : `F8` (même évaluateur de condition — le réutiliser, ne pas en
  écrire un second).

### [ ] F10 — Sections repliables — **PAS FAIT, reporté en 2.3.0**

> ## ⚠️ La seule tâche de cette roadmap qui n'est pas implémentée.
>
> Rien n'a été écrit pour `F10` : ni type, ni composant, ni réglage. Le
> dashboard garde **une grille unique par page**, comme avant la 2.2.0.
>
> ### Pourquoi elle est restée dehors
>
> **Elle touche le format de configuration.** Toutes les autres tâches de cette
> version ajoutent des champs *facultatifs* : une config 2.1.x se charge telle
> quelle, et les nouveautés sont inertes tant que personne ne les configure.
> Les sections, non — elles changent la façon dont une page contient ses
> widgets. Il faut donc une migration de configuration, sur des installations
> en service, avec un chemin de retour si elle tourne mal.
>
> **Elle pèse plus lourd que tout le reste réuni.** Grille, glisser-déposer,
> compactage, breakpoints, undo, sélection multiple, visibilité conditionnelle :
> tout suppose aujourd'hui une seule grille par page. Les sections rendent
> chacun de ces mécanismes conditionnel à la section courante.
>
> **Le risque est mal placé dans cette version.** La 2.2.0 est une version de
> consolidation : historique de configuration, détection de conflits,
> écritures authentifiées, frontières d'erreur. Y glisser une migration de
> format irait à l'encontre de ce qu'elle cherche à établir.
>
> ### Ce qu'il faudra faire, le jour venu
>
> - **Prérequis rempli** : `B1` (historique de configuration) est en place. Une
>   migration de sections ratée est donc désormais rattrapable — c'était la
>   condition que le plan d'origine posait.
> - Étendre le format de page : une page contient des *sections*, une section
>   contient des widgets. Prévoir la migration « page plate → section unique »,
>   et son inverse.
> - Rendre `DashboardGrid` conscient des sections (une grille par section, pas
>   une pour la page).
> - Reprendre `undo` (`E1`), la sélection multiple (`E3`) et le compactage
>   (`packLayout`) : tous raisonnent sur `layout.widgets[bp]`, qui devient
>   ambigu.
> - En-têtes repliables, avec l'état de pliage **par appareil** (une tablette
>   murale et un téléphone n'ont pas les mêmes besoins) — donc dans
>   `behaviourSettings`, pas dans la configuration partagée.
>
> ### Alternative, si le besoin est surtout visuel
>
> Le widget `group` existe déjà et regroupe des cards dans une case. Il ne
> replie pas et ne s'étend pas sur toute la largeur, mais il couvre une partie
> du besoin sans toucher au format de configuration.

- **Où** : [src/components/layout/DashboardGrid.tsx](../src/components/layout/DashboardGrid.tsx), [src/context/DashboardLayoutContext.tsx](../src/context/DashboardLayoutContext.tsx)
- **Quoi** : équivalent du layout Sections de HA 2024.3 — des groupes titrés et
  repliables dans une page, au lieu d'une grille unique.

### [x] F11 — Badges en haut de page

> **Fait** — [PageBadges.tsx](../src/components/layout/PageBadges.tsx). Les
> badges sont portés par la **page**, donc par la configuration : ils suivent
> l'export, l'historique et la restauration comme le reste.
>
> Une entité absente du store s'affiche **grisée** plutôt que de disparaître :
> sinon l'utilisateur ne saurait pas que sa pastille pointe dans le vide.
> Hors édition, une page sans badge n'occupe aucune place.

- **Où** : [src/components/layout/PageTabs.tsx](../src/components/layout/PageTabs.tsx), nouveau composant
- **Quoi** : pastilles d'état compactes (présence, batteries faibles, alarme),
  façon HA 2024.8. Une rangée d'entités configurable par page.

### [x] F12 — Importer les thèmes Home Assistant

> **Fait** — [ha-themes.ts](../src/lib/ha-themes.ts) (conversion pure, testée) +
> `HAThemeImport`. Lecture par `frontend/get_themes` sur le WebSocket.
>
> **Un thème HA n'a aucun schéma** : chaque auteur définit les variables qu'il
> veut, rien n'est obligatoire. La conversion part donc du thème sombre et
> n'écrase que ce que le thème fournit réellement — un thème qui ne définit que
> `primary-color` donne un dashboard cohérent, avec juste l'accent changé.
> Trois tests couvrent le partiel, le vide et le nul.
>
> **`cardTint` est retiré** : il recompose la surface des cards depuis le
> curseur d'opacité, et garder celle du thème sombre rendrait le curseur
> incohérent avec la couleur importée.
>
> Le typage a été scindé — `BuiltInThemeId` garde `THEMES` exhaustif, `ThemeId`
> ajoute `'ha'`, dont les tokens viennent de l'installation et non du build.

- **Où** : [src/config/themes.ts](../src/config/themes.ts), [src/context/ThemeContext.tsx](../src/context/ThemeContext.tsx)
- **Quoi** : les thèmes HA sont des variables de style ; les lire via le
  WebSocket (`frontend/get_themes`) donne une cohérence gratuite avec le reste
  de l'installation.

---

## Hors périmètre (décidé, ne pas rouvrir)

- Système de greffons tiers
- Éditeur YAML brut
- Multi-locataire / plusieurs foyers

Trois usines à gaz pour un dashboard familial.

---

## Sortie de version

1. `npm run check:widgets && npm run type-check && npm run lint && npm run test:run`
2. `npm run test:e2e:dashboard`
3. Ajouter l'entrée `2.2.0` **en tête** de [src/data/release-notes.ts](../src/data/release-notes.ts)
   — c'est elle qui déclenche la fenêtre « Nouveautés », et `create-tag`
   prévient si elle diverge du tag
4. Vérifier la migration depuis une DB 2.1.x réelle (cf. `A1`)
5. `npm run create-tag -- --minor` depuis `main`, arbre propre

**Ne jamais** éditer `config.yaml` ni taguer à la main.
