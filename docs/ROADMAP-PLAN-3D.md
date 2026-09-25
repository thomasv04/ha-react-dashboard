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

**État global** : **36 tâches sur 39** — phases A à H et J, `I1` et `I2`. `F1` reste à essayer sur un vrai Android.

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

### [x] A6 — Viser les coins sans tâtonner

> **Fait** : un rectangle ambre suit la souris du premier coin au pointeur,
> dessiné par-dessus tout ; une fois l'élément posé, deux poignées reprennent
> ses coins — le rectangle suit le glisser, l'élément se redessine au lâcher.
> La fenêtre de réglage passe au-dessus de la barre d'outils.

- **Pourquoi** : révélé en testant. Deux clics au jugé tombent vite à côté —
  sur le frigo devant la porte, sur le mur au-dessus. Le battant est alors trop
  grand, ou la découpe mord dans le mur.
- **Quoi** : pendant le dessin, le rectangle suit la souris entre le premier
  coin et le pointeur ; une fois posé, ses coins se reprennent à la souris.

---

## Phase B — Un ciel vivant

### [x] B1 — Le ciel suit le soleil

> **Fait** : dégradé et étoiles en CSS, derrière le canevas transparent — rien
> de plus à dessiner pour WebGL. Vérifié de nuit, au crépuscule, à l'heure
> dorée et de jour. Option « Ciel », active par défaut. Le mock a désormais un
> `sun.sun` (début d'après-midi).

- **Quoi** : derrière la maquette, un dégradé qui dépend de l'élévation du
  soleil : nuit, aube orangée, jour, crépuscule — et des étoiles la nuit.
  Option par page (le fond du thème reste possible).
- **Fait quand** : fonction de couleurs testée, rendu vérifié à quatre heures
  de la journée.

### [x] B2 — La lumière suit l'heure et la météo

> **Fait** : soleil orangé à l'horizon, doré, puis blanc chaud ; sa force ne
> chute qu'au ras de l'horizon (en sinus, un soleil rasant ne dorait rien).
> Nuages d'après l'état de l'entité météo (`cloudiness`, testée) : soleil
> voilé et décoloré, ombres adoucies et pâlies, ciel grisé, étoiles cachées.
> Entité choisie dans « Maquette 3D », ou la première trouvée.

- **Quoi** : soleil doré bas sur l'horizon ; par temps couvert, soleil voilé,
  ombres adoucies, ambiance plus diffuse. Entité météo choisie, ou la
  première trouvée.

### [x] B3 — Pluie, neige, orage

> **Fait** : tuiles SVG que le compositeur fait défiler (un cycle = une tuile,
> dans la pente des gouttes : la boucle ne se voit pas) ; flocons qui
> tanguent ; éclairs par temps d'orage. Coupé en économie d'énergie, en
> mouvement réduit, quand les animations sont réduites et sous l'écran de
> veille.
>
> **Puis** ([FloorplanWeather.tsx](../src/components/floorplan/FloorplanWeather.tsx)) :
> rien de réglé d'avance. Chaque averse sème ses gouttes, ses flocons, ses
> grêlons au hasard ; chaque calque part d'un point de sa course, à sa
> vitesse ; la pluie forcit et faiblit ; l'orage frappe quand il veut, d'un à
> trois éclairs de force inégale, toutes les 4 à 14 s. La grêle a ses
> grêlons, droits et rapides, sur un peu de pluie. Quand il gèle dehors
> (température de l'entité `weather`), le givre gagne les coins : il paraît
> sous 1 °C et couvre tout ce qu'il peut à −5 °C — immobile, il reste même
> sans animations. Tout glisse en `transform` ou change d'opacité (Web
> Animations) : le compositeur l'anime seul.

- **Quoi** : une couche animée en CSS par-dessus la maquette — la maquette,
  elle, n'est pas redessinée. Éclairs par temps d'orage. Coupée en économie
  d'énergie et quand les animations sont réduites.

---

## Phase C — Des pièces qui s'allument

### [x] C1 — Dessiner les pièces

> **Fait** : chaque clic pose un sommet, le contour suit la souris ; recliquer
> le premier sommet (ou Entrée) ferme la pièce, qu'on nomme. Le sol de la pièce
> est le plus bas des points cliqués — un clic sur un meuble ne le soulève
> pas. En édition, contour bleu et nom au centre. Tracés au sol génériques
> (`floors`) : ils serviront à la vue thermique et au vol vers une pièce. La
> démo a ses six pièces ; test E2E : trois clics, un nom, enregistrée.

- **Quoi** : un outil « Pièce » : des clics au sol forment le contour, un
  nom, et c'est enregistré (`floorplan.rooms`). Liste, suppression.

### [x] C2 — La lumière reste dans sa pièce

> **Fait** : dans la boucle des lampes du shader d'éclairage de three.js,
> chaque lampe est multipliée par un masque — 1 dans sa pièce, puis s'éteignant
> sur 0,8 unité au-delà du contour, de quoi éclairer la face des murs. Une lampe
> tenue à sa pièce l'éclaire jusqu'au coin le plus loin. Sans pièce, rien ne
> change. 16 lampes et 16 sommets par pièce au plus. Vérifié de nuit dans la
> démo : plus rien ne passe les cloisons.

- **Quoi** : chaque lampe n'éclaire que la pièce qui contient son point
  d'accroche — fin du débordement à travers les murs. Même socle que `A1`
  (matériaux modifiés).

### [x] C3 — Vue thermique

> **Fait** : un bouton thermomètre, à côté de « Recentrer », dès qu'une pièce
> a une température — la moyenne des capteurs de température posés dedans
> (classe `temperature`, °C ou °F). Pièces colorées du bleu (16°) au rouge
> (26°), valeur au centre ; les pastilles de ces capteurs s'effacent le temps
> de la vue, leur valeur est dans la pièce. Démo : un capteur par pièce.

- **Quoi** : un bouton en consultation colore chaque pièce selon sa
  température (le capteur posé dans la pièce, détecté), du bleu au rouge, la
  valeur au centre.

---

## Phase D — Vol vers une pièce

### [x] D1 — Toucher une pièce

> **Fait** : la caméra vole jusqu'à la pièce en une seconde — elle tourne
> autour de sa cible en s'approchant, sans traverser la maison — et la cadre
> entière, en plongée. Les pastilles des autres pièces s'estompent et laissent
> passer le toucher : en toucher une mène à sa pièce. Retour à la vue de
> départ par le bouton « ‹ Pièce », Échap (sauf fiche ouverte) ou un toucher
> hors des pièces ; tourner la maison à la main interrompt le vol. Un meuble
> contre le mur, le mur lui-même comptent : à défaut du point touché, c'est la
> pièce dont le sol est sous le doigt.

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

### [x] E2 — Les pastilles se cachent derrière les murs

> **Fait** : une fois la scène posée (¼ s sans nouvelle image), un rayon par
> pastille, de la caméra à son point d'accroche ; ce que la maquette ne dessine
> plus — murs abaissés, originaux des portes remplacées — ne cache rien. Une
> pastille cachée s'efface en fondu et laisse passer le toucher. Un rayon
> traverse toute la maquette (5 ms sur un PC, davantage sur une tablette) :
> ils sont répartis sur plusieurs images, 4 ms au plus par image. Pendant la
> rotation au repos, la caméra ne s'arrête jamais : l'état reste celui du
> dernier arrêt. Rien ne se cache en édition, où il faut tout pouvoir
> attraper. Démo : la pastille de la cuisine, posée dans l'îlot, remontée
> dessus.

- **Quoi** : une pastille dont le point est masqué par la maquette (hors
  partie coupée) disparaît. Recalculé quand la caméra s'arrête, pas à chaque
  image.

### [x] E3 — Un fondu tramé plutôt qu'une coupe franche

> **Fait** ([modelPatch.ts](../src/components/floorplan/modelPatch.ts)) : au-dessus
> de la coupe, un mur ne s'arrête plus net ; il s'efface sur 12 % de la
> hauteur de la maquette, une part de ses pixels gardée, de moins en moins en
> montant — un tramage de Bayer 4 × 4 posé sur les pixels de l'écran, sans
> transparence à trier. Un meuble d'une maquette ExportToHASS (ni mur, ni sol,
> ni logé dans un mur, ni nommé comme une ouverture : un volet est posé devant
> le mur) n'est plus tranché : sa partie haute reste en fantôme, un pixel sur
> trois, qu'on reconnaît et au travers duquel on voit. Ses ombres restent
> entières ; celles des murs gardent la coupe franche. Juste sous la coupe, la
> tranche sombre s'estompe elle aussi : vue au travers du fondu, elle en
> piquetait le bas de points noirs ; vue d'en haut, plus profonde, elle reste.
> Une bande de 18 % faisait, sur les murs sombres de la démo, une fumée
> au-dessus des cloisons. La maquette synthétique a désormais son armoire
> bleue, haute de 2 m.

- **Quoi** : l'effet « Dithering Fade » des jeux, à la place de la coupe :
  surtout, qu'un meuble haut — l'armoire bleue de la maison — ne soit plus
  coupé en deux.

---

## Phase F — Boussole

### [x] F1 — La maison s'oriente comme le téléphone

> **Fait**, reste l'essai sur un Android (par toi). Le bouton boussole paraît
> sur téléphone dès que l'appareil donne son orientation absolue
> (`deviceorientationabsolute` : Chrome et l'appli Android, en HTTPS) ;
> l'iPhone ne la donne pas, le bouton n'y paraît pas. Le cap est celui du haut
> de l'écran : `360 − alpha`, plus l'angle de l'écran en paysage — ni
> l'inclinaison ni le roulis n'y changent rien tant que le téléphone n'est
> pas à la verticale. Le nord de la maquette (réglage « Nord ») est pris en
> compte. La caméra suit en douceur (¼ s) et ne bouge pas en deçà d'un degré,
> car le capteur tremble. Tourner la maison au doigt coupe le mode, un
> pincement aussi pour l'instant ; « Recentrer » de même. Pas de rotation au
> repos pendant ce temps. Test E2E avec des événements simulés : face au sud,
> puis à l'est, la maison se retourne. Si le cap paraît décalé de 90° en
> paysage, c'est le signe de l'angle de l'écran.

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

### [x] G2 — Un halo qui respire

> **Fait** : une lueur ambre respire sous la pastille d'un détecteur de
> mouvement, d'occupation ou de présence déclenché (`isPresence`, testée), en
> 2D comme en 3D. Opacité et échelle en CSS : le compositeur l'anime seul, la
> maquette n'est pas redessinée. Mouvement réduit ou économie d'énergie : la
> lueur reste, immobile. Posée dans la pastille, elle aurait été rognée par la
> case du widget : elle est sous elle, sur le plan — pas sur une page grille.

- **Quoi** : un détecteur de mouvement ou de présence déclenché fait pulser
  un halo sous sa pastille (CSS, en 2D comme en 3D).

### [x] G3 — Lueur des lampes

> **Fait** : option « Lueur des lampes » (activée dans la démo). Une tache
> douce de la couleur de la lampe, posée au point de sa pastille, qui déborde
> tout autour — son cœur est sous la pastille. Additive, hors du rendu tonal :
> elle se voit surtout la nuit, comme une vraie. Sans test de profondeur,
> sinon la surface où elle est posée la couperait en deux ; elle disparaît
> avec sa pastille quand la maquette la cache (`E2`). Une première version,
> à la hauteur de la lumière, flottait loin au-dessus de la pastille, sur un
> mur déjà éclairé : on ne la voyait pas.

- **Quoi** : option : une lueur autour de chaque lampe allumée, de sa
  couleur.

---

## Phase H — Rejouer la journée

### [x] H1 — Le soleil calculé

> **Fait** : `sunPosition(date, latitude, longitude)`, dans
> [floorplan.ts](../src/lib/floorplan.ts) — l'algorithme de SunCalc, élévation
> et azimut comme `sun.sun`. Comparée à astral 2.2, la bibliothèque dont HA
> tire `sun.sun`, sur sept cas (jour, nuit, hémisphère sud, soleil de minuit,
> équateur) : à 0,15° près en élévation, 0,4° en azimut — sauf près du
> zénith, où l'azimut ne veut plus rien dire. Sans la réfraction, qu'ajoute
> HA : un quart de degré au ras de l'horizon. La latitude et la longitude de
> HA sont lues par `H2`, qui s'en sert ; pas de repli quand `sun.sun` manque,
> l'intégration fait partie de `default_config`.

- **Quoi** : position du soleil calculée depuis la latitude et la longitude
  de Home Assistant, pour n'importe quelle heure. Testée contre des valeurs de
  référence.

### [x] H2 — Le curseur des 24 heures

> **Fait** : un bouton « Rejouer les dernières 24 heures », à côté de
> « Recentrer », ouvre une barre de lecture : lecture accélérée (une
> demi-heure par seconde, la journée en 48 s), curseur, heure. Le soleil est
> celui de l'instant rejoué, calculé au lieu de HA (`H1`) : ciel, ombres et
> étoiles suivent. Lampes, portes, fenêtres et volets rejouent leur historique
> (`history/history_during_period`, attributs compris : luminosité,
> position) — lu par `stateAt`, testée ; sans historique, ils restent dans
> leur état du moment. Pendant la relecture, pastilles et cards, qui montrent
> le présent, s'estompent, et la vue thermique se retire. Échap ou le bouton
> reviennent au direct. Mock : une journée simulée — lampes au réveil et le
> soir, porte ouverte à midi, volet fermé la nuit. En mode mock toujours, un
> curseur « Soleil (démo) », dans « Maquette 3D », règle l'heure du soleil
> sans relecture (demandé en cours de route).

- **Quoi** : un curseur rejoue les 24 dernières heures d'après l'historique
  (`history/history_during_period`) : soleil, ombres, lampes, portes,
  volets. Lecture accélérée. Historique simulé dans le mock.

---

## Phase I — L'énergie qui circule

Idée venue d'une capture de référence : panneaux solaires, borne et batterie
reliés par des flux animés. Là-bas, des traits plats posés sur une image ;
ici, des câbles tracés sur la maquette elle-même, qui suivent le sol, les
murs, le toit, tournent avec la maison et passent derrière les murs.

### [x] I1 — Tracer un câble

> **Fait** : outil « Câble » en édition. Chaque clic sur la maquette pose un
> point ; Entrée, ou un clic sur le dernier point, finit le câble. Reste à
> choisir son entité : sa sorte en est devinée d'après son nom — chez Zendure,
> « solarflow » est la batterie, pas ses panneaux —, et le sens s'inverse d'un
> bouton. Pendant qu'on choisit, le câble s'anime déjà : on voit son sens.
> Liste, suppression ; `floorplan.cables`.

- **Quoi** : un outil « Câble » en édition. Clics successifs sur la maquette
  (sol, murs, toit), Entrée pour finir ; l'entité de puissance (W ou kW), le
  type (solaire, réseau, batterie, voiture, maison) qui en fixe la couleur,
  le sens. Liste, suppression. Stocké dans `floorplan.cables`.

### [x] I2 — L'énergie circule

> **Fait** : le câble est un tube de la scène
> ([cables3d.ts](../src/components/floorplan/cables3d.ts)), posé au sol, gaine
> graphite satinée, coudes arrondis. Éclairé par le soleil et les lampes, il
> porte son ombre, passe derrière les murs et sous les meubles. Le courant y
> court en traits lumineux de la couleur de sa sorte — celles de la card
> « Flux d'énergie » —, dans le sens du flux : signe de la puissance, ou
> charge et décharge de la batterie, codes `1`/`2` compris. Plus le courant
> est fort, plus ils vont vite ; au repos, la gaine seule. La puissance
> s'écrit à mi-longueur. Une première version dessinait les câbles en SVG
> par-dessus le canevas : un trait plat posé sur une image photoréaliste,
> abandonnée. L'animation tourne à 30 images par seconde sans recalculer les
> ombres ni recaler les pastilles ; les ombres ne sont plus recalculées non
> plus quand seule la caméra bouge. Coupée par « Réduire les animations » et
> le mouvement réduit. Démo : le circuit d'une SolarFlow — solaire, réseau,
> maison —, son niveau de batterie au point de jonction.

- **Quoi** : le câble, un fin tube posé sur la maquette, porte des impulsions
  lumineuses qui avancent dans le sens du flux (signe de la puissance),
  d'autant plus vite et serrées que la puissance est forte ; éteint à 0 W. La
  valeur en clair, au milieu du câble.
- **Attention** : c'est la seule animation continue — le soleil produit toute
  la journée. Vingt images par seconde, sans recalculer les ombres ; figée en
  économie d'énergie.

### [ ] I3 — Panneaux solaires

- **Quoi** : un élément « panneau solaire », dessiné comme une porte (deux
  coins, sur le toit ou au sol) : un champ de cellules généré, qui s'illumine
  avec la production. Pour une maquette qui n'a pas les siens.

### [ ] I4 — Rejouer l'énergie

- **Quoi** : la relecture des 24 heures (`H2`) rejoue aussi les flux, d'après
  l'historique des capteurs de puissance — la production qui monte à midi.

### [ ] I5 — Les sources du tableau Énergie

- **Quoi** : proposer d'abord les entités déclarées dans le tableau Énergie
  de HA (`energy/get_prefs`) : solaire, réseau, batterie.
- **Démo** : un circuit dans le mock — panneaux à côté de la maison, batterie,
  borne de recharge.

---

## Phase J — Les ouvertures de la maquette

Une maquette exportée de Sweet Home 3D avec le plugin
[ExportToHASS](https://github.com/adizanni/ExportToHASS) garde chaque porte,
chaque fenêtre en objets séparés, jusqu'à leurs parties mobiles. Plutôt que de
les dessiner (`A2`), on anime les vraies : le battant pivote sur ses gonds, les
panneaux d'une baie glissent. Le dessin reste pour les maquettes « fondues ».

**Ce que donne l'export** — `home.glb`, ta maison, gardée hors du dépôt, en est
un : des nœuds à plat, un maillage chacun, en centimètres, sans
transformation. Murs `wall_<n>_<face>`, sols `room_<niveau>_<n>`. Chaque
objet donne `<Nom>_<composant>`, puis `<Nom>_<composant>_<k>` quand le nom
revient — `k` compte les reprises dans tout le fichier. Un nom hors de
`[A-Za-z0-9_]` (un accent suffit) est abandonné : il ne reste que le numéro du
composant (`1_2`, `6_3`), inutilisable. Un `#` final fond tous les composants
en un seul : le battant n'est plus séparable du cadre.

**Nomenclature**, dans Sweet Home 3D (double-clic sur l'objet, champ « Nom ») :
un nom unique par ouverture, dont le premier mot donne le type —
`Porte_Cuisine`, `Baie_Salon`, `Fenetre_Chambre`, `Volet_Salon`, `Garage`.
Sans accent, sans `#` ; un nombre final est toléré (`J10`). Unique, il reste
stable d'un export à l'autre : avec un nom partagé, supprimer une porte décale
le `k` des suivantes, et leurs liaisons avec. Le plugin, lui, reste tel quel.

### [x] J1 — Les réglages en onglets

> **Fait** ([FloorplanSettings.tsx](../src/components/floorplan/FloorplanSettings.tsx)) :
> un seul onglet ouvert à la fois ; un second clic le referme, et la maquette
> retrouve sa place. Outils et indication restent en bas. L'image du plan, qui
> ne sert plus qu'à la place de la maquette, se choisit dans l'onglet
> « Maquette ». Un plan en image garde son panneau d'avant.

- **Où** : [FloorplanView.tsx](../src/components/floorplan/FloorplanView.tsx)
- **Quoi** : le panneau « Maquette 3D » empilait une quinzaine de contrôles.
  Quatre onglets : **Maquette** (fichier ou image, nord, vue d'accueil, murs
  en coupe, rotation au repos), **Ambiance** (ciel, lueur des lampes, météo,
  soleil du mock), **Ouvertures** (portes et volets dessinés, puis `J5`),
  **Éléments** (pièces, câbles). La barre « Poser » reste en bas, toujours
  visible ; le panneau a une hauteur bornée et défile.
- **Fait quand** : chaque réglage d'avant est dans son onglet ; les tests E2E
  suivent.

### [x] J2 — Reconnaître les ouvertures

> **Fait** ([floorplan-openings.ts](../src/lib/floorplan-openings.ts), un module
> à part : un gros morceau, sans rapport avec le reste du plan). Sur `home.glb` :
> les cinq `Porte_en_bois`, cinq composants chacune, la
> `Porte_coulissante_grise`, huit ouvertures sans nom valide logées dans les
> murs ; télévision et canapé laissés de côté. « Logé dans un mur » se juge au
> milieu de la plus large pièce de l'objet, son cadre : un battant entrouvert
> fait déborder l'ensemble. Un centimètre se déduit de la taille de la
> maquette — Blender exporte en mètres.

- **Où** : [floorplan-openings.ts](../src/lib/floorplan-openings.ts)
- **Quoi** : les nœuds lus au chargement. La famille d'après le nom, puis les
  occurrences par géométrie : boîtes qui se touchent (union-find), au sein
  d'une même famille — une armoire collée au chambranle n'est jamais prise
  pour la porte. Murs et sols écartés ; objets sans nom valide comptés, pour
  un avertissement ; type deviné d'après le premier mot du nom ; familles
  logées dans un mur, les ouvertures probables.
- **Fait quand** : sur `home.glb`, les cinq `Porte_en_bois` et la
  `Porte_coulissante_grise` sont retrouvées, les ouvertures sans nom
  comptées, canapé et télévision laissés de côté. Tests unitaires.

### [x] J3 — Gonds et glissières

> **Fait**, vérifié sur `home.glb` : chaque `Porte_en_bois`, entrouverte de
> 56°, se referme sur la fine baguette de ses gonds ; la porte d'entrée tourne
> à l'opposé de sa poignée, vers l'intérieur ; chaque fenêtre, sur ses
> charnières, du côté de sa poignée. Sa « porte-fenêtre » est en fait une baie
> coulissante — deux vantaux sur deux rails, poignées aux montants — : un
> vantail glisse sur l'autre. La porte coulissante grise est modélisée
> ouverte, ses panneaux rangés derrière les parties fixes : ils se rejoignent
> au milieu pour la fermer. Un battant s'ouvre de 83°, comme ceux qu'on
> dessine. Volets et portes de garage attendent `J8`.

- **Où** : [floorplan-openings.ts](../src/lib/floorplan-openings.ts)
- **Quoi** : dans chaque ouverture, le cadre, l'axe du mur, les parties
  mobiles — grand panneau vertical et ce qui y tient : vitre, poignée. Battant
  : l'arête des gonds (charnières ; sinon à l'opposé de la poignée ; sinon
  contre le montant), l'angle de repos s'il est modélisé entrouvert (axe
  principal de ses sommets), le côté où il s'ouvre. Baie : ses panneaux,
  modélisés fermés ou ouverts (un vide entre eux), et leur course.
- **Fait quand** : sur `home.glb`, gonds et angles justes pour les portes
  entrouvertes, la porte d'entrée et les fenêtres ; la baie et la porte
  coulissante savent se fermer. Tests unitaires.

### [x] J4 — Les vraies portes bougent

> **Fait** : les maillages mobiles passent sous un pivot — sur l'axe des
> gonds, ou qui glisse — et reviennent à la maquette, dans sa pose, quand la
> liaison s'en va. Ils restent les siens : coupe des murs, lumière des pièces
> et lancers de rayon les suivent. `floorplan.openings` : `kinds`, le type
> choisi à la main par famille, et `links` — `node`, le nœud du premier
> composant, `entityId`, `flip`, `hinge`. Même mouvement que les éléments
> dessinés ; arrivée, une vraie porte peut cacher une pastille, ou la montrer :
> c'est revérifié. Rejouée, elle suit son historique. Une maquette fondue n'est
> pas parcourue. Vérifié dans le mock sur `home.glb` : les cinq portes et la
> porte coulissante, ouvertes puis fermées.

- **Où** : [Floorplan3D.tsx](../src/components/floorplan/Floorplan3D.tsx)
- **Quoi** : les maillages mobiles passent sous un pivot posé sur l'axe des
  gonds, ou sur la glissière ; l'entité les ouvre comme un élément dessiné
  (`openness`, 0,9 s, en douceur, ombres suivies), rien entre deux
  mouvements. Config `floorplan.openings` : type par famille, entité par
  ouverture — des noms de nœuds, jamais des indices —, sens ou gonds
  corrigés. Une ouverture introuvable après un nouvel export est ignorée.
- **Fait quand** : une porte liée s'ouvre et se ferme avec son entité, sans
  rien déranger d'autre dans la maquette.

### [x] J5 — L'onglet « Ouvertures »

> **Fait** ([FloorplanOpenings.tsx](../src/components/floorplan/FloorplanOpenings.tsx)) :
> une ligne par ouverture des familles retenues — son entité et son état, ou
> « Lier une entité… » —, puis les types, repliés : les familles de chacun,
> « auto » quand le nom les a devinées ; en retirer une, en ajouter une —
> celles logées dans un mur d'abord — fige le choix. Un clic sur une ligne
> ouvre la fenêtre de liaison à côté de la porte, qui s'ouvre et se ferme
> pendant qu'on choisit (entrouverte, immobile, quand les animations sont
> réduites) : entité, type pour toute la famille — deviné d'après l'entité
> quand le nom ne disait rien —, sens, gonds, délier. Les objets sans nom
> valide logés dans un mur font un avertissement. Les éléments dessinés
> restent listés ici ; maquette fondue : l'outil de dessin, comme avant.

- **Quoi** : les liaisons d'abord — chaque occurrence, son entité ou « Lier
  une entité… » ; un clic la montre et ouvre sa fenêtre de liaison : entité,
  type deviné comme en `A2`, sens, gonds, aperçu qui s'ouvre. Puis les types :
  pour chacun, un sélecteur multiple des familles de la maquette, celles
  logées dans un mur d'abord, prérempli d'après les noms. Objets sans nom : un
  avertissement. Maquette fondue : renvoi à l'outil de dessin.

### [x] J6 — Lier en cliquant la porte

> **Fait** : avec l'outil « Porte · volet », l'objet sous le pointeur — le
> rayon remonte au nœud de la maquette, pivots compris — se cerne en ambre
> quand un clic le lierait : une famille qui a un type, ou un objet logé dans
> un mur. L'indication le nomme. Le clic ouvre sa fenêtre de liaison ; sa
> famille n'a pas de type : on le choisit là, pour toute la famille. Un objet
> sans nom valide dit pourquoi on ne peut pas le lier, et propose de le
> dessiner. Un objet d'un seul tenant (`#` final) est signalé : rien n'y
> bouge. Ailleurs, le clic dessine, comme avant.

- **Quoi** : avec l'outil « Porte · volet », une ouverture détectée se
  surligne au survol ; un clic ouvre sa fenêtre de liaison, à côté d'elle. Sa
  famille n'a pas de type : on le choisit, pour toute la famille. Ailleurs, le
  clic dessine, comme avant.

### [x] J7 — Démo et tests de bout en bout

> **Fait** : [make-openings-glb.ts](../scripts/make-openings-glb.ts) écrit
> `openings.glb` — une pièce aux murs percés : porte fermée à charnières, porte
> entrouverte, fenêtre à deux vantaux, baie coulissante, fenêtre sans nom,
> canapé, table sans nom. Des tests unitaires la vérifient, et trois E2E s'en
> servent : une porte liée à une entité ouverte s'ouvre ; l'onglet liste les
> ouvertures et en lie une, gardée à l'enregistrement ; survolée puis cliquée,
> une vraie fenêtre ouvre sa fenêtre de liaison. La maquette dit où en est
> chaque ouverture (`data-floorplan-openings`), comme les pastilles et les
> câbles. Le mock montre `home.glb`, page « Maison SH3D » : deux portes et la
> porte coulissante liées, que la journée rejouée ouvre et ferme.

- **Quoi** : un script génère une petite maquette façon ExportToHASS — porte,
  fenêtres, baie, objet sans nom, murs — pour les tests E2E ; le mock montre
  `home.glb`, portes liées.

### [x] J8 — Volets roulants et portes de garage de la maquette

> **Fait** : le tablier — le plus grand panneau, large de la moitié de
> l'ouverture au moins : ni les coulisses, étroites, ni le coffre, bas —
> s'enroule vers son haut selon la position, comme celui qu'on dessine ; il en
> reste un liseré sous le coffre. Une porte de garage sans cadre n'a que son
> panneau, qui s'enroule de même. Modélisé à mi-course, le tablier descend
> jusqu'en bas pour fermer. Vérifié sur la maquette synthétique, qui a
> désormais son volet et sa porte de garage : `home.glb` n'en a pas.

- **Quoi** : un volet ou une porte de garage de la maquette s'enroule vers le
  haut selon sa position (`current_position`), comme ceux qu'on dessine.

### [x] J9 — Les lampes, dans l'onglet « Éléments »

> **Fait** ([FloorplanLamps.tsx](../src/components/floorplan/FloorplanLamps.tsx)) :
> les onglets de `J1` ne disaient nulle part qu'une lampe est une pastille
> d'une lumière — l'outil s'appelle « Pastille ». L'onglet « Éléments » liste
> désormais les lampes de la page, l'ampoule de la couleur de la lampe
> allumée, chacune retirable ; « Poser une lampe » prend l'outil « Pastille »,
> dont le prochain clic ne propose que des lumières. Une lampe posée, l'outil
> redevient celui de toutes les pastilles.

- **Quoi** : on doit trouver comment poser une lampe sans savoir que c'est
  une pastille.

### [x] J10 — Un nom qui finit par un nombre

> **Fait** ([floorplan-openings.ts](../src/lib/floorplan-openings.ts)), trouvé
> sur ta maison réexportée : une fenêtre nommée `Fenetre_sal_1` s'exporte en
> `Fenetre_sal_1_1` … `Fenetre_sal_1_12`, que le nom seul lit comme douze
> reprises d'un même composant. Douze fenêtres d'une seule pièce, rien ne
> bougeait, et la fenêtre de liaison réclamait de retirer un « # » absent. Des
> objets qui se touchent, d'un même composant et sans première fois, sont un
> seul objet : le nombre rejoint son nom. Le rang dans une famille se compte
> dans tout le fichier : deux `Fenetre_sal_1` font 1 et 2. L'aide dit où
> renommer dans Sweet Home 3D : double-clic sur l'objet, champ « Nom ».

- **Quoi** : une ouverture dont le nom finit par un nombre (`Fenetre_1`,
  `Porte_2`) se lie et bouge comme les autres.

### [x] J11 — Les grandes maquettes

> **Fait** : l'unité se déduisait de la taille à un facteur dix près — au-delà
> de 63 m de diagonale, une maison en centimètres, jardin compris, passait pour
> des millimètres, et toutes les tolérances de la détection décuplaient. Seuls
> restent les centimètres de Sweet Home 3D et les mètres de Blender : au-delà
> de 200 unités, des centimètres. Et la coupe des murs se règle sur leur
> hauteur (`wall_*`) plutôt que sur celle de toute la maquette : sur ta maison
> réexportée, des objets sans nom qui montent à 3,48 m, au-dessus des murs de
> 2,80 m, la relevaient de 1,06 à 1,32 m.

- **Quoi** : une maquette ExportToHASS de plus de 63 m, ou dont un objet
  dépasse des murs, se lit et se coupe comme les autres.

### [x] J12 — Les liaisons que proposent les noms

> **Fait** (`suggestLinks`, [floorplan-openings.ts](../src/lib/floorplan-openings.ts)) :
> l'onglet « Ouvertures » propose, sous chaque ouverture sans entité,
> l'entité qui porte son nom — les mots de sa famille hors celui du type,
> dans l'identifiant ou le nom, accents et casse ignorés : `Porte_Entree` →
> « Porte d'entrée » — et qui peut la mouvoir : un contact de porte pour une
> porte, de fenêtre pour une fenêtre, un volet pour un volet. Entre
> plusieurs, celle qui a le moins de mots en plus (`cover.volet_chambre`
> plutôt que `cover.volet_chambre_invites`) ; à égalité, aucune. Rien pour une
> famille de plusieurs objets — `Porte_en_bois` × 5 ne dit pas laquelle est
> laquelle —, ni une entité déjà liée. « Lier les entités proposées » les lie
> toutes ; la fenêtre de liaison s'ouvre, elle, déjà remplie.

- **Quoi** : lier en un clic les ouvertures dont le nom dit l'entité.
