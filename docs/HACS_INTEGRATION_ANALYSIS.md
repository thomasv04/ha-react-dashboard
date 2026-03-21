# Analyse HACS : Comment UI Lovelace Minimalist fonctionne — et comment corriger ha-dashboard

> Analyse complète du projet [UI Lovelace Minimalist](https://github.com/UI-Lovelace-Minimalist/UI) pour comprendre le mécanisme HACS, le déploiement automatique, et s'en inspirer pour faire fonctionner `ha-dashboard` comme un vrai panneau HA.

---

## Table des matières

1. [Les deux catégories HACS — Integration vs Frontend](#1-les-deux-catégories-hacs)
2. [Comment UI-main fonctionne avec HACS](#2-comment-ui-main-fonctionne-avec-hacs)
   - [Le fichier hacs.json](#21-le-fichier-hacsjson)
   - [Le manifest.json HA](#22-le-manifestjson-ha-integration)
   - [La validation CI/CD](#23-la-validation-cicd)
   - [Le pipeline de release (packaging)](#24-le-pipeline-de-release-packaging)
   - [L'installation par HACS (côté utilisateur)](#25-linstallation-par-hacs-côté-utilisateur)
3. [Comment le dashboard se crée automatiquement](#3-comment-le-dashboard-se-crée-automatiquement)
   - [Architecture Python de l'intégration](#31-architecture-python-de-lintégration)
   - [configure_ulm() — Copie des fichiers](#32-configure_ulm--copie-des-fichiers)
   - [configure_dashboard() — Enregistrement du panneau](#33-configure_dashboard--enregistrement-du-panneau)
   - [configure_plugins() — Ressources JS](#34-configure_plugins--ressources-js)
   - [Le système de templates button-card](#35-le-système-de-templates-button-card)
4. [Projets similaires — Ce que les autres ont fait](#4-projets-similaires--ce-que-les-autres-ont-fait)
   - [Projets React + HA trouvés](#41-projets-react--ha-trouvés)
   - [Le pattern dominant dans la communauté](#42-le-pattern-dominant-dans-la-communauté)
   - [Avertissement : panel_iframe est SUPPRIMÉ](#43-avertissement--panel_iframe-est-supprimé)
5. [Analyse de ha-dashboard et ses problèmes HACS](#5-analyse-de-ha-dashboard-et-ses-problèmes-hacs)
   - [Ce qui est déjà bien fait](#51-ce-qui-est-déjà-bien-fait)
   - [Les bugs bloquants](#52-les-bugs-bloquants)
   - [Le problème fondamental de catégorie](#53-le-problème-fondamental-de-catégorie)
6. [La solution recommandée — React en Web Component + Python Integration](#6-la-solution-recommandée--react-en-web-component--python-integration)
   - [Pourquoi cette approche ?](#61-pourquoi-cette-approche-)
   - [Architecture cible](#62-architecture-cible)
   - [Étape 1 — Wrapper Web Component pour React](#63-étape-1--wrapper-web-component-pour-react)
   - [Étape 2 — Intégration Python minimale](#64-étape-2--intégration-python-minimale)
   - [Étape 3 — Pipeline CI/CD complet](#65-étape-3--pipeline-cicd-complet)
   - [Étape 4 — hacs.json pour une intégration](#66-étape-4--hacsjson-pour-une-intégration)
   - [Étape 5 — Validation HACS en CI](#67-étape-5--validation-hacs-en-ci)
7. [Alternative rapide sans Python — panel_custom manuel](#7-alternative-rapide-sans-python--panel_custom-manuel)
8. [Référence — Fichiers clés UI-main](#8-référence--fichiers-clés-ui-main)
6. [Plan d'action concret pour l'Option A](#6-plan-daction-concret-option-a)
7. [Référence — Fichiers clés UI-main](#7-référence--fichiers-clés-ui-main)

---

## 1. Les deux catégories HACS

HACS (Home Assistant Community Store) supporte plusieurs catégories. Les deux qui nous intéressent :

| Catégorie | Usage | Où HACS installe | Exemple |
|-----------|-------|-----------------|---------|
| `integration` | Composant Python HA (logique backend) | `config/custom_components/<domain>/` | UI Lovelace Minimalist, HACS lui-même |
| `frontend` | Ressource JS Lovelace (card, panel) | `config/www/community/<repo_name>/` | button-card, mini-graph-card, ha-dashboard |

**UI-main utilise `integration`** — ce n'est PAS une ressource frontend, c'est un composant Python qui orchestre tout.  
**ha-dashboard utilise `frontend`** — les fichiers buildés sont copiés dans `/www/community/`.

Ces deux approches ont des capacités très différentes :

- Une **intégration** peut enregistrer des panels, copier des fichiers, faire des appels API HA au démarrage.
- Un **frontend** est simplement copié dans `/www/` — HA n'exécute rien automatiquement, c'est à l'utilisateur de référencer les fichiers.

---

## 2. Comment UI-main fonctionne avec HACS

### 2.1 Le fichier `hacs.json`

```json
{
  "name": "UI Lovelace Minimalist",
  "render_readme": true,
  "homeassistant": "2025.12.3",
  "zip_release": true,
  "filename": "ui_lovelace_minimalist.zip",
  "hacs": "2.0.5"
}
```

Champs critiques :
- **`"zip_release": true`** — dit à HACS de ne PAS cloner le repo, mais de télécharger un asset zip depuis la GitHub Release.
- **`"filename": "ui_lovelace_minimalist.zip"`** — le nom EXACT du zip dans les assets de la release GitHub. Ces deux champs doivent être cohérents.
- Il n'y a **pas** de champ `"category"` dans ce fichier — HACS détermine la catégorie via le répertoire `custom_components/` présent dans le repo.

### 2.2 Le `manifest.json` HA (intégration)

Situé à `custom_components/ui_lovelace_minimalist/manifest.json` :

```json
{
  "domain": "ui_lovelace_minimalist",
  "name": "UI Lovelace Minimalist",
  "config_flow": true,
  "dependencies": ["lovelace", "http", "frontend"],
  "iot_class": "calculated",
  "requirements": ["aiofiles>=0.8.0", "aiogithubapi>=22.2.4"],
  "version": "1.4.4"
}
```

- **`"config_flow": true`** → l'intégration apparaît dans _Paramètres → Appareils & Services_ avec un wizard d'installation.
- **`"dependencies"`** → HA charge d'abord `lovelace`, `http`, `frontend` avant d'initialiser l'intégration.
- **`"version"`** → injecté automatiquement par le script Python lors du release.

### 2.3 La validation CI/CD

Le fichier `.github/workflows/hacs-validate.yml` tourne sur chaque PR :

```yaml
# 1. hacs/action — vérifie hacs.json, manifest.json, CODEOWNERS, structure du repo
# 2. home-assistant/actions/hassfest — vérifie la conformité HA (config_flow, traductions, services)
```

Sans ces validations passantes, HACS rejette l'intégration du store.

### 2.4 Le pipeline de release (packaging)

Le fichier `.github/workflows/release.yml` se déclenche sur **`release: published`** (création d'une release GitHub) :

```yaml
steps:
  1. Checkout code
  2. Récupère la version depuis le tag git (ex: v1.4.4)
  3. Exécute update_hacs_manifest.py --version 1.4.4
     → patch manifest.json: "version": "1.4.4"
  4. cd custom_components/ui_lovelace_minimalist
     zip ui_lovelace_minimalist.zip -r ./
     → zip TOUT le dossier custom_components/ui_lovelace_minimalist/
  5. Upload du zip comme asset de la release GitHub
```

**Point clé** : le nom du zip (`ui_lovelace_minimalist.zip`) correspond EXACTEMENT à `"filename"` dans `hacs.json`. HACS cherche cet asset par son nom exact.

### 2.5 L'installation par HACS (côté utilisateur)

```
Utilisateur clique "Installer" dans HACS
        ↓
HACS lit hacs.json → voit "zip_release": true → cherche l'asset "ui_lovelace_minimalist.zip"
        ↓
HACS télécharge et dézippe dans config/custom_components/ui_lovelace_minimalist/
        ↓
HA redémarre → détecte le nouveau custom_component
        ↓
Notification "Nouvelle intégration disponible" → user lance le config_flow
        ↓
async_setup_entry() est appelé → le dashboard est créé automatiquement
```

---

## 3. Comment le dashboard se crée automatiquement

C'est la partie la plus importante. UI-main n'est PAS un simple pack de ressources — c'est une **intégration Python active** qui manipule HA via son API interne.

### 3.1 Architecture Python de l'intégration

```
custom_components/ui_lovelace_minimalist/
├── __init__.py      # Entry point: async_setup_entry() → async_startup()
├── base.py          # UlmBase: toute la logique configure_*()
├── config_flow.py   # Wizard d'installation UI (langue, thème, GitHub token)
├── const.py         # Constantes (DOMAIN, langues, clés de config)
├── services.yaml    # Expose un service "reload"
└── lovelace/        # Tous les assets YAML (templates, thèmes, dashboard)
```

Séquence au démarrage (`async_startup()` dans `__init__.py`) :
```python
await ulm.configure_community_cards()  # télécharge cards GitHub si activé
await ulm.configure_ulm()              # copie fichiers dans config/
await ulm.configure_plugins()          # enregistre URLs des JS cards
await ulm.configure_dashboard()        # crée le panneau Lovelace dans HA
```

### 3.2 `configure_ulm()` — Copie des fichiers

À l'intérieur de `base.py`, cette méthode crée une arborescence dans `config/ui_lovelace_minimalist/` :

```
config/
└── ui_lovelace_minimalist/
    ├── dashboard/
    │   └── ui-lovelace.yaml          ← copié depuis lovelace/ui-lovelace.yaml (si absent)
    ├── custom_cards/                 ← dossier pour les cards custom de l'utilisateur
    ├── custom_actions/
    │   └── custom_actions.yaml       ← copié depuis lovelace/custom_actions.yaml
    └── __ui_minimalist__/
        └── ulm_templates/            ← TOUS les templates button-card
            ├── card_templates/       ← 22 templates intégrés (card_light, card_battery...)
            ├── community_cards/      ← cards téléchargées depuis GitHub
            └── custom_cards/         ← cards custom de l'utilisateur (fusionnées)
```

Les templates ne sont copiés **que si le fichier n'existe pas déjà** — ça protège les modifications de l'utilisateur lors des mises à jour.

### 3.3 `configure_dashboard()` — Enregistrement du panneau

C'est ici que la magie opère. L'intégration utilise l'API interne de HA pour enregistrer un dashboard Lovelace :

```python
from homeassistant.components.lovelace import _register_panel
from homeassistant.components.lovelace.dashboard import LovelaceYAML

# Crée un dashboard Lovelace en mode YAML
hass.data["lovelace"].dashboards["ui-lovelace-minimalist"] = LovelaceYAML(
    hass,
    "ui-lovelace-minimalist",
    {
        "mode": "yaml",
        "title": "UI Lovelace Minimalist",
        "filename": "ui_lovelace_minimalist/dashboard/ui-lovelace.yaml",
        "show_in_sidebar": True,
        "require_admin": False,
    }
)

# Enregistre le panneau dans la sidebar HA
_register_panel(hass, "ui-lovelace-minimalist", "yaml", dashboard_config, True)
```

**Résultat** : le dashboard apparaît immédiatement dans la sidebar HA sans redémarrage, pointant vers le fichier YAML copié lors de `configure_ulm()`.

### 3.4 `configure_plugins()` — Ressources JS

Pour les cartes JS (button-card, mini-graph-card, etc.), l'intégration utilise :

```python
from homeassistant.components.frontend import add_extra_js_url

# Enregistre button-card comme ressource JS globale
add_extra_js_url(hass, "/ui_lovelace_minimalist/button-card.js")

# Enregistre un chemin statique pour que HA serve le fichier
hass.http.register_static_path(
    "/ui_lovelace_minimalist",
    str(self.integration_dir / "lovelace" / "js"),
    cache_headers=True
)
```

Cela évite à l'utilisateur d'ajouter manuellement les ressources dans Lovelace.

### 3.5 Le système de templates button-card

Le dashboard YAML de l'utilisateur contient une seule ligne magique :

```yaml
# config/ui_lovelace_minimalist/dashboard/ui-lovelace.yaml
button_card_templates: !include_dir_merge_named "../../custom_components/ui_lovelace_minimalist/__ui_minimalist__/ulm_templates/"
```

Cette directive HA (`!include_dir_merge_named`) charge **récursivement** tous les fichiers YAML du dossier et les fusionne en un dictionnaire. Chaque fichier définit des templates nommés :

```yaml
# card_light.yaml
card_light:
  template:
    - "icon_more_info_new"
  variables:
    ulm_card_light_name: "[[[ return entity.attributes.friendly_name ]]]"
  styles:
    card:
      - background-color: "[[[ if (entity.state === 'on') return 'rgba(255,200,0,0.2)' ]]]"
```

Utilisation dans le dashboard :
```yaml
type: "custom:button-card"
template: "card_light"
entity: light.salon
variables:
  ulm_card_light_enable_slider: true
```

---

## 4. Projets similaires — Ce que les autres ont fait

### 4.1 Projets React + HA trouvés

La recherche sur GitHub montre que **très peu de projets** tentent de faire ce que tu fais (une SPA React complète comme dashboard HA via HACS). C'est une niche — la communauté HA est majoritairement orientée YAML/Lovelace.

**Projets identifiés :**

| Projet | Approche | État |
|--------|----------|------|
| [Prism-Dashboard](https://github.com/M7mdtwab/Prism-Dashboard) | React + custom-components + HACS | Pas de releases publiées, distribution manuelle |
| [hass-browser_mod](https://github.com/thomasloven/hass-browser_mod) | TypeScript + Python integration | Très mature (1.7k ⭐), le modèle de référence |

**Prism-Dashboard** est le projet le plus proche de ha-dashboard : React, Vite, HACS, custom cards. Mais il livre ses fichiers buildés directement dans le repo (`dist/`, `www/`) et ne publie pas de releases GitHub — l'utilisateur doit cloner manuellement. Il ne résout pas non plus le problème du panneau automatique.

**browser_mod** est la référence absolue pour comprendre l'architecture hybrid TypeScript + Python integration. Il bundle son JS via rollup, l'intègre dans un custom_component Python, et utilise `add_extra_js_url()` pour l'injecter dans HA — mais c'est une extension Lovelace, pas un panneau plein écran.

### 4.2 Le pattern dominant dans la communauté

Les projets qui réussissent à intégrer une SPA dans HA suivent presque toujours l'un de ces patterns :

```
Pattern 1 — Custom Element wrapper (officiel, recommandé par les devs HA)
  React app → bundlée dans un seul JS → wrappée dans un customElements.define()
  → déclarée via panel_custom dans configuration.yaml
  → HACS distribue le .js via catégorie "Plugin (Dashboard)"

Pattern 2 — Python integration + static files serving (comme UI-main)
  React app → buildée → copiée dans le package Python
  → l'intégration sert les fichiers via hass.http.register_static_path()
  → l'intégration enregistre le panneau via async_register_built_in_panel()
  → HACS distribue tout via catégorie "integration" + zip

Pattern 3 — HA Add-on (Docker)
  React app → servie par un serveur Node/nginx dans un container Docker
  → accès via l'ingress HA Supervisor
  → distribution via un dépôt de add-ons
```

### 4.3 `panel_iframe` est supprimé — mais remplacé par "Page Web"

`panel_iframe` (l'ancienne intégration YAML) a été **supprimée de Home Assistant**. Toute la documentation ancienne qui mentionne `panel_iframe:` dans `configuration.yaml` est obsolète.

**Mais HA 2026.x a introduit un type de tableau de bord natif "Page Web"** directement dans l'UI (_Paramètres → Tableaux de bord → Ajouter → Page Web_). C'est le remplaçant officiel, intégré dans l'interface sans aucune configuration YAML.

Cela change tout pour ha-dashboard : **l'approche HACS frontend est viable** — il suffit de corriger les bugs du packaging, et l'utilisateur ajoute manuellement un tableau de bord "Page Web" une seule fois.

Les alternatives valides aujourd'hui, du plus simple au plus automatique :
1. **"Page Web" dans l'UI HA** (manuel, 1 clic) — pointe vers `/local/community/ha-react-dashboard/index.html`
2. **`panel_custom`** avec un custom element (Web Component) — via `configuration.yaml`
3. **Enregistrement programmatique** via une intégration Python (`async_register_built_in_panel`) — 100% automatique
4. **HA Add-on** avec ingress — le plus complexe

---

## 5. Analyse de ha-dashboard et ses problèmes HACS

### 5.1 Ce qui est déjà bien fait

✅ `hacs.json` avec `category: frontend` et `filename: ha-react-dashboard.zip`  
✅ `vite.config.ts` avec le mode HACS (`VITE_HACS=true` → `base: './'` pour chemins relatifs)  
✅ `.github/workflows/release.yml` qui build le projet et crée un zip  
✅ `addon.json` pour le mode Add-on  
✅ Trois modes de déploiement bien séparés  

### 5.2 Les bugs bloquants

#### Bug #1 — Mismatch crítico entre le nom du zip et `hacs.json`

Le workflow crée :
```
release-${{ github.ref_name }}.zip   →  ex: release-v1.0.8.zip
```

Mais `hacs.json` déclare :
```json
"filename": "ha-react-dashboard.zip"
```

**HACS cherche `ha-react-dashboard.zip` mais le workflow crée `release-v1.0.8.zip` → HACS ne trouve pas le fichier et l'installation échoue.**

#### Bug #2 — `zip_release: true` manquant dans `hacs.json`

Sans `"zip_release": true`, HACS tente de cloner le repo et d'installer les fichiers bruts (le code source TypeScript) au lieu du zip buildé.

#### Bug #3 — Le `dist/index.html` actuel est buildé pour le mauvais mode

Le fichier `dist/index.html` commité a des chemins absolus `/local/ha-dashboard/assets/...` — buildé sans `VITE_HACS=true`. Fix : ajouter `dist/` au `.gitignore`.

#### Bug #4 — Deux `hacs.json` en conflit

- `hacs.json` — le vrai fichier HACS (avec `category: frontend`)
- `.hacs.json` — un fichier caché avec un contenu différent (`filename: index.html`)

### 5.3 Le problème fondamental de catégorie

Avec tous les bugs corrigés, la catégorie `frontend` installe les fichiers dans `config/www/community/ha-react-dashboard/`. Ils sont accessibles à l'URL `/local/community/ha-react-dashboard/index.html`.

**HA n'ouvre PAS ce fichier automatiquement** — mais depuis HA 2026.x, il suffit d'une seule action manuelle :

> _Paramètres → Tableaux de bord → Ajouter → **Page Web** → URL : `/local/community/ha-react-dashboard/index.html`_

C'est la solution la plus simple. Elle nécessite juste de corriger les bugs du packaging (sections 5.2 ci-dessus).

Pour une installation **100% automatique sans aucune action manuelle**, il faudrait une intégration Python (voir section 6).

---

## 6. La solution recommandée selon le niveau souhaité

### Niveau 1 — Le plus simple : HACS Frontend + "Page Web" (✅ recommandé pour usage personnel)

Corriger les 4 bugs du packaging (section 5.2), puis :

1. Installer depuis HACS → les fichiers arrivent dans `/www/community/ha-react-dashboard/`
2. Dans HA : _Paramètres → Tableaux de bord → Ajouter → **Page Web**_
3. URL : `/local/community/ha-react-dashboard/index.html`
4. Titre + icône → Sauvegarder

C'est tout. Le tableau de bord apparaît dans la sidebar. Cette approche est **viable et propre** avec HA 2026.x.

**Limitation** : `index.html` est une SPA avec `@hakit/core` qui gère l'auth via WebSocket — ça fonctionne bien dans un iframe "Page Web" si `VITE_HACS=true` (chemins relatifs).

---

### Niveau 2 — Installation 100% automatique : React Web Component + Python Integration

### 6.1 Pourquoi cette approche ?

C'est le seul chemin qui offre :
- ✅ Installation via HACS en un clic
- ✅ Panneau HA enregistré **automatiquement** dans la sidebar (0 configuration manuelle)
- ✅ React app 100% fonctionnelle / accès direct à `hass` object (pas d'iframe)
- ✅ Compatible HA 2026.x

### 6.2 Architecture cible

```
repo/
├── hacs.json                          ← catégorie: integration
├── custom_components/
│   └── ha_react_dashboard/
│       ├── manifest.json              ← domain, config_flow: false
│       ├── __init__.py                ← async_setup_entry() → enregistre panneau + static
│       └── www/
│           ├── ha-react-dashboard.js  ← le bundle React (Web Component)
│           └── assets/                ← CSS, fonts, chunks
├── src/                               ← code source React
├── vite.config.ts                     ← mode "web component" (iife/esm, pas d'index.html)
└── .github/
    └── workflows/
        └── release.yml                ← npm build → copie dist/ dans custom_components/www/ → zip
```

### 6.3 Étape 1 — Wrapper Web Component pour React

HA exige que les panels soient des **custom elements**. Il faut wrapper ton app React dans un Web Component. Ce fichier remplace ton `main.tsx` pour le build HACS :

**`src/ha-panel.ts`** (point d'entrée pour le build Web Component) :
```typescript
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

class HaReactDashboardPanel extends HTMLElement {
  private _hass: any;
  private _root: any;

  connectedCallback() {
    // Crée un shadow DOM isolé (ou root normal selon préférence)
    const mountPoint = document.createElement('div');
    mountPoint.style.cssText = 'width:100%;height:100%;';
    this.appendChild(mountPoint);
    
    this._root = createRoot(mountPoint);
    this._root.render(
      React.createElement(App, { hass: this._hass })
    );
  }

  disconnectedCallback() {
    this._root?.unmount();
  }

  // HA injecte l'objet hass automatiquement via cette propriété
  set hass(hass: any) {
    this._hass = hass;
    // Re-render si le composant est déjà monté
    if (this._root) {
      this._root.render(
        React.createElement(App, { hass })
      );
    }
  }

  // HA appelle setConfig() avec la config du panneau
  setConfig(config: any) {}
}

customElements.define('ha-react-dashboard-panel', HaReactDashboardPanel);
```

**`vite.config.ts`** — mode build pour Web Component :
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isHACS = process.env.VITE_HACS === 'true';

export default defineConfig({
  plugins: [react()],
  build: isHACS ? {
    // Build en librairie : un seul fichier JS auto-contenu
    lib: {
      entry: 'src/ha-panel.ts',
      name: 'HaReactDashboard',
      fileName: 'ha-react-dashboard',
      formats: ['iife'],   // iife = Immediately Invoked Function Expression, auto-contenu
    },
    rollupOptions: {
      // Ne pas externaliser React — tout doit être dans le bundle
      external: [],
    },
    outDir: 'custom_components/ha_react_dashboard/www',
  } : {
    // Build normal pour le dev SSH/addon
    outDir: 'dist',
  },
});
```

> **Note** : le format `iife` produit un fichier unique `ha-react-dashboard.iife.js` qui s'auto-exécute et enregistre le custom element. Tout React est inclus dedans (~200-400 Ko après minification).

### 6.4 Étape 2 — Intégration Python minimale

**`custom_components/ha_react_dashboard/manifest.json`** :
```json
{
  "domain": "ha_react_dashboard",
  "name": "HA React Dashboard",
  "codeowners": ["@ton-github-username"],
  "config_flow": false,
  "dependencies": ["frontend"],
  "documentation": "https://github.com/ton-username/ha-react-dashboard",
  "integration_type": "service",
  "iot_class": "local_push",
  "issue_tracker": "https://github.com/ton-username/ha-react-dashboard/issues",
  "requirements": [],
  "version": "1.0.0"
}
```

**`custom_components/ha_react_dashboard/__init__.py`** :
```python
"""HA React Dashboard custom integration."""
from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import (
    add_extra_js_url,
    async_register_built_in_panel,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

_LOGGER = logging.getLogger(__name__)

DOMAIN = "ha_react_dashboard"
PANEL_URL = "ha-react-dashboard"
PANEL_TITLE = "React Dashboard"
PANEL_ICON = "mdi:view-dashboard-variant"
JS_FILE = "ha-react-dashboard.iife.js"


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the HA React Dashboard integration."""
    # 1. Enregistre le chemin statique vers les fichiers buildés
    www_path = Path(__file__).parent / "www"
    hass.http.register_static_path(
        f"/hakit/{DOMAIN}",
        str(www_path),
        cache_headers=True,
    )

    # 2. Injecte le JS dans chaque page HA (enregistre le custom element)
    add_extra_js_url(hass, f"/hakit/{DOMAIN}/{JS_FILE}")

    # 3. Enregistre le panneau dans la sidebar HA
    async_register_built_in_panel(
        hass,
        component_name="custom",   # type "custom" = custom element
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        frontend_url_path=PANEL_URL,
        config={
            "_panel_custom": {
                "name": "ha-react-dashboard-panel",  # doit correspondre à customElements.define()
                "js_url": f"/hakit/{DOMAIN}/{JS_FILE}",
                "embed_iframe": False,
                "trust_external_script": False,
            }
        },
        require_admin=False,
    )

    _LOGGER.info("HA React Dashboard panel registered")
    return True
```

> `config_flow: false` signifie que l'intégration s'active via `configuration.yaml` avec `ha_react_dashboard:` — pas de wizard. C'est plus simple pour ce cas d'usage.

Pour activer sans wizard, l'utilisateur ajoute dans `configuration.yaml` :
```yaml
ha_react_dashboard:
```

OU tu actives `config_flow: true` et tu crées un `config_flow.py` vide (avec just un `async_step_user` qui finish directement) pour que l'installation se fasse depuis l'UI HA.

### 6.5 Étape 3 — Pipeline CI/CD complet

**`.github/workflows/release.yml`** :
```yaml
name: Build and Release

on:
  release:
    types: [published]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type-check
        run: npm run type-check

      - name: Run tests
        run: npm run test:run

      - name: Build Web Component bundle (HACS mode)
        run: npm run build
        env:
          VITE_HACS: 'true'
        # → produit custom_components/ha_react_dashboard/www/ha-react-dashboard.iife.js

      - name: Patch version in manifest.json
        run: |
          VERSION="${GITHUB_REF_NAME#v}"
          python3 -c "
          import json, sys
          path = 'custom_components/ha_react_dashboard/manifest.json'
          with open(path) as f: m = json.load(f)
          m['version'] = sys.argv[1]
          with open(path, 'w') as f: json.dump(m, f, indent=2)
          print(f'Version set to {sys.argv[1]}')
          " "$VERSION"

      - name: Create ZIP from custom_components folder
        run: |
          cd custom_components
          zip -r ../ha-react-dashboard.zip ha_react_dashboard/
          cd ..
          ls -lh ha-react-dashboard.zip

      - name: Upload ZIP to Release
        uses: softprops/action-gh-release@v1
        with:
          files: ha-react-dashboard.zip
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Points clés du workflow :**
1. Le build React produit directement dans `custom_components/ha_react_dashboard/www/` — pas de `dist/`
2. Le zip contient `ha_react_dashboard/` (avec Python + JS) — c'est ce que HACS installe dans `custom_components/`
3. La version est patchée dans `manifest.json` avant le zip

**Structure du zip résultant :**
```
ha-react-dashboard.zip
└── ha_react_dashboard/
    ├── manifest.json          ← version patchée par la CI
    ├── __init__.py            ← enregistre le panneau au démarrage
    └── www/
        └── ha-react-dashboard.iife.js   ← React bundlé
```

HACS dézippe ça dans `config/custom_components/ha_react_dashboard/`.

### 6.6 Étape 4 — `hacs.json` pour une intégration

Changer le `hacs.json` à la racine :
```json
{
  "name": "HA React Dashboard",
  "render_readme": true,
  "homeassistant": "2026.1.0",
  "zip_release": true,
  "filename": "ha-react-dashboard.zip",
  "hacs": "2.0.5"
}
```

Supprimer le champ `"category"` — HACS détecte automatiquement la catégorie `integration` via la présence de `custom_components/`.

### 6.7 Étape 5 — Validation HACS en CI

**`.github/workflows/hacs-validate.yml`** :
```yaml
name: Validate HACS

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: HACS validation
        uses: hacs/action@main
        with:
          category: integration

      - name: HA hassfest validation
        uses: home-assistant/actions/hassfest@master
```

---

## 7. Alternative rapide sans Python — `panel_custom` manuel

Si tu veux éviter Python et juste tester vite, tu peux utiliser le build IIFE et déclarer le panneau manuellement dans `configuration.yaml` (après avoir copié le JS dans `/config/www/`).

**Workflow CI simplifié** (pour usage personnel, sans HACS) :
```yaml
- name: Build
  run: npm run build
  env:
    VITE_HACS: 'true'
    # → produit ha-react-dashboard.iife.js

- name: Deploy via SSH
  uses: appleboy/scp-action@v0.1.7
  with:
    host: ${{ secrets.HA_HOST }}
    username: ${{ secrets.HA_USER }}
    key: ${{ secrets.HA_SSH_KEY }}
    source: "dist/ha-react-dashboard.iife.js,dist/assets/"
    target: "/config/www/ha-react-dashboard/"
```

Puis dans `configuration.yaml` :
```yaml
panel_custom:
  - name: ha-react-dashboard-panel
    url_path: react-dashboard
    sidebar_title: React Dashboard
    sidebar_icon: mdi:view-dashboard-variant
    module_url: /local/ha-react-dashboard/ha-react-dashboard.iife.js
```

Redémarrer HA → le panneau apparaît dans la sidebar.

---

## 8. Référence — Fichiers clés UI-main

| Fichier | Rôle |
|---------|------|
| `hacs.json` | Métadonnées HACS (zip_release, filename, version HA min) |
| `custom_components/ui_lovelace_minimalist/manifest.json` | Manifest HA (domain, config_flow, dependencies) |
| `custom_components/ui_lovelace_minimalist/__init__.py` | Entry point Python (async_setup_entry) |
| `custom_components/ui_lovelace_minimalist/base.py` | Logique principale (configure_ulm, configure_dashboard) |
| `custom_components/ui_lovelace_minimalist/config_flow.py` | Assistant de configuration UI |
| `.github/workflows/release.yml` | Pipeline de release → zip → upload GitHub |
| `.github/update_hacs_manifest.py` | Injecte la version dans manifest.json |
| `.github/workflows/hacs-validate.yml` | Validation HACS + hassfest sur chaque PR |

---

## Résumé visuel — Les architectures

```
NIVEAU 1 — HACS Frontend + "Page Web" (simple, 1 étape manuelle)
══════════════════════════════════════════════════════════════════
GitHub Release → ha-react-dashboard.zip → HACS → /www/community/ha-react-dashboard/
                                                              ↓
                                  index.html accessible à /local/community/ha-react-dashboard/
                                                              ↓
                            HA → Paramètres → Tableaux de bord → Ajouter → "Page Web"
                                    URL: /local/community/ha-react-dashboard/index.html  ✅


NIVEAU 2 — Python Integration + Web Component (0 configuration manuelle)
══════════════════════════════════════════════════════════════════════════
GitHub Release → ha-react-dashboard.zip → HACS → custom_components/ha_react_dashboard/
                                                              ↓
                                     async_setup() au démarrage HA
                                                 ↓
                        ┌────────────────────────────────────────────┐
                        │ register_static_path() → sert le bundle JS │
                        │ add_extra_js_url() → injecte React dans HA │
                        │ async_register_built_in_panel()            │
                        │  → "React Dashboard" dans la sidebar HA    │ ← AUTOMATIQUE ✅
                        └────────────────────────────────────────────┘


UI LOVELACE MINIMALIST (référence — YAML templates + Python)
══════════════════════════════════════════════════════════════
GitHub Release → zip → HACS → custom_components/
  Python s'exécute → copie YAML → enregistre panneau Lovelace
```

---

*Document créé le 21 mars 2026 — Analyse basée sur UI Lovelace Minimalist v1.4.4 et HA 2026.3*
