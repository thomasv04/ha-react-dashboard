# HA-Dashboard - Knowledge Base pour l'IA

Ce fichier est pour que l'IA (Copilot) se souvienne rapidement du contexte du projet chez chaque nouvelle conversation.

---

## 📍 Localisation projet

```
📁 d:\Utilisateurs\thomas\Documents\Development\home-assistant\ha-dashboard
```

## 🎯 Objectif du projet

**Créer un tableau de bord web pour Home Assistant qui soit :**
- ✨ **Beau et sexy** (design moderne avec glassmorphism)
- 👨‍👩‍👧 **Approuvé par la moitié significative** (SO - Significant Other)
- 📱 **Responsive** (mobile, tablette, desktop)
- ⚡ **Performant et fluide**
- 🎨 **Configurable visuellement** (pas de YAML)
- 🖱️ **Drag & drop** pour personalisation

*Inspiré par GlassHome (https://www.reddit.com/r/homeassistant/comments/...)*

---

## 🏗️ Stack technique

| Layer | Tech |
|-------|------|
| **Runtime** | React 19 + TypeScript |
| **Bundler** | Vite |
| **Styling** | Tailwind CSS 4 + Framer Motion |
| **Icons** | Lucide React |
| **HA Integration** | @hakit/core + @hakit/components |
| **Components** | Storybook, Radix UI |
| **Deploy** | SSH vers Home Assistant |

## 📦 Dépendances clés

```json
{
  "@hakit/core": "^6.0.2",        // Client HA (entities, services)
  "@hakit/components": "^6.0.2",  // Composants pré-faits
  "framer-motion": "^12.38.0",    // Animations
  "lucide-react": "^0.577.0",     // Icônes 300+
  "tailwindcss": "^4.2.2",        // Styling
  "react": "^19.2.4",
  "react-dom": "^19.2.4"
}
```

---

## 📁 Structure source

```
src/
├── App.tsx                          // Entrée + Providers
├── Dashboard.tsx                    // Layout principal grid
├── main.tsx                         // Bootstrap
├── index.css                        // Styles globaux Tailwind
│
├── components/
│   ├── cards/                       // Widgets individuels
│   │   ├── GreetingCard.tsx         // Horloge + welcome
│   │   ├── WeatherCard.tsx          // Météo
│   │   ├── EnergyCard.tsx           // Consommation énergétique
│   │   ├── TempoCard.tsx            // Couleur TEMPO EDF
│   │   ├── ThermostatCard.tsx       // Thermostat + clim
│   │   ├── RoomsGrid.tsx            // Aperçu des pièces
│   │   ├── ActivityBar.tsx          // Status pills (haut)
│   │   ├── ShortcutsCard.tsx        // Boutons rapides
│   │   ├── CameraCard.tsx           // Flux caméra
│   │   ├── PelletCard.tsx           // État poêle
│   │   ├── AlarmCard.tsx            // Alarmes
│   │   └── *.stories.tsx            // Storybook stories
│   │
│   ├── panels/                      // Modal overlays
│   │   ├── LightsPanel.tsx          // Contrôle lumières
│   │   ├── ShuttersPanel.tsx        // Contrôle volets
│   │   ├── VacuumPanel.tsx          // Aspirateur
│   │   ├── SecurityPanel.tsx        // Sécurité
│   │   ├── NotificationsPanel.tsx
│   │   ├── FlowersPanel.tsx         // Plantes + moniteur eau
│   │   └── CameraPanel.tsx
│   │
│   ├── layout/
│   │   ├── BottomNav.tsx            // Navigation inférieure
│   │   ├── Panel.tsx                // Wrapper modal + animation
│   │   └── ...
│   │
│   └── ui/                          // Composants génériques
│       └── Toast.tsx                // Notifications toast
│
├── context/                         // État globale
│   ├── PanelContext.tsx             // Quel panel actif?
│   └── ToastContext.tsx             // Queue notifications
│
├── hooks/                           // Custom hooks
│   ├── useHAToast.ts                // Subscribe toasts HA
│   └── useSafeEntity.ts             // Get entity with fallback
│
└── lib/
    ├── sounds.ts                    // Audio notifications
    └── utils.ts                     // Utilitaires
```

---

## 🎨 Widgets actuels (11)

| Widget | Fichier | Entity | État |
|--------|---------|--------|------|
| 🕐 Horloge & Greeting | `GreetingCard.tsx` | - | ✅ OK |
| ☀️ Météo | `WeatherCard.tsx` | `weather.*` | ✅ OK |
| ⚡ Énergie | `EnergyCard.tsx` | `sensor.*energy` | ✅ OK |
| 🌈 TEMPO | `TempoCard.tsx` | `input_select.tempo` | ✅ OK |
| 🌡️ Thermostat | `ThermostatCard.tsx` | `climate.*` | ✅ OK |
| 🏠 Pièces | `RoomsGrid.tsx` | `zone.*` ou custom | ✅ OK |
| 💡 Activité | `ActivityBar.tsx` | `light.*` | ✅ OK |
| 🔗 Raccourcis | `ShortcutsCard.tsx` | hardcodé | ✅ OK |
| 📹 Caméra | `CameraCard.tsx` | `camera.*` | ✅ OK |
| 🪵 Poêle | `PelletCard.tsx` | `climate.pellet` | ✅ OK |
| 🚨 Alarme | `AlarmCard.tsx` | `alarm_control_panel.*` | ✅ OK |

**Manquants:** Battery, Scenes, Sensor avancé, Zone imagery

---

## 🎮 Patterns & Architecture

### Context API
- `PanelContext` : Quel panel est actif (overlay)
- `ToastContext` : Queue de notifications

### Custom Hooks
- `usePanel()` : Ouvrir/fermer panels
- `useHass()` : Accéder aux entities Home Assistant
- `useHAToast()` : Subscribe events notification HA

### Animations
- Framer Motion : `motion.div`, `AnimatePresence`
- Spring physics pour les overlays

### Styling
- Tailwind CSS (utility-first)
- Variables CSS dynamiques (@hakit/components)
- Responsive: `mobile` → `lg:` breakpoint

---

## 🔌 Commandes déploiement

```bash
# Dev local
npm run dev                   # Host: http://localhost:5173

# Build
npm run build                 # Output: dist/

# Déployer vers HA via SSH
npm run deploy               # Nécessite .env: SSH credentials

# Sync Home Assistant types
npm run sync                 # Récupère entity types depuis HA

# Storybook (component preview)
npm run storybook            # http://localhost:6006
npm run build-storybook      # Statique pour docs

# Linting
npm run lint                 # ESLint
npm run prettier             # Format code
```

---

## 🌐 Variables d'environnement (.env)

```bash
VITE_HA_URL=https://home.example.com     # URL Home Assistant
VITE_HA_TOKEN=eyJ0eXAiOiJKV1...          # Token HA (long term)
VITE_SSH_USERNAME=root                    # SSH user
VITE_SSH_HOSTNAME=192.168.1.100           # SSH IP/domain
VITE_SSH_PASSWORD=password                # SSH password
VITE_FOLDER_NAME=dashboard                # Dossier sur HA
```

---

## 🎯 État vs GlassHome

**Similaires** ✅
- Widget météo, caméra, thermostat
- Design moderne + animations
- Responsive multi-device
- Intégration HA complète
- Panneau complet pour chaque système

**Manquants** ❌ (CRITIQUES)
- **Drag & Drop** des widgets
- **Sauvegarde du layout** personnalisé
- **Mode édition** visuelle

**Manquants** ⚠️ (Important)
- 4 widgets additionnels
- Groupes d'entités
- Système de zones avancé

---

## 🚀 Prochaine phase (Phase 1)

**Objectif** : Implémenter drag-and-drop + sauvegarde pour égaler GlassHome

### Actions
1. Installer `react-grid-layout`
2. Créer `DashboardLayoutContext.tsx`
3. Wrapper `DashboardGrid.tsx` autour des widgets
4. Implémentation localStorage + synchro HA
5. Mode édition (toggle)
6. Tests responsive

### Durée
~1-2 semaines de dev

### Librairy recommandée
```bash
npm install react-grid-layout @types/react-grid-layout
```

---

## 📚 Documentation locale

Tous les fichiers docs sont dans `docs/`:

1. **SUMMARY.md** - Résumé exécutif (2 min read)
2. **PROJECT_OVERVIEW.md** - Vue complète (5 min)
3. **DRAG_DROP_EXPLANATION.md** - Technique DnD (10 min)
4. **ROADMAP_AND_COMPARISON.md** - Plan détaillé (15 min)
5. **AI_MEMORY.md** - Ce fichier (pour l'IA) ← *Vous êtes ici*

---

## 🔗 Ressources externes

| Ressource | URL |
|-----------|-----|
| React Grid Layout | https://react-grid-layout.github.io/ |
| @hakit/core Docs | https://shannonhochkins.github.io/ha-component-kit/ |
| Home Assistant API | https://developers.home-assistant.io/ |
| Tailwind CSS | https://tailwindcss.com/ |
| Framer Motion | https://www.framer.com/motion/ |

---

## 🎨 Design System

### Couleurs (via Tailwind)
- Primary: Dynamique (thème HA)
- Secondary: Blancs/gris pour contraste
- Accents: Orange, purple, blue, green par type

### Spacing
- Gaps: 4, 8, 12, 16 px (Tailwind scale)
- Padding cartes: px-6 py-4

### Borderradius
- Cartes: rounded-3xl (large coins)
- Buttons: rounded-lg

### Animations
- Panel overlay: spring stiffness 300
- Entrée/sortie: 0.2-0.3s

---

## 🧪 Testing

**Actuellement:**
- Storybook pour component review
- ESLint pour linting
- Prettier pour code formatting

**À ajouter:**
- E2E tests (Playwright) pour DnD
- Unit tests pour hooks
- Mobile device testing

---

## 👤 Personne responsable

```
Thomas (le propriétaire)
Stack: React + Home Assistant enthusiast
But: Faire un dashboard SO-approved ✨
```

---

## 💬 Citation inspiratrice

> "ce qui commence par un petit 'je vais régler ça vite fait' se transforme en un projet à part entière qui vous bouffe des jours de votre vie."

→ Oui une vraie passion du projet! 🔥

