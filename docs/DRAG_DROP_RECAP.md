# Fonctionnement du Drag & Drop sur le Dashboard

## 1. Architecture
- Dashboard = grille responsive (breakpoints lg/md/sm)
- Chaque widget : position (x, y), taille (w, h), type, id unique
- Layout stocké dans un objet `DashboardLayout` (widgets par breakpoint)

## 2. Implémentation du Drag & Drop
- **Pas de librairie externe** : drag & drop fait maison
- **Composant principal** : `DashboardGrid` (logique drag, calculs, overlays)
- **Déroulé** :
  - Mode édition : poignée de drag sur chaque widget
  - Drag : suivi souris, calcul dynamique de la position de drop
  - Drop : mise à jour du widget dans le layout via `updateWidget`
  - Overlays/effets visuels avec Framer Motion

## 3. Persistance
- Layout dans le state React (context)
- Sauvegarde via le hook `useDashboardConfig` (POST `/api/config`)
- Export/import du layout en JSON possible

## 4. Mode édition
- Bouton pour basculer édition/visualisation
- En édition : drag & drop activé, overlays visibles, suppression possible

---

## Fichiers clés à retenir

1. **src/components/layout/DashboardGrid.tsx**
   - Logique drag & drop custom (état, calculs, overlays, drag handle)
   - Composants `DashboardGrid` et `GridItem`

2. **src/context/DashboardLayoutContext.tsx**
   - Structure layouts/widgets, context global dashboard
   - Fonctions de mise à jour du layout (`updateWidget`, `setLayout`...)

3. **src/hooks/useDashboardConfig.ts**
   - Hook pour charger/sauvegarder la config (layout + thème)
   - Persistance côté backend

4. **src/Dashboard.tsx**
   - Utilisation du context, du hook de config, et de `DashboardGrid`
   - Gestion du mode édition et du bouton de sauvegarde

---

**Résumé** :
Pour porter le drag & drop, il faut transférer :
- La logique de grille et de drag de `DashboardGrid.tsx`
- Le context et la structure de données de `DashboardLayoutContext.tsx`
- Le hook de persistance `useDashboardConfig.ts`
- L’intégration dans la page principale `Dashboard.tsx`

Besoin d’un extrait précis ? Demande-moi !
