# Roadmap — la maison en 3D

Fichier de suivi de la page **Plan** en 3D, sur la branche `feat/plan-maison-3d`.
Chaque tâche a un identifiant stable (`A1`, `B2`…) : dire « fais `C2` » suffit à
reprendre le travail dans une nouvelle session, sans contexte.

**Règles de tenue du fichier**

- Cocher `[x]` **au moment du commit**, pas avant.
- Si une tâche est abandonnée : `[~]` + une ligne « abandonné parce que … ».
- Si une tâche révèle un travail non prévu, l'ajouter en bas de sa phase avec
  l'identifiant suivant libre.
- Ne pas réécrire l'historique des tâches faites.

**Ordre** — du plus attendu au plus lourd. `A1` sert de socle à plusieurs
phases (animations, découpe de la maquette) ; `D1` demande les pièces de `C1`.
Le reste est indépendant.

**État global** : **7 tâches sur 21** — `E1` et `G1`, passées en priorité, puis la phase A.

---

## Déjà livré

- [x] Page **Plan** : une image du logement, des pastilles et des cards posées
  dessus, halos des lampes, assombrissement la nuit, onglets réordonnables.
- [x] **Maquette 3D** (`.glb`) à la place de l'image : rotation, soleil de
  `sun.sun` avec ombres, lampes qui éclairent de leur couleur, pastilles
  accrochées à la maquette, vue d'accueil enregistrable.
- [x] **Téléversement** du `.glb` (onglet Fichier), dans l'add-on comme dans
  l'intégration.
- [x] **Démo** : `vite --mode mock` affiche une page « Maison 3D » toute prête.

## Repères techniques

- **Où vit le code** : [Floorplan3D.tsx](../src/components/floorplan/Floorplan3D.tsx)
  (scène three.js, chargée à la demande), [FloorplanView.tsx](../src/components/floorplan/FloorplanView.tsx)
  (la page, l'édition, les pastilles en DOM par-dessus), [floorplan.ts](../src/lib/floorplan.ts)
  (calculs purs, testés).
- **Coordonnées** : tout ce qui est posé sur la maquette (pastilles, éléments,
  pièces) est stocké dans les coordonnées de la maquette elle-même, pas de la
  scène — elles survivent à un changement de taille d'écran ou de cadrage.
- **Rendu à la demande** : une image quand quelque chose change, jamais en
  continu. Une animation (porte qui s'ouvre, caméra qui vole) demande des
  images tant qu'elle dure, puis s'arrête.
- **Maquettes « fondues »** : celle des tests n'a que 5 objets, un par
  matière — portes, murs et fenêtres ne font qu'un. Rien n'y est sélectionnable
  individuellement : les éléments animés sont **dessinés** (deux coins cliqués)
  et remplacent la partie correspondante de la maquette, qu'on découpe.

---

## Phase A — Portes, fenêtres et volets animés

### [x] A1 — Socle : animations et découpe de la maquette

> **Fait** : la boucle d'animation (livrée avec `G1`), et les découpes de
> [modelPatch.ts](../src/components/floorplan/modelPatch.ts) — vérifiées sur une
> porte, une fenêtre et une porte de garage de la maquette de test. L'original
> découpé ne porte plus d'ombre ; un élément généré est coupé par les murets
> comme la maquette, mais pas par sa propre découpe.

- **Où** : [Floorplan3D.tsx](../src/components/floorplan/Floorplan3D.tsx)
- **Quoi** :
  - des transitions : tant qu'une animation tourne, une image par frame, puis
    retour au rendu à la demande ;
  - des **découpes** : boîtes dans lesquelles la maquette n'est pas dessinée
    (matériaux modifiés par `onBeforeCompile`). C'est ce qui permet de
    remplacer une porte fondue dans le mur par un battant qui s'ouvre.
- **Fait quand** : une découpe posée à la main fait disparaître un morceau de
  mur dans le mock, sans toucher au reste.

### [x] A2 — Poser un élément animé

> **Fait.** La fenêtre de réglage s'ouvre à côté de l'élément, pas dessus : on
> voit l'aperçu, entrouvert, pendant qu'on choisit. L'entité d'abord — le type
> en est deviné (`device_class`) ; le côté part de celui qu'on regarde ; la
> couleur est prise sur la maquette, au centre de l'ouverture. Interface dans
> [FloorplanParts.tsx](../src/components/floorplan/FloorplanParts.tsx).

- **Où** : [FloorplanView.tsx](../src/components/floorplan/FloorplanView.tsx), [PageContext.tsx](../src/context/PageContext.tsx)
- **Quoi** : en édition, un outil « Porte / volet » à côté de « Pastille ».
  Deux clics sur la maquette : le coin bas **côté gonds**, puis le coin haut
  opposé. Ensuite : le type (porte, fenêtre, volet roulant, porte de garage),
  l'entité (`cover`, `binary_sensor`), le côté (vers où la porte s'ouvre, de
  quel côté du mur est le volet). La liste des éléments posés permet de les
  retirer. Stockés dans `floorplan.parts`.
- **Fait quand** : poser, voir l'aperçu, enregistrer, recharger — l'élément
  est toujours là ; une config mal formée est ignorée, pas fatale.

### [x] A3 — Portes et fenêtres qui s'ouvrent

> **Fait** ([parts3d.ts](../src/components/floorplan/parts3d.ts)) : porte avec
> ses poignées, fenêtre avec son cadre et sa vitre, pivotant sur les gonds du
> premier coin cliqué, en 0,9 s. Vérifié ouverte et fermée sur la maquette.

- **Quoi** : un battant généré, de la couleur de la maquette à l'endroit
  cliqué (verre teinté pour une fenêtre) ; l'original est découpé. Le battant
  pivote sur ses gonds selon l'état : `on`/`off` d'un capteur d'ouverture, ou
  la position d'un `cover`. Transition douce, ombres portées.
- **Fait quand** : basculer le capteur dans le mock ouvre et ferme la porte.

### [x] A4 — Volets roulants et porte de garage

> **Fait** : lames d'une texture générée, qui gardent leur taille quand le
> tablier s'enroule ; coffre au-dessus du volet. Garage : larges lames, dans
> l'ouverture découpée.

- **Quoi** : un tablier à lames devant l'ouverture, qui descend selon
  `current_position` (coffre en haut). Porte de garage : l'original est
  découpé et le tablier remonte dans l'ouverture.
- **Fait quand** : régler la position d'un volet du mock le fait descendre
  d'autant.

### [x] A5 — Démonstration et test

> **Fait**, à un écart près : le mock ne sait pas changer l'état d'une entité
> pendant un test. Le test E2E dessine donc une porte, vérifie le type deviné et
> la retrouve dans la config enregistrée ; l'ouverture et la fermeture ont été
> vérifiées à l'écran. Démo : une porte ouverte, un volet à mi-hauteur, une
> fenêtre ouverte.

- **Quoi** : la maison du mock reçoit une porte, une fenêtre et un volet ; un
  test E2E pose un élément et le voit changer d'état.

### [ ] A6 — Viser les coins sans tâtonner

- **Pourquoi** : révélé en testant. Deux clics au jugé tombent vite à côté —
  sur le frigo devant la porte, sur le mur au-dessus. Le battant est alors trop
  grand, ou la découpe mord dans le mur.
- **Quoi** : pendant le dessin, le rectangle suit la souris entre le premier
  coin et le pointeur ; une fois posé, ses coins se reprennent à la souris.

---

## Phase B — Un ciel vivant

### [ ] B1 — Le ciel suit le soleil

- **Quoi** : derrière la maquette, un dégradé qui dépend de l'élévation du
  soleil : nuit, aube orangée, jour, crépuscule — et des étoiles la nuit.
  Option par page (le fond du thème reste possible).
- **Fait quand** : fonction de couleurs testée, rendu vérifié à quatre heures
  de la journée.

### [ ] B2 — La lumière suit l'heure et la météo

- **Quoi** : soleil doré bas sur l'horizon ; par temps couvert, soleil voilé,
  ombres adoucies, ambiance plus diffuse. Entité météo choisie, ou la
  première trouvée.

### [ ] B3 — Pluie, neige, orage

- **Quoi** : une couche animée en CSS par-dessus la maquette — la maquette,
  elle, n'est pas redessinée. Éclairs par temps d'orage. Coupée en économie
  d'énergie et quand les animations sont réduites.

---

## Phase C — Des pièces qui s'allument

### [ ] C1 — Dessiner les pièces

- **Quoi** : un outil « Pièce » : des clics au sol forment le contour, un
  nom, et c'est enregistré (`floorplan.rooms`). Liste, suppression.

### [ ] C2 — La lumière reste dans sa pièce

- **Quoi** : chaque lampe n'éclaire que la pièce qui contient son point
  d'accroche — fin du débordement à travers les murs. Même socle que `A1`
  (matériaux modifiés).

### [ ] C3 — Vue thermique

- **Quoi** : un bouton en consultation colore chaque pièce selon sa
  température (le capteur posé dans la pièce, détecté), du bleu au rouge, la
  valeur au centre.

---

## Phase D — Vol vers une pièce

### [ ] D1 — Toucher une pièce

- **Quoi** : la caméra s'y approche en douceur, les pastilles des autres
  pièces s'estompent ; retour par un bouton, Échap ou un toucher ailleurs.
- **Dépend de** : `C1`.

---

## Phase E — Murs en coupe

### [x] E1 — Les murs côté caméra s'abaissent

> **Fait**, façon Les Sims plutôt qu'en coupe plane : une première version
> tranchait la maison par un plan passant par son centre — murs creux, bouts
> de cadres de fenêtres, cloison coupée net au milieu d'une pièce. Désormais,
> seuls les deux murs extérieurs du fond (les côtés de l'emprise tournés dos à
> la caméra) restent debout ; tout le reste est abaissé à 38 % de la hauteur,
> juste au-dessus des plans de travail — plus bas, tables et plans de travail
> étaient coupés aussi : la maquette de test fond murs et meubles, un objet
> par matière. La tranche est peinte d'un gris bleuté sombre. Les murs
> **glissent** (≈ 0,4 s) quand la caméra tourne, avec une marge au seuil pour
> ne pas osciller ; la maison « s'ouvre » au chargement. Coupe faite dans les
> shaders ([modelPatch.ts](../src/components/floorplan/modelPatch.ts)), ombres
> comprises. Activée par défaut, décochable dans « Maquette 3D ». Au passage,
> l'ambiance est un peu plus claire : on voit désormais l'intérieur des pièces.

- **Quoi** : tout ce qui dépasse d'environ un mètre, du côté de la caméra,
  n'est pas dessiné (plans de coupe natifs de three.js) ; la coupe suit la
  caméra. Aucune reconnaissance des murs nécessaire : ça marche sur toute
  maquette. Option par page ; la caméra peut alors descendre plus bas.

### [ ] E2 — Les pastilles se cachent derrière les murs

- **Quoi** : une pastille dont le point est masqué par la maquette (hors
  partie coupée) disparaît. Recalculé quand la caméra s'arrête, pas à chaque
  image.

---

## Phase F — Boussole

### [ ] F1 — La maison s'oriente comme le téléphone

- **Quoi** : un bouton boussole, sur téléphone seulement. La maison tourne
  pour que ce qui est devant soi à l'écran le soit en vrai. Mouvement lissé ;
  tourner la maison au doigt coupe le mode. Masqué si l'appareil ne donne pas
  son orientation.
- **Attention** : dans l'appli Home Assistant, Android seulement et très
  probablement en HTTPS ; l'appli iPhone ne transmet pas l'orientation.
- **Fait quand** : calcul du cap testé ; essayé sur un Android (par toi).

---

## Phase G — Petits plus

### [x] G1 — La maison tourne au repos

> **Fait** : un tour en deux minutes, une image sur deux (30 par seconde) pour
> ménager la tablette. Option « Tourner au repos », activée dans la démo du
> mock ; jamais en édition ni en économie d'énergie.

- **Quoi** : option : après une minute sans toucher, la maison tourne
  lentement ; le moindre geste l'arrête. Coupé en économie d'énergie.

### [ ] G2 — Un halo qui respire

- **Quoi** : un détecteur de mouvement ou de présence déclenché fait pulser
  un halo sous sa pastille (CSS, en 2D comme en 3D).

### [ ] G3 — Lueur des lampes

- **Quoi** : option : une lueur autour de chaque lampe allumée, de sa
  couleur.

---

## Phase H — Rejouer la journée

### [ ] H1 — Le soleil calculé

- **Quoi** : position du soleil calculée depuis la latitude et la longitude
  de Home Assistant, pour n'importe quelle heure. Testée contre des valeurs de
  référence.

### [ ] H2 — Le curseur des 24 heures

- **Quoi** : un curseur rejoue les 24 dernières heures d'après l'historique
  (`history/history_during_period`) : soleil, ombres, lampes, portes,
  volets. Lecture accélérée. Historique simulé dans le mock.
