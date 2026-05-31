# Prompt — Audit qualité projet ha-dashboard (Claude Opus 4.6)

> Copier-coller ce prompt dans une session Claude Opus 4.6 après avoir partagé l'arbre de fichiers ou le contenu du dépôt.

---

## Prompt

Tu es un expert senior en développement frontend TypeScript/React, architecture logicielle, sécurité web et qualité de code. Je vais te partager le code source complet d'un projet open-source : **ha-dashboard**, un tableau de bord React pour Home Assistant. Il est construit avec Vite, React 18, TypeScript, Tailwind CSS v4, @hakit/core et @hakit/components.

**Stack technique :**
- Frontend : React 18 + TypeScript strict, Vite, Tailwind CSS v4
- State management : Context API (pas de Zustand/Redux)
- Tests : Vitest + Testing Library + Playwright (e2e)
- Backend : Node.js (Express + better-sqlite3)
- i18n : système maison (fichiers JSON locales en/fr)
- Storybook pour les composants UI

**Architecture des sources :**
```
src/
├── App.tsx / Dashboard.tsx / main.tsx
├── components/
│   ├── cards/          ← ~24 widgets (LightCard, WeatherCard, VacuumCard, etc.)
│   ├── layout/         ← grille, modals d'édition, ajout de widget
│   ├── panels/         ← LightsPanel, FlowersPanel
│   ├── custom-panels/  ← éditeur de panneaux custom
│   ├── modals/         ← MoreInfo modals par type d'entité
│   ├── wallpanel/      ← mode "écran d'affichage"
│   └── ui/             ← composants UI génériques (Modal, Toast, etc.)
├── context/            ← DashboardLayoutContext (god object ~900 lignes), ThemeContext, etc.
├── config/             ← widget-registry, widget-dispositions, size-presets
├── hooks/              ← useDashboardConfig, useSafeEntity, useHAModal, etc.
├── types/              ← widget-types, widget-fields, widget-configs
└── i18n/               ← locales en/fr (common, widgets, panels, settings, layout, etc.)

server/
├── index.js            ← Express + helmet, serveur statique
├── db.js               ← SQLite (better-sqlite3)
└── routes/             ← config, settings, profiles, uploads, translations
```

**Effectue un audit complet et structuré en analysant les axes suivants :**

### 1. Architecture & structure du code
- Le `DashboardLayoutContext` est un "god object" — comment le découper proprement ?
- La séparation des responsabilités est-elle respectée entre composants, hooks et contextes ?
- Les patterns React utilisés sont-ils appropriés (mémoïsation, colocalization, composition) ?
- Y a-t-il des dépendances circulaires ou des couplages problématiques ?

### 2. Qualité TypeScript
- Utilisation de `as any` — identifier tous les cas et proposer des alternatives typées
- Types trop permissifs (`unknown`, unions démesurées, types fantômes)
- Les interfaces de configuration des widgets (`widget-types.ts`, `widget-fields.ts`) sont-elles bien structurées ?
- Exhaustivité des discriminated unions (ex: `WidgetConfig`)
- La rigueur du mode strict est-elle bien exploitée ?

### 3. Sécurité (OWASP Top 10)
- Le serveur Express utilise `helmet` — la CSP est-elle correctement configurée pour le SPA ?
- Validation des inputs côté serveur (payload `data` des profils, noms de fichiers uploadés)
- Pas d'authentification sur les routes API — est-ce intentionnel ? Quels risques ?
- Le token Home Assistant (`VITE_HA_TOKEN`) est utilisé en dev — risque d'exposition ?
- Les routes `PUT/DELETE /api/profiles/:id` n'ont pas de vérification d'ownership

### 4. Performance
- Quelles sont les re-renders inutiles probables étant donné la structure des contextes ?
- Le découpage de bundle (code splitting) est-il bien fait pour les ~24 widgets ?
- Les hooks custom utilisent-ils correctement `useMemo` / `useCallback` ?
- Le virtualisme du picker d'icônes Lucide est-il suffisant ?

### 5. Tests
- La couverture actuelle est faible (manque : VacuumCard, MediaPlayerCard, AutomationCard, tous les modals MoreInfo, tous les hooks, WallPanel). Quelle stratégie de tests prioriser ?
- Les tests existants sont-ils bien structurés (isolation, mocks, assertions significatives) ?
- Les tests e2e Playwright couvrent-ils les cas critiques ?

### 6. i18n
- Y a-t-il des chaînes hardcodées résiduelles dans les composants TSX ?
- La structure des fichiers de traduction est-elle cohérente et maintenable ?
- Le mécanisme de fallback fr→en est-il fiable ?

### 7. Accessibilité (WCAG AA)
- Les widgets de la grille ont-ils les rôles ARIA appropriés ?
- La navigation clavier est-elle possible dans les modals ?
- Les boutons et icônes interactifs ont-ils des labels accessibles ?
- Y a-t-il un lien "skip to content" ?

### 8. Maintenabilité & dette technique
- Le registre de widgets (checklist obligatoire de 9 fichiers à synchroniser manuellement) — comment l'automatiser ou le rendre plus sûr ?
- Les `barrel exports index.ts` manquants pour ~10 cards — impact réel ?
- Les `console.log` laissés en production — comment les éliminer systématiquement ?
- La convention de nommage est-elle cohérente à travers le projet ?

### 9. Conformité REST / API server
- `POST /` pour sauvegarder la config au lieu de `PUT /` — est-ce un vrai problème ?
- `GET /api/profiles` sans pagination — risque réel en pratique ?
- La gestion des erreurs côté serveur est-elle homogène ?

### 10. Recommandations priorisées
Classe tes recommandations selon la matrice **Impact × Effort** :

| Priorité | Recommandation | Impact | Effort | Catégorie |
|----------|---------------|--------|--------|-----------|
| P0 | ... | 🔴 Critique | ... | Sécurité |
| P1 | ... | 🟠 Haut | ... | ... |
| P2 | ... | 🟡 Moyen | ... | ... |
| P3 | ... | 🟢 Faible | ... | ... |

---

**Format de réponse attendu :**
- Réponse en français
- Une section par axe avec des observations concrètes (avec références aux fichiers/lignes si possible)
- Des extraits de code pour illustrer les problèmes ET les solutions recommandées
- Sois direct et critique — ne cache pas les vrais problèmes par politesse
- Distingue ce qui est un vrai problème de ce qui est un choix délibéré acceptable
- Termine par un **score de qualité global** sur 10 avec justification

**Contexte additionnel :**
- C'est un projet personnel / open-source pour usage domotique
- Il n'y a pas d'authentification car le dashboard est destiné à un réseau local privé (Nginx/proxy en amont)
- Le serveur Node.js est un backend léger (BFF), pas une API publique
- L'objectif est d'avoir un code propre, maintenable et extensible pour ajouter facilement de nouveaux types de widgets
