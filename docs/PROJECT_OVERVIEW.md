# HA-Dashboard - Vue d'ensemble du projet

## 📋 Description générale

**HA-Dashboard** est un tableau de bord web personnel pour Home Assistant. C'est un projet **React + TypeScript + Vite** qui offre une alternative au tableau de bord standard de Home Assistant, avec un focus sur l'**esthétique**, l'**interactivité** et une **expérience utilisateur moderne**.

**Objectif principal** : Créer un tableau de bord magnifique et sexy (responsive sur ordi, tablette, téléphone) qui soit approuvé par la moitié significative (SO - Significant Other). 

Stack : **Full Stack React** (plus de YAML configuré manuellement)

---

## 🎨 Caractéristiques actuelles

### Widgets/Cartes implémentées
- **GreetingCard** : Horloge et accueil personnalisé
- **WeatherCard** : Affichage météo
- **EnergyCard** : Consommation énergétique
- **TempoCard** : Couleurs EDF TEMPO
- **ThermostatCard** : Contrôle climatisation
- **RoomsGrid** : Aperçu des pièces
- **ActivityBar** : Barre de statut (lumières, poêle, etc.)
- **ShortcutsCard** : Raccourcis rapides
- **CameraCard** : Flux caméra
- **PelletCard** : État du poêle à pellets
- **AlarmCard** : État des alarmes

### Panneaux (overlays)
- **LightsPanel** : Contrôle des lumières
- **ShuttersPanel** : Contrôle des volets
- **VacuumPanel** : Contrôle de l'aspirateur robot
- **SecurityPanel** : Contrôle du système de sécurité
- **NotificationsPanel** : Notifications
- **FlowersPanel** : État des plantes (humidité, lumière)
- **CameraPanel** : Galerie caméras

### Fonctionnalités UX
✅ Animations fluides avec Framer Motion
✅ Barre de navigation inférieure (responsive)
✅ Design moderne avec gradients et blur effects (glassmorphism)
✅ Intégration complète Home Assistant (@hakit/core)
✅ Toast notifications personnalisées
✅ Support du son pour notifications
✅ Adaptation responsive (mobile, tablette, desktop)
✅ Storybook pour les composants
✅ Déploiement SSH automatisé vers Home Assistant

---

## 🏗️ Architecture

```
src/
├── App.tsx                 # Entrée principale, providers
├── Dashboard.tsx           # Layout principal
├── components/
│   ├── cards/             # Widgets (GreetingCard, WeatherCard, etc.)
│   ├── panels/            # Overlays modaux (LightsPanel, etc.)
│   ├── layout/            # Composants layout (BottomNav, Panel)
│   └── ui/                # Composants UI génériques
├── context/               # Contextes React (PanelContext, ToastContext)
├── hooks/                 # Hooks custom (useHAToast, useSafeEntity)
├── lib/                   # Utilitaires (sounds.ts, utils.ts)
└── index.css              # Styles globaux Tailwind
```

### Patterns utilisés
- **Provider Pattern** : `PanelProvider`, `ToastProvider` pour state global
- **Context API** : Gestion du panel actif et des toasts
- **Custom Hooks** : `useHAToast()`, `useSafeEntity()`
- **Framer Motion** : Animations des panels et transitions
- **Tailwind CSS** : Styling utility-first

---

## ⚙️ Stack technique

| Tech | Rôle |
|------|------|
| **React 19** | Framework UI |
| **TypeScript** | Type safety |
| **Vite** | Bundler ultra-rapide |
| **Tailwind CSS** | Styling |
| **Framer Motion** | Animations |
| **@hakit/core** | Client Home Assistant |
| **@hakit/components** | Composants HA pré-faits |
| **Lucide React** | Icônes |
| **Storybook** | Component previews |
| **ESLint + Prettier** | Linting & formatting |

---

## 📊 État vs GlassHome (comparaison)

### ✅ Implémenté (similaire à GlassHome)
- Multiple widgets (méto, caméra, thermostats, etc.)
- Panneaux détaillés pour chaque système
- Design moderne et responsive
- Animations fluides
- Intégration complète Home Assistant
- Contrôle d'entités

### ❌ Manquant par rapport à GlassHome

| Fonctionnalité | Important | Notes |
|---|---|---|
| **Drag & Drop personnalisé** | ⭐⭐⭐⭐⭐ | Repositionner les widgets et les redimensionner |
| **Sauvegarde de layout** | ⭐⭐⭐⭐⭐ | Persister la configuration utilisateur |
| **Éditeur visuel du tableau de bord** | ⭐⭐⭐⭐ | Mode édition pour configurer |
| **Système de zones/pièces** | ⭐⭐⭐⭐ | Filtrer les widgets par pièce |
| **Configuration UI (pas YAML)** | ⭐⭐⭐⭐ | Point fort de GlassHome |
| **Widgets additionnels** | ⭐⭐⭐ | Zone (aperçu pièce), Batteries, Scènes |
| **Groupes d'entités** | ⭐⭐⭐ | Contrôler plusieurs lumières ensemble |
| **IA et ML** | ⭐⭐ | Fonctionnalités futures mentionnées |

---

## 🔧 Commandes utiles

```bash
# Développement
npm run dev

# Build
npm run build

# Déployer vers Home Assistant
npm run deploy

# Synchroniser les types HA
npm run sync

# Storybook
npm run storybook
```

---

## 🚀 Prochaines étapes prioritaires

1. **[CRUCIALE]** Implémenter drag-and-drop + sauvegarde du layout
   - Utiliser une lib comme `react-beautiful-dnd` ou `dnd-kit`
   - Stocker en localStorage (local) ou Home Assistant (cloud)
   - Ajouter mode "édition" du tableau de bord

2. **Système de configuration dynamique**
   - UI pour ajouter/retirer/configurer les widgets
   - Gestion des zones/pièces
   - Filtrage des entités par zone

3. **Expansion des widgets**
   - Zone complète (aperçu pièce avec image)
   - Batteries (status + alertes)
   - Scènes
   - Timeline/historique

4. **Groupe d'entités**
   - Permettre de grouper les lumières
   - Contrôle batch

5. **Mode nuit / Tailles adaptatives**
   - Meilleur responsive sur mobile
   - Réduction de taille des widgets sur petit écran
