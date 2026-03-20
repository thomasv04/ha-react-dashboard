# Analyse comparative avec GlassHome & Roadmap

## 📊 Matrice comparative

### Widgets

| Widget | HA-Dashboard | GlassHome | Priorité |
|--------|---|---|---|
| Lumières | ✅ (LightsPanel) | ✅ | ✅ OK |
| Météo | ✅ (WeatherCard) | ✅ | ✅ OK |
| Caméra | ✅ (CameraCard/Panel) | ✅ | ✅ OK |
| Thermostat/Clim | ✅ (ThermostatCard) | ✅ | ✅ OK |
| Capteurs | ⚠️ (partial) | ✅ | 🔴 MANQUE |
| Batterie | ❌ | ✅ | 🔴 MANQUE |
| Scènes | ❌ | ✅ | 🔴 MANQUE |
| Zone/Pièce | ⚠️ (RoomsGrid basic) | ✅ (advanced) | 🟡 À améliorer |
| Volets | ✅ (ShuttersPanel) | ✅ | ✅ OK |
| Aspirateur | ✅ (VacuumPanel) | ✅ | ✅ OK |
| Sécurité/Alarme | ✅ (SecurityPanel) | ✅ | ✅ OK |
| Plantes | ✅ (FlowersPanel) | ✅ | ✅ OK |
| **Horloge** | ✅ (GreetingCard) | ✅ | ✅ OK |
| **Énergie** | ✅ (EnergyCard) | ✅ | ✅ OK |

**Score**: 11/15 widgets = 73% de couverture

---

### Fonctionnalités UX

| Fonctionnalité | HA-Dashboard | GlassHome | Importance |
|---|---|---|---|
| **Drag & Drop** | ❌ Layout fixe | ✅ Interactif | 🔴 CRITIQUE |
| **Sauvegarde Layout** | ❌ Hardcodé | ✅ Sauvegardé | 🔴 CRITIQUE |
| **Mode Édition** | ❌ | ✅ | 🔴 CRITIQUE |
| **Animations fluides** | ✅ Framer Motion | ✅ | ✅ OK |
| **Responsive mobile** | ✅ Tailwind media | ✅ | ✅ OK |
| **Responsive tablet** | ✅ | ✅ | ✅ OK |
| **Dark/Light theme** | ⚠️ Partiel | ✅ | 🟡 À améliorer |
| **Notifications** | ✅ (ToastContext) | ✅ | ✅ OK |
| **Icônes modernes** | ✅ Lucide | ✅ | ✅ OK |
| **Glassmorphism** | ✅ (blur/glass) | ✅ | ✅ OK |
| **Drag widgets** | ❌ | ✅ | 🔴 CRITIQUE |
| **Resize widgets** | ❌ | ✅ | 🟡 Important |

**Score**: 7/12 = 58% de couverture fonctionnelle

---

## 🎯 Roadmap priorisée

### 🔴 Phase 1: Essentials (Semaines 1-2)

Le **minimum** pour être compétitif avec GlassHome.

#### 1.1 Drag & Drop + Layout persistence
- [ ] Installer `react-grid-layout`
- [ ] Créer wrapper `DashboardWithGrid.tsx`
- [ ] Implémentation sauvegarde localStorage
- [ ] Intégration Home Assistant (input_text helper)
- [ ] Mode édition (toggle button)
- **Impact** : ⭐⭐⭐⭐⭐ (core differentiator)

#### 1.2 Éditeur visuel basique
- [ ] Page `components/pages/EditDashboard.tsx`
- [ ] Widget selector
- [ ] Configuration visuelle des widgets
- [ ] Preview live
- **Impact** : ⭐⭐⭐⭐

#### 1.3 Battery widget
- [ ] Créer `BatteryCard.tsx`
- [ ] Fetch entities `sensor.*_battery`
- [ ] Affichage % + alerte bas (< 20%)
- [ ] Support multiple batteries

### 🟡 Phase 2: Enhancements (Semaines 3-4)

Les features qui font la différence en polish.

#### 2.1 Zones/Pièces système
- [ ] Créer contexte global zones
- [ ] UI pour définir zones dans Home Assistant
- [ ] Filtrer les entités par zone
- [ ] Smart widget suggestions par zone

#### 2.2 Scenes widget
- [ ] ScenesPanelCard.tsx
- [ ] List scenes avec boutons d'activation
- [ ] Animations transition

#### 2.3 Improvements widgets existants
- [ ] Zone card améliorée (image pièce, plus infos)
- [ ] Groupes lumières (contrôle batch)
- [ ] Settings page plus complète

### 🟢 Phase 3: Polish & AI (Semaines 5+)

Les bonus qui rapportent des points avec SO.

#### 3.1 Theme system complet
- [ ] Créer thème manager
- [ ] Light mode / Dark mode toggle
- [ ] Couleur themes
- [ ] Persistance des préférences

#### 3.2 Widget library
- [ ] Créer + publier composant library réutilisable
- [ ] Storybook + docs complète
- [ ] Support contributeurs externes

#### 3.3 Analytics & Insights
- [ ] Historique consommation énergie graphes
- [ ] Statistiques d'utilisation (lights on time, etc.)
- [ ] Prédictions IA (GlassHome le mentionne)

#### 3.4 Mobile improvements
- [ ] Bottom sheet au lieu de Modal sur mobile
- [ ] Gesture support (swipe)
- [ ] PWA (installable)

---

## 🔧 Architecture pour Phase 1

### Structure de fichiers après Phase 1

```
src/
├── Dashboard.tsx              # OLD - à refactoriser
├── DashboardWithGrid.tsx      # NEW - avec grid layout
├── components/
│   ├── cards/
│   │   ├── BatteryCard.tsx    # NEW
│   │   └── ...
│   ├── editor/                # NEW
│   │   ├── EditDashboard.tsx
│   │   ├── WidgetSelector.tsx
│   │   └── WidgetConfig.tsx
│   ├── layout/
│   │   └── DashboardGrid.tsx  # NEW - wrapper GridLayout
│   └── ...
├── context/
│   ├── DashboardLayoutContext.tsx  # NEW
│   ├── ZonesContext.tsx            # NEW (Phase 2)
│   └── ...
├── hooks/
│   ├── useDashboardLayout.ts       # NEW
│   ├── useLayoutPersist.ts         # NEW
│   └── ...
└── ...
```

---

## 💡 Considérations développeur

### localStorage vs Home Assistant
| Aspect | localStorage | Home Assistant |
|---|---|---|
| Speed | Instant | 100-500ms |
| Multi-device | ❌ | ✅ |
| Persistence | ✅ (local) | ✅ (cloud) |
| Privacy | ✅ | Dépend setup |
| Backup | ❌ | ✅ (via HA) |

**Stratégie** : localStorage + synchro async vers HA

### Responsive Breakpoints
```typescript
breakpoints={{ 
  lg: 1200,   // Desktop
  md: 768,    // Tablet
  sm: 480,    // Mobile
}}
cols={{ 
  lg: 12,     // Gran écran
  md: 8,      // Tablet
  sm: 4       // Mobile
}}
```

### Testing Strategy
- [ ] Tests E2E (Playwright) pour DnD
- [ ] Tests unitaires pour hooks
- [ ] Storybook stories pour widgets
- [ ] Tests sur vrais appareils (mobile/tablet)

---

## 📈 Métriques de succès

### Après Phase 1
- ✅ Drag & drop widgets fonctionnels
- ✅ Layout persiste après rechargement
- ✅ Responsive sur 3 breakpoints
- ✅ 14+ widgets disponibles
- ✅ Mode édition intuitif

### Après Phase 2
- ✅ Système de zones complètement fonctionnel
- ✅ 15+ widgets
- ✅ Groupes d'entités
- ✅ Configuration UI zero YAML

### Après Phase 3
- ✅ Theme system complet
- ✅ Installable en PWA
- ✅ Graphes/analytics
- ✅ Prêt pour évaluation SO ✨

---

## ⚠️ Pièges courants

1. **Performance drag-drop sur mobile**
   - Solution: désactiver resize sur mobile
   - Prioriser drag uniquement

2. **Sauvegarde trop fréquente**
   - Solution: debounce 2-5 secondes
   - Save explicite via button

3. **Layouts incompatibles après resize window**
   - Solution: breakpoints bien définis
   - Fallback layout par défaut

4. **Entity IDs changent**
   - Solution: utiliser friendly_id si possible
   - Validation entités à chargement

---

## 🚀 Quick start Phase 1

```bash
# 1. Installer dependencies
npm install react-grid-layout @types/react-grid-layout

# 2. Créer DashboardLayoutContext
touch src/context/DashboardLayoutContext.tsx

# 3. Créer DashboardGrid wrapper
touch src/components/layout/DashboardGrid.tsx

# 4. Créer EditDashboard page
mkdir -p src/components/pages
touch src/components/pages/EditDashboard.tsx

# 5. Créer BatteryCard
touch src/components/cards/BatteryCard.tsx

# Dev time: ~3-5 jours pour Phase 1 complète
```

---

## 📚 Ressources

- React Grid Layout: https://react-grid-layout.github.io/react-grid-layout/
- Home Assistant API: https://developers.home-assistant.io/
- @hakit/core docs: https://shannonhochkins.github.io/ha-component-kit/

