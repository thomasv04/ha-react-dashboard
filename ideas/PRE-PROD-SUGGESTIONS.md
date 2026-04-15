# Suggestions avant mise en production — ha-dashboard

> État du dashboard au 2026-04-20. Tout ce qui suit est **nouveau** — les idées déjà documentées dans ce dossier (more-info modals, automation widget, etc.) ne sont pas reprises.

---

## Légende

| Difficulté | Symbole |
|-----------|---------|
| Facile (< 1h) | 🟢 |
| Moyen (2–4h) | 🟡 |
| Complexe (> 4h) | 🔴 |

| Impact | Description |
|--------|-------------|
| ⭐ | Petit polish, presque invisible |
| ⭐⭐ | Amélioration notable pour l'utilisateur |
| ⭐⭐⭐ | Feature différenciante, change la perception du dashboard |

---

## 1. Badge "dernière mise à jour" sur les SensorCards 🟢 ⭐⭐

**Quoi :** Un petit timestamp discret sous la valeur du capteur (ex: "il y a 3 min") qui se met à jour en temps réel.

**Pourquoi :** Quand un capteur ne se met plus à jour (déconnecté, pile morte), rien ne l'indique visuellement. Ce badge permet de voir immédiatement qu'une valeur est "périmée".

**Comment :** Lire `entity.last_updated`, utiliser `date-fns/formatDistanceToNow` (déjà en dépendance), afficher en rouge si > seuil configurable (ex: 10 min).

**Config ajoutée :** `staleBadge?: boolean`, `staleThresholdMinutes?: number`

---

## 2. Widget "MediaPlayer" (lecteur multimédia) 🔴 ⭐⭐⭐

**Quoi :** Widget pour contrôler Spotify, Sonos, Chromecast, etc. depuis le dashboard.

**Affiche :** Pochette d'album, titre, artiste, barre de progression, boutons play/pause/next/prev, volume.

**Pourquoi :** C'est la seule grande catégorie d'entités HA totalement absente. C'est le widget que tout le monde cherche en premier sur un dashboard maison.

**Services :** `media_player.play_media`, `media_player.media_play_pause`, `media_player.media_next_track`, `media_player.volume_set`

**Attributs :** `media_title`, `media_artist`, `entity_picture`, `media_position`, `media_duration`, `volume_level`, `state`

---

## 3. Confirmation visuelle au toggle (ripple + micro-animation) 🟢 ⭐⭐

**Quoi :** Quand on clique sur un toggle (lumière, automation, alarme), un effet "ripple" part du point de clic + le widget pulse brièvement.

**Pourquoi :** Sans retour visuel immédiat, on ne sait pas si le clic a été pris en compte. HA peut mettre 200–500ms à répondre. Le ripple donne une réponse instantanée.

**Comment :** Composant `<Ripple>` avec Framer Motion `animate` déclenché `onPointerDown`. Ajouter `scale: [1, 1.02, 1]` sur le container au même moment.

**Coût :** ~30 lignes, 1 composant réutilisable dans tous les widgets de contrôle.

---

## 4. Mode "Présentation TV" (kiosk) 🟡 ⭐⭐⭐

**Quoi :** Un paramètre dans les settings pour masquer le bouton d'édition et les boutons de page — **sans toucher au dock** (barre du bas conservée pour la navigation entre pages). L'objectif est un affichage épuré sur écran mural tout en gardant l'accès aux pages.

**Ce qui est masqué :**
- Bouton d'édition (crayon)
- Boutons d'ajout de page
- Tout ce qui n'est pas navigationnel

**Ce qui est conservé :**
- Le dock de navigation du bas (pages, icônes)

**Option secondaire :** Masquer automatiquement le bouton d'édition après X secondes d'inactivité (avec un léger fade), et le faire réapparaître au toucher.

**Masquer le menu HA — solution confirmée :** Il existe deux URLs pour accéder au dashboard :

- `/app/<addon_slug>` → ouvre dans le shell HA **avec** la sidebar à gauche
- `/api/hassio_ingress/<token>/` → ouvre **sans** sidebar, page web pleine, aucun chrome HA

L'URL Ingress directe est la solution naturelle pour le mode mural. Aucun code nécessaire côté dashboard.

**À documenter dans les settings `kioskMode` :** afficher l'URL Ingress du dashboard pour que l'utilisateur puisse la copier et la configurer dans WallPanel/navigateur tablette.

**Pourquoi :** Le dashboard est conçu pour être affiché en permanence (WallPanel, GreetingCard, horloge...). Les boutons d'édition encombrent l'écran mais la navigation reste utile.

**Config :** `kioskMode: boolean` dans les device settings (per-device, pas global).

---

## 5. Widget "Batterie" — alerte piles faibles 🟡 ⭐⭐

**Quoi :** Widget qui liste automatiquement tous les capteurs de batterie en dessous d'un seuil (ex: < 20%), avec leur nom et niveau.

**Pourquoi :** Les piles mortes sont la panne silencieuse numéro 1 dans une maison connectée. Ce widget évite de découvrir que le capteur de porte ne marche plus depuis 3 semaines.

**Deux modes :**
- **Auto-discover** : scanne toutes les entités avec `device_class: battery` 
- **Manuel** : liste d'entités configurée à la main

**Affichage :** Liste compacte, icône de batterie colorée (rouge < 10%, orange 10–20%), niveau en %, dernier report.

---

## 6. Raccourcis clavier globaux 🟡 ⭐⭐

**Quoi :** Quelques shortcuts clavier pour naviguer sans souris :

| Touche | Action |
|--------|--------|
| `E` | Toggle mode édition |
| `Escape` | Fermer modal/panneau ouvert |
| `1–9` | Naviguer vers page 1–9 |
| `W` | Activer/désactiver WallPanel |

**Pourquoi :** Utile pour les tablettes avec clavier, les écrans muraux avec télécommande, ou simplement en dev. `Escape` pour fermer les modals est quasiment attendu.

**Comment :** Hook `useKeyboardShortcuts` avec `useEffect` + `addEventListener('keydown')`, actif seulement si focus pas dans un `<input>`.

---

## 7. Indicateur de connexion HA (dot animé) 🟢 ⭐⭐

**Quoi :** Un petit dot coloré dans la barre du haut (à côté de l'heure ou du bouton settings) qui indique l'état de la connexion WebSocket à Home Assistant :
- 🟢 Vert pulsant = connecté
- 🟡 Jaune = reconnexion en cours
- 🔴 Rouge = déconnecté

**Pourquoi :** Quand HA redémarre ou que le réseau coupe, le dashboard ne montre rien — les valeurs restent figées sur le dernier état connu. Un utilisateur ne sait pas si le dashboard est "live" ou figé.

**Comment :** `useHass()` expose l'état de connexion via `connection`. Dot avec `animate={{ scale: [1, 1.2, 1] }}` en boucle quand connecté.

---

## 8. "Drag to reorder" les pages 🟡 ⭐⭐

**Quoi :** En mode édition, pouvoir réordonner les onglets de pages par drag & drop (ou long-press sur mobile).

**Pourquoi :** Actuellement les pages sont créées dans un ordre fixe. Pour réorganiser il faudrait les supprimer et recréer. C'est bloquant pour quelqu'un qui a 4+ pages configurées.

**Comment :** `@dnd-kit/sortable` est probablement déjà dans les dépendances (utilisé pour la grille). La liste de pages dans le header devient un `SortableContext`.

---

## 9. Confirmation avant suppression de widget 🟢 ⭐

**Quoi :** Quand on clique "Supprimer" sur un widget en mode édition, un petit popover de confirmation apparaît ("Supprimer ce widget ? [Annuler] [Confirmer]") plutôt que la suppression immédiate.

**Pourquoi :** En mode édition sur mobile (tablette), les boutons sont petits et un clic accidentel peut supprimer un widget bien configuré. La restauration est impossible sans backend de versionning.

**Comment :** Remplacer `onClick={removeWidget}` par un state `confirmingDelete` + popover Framer Motion.

---

## 10. Widget "Compte à rebours / Timer" 🟡 ⭐⭐

**Quoi :** Affiche un timer HA (`timer.*`) ou un compte à rebours custom avec :
- Temps restant en grand
- Barre de progression circulaire
- Boutons Start / Pause / Cancel

**Pourquoi :** Très utile pour suivre des timers cuisine, des minuteries d'arrosage, des programmes d'électroménager. Niche mais très satisfaisant visuellement.

**Services :** `timer.start`, `timer.pause`, `timer.cancel`

---

## 11. Thème automatique jour/nuit 🟢 ⭐⭐

**Quoi :** Option dans les device settings pour basculer automatiquement entre thème Dark et un thème Light (ou Glass) selon l'heure du coucher/lever du soleil — ou simplement entre 8h et 22h.

**Pourquoi :** Le dashboard affiché en permanence sur mur est aveuglant en thème dark le matin dans une pièce lumineuse, et trop lumineux la nuit en thème light.

**Config :** `autoTheme: boolean`, `lightTheme: ThemeName`, `darkTheme: ThemeName`, source = `sun.sun` entity (HA) ou plage horaire fixe.

**Comment :** Hook `useAutoTheme` qui écoute `sun.sun` state (`above_horizon` / `below_horizon`) et appelle `setTheme()`.

---

## 12. Export / Import de la config dashboard (JSON) 🟡 ⭐⭐

**Quoi :** Dans les settings, deux boutons : "Exporter la config" (télécharge un JSON) et "Importer une config" (upload d'un JSON).

**Pourquoi :** Permet de sauvegarder le layout avant une grosse modif, de partager sa config avec d'autres, ou de migrer d'une instance HA à une autre. Actuellement la config est côté serveur sans backup simple.

**Comment :** `GET /api/config` → `JSON.stringify` → `Blob` → `URL.createObjectURL`. Import : upload → `PUT /api/config`.

---

## 13. Recherche d'entité dans les champs de config 🟡 ⭐⭐⭐

**Quoi :** Quand on édite un widget et qu'on saisit un `entityId`, un dropdown autocomplete apparaît avec les entités disponibles dans HA (filtrées par domaine si pertinent).

**Pourquoi :** Actuellement il faut connaître exactement l'entity_id par cœur (ex: `sensor.chambre_temperature`). C'est la friction principale pour configurer de nouveaux widgets.

**Comment :** `useHass().entities` retourne toutes les entités. Un input avec dropdown filtré sur la saisie + `device_class` pour pré-filtrer. Déjà partiellement implémenté dans `EntityPickerField` — à vérifier si c'est utilisé partout.

---

## 14. Bloc "SwitchBlock" pour les Custom Panels 🟢 ⭐⭐

**Quoi :** Nouveau type de bloc dans le Custom Panel Builder : un toggle switch qui contrôle une entité `switch.*` ou `input_boolean.*`.

**Pourquoi :** Les Custom Panels ont des ButtonBlock (un clic = service) et CoverRowBlock, mais pas de toggle d'état persistant. Pour piloter une prise, une pompe, un circuit d'éclairage depuis un panel custom, il faut actuellement utiliser 2 boutons (on/off) ce qui est moins intuitif.

**Affichage :** Nom à gauche, toggle switch à droite, couleur verte si `on`.

---

## 15. Historique des 5 dernières commandes exécutées 🟡 ⭐

**Quoi :** Un petit panneau accessible depuis la navbar (icône horloge) qui montre les 5 dernières actions effectuées depuis le dashboard :
```
18:42  Lumière salon → ON
18:39  Thermostat → 21.5°C
18:30  Volet salon → 50%
```

**Pourquoi :** Utile pour déboguer des automatisations, vérifier ce qu'un autre membre du foyer a changé, ou simplement annuler mentalement ("ah c'est moi qui ai éteint ça").

**Comment :** Hook `useCommandHistory` avec un array de max 20 commandes stocké en mémoire (pas besoin de persistence). Chaque `callService` wrappé pour logger action + timestamp.

---

## 16. Widget "Scènes" (scenes activator) 🟡 ⭐⭐

**Quoi :** Widget qui affiche une ou plusieurs scènes HA (`scene.*`) sous forme de boutons avec icône. Un clic active la scène.

**Pourquoi :** Les scènes sont une feature puissante de HA (pré-réglages lumières, température, etc.) mais il n'existe aucun moyen de les activer depuis ce dashboard actuellement.

**Service :** `scene.turn_on { entity_id }`

**Formats :**
- 1 scène par widget (compact)
- Grille 2×2 ou 2×3 de scènes (layout "grid")

---

## 17. Notification toast quand une entité passe dans un état critique 🟡 ⭐⭐

**Quoi :** Configurer des alertes sur n'importe quelle entité : si `sensor.co2_salon` > 1000, afficher un toast rouge "CO² élevé en salon (1024 ppm)".

**Pourquoi :** Le dashboard est souvent affiché sur un écran mural que personne ne regarde activement. Une notification visuelle attire l'attention.

**Config :** Dans un widget SensorCard, ajouter `alertThreshold: number`, `alertDirection: 'above' | 'below'`, `alertMessage: string (template)`.

**Comment :** Hook `useEntityAlert` qui compare `entity.state` au seuil et déclenche `addToast(...)` si franchi (avec debounce pour éviter le spam).

---

## 18. Zoom/scroll horizontal sur les prévisions météo 🟢 ⭐

**Quoi :** Dans le WeatherCard (et son future more-info), rendre la liste des prévisions scroll horizontalement sur mobile pour afficher 7+ jours sans tronquer.

**Pourquoi :** Sur tablette en portrait, les 4 jours de prévision actuels sont comprimés et le texte est minuscule. Un scroll horizontal permettrait d'en afficher plus sans casser le layout.

**Comment :** `overflow-x: auto; scrollbar-none` + `flex-nowrap` sur le container des prévisions.

---

## 19. "Long press" pour ouvrir le More Info sur mobile 🟢 ⭐⭐

**Quoi :** Sur mobile/tablette, un long press (300ms) sur un widget ouvre le modal More Info, tandis qu'un tap court exécute l'action principale (toggle la lumière, etc.).

**Pourquoi :** Sur desktop on peut séparer clic rapide (action) et clic lent (info). Sur mobile c'est la même chose avec tap/long-press. Ça évite d'ouvrir le More Info accidentellement quand on veut juste éteindre une lumière.

**Comment :** Hook `useLongPress` avec `setTimeout(300)` + annulation si `pointerup` avant.

---

## 20. Mode "simplifié" par page (pour enfants / personnes âgées) 🔴 ⭐⭐⭐

**Quoi :** Option de page : `simplifiedMode: true`. Dans ce mode, les widgets ont une présentation ultra-simplifiée (gros texte, gros boutons, pas de données secondaires, couleurs très contrastées).

**Exemple :** Une LightCard en mode simplifié = juste un grand cercle de couleur cliquable, rien d'autre.

**Pourquoi :** Dashboard partagé par toute la famille. Une page "Salon" simplifiée pour les grands-parents qui n'ont besoin que d'allumer/éteindre les lumières.

**Comment :** Contexte `PageContext` étendu avec `simplified?: boolean`, chaque widget lit ce contexte et rend un layout alternatif si actif.

---

## Récapitulatif priorisé

| # | Feature | Difficulté | Impact | Recommandation |
|---|---------|-----------|--------|----------------|
| 7 | Indicateur connexion HA | 🟢 | ⭐⭐ | **Faire en premier** — sécurité utilisateur |
| 3 | Ripple / micro-animation toggle | 🟢 | ⭐⭐ | **Faire en premier** — polish immédiat |
| 9 | Confirmation suppression widget | 🟢 | ⭐ | Rapide, évite frustration |
| 1 | Badge "dernière mise à jour" | 🟢 | ⭐⭐ | Utile dès le premier capteur mort |
| 18 | Scroll horizontal météo mobile | 🟢 | ⭐ | 5 lignes de CSS |
| 12 | Export / Import config JSON | 🟡 | ⭐⭐ | Avant la prod ! backup indispensable |
| 11 | Thème auto jour/nuit | 🟢 | ⭐⭐ | Usage mural permanent |
| 4 | Mode kiosk (TV/mural) | 🟡 | ⭐⭐⭐ | Usage mural = cas d'usage principal |
| 6 | Raccourcis clavier | 🟡 | ⭐⭐ | Dev + tablette avec clavier |
| 14 | SwitchBlock custom panels | 🟢 | ⭐⭐ | Complète les custom panels |
| 16 | Widget Scènes | 🟡 | ⭐⭐ | Feature HA très utilisée |
| 5 | Widget Batteries | 🟡 | ⭐⭐ | Maintenance maison connectée |
| 17 | Alertes entités critiques | 🟡 | ⭐⭐ | Sécurité + usage mural |
| 8 | Drag reorder des pages | 🟡 | ⭐⭐ | UX manquante |
| 19 | Long press → More Info mobile | 🟢 | ⭐⭐ | Mobile first polish |
| 10 | Widget Timer / Compte à rebours | 🟡 | ⭐⭐ | Niche mais très visuel |
| 15 | Historique des commandes | 🟡 | ⭐ | Debug/curiosité |
| 13 | Autocomplete entityId | 🟡 | ⭐⭐⭐ | Onboarding nouveaux utilisateurs |
| 2 | Widget MediaPlayer | 🔴 | ⭐⭐⭐ | Le widget le plus demandé, mais long |
| 20 | Mode simplifié par page | 🔴 | ⭐⭐⭐ | Différenciant mais complexe |
