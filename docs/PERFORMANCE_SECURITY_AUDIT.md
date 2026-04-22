# Audit Performances & Sécurité — HA Dashboard

> Rédigé le 2026-04-06. Base : v1.0.8, React 19, Vite, Tailwind CSS v4, Framer Motion v12, Express + SQLite.

---

## 1. Résumé exécutif

Le dashboard tourne correctement sur desktop. Sur **petite tablette** (iPad mini, tablette Android 7–10") plusieurs points créent des latences perceptibles ou une sur-consommation GPU/CPU. Les problèmes les plus impactants sont le `backdrop-filter: blur` omniprésent et les animations Framer Motion qui tournent même quand elles ne servent à rien. La sécurité serveur est globalement correcte mais présente quelques angles morts à corriger.

---

## 2. Problèmes de performances identifiés

### 2.1 🔴 CRITIQUE — `backdrop-filter: blur` sur chaque card (`.gc`)

**Fichier** : `src/index.css` lignes 180–181

```css
.gc {
  -webkit-backdrop-filter: blur(var(--dash-glass-blur, 30px)) saturate(160%) brightness(80%);
  backdrop-filter: blur(var(--dash-glass-blur, 30px)) saturate(160%) brightness(80%);
}
```

Ce filtre **force un compositing layer GPU par élément**. Sur un dashboard avec 10–15 widgets, cela représente 10–15 couches GPU simultanées. Sur un SoC Cortex-A55 (tablette entrée de gamme), cela dépasse la VRAM disponible pour le compositing et provoque des **chutes de framerate à < 30 fps**.

**Le code a déjà la bonne idée** en mode édition (ligne 28–32, `backdrop-filter: none` sur `.dashboard-editing .gc`) — mais ce switch n'est jamais disponible en lecture normale.

**Fix proposé** : ajouter une classe CSS `perf-mode` sur `<html>` qui désactive les blurs (voir section 4).

---

### 2.2 🔴 CRITIQUE — Valeur de blur hardcodée dans les modales

**Fichiers** : `ThemeControlsModal.tsx`, `WidgetEditModal.tsx`, `AddWidgetModal.tsx`, `WallPanelConfigModal.tsx`

Tous les modaux utilisent `backdropFilter: 'blur(20px)'` ou `blur(24px)` en **inline style** contournant la variable CSS `--dash-glass-blur`. Si l'utilisateur réduit le blur via les réglages thème, les modaux conservent leur blur maximal.

---

### 2.3 🟠 MAJEUR — Framer Motion : animations sur chaque mount de widget

**Fichiers** : `WeatherCard`, `CameraCard`, `LightCard`, `SensorCard`, `CoverCard`, `TemplateCard`, `PersonStatusCard` (100% des cards)

```tsx
// Pattern répété dans tous les widgets
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
>
```

Ces animations se déclenchent à **chaque reconnexion WebSocket HA** (state update qui cause un remount) et à chaque changement de page. Sur tablette, Framer Motion utilise `requestAnimationFrame` + WAAPI ; si le thread JS est occupé (traitement des states HA), les animations jankent.

De plus, **Framer Motion est une dépendance lourde** (~50 kB gzippé) utilisée ici uniquement pour des transitions simples que CSS peut faire.

---

### 2.4 🟠 MAJEUR — `hls.js` chargé globalement même sans CameraCard

**Fichier** : `src/components/ui/CameraFeed/components/CameraFeed.tsx`

`hls.js` (~200 kB gzippé) est importé statiquement dans `CameraFeed`, qui lui-même est importé dans `Dashboard.tsx`. Il est donc **bundlé dans le chunk principal** même si l'utilisateur n'a aucune caméra configurée.

**Fix** : import dynamique `const Hls = (await import('hls.js')).default` dans le `useEffect` de `CameraFeed`.

---

### 2.5 🟡 MODÉRÉ — Pas de `will-change` sur les éléments animés en slide/transition

Les transitions de page (`AnimatePresence` dans `PageTabs`, `Dashboard`) ne précisent pas `will-change: transform, opacity`. Le browser ne peut pas pré-allouer la couche GPU, ce qui crée un **jank au premier frame**.

---

### 2.6 🟡 MODÉRÉ — `ResizeObserver` dans chaque `DashboardGrid`

**Fichier** : `src/components/layout/DashboardGrid.tsx` lignes 83–90

Un `ResizeObserver` est créé à chaque rendu pour détecter le breakpoint. L'implémentation est correcte (disconnect + cleanup), mais si plusieurs pages sont montées en même temps (pré-chargement), plusieurs observers tournent en parallèle.

---

### 2.7 🟡 MODÉRÉ — `BackgroundSlideshow` avec `filter: blur(15px)` + transitions CSS

**Fichier** : `src/components/wallpanel/BackgroundSlideshow.tsx`

Le screensaver applique un `filter: blur(15px)` CSS sur des images plein écran, cumulé à des transitions d'opacité. Sur petite tablette c'est particulièrement lourd.

---

### 2.8 🟢 MINEUR — Police variable `@fontsource-variable/geist` chargée entièrement

La police variable Geist (~120 kB) est chargée même si le thème utilise une police système. Un `font-display: swap` et un subset Unicode permettraient de réduire le FOUT.

---

## 3. Problèmes de sécurité identifiés

### 3.1 🔴 CRITIQUE (conditionnel) — Endpoint `/api/config` POST sans validation du body

**Fichier** : `server/routes/config.js` lignes 24–30

```js
const config = req.body;
if (!config || typeof config !== 'object') {
  return res.status(400).json({ error: 'Invalid config' });
}
// Pas de validation de la taille, des champs, du format
const data = JSON.stringify(config);
```

Un attaquant authentifié peut envoyer un payload JSON de plusieurs MO (la limite `express.json` est fixée à `2mb` dans `server/index.js` — c'est le seul garde-fou). Il n'y a **aucune validation de structure ni sanitisation** — un JSON circulaire ou avec des clés inattendues est accepté. Recommandation : valider avec `zod` ou au moins vérifier `config.version` et `config.pages`.

---

### 3.2 🟠 MAJEUR — `device_id` dans settings provient du query param sans sanitisation

**Fichier** : `server/routes/settings.js` ligne 7

```js
const deviceId = req.query.device_id || 'default';
```

`device_id` est utilisé dans une requête SQLite préparée (paramètre `?`) — **pas d'injection SQL possible** grâce à `better-sqlite3`. Cependant, une valeur très longue (ex. 10 000 chars) est acceptée et stockée telle quelle. **Fix** : limiter à 128 chars alphanumériques.

---

### 3.3 🟠 MAJEUR — `haAuthMiddleware` : validation du token HA avec un seul appel HTTP non-authentifié

**Fichier** : `server/haAuth.js` lignes 43–52

La validation du token fait un appel vers `${haUrl}/api/` avec le Bearer token du client. Si `HA_URL` n'est pas défini, le fallback est `http://supervisor/core` — ce qui est correct en add-on. Mais en mode **standalone sur réseau local** avec `HA_URL` mal configuré pointant vers une IP externe, le token est envoyé vers un tiers non vérifié.

**Fix** : valider que `HA_URL` est une URL locale (loopback, RFC1918) ou HTTPS, et logger un warning au démarrage si ce n'est pas le cas.

---

### 3.4 🟠 MAJEUR — Headers de sécurité HTTP absents

**Fichier** : `server/index.js`

Aucun header de sécurité n'est positionné :
- Pas de `Content-Security-Policy` (XSS, injection de scripts)
- Pas de `X-Content-Type-Options: nosniff`
- Pas de `X-Frame-Options: DENY` (clickjacking)
- Pas de `Referrer-Policy`
- Pas de `Permissions-Policy`

**Fix** : ajouter `helmet` (1 ligne) ou configurer ces headers manuellement.

```bash
npm install helmet
```
```js
import helmet from 'helmet';
app.use(helmet());
```

---

### 3.5 🟡 MODÉRÉ — `express.json({ limit: '2mb' })` appliqué globalement

La limite de 2 Mo s'applique à **toutes les routes** y compris les settings et profils, pas seulement `/api/config`. Un payload de 2 Mo pour une config de settings n'a aucun sens. **Fix** : appliquer des limites spécifiques par route (ex. `1kb` pour settings, `2mb` pour config).

---

### 3.6 🟡 MODÉRÉ — `imageUrl` dans `BackgroundConfig` non validée côté serveur

**Fichier** : `server/routes/config.js` (stockage) + `src/components/layout/BackgroundLayer.tsx` (rendu)

L'URL de l'image de fond est stockée telle quelle et injectée comme `backgroundImage: url(...)`. Côté client, si l'URL contient des caractères spéciaux CSS, cela peut briser le layout. Cela ne présente pas de risque XSS (CSS injection limitée), mais **côté serveur**, l'URL n'est pas validée avant persistance.

---

### 3.7 🟢 MINEUR — `migrateFromJSON` : lecture de fichier JSON sans validation

**Fichier** : `server/db.js` lignes 67–80

La migration one-shot depuis `dashboard_config.json` fait un `JSON.parse` sans try/catch sur la profondeur ou la taille. Un fichier JSON malformé casse silencieusement la migration.

---

## 4. Plan d'action recommandé

### 4.1 Option "Performances" dans la modale Apparence (priorité haute)

Ajouter une section **Performances** dans `ThemeControlsModal.tsx` avec les paramètres suivants, persistés dans `ThemeContext` localStorage :

| Paramètre | Défaut | Effet |
|---|---|---|
| `reduceBlur` | `false` | Réduit `--dash-glass-blur` à `4px` au lieu de `20–40px` |
| `reduceAnimations` | `false` | Ajoute la classe CSS `perf-animations-off` sur `<html>` |
| `disableCardShadows` | `false` | Supprime `box-shadow` sur `.gc` |
| `reducedMotion` (auto) | — | Détection `prefers-reduced-motion` |

**Implémentation CSS pour `reduceAnimations`** dans `index.css` :

```css
/* Mode performances : désactive les animations non-essentielles */
.perf-animations-off *,
.perf-animations-off *::before,
.perf-animations-off *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}
```

**Note** : Framer Motion contourne cette règle CSS car il anime directement via JS/WAAPI. Il faudra passer un contexte React `AnimationsContext` avec `{ enabled: boolean }` et utiliser des `motion.div` conditionnels (ou `duration: 0` en cas de désactivation).

**Implémentation CSS pour `reduceBlur`** :

```css
.perf-reduce-blur .gc,
.perf-reduce-blur .gc-light {
  -webkit-backdrop-filter: blur(4px) !important;
  backdrop-filter: blur(4px) !important;
}
```

---

### 4.2 Import dynamique de hls.js (priorité haute)

**Fichier** : `src/components/ui/CameraFeed/components/CameraFeed.tsx`

Remplacer :
```ts
import Hls from 'hls.js';
```

Par un import dynamique dans le `useEffect` :
```ts
useEffect(() => {
  if (!streamUrl || shouldMJPEG) return;
  let hls: import('hls.js').default | null = null;
  import('hls.js').then(({ default: Hls }) => {
    if (!Hls.isSupported()) return;
    hls = new Hls({ ... });
    hls.loadSource(streamUrl);
    hls.attachMedia(video);
  });
  return () => hls?.destroy();
}, [streamUrl, shouldMJPEG]);
```

Gain : **~200 kB retiré du bundle initial**.

---

### 4.3 Ajouter `helmet` au serveur (priorité haute, 5 min)

```js
// server/index.js
import helmet from 'helmet';
app.use(helmet({
  contentSecurityPolicy: false, // à activer progressivement
}));
```

---

### 4.4 Valider `device_id` dans settings (priorité moyenne)

```js
// server/routes/settings.js
const raw = req.query.device_id || 'default';
const deviceId = /^[\w\-]{1,128}$/.test(raw) ? raw : 'default';
```

---

### 4.5 Valider la structure config au POST (priorité moyenne)

```js
// server/routes/config.js
const { version, pages } = config;
if (version && typeof version !== 'number') {
  return res.status(400).json({ error: 'Invalid version field' });
}
```

---

## 5. Résumé des priorités

| # | Problème | Impact | Effort | Priorité |
|---|---|---|---|---|
| 1 | `backdrop-filter` global → option `reduceBlur` | 🔴 Perf critique tablette | Moyen | P0 |
| 2 | Import dynamique `hls.js` | 🔴 Bundle −200 kB | Faible | P0 |
| 3 | `helmet` headers HTTP | 🟠 Sécurité | Très faible | P0 |
| 4 | Option `reduceAnimations` + contexte React | 🟠 Perf animations | Moyen | P1 |
| 5 | Validation `device_id` | 🟠 Sécurité | Très faible | P1 |
| 6 | Validation body `/api/config` | 🟠 Sécurité | Faible | P1 |
| 7 | Blurs inline modales ignorent la variable CSS | 🟡 Cohérence perf | Faible | P2 |
| 8 | `will-change` sur transitions de page | 🟡 Perf transitions | Très faible | P2 |
| 9 | `HA_URL` validation au démarrage | 🟡 Sécurité | Faible | P2 |
| 10 | Limite JSON par route | 🟢 Sécurité mineur | Très faible | P3 |

---

## 6. Évolutions de la modale Apparence

La modale `ThemeControlsModal.tsx` est actuellement structurée en 3 sections (Thème, Opacité cards, Fond d'écran). Proposition d'ajouter une **4e section "Performances"** :

```
┌─────────────────────────────────────────┐
│  Apparence                          [X] │
│  Personnalise le thème et le fond       │
├─────────────────────────────────────────┤
│  ⚙ Thème                                │
│  [Sombre] [Clair] [Verre] [Minuit] ...  │
├─────────────────────────────────────────┤
│  ☰ Opacité des cards — 29%             │
│  ─────────●──────────────────────────── │
├─────────────────────────────────────────┤
│  ⊞ Fond d'écran                         │
│  [Couleur] [Gradient] [Image]           │
│  ...                                    │
├─────────────────────────────────────────┤
│  ⚡ Performances                    NEW  │
│  ○ Réduire les flous (tablettes)        │
│    Réduit backdrop-filter à 4px        │
│  ○ Désactiver les animations            │
│    Plus fluide sur petits appareils     │
│  ○ Désactiver les ombres des cards      │
│    Allège le rendu GPU                  │
└─────────────────────────────────────────┘
```

Ces 3 toggles sont persistés en `localStorage` avec le reste du thème et appliqués via des classes CSS sur `<html>` (approche la plus légère — pas de contexte React supplémentaire pour les toggles purement CSS).

Pour les animations Framer Motion, un contexte `MotionConfig` de Framer Motion permet de forcer `{ reducedMotion: 'always' }` globalement :

```tsx
// App.tsx
import { MotionConfig } from 'framer-motion';
<MotionConfig reducedMotion={reduceAnimations ? 'always' : 'user'}>
  ...
</MotionConfig>
```

C'est la solution la plus propre : une seule ligne en `App.tsx`, aucune modification des widgets individuels.
