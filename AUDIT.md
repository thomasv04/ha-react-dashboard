# Audit du projet — Ce qu'il reste à manger 🍽️

> Généré le 2026-05-29. Classé par catégorie, du plus impactant au plus cosmétique.

---

## 1. ~~Widget `PelletCard` — orphelin total~~ ✅ Corrigé

`src/components/cards/PelletCard/PelletCard.tsx` existe mais n'était enregistré **nulle part**.

Tous les fichiers requis ont été mis à jour :

| Fichier requis | Statut |
|---|---|
| `src/types/widget-types.ts` — interface `PelletCardConfig` | ✅ |
| `src/types/widget-configs.ts` — re-export | ✅ |
| `src/types/widget-fields.ts` — default config + field defs | ✅ |
| `src/config/widget-dispositions.ts` — entrée `WIDGET_DISPOSITIONS` | ✅ |
| `src/context/DashboardLayoutContext.tsx` — union `GridWidget['type']` | ✅ |
| `src/context/DashboardLayoutContext.tsx` — `WIDGET_CATALOG` + `SIZE_PRESETS` | ✅ |
| `src/config/widget-registry.ts` — `PREVIEW_COMPONENTS` + `WIDGET_COMPONENTS` | ✅ |
| `src/components/layout/AddWidgetModal/widget-meta.ts` — `WIDGET_META` | ✅ |
| `src/components/cards/PelletCard/index.ts` — barrel export | ✅ |

Le composant a aussi été mis à jour pour lire l'`entityId` depuis le config (`useWidgetConfig`) au lieu d'un entity ID hardcodé.

---

## 2. ~~Chaînes i18n — violations hardcodées (~30 occurrences)~~ ✅ Corrigé

Tous les textes français/anglais écrits directement dans les composants ont été migrés vers `t()`.

**Fichiers modifiés (~38 fichiers) :**

| Fichier | Action |
|---|---|
| `src/i18n/locales/en/common.json` + `fr/` | Ajout : `entityNotFound`, `noData`, `copy` |
| `src/i18n/locales/en/widgets.json` + `fr/` | Ajout : `label`, `description`, `notFound`, etc. pour tous les types de widgets |
| `src/i18n/locales/en/layout.json` + `fr/` | Ajout : ~65 clés (infoPanel, customPanel, wallPanel, widgetCategories, etc.) |
| `src/i18n/locales/en/panels.json` + `fr/` | Ajout : `lights_panel.configHint`, `flowers_panel.plantName` |
| `src/Dashboard.tsx` | `"Loading configuration..."` → `t('dashboard.loading')` |
| `src/components/cards/PelletCard/PelletCard.tsx` | `"Feu à pellet"` → `t('widgets.pellet.title')` |
| `src/components/cards/AutomationCard/AutomationCard.tsx` | `"Automatisation introuvable"` → `t('widgets.automation.notFound')` |
| `src/components/cards/SensorCard/SensorCard.tsx` | `"Entité introuvable"` → `t('widgets.sensor.notFound')` |
| `src/components/modals/WeatherMoreInfo.tsx` | Tous les labels de détails météo traduits |
| `src/components/modals/LightMoreInfo.tsx` | `"Entité introuvable"` → `t('common.entityNotFound')` |
| `src/components/modals/CoverMoreInfo.tsx` | idem |
| `src/components/modals/EnergyMoreInfo.tsx` | + `"Énergie Solaire"` → `t('widgets.energy.defaultName')` |
| `src/components/modals/ThermostatMoreInfo.tsx` | + `"Température actuelle:"` → `t('widgets.thermostat.currentTemp')` |
| `src/components/modals/SensorMoreInfo.tsx` | `"Entité introuvable"` traduit |
| `src/components/modals/AutomationMoreInfo.tsx` | idem |
| `src/components/modals/PersonMoreInfo.tsx` | idem |
| `src/components/modals/InfoPanel.tsx` | Timeline, Dernier changement, Dernière mise à jour, Attributs traduits |
| `src/components/charts/BinaryTimeline.tsx` | `"Pas de données"` → `t('common.noData')` |
| `src/components/custom-panels/CustomPanelRenderer.tsx` | État vide FR traduit |
| `src/components/custom-panels/CustomPanelEditorModal.tsx` | Toutes les dizaines de strings FR/EN traduites (BLOCK_META, BLOCK_TYPE_PICKER, SERVICE_PRESETS, formulaires, en-têtes) |
| `src/components/wallpanel/WallPanelConfigModal.tsx` | Tous les labels/options/titres traduits |
| `src/components/wallpanel/WallPanelEditShell.tsx` | `"Ajouter"`, `"Sauvegarder"` traduits |
| `src/components/dashboard/EditButton.tsx` | `"Ajouter"`, `"Sauvegarde..."`, `"Sauvegarder"` traduits |
| `src/components/layout/BottomNav.tsx` | `"Personnaliser le dock"`, `"Dock"` traduits |
| `src/components/layout/CardLayoutTab.tsx` | `"Disposition du contenu"`, `"Taille sur la grille"` traduits |
| `src/components/layout/AddWidgetModal/PreviewPanel.tsx` | `"Choisir une entité"`, `"Aucune entité trouvée"`, `"Choisir une entité →"` traduits |
| `src/components/layout/AddWidgetModal/ListRow.tsx` | `{meta.label}` → `{t(meta.label)}` |
| `src/components/layout/AddWidgetModal/index.tsx` | `{cat.label}` → `{t(cat.label)}` |
| `src/components/layout/AddWidgetModal/widget-meta.ts` | Tous les `label`, `description` de `WIDGET_META` et `CATEGORIES` convertis en clés de traduction |
| `src/components/layout/TemplateField.tsx` | `"Aperçu : "` → `t('layout.previewLabel')` |
| `src/components/layout/WidgetPickers.tsx` | `"Aucune icône trouvée"`, `"Aucune icône custom"`, `"Envoi en cours…"`, `"Uploader une icône"` traduits |
| `src/components/panels/LightsPanel.tsx` | Titre panneau + texte dev traduits |
| `src/components/panels/FlowersPanel.tsx` | `"Orchidée"`, `"Plantes"` traduits |
| `src/components/ui/Modal/composents/Modal.tsx` | `aria-label='Fermer'` → `aria-label={t('common.close')}` |
| `src/components/layout/PageTabs.tsx` | `"Page"`, `"Nouvelle page"` traduits |
| `src/components/ui/Modal/tests/Modal.test.tsx` | Test mis à jour : `getByLabelText('Fermer')` → `getByLabelText('Close')` |

---

## 3. Sécurité

| Fichier | Problème | Sévérité |
|---|---|---|
| ~~`server/index.js` L29~~ | ~~`contentSecurityPolicy: false` — XSS non protégé~~. CSP activée avec une politique adaptée au SPA. | ✅ Corrigé |
| `server/routes/profiles.js` | Pas de vérification d'ownership sur `PUT` / `DELETE` — n'importe quel user peut écraser le profil d'un autre s'il connaît l'UUID | 🟡 Moyen |
| ~~`src/App.tsx` L55~~ | ~~`import.meta.env.VITE_HA_TOKEN` — le token HA long-lived est embarqué dans le bundle JS~~. `VITE_HA_TOKEN` n'est désormais utilisé qu'en mode dev. | ✅ Corrigé |
| `server/routes/uploads.js` | `file.originalname` stocké en base sans sanitization | 🟢 Faible |

---

## 4. Console.log laissés en production

| Fichier | Ligne | Message |
|---|---|---|
| `src/context/DashboardLayoutContext.tsx` | 528 | `"Layout préparé pour l'envoi au backend"` |
| `src/hooks/useDashboardConfig.ts` | 102 | `'Configuration sauvegardée avec succès !'` |
| `server/db.js` | 112 | `'[db] Migrated dashboard_config.json → SQLite'` |

---

## 5. Barrel exports `index.ts` manquants (10 cards sur ~19)

| Dossier |
|---|
| `src/components/cards/WeatherCard/` |
| `src/components/cards/ThermostatCard/` |
| `src/components/cards/EnergyCard/` |
| `src/components/cards/RoomsGrid/` |
| `src/components/cards/ShortcutsCard/` |
| `src/components/cards/TempoCard/` |
| `src/components/cards/GreetingCard/` |
| `src/components/cards/ActivityBar/` |
| `src/components/cards/CameraCard/` |
| `src/components/cards/PelletCard/` |

---

## 6. Tests manquants

### Cards sans test file :
- `VacuumCard`
- `MediaPlayerCard`
- `AutomationCard`

### Modals (tous sans tests) :
- `WeatherMoreInfo`, `LightMoreInfo`, `CoverMoreInfo`, `EnergyMoreInfo`
- `ThermostatMoreInfo`, `SensorMoreInfo`, `AutomationMoreInfo`, `PersonMoreInfo`
- `InfoPanel`
- `CustomPanelEditorModal`

### Autres :
- `src/components/wallpanel/WallPanelConfigModal`, `WallPanelEditShell`, `WallPanelOverlay`
- `src/components/layout/BottomNav`, `CardLayoutTab`, `PageTabs`, `TemplateField`, `WidgetPickers`
- `src/components/panels/LightsPanel`, `FlowersPanel`, etc.
- `src/hooks/useDashboardConfig`, `useHAModal`, `useHAToast`, `useResolvedMediaUrls`, `useSafeEntity`

---

## 7. Casts `as any` en production (7 occurrences)

Tous liés à `callService` dont le type est incomplet dans `@hakit/core`. À corriger via module augmentation ou typage local.

| Fichier |
|---|
| `src/hooks/useHAToast.ts` L84 |
| `src/hooks/useHAModal.ts` L76 |
| `src/components/modals/CoverMoreInfo.tsx` L36 |
| `src/components/cards/AlarmCard/AlarmCard.tsx` L110 |
| `src/components/cards/VacuumCard/VacuumCard.tsx` (×4) |

---

## 8. Gaps config / registres widgets

| Widget | `WIDGET_COMPONENTS` | `WIDGET_META` | `WIDGET_CATALOG` | Problème |
|---|---|---|---|---|
| `pellet` | ❌ | ❌ | ❌ | Totalement orphelin |
| `activity` | ✅ | ✅ | ❌ | Absent de `WIDGET_CATALOG` |
| `greeting` | ✅ | ✅ | ❌ | Absent de `WIDGET_CATALOG` |
| `activity` SIZE_PRESETS | — | — | — | Tous les 3 presets = `'Normal'`, Compact/Large manquants, le cycle de taille est cassé |
| `greeting` SIZE_PRESETS | — | — | — | Idem |
| `media_player` dispositions | — | — | — | Section `vertical` incomplète dans `widget-dispositions.ts` |

---

## 9. Problèmes serveur API

| Fichier | Problème |
|---|---|
| `server/routes/config.js` | Utilise `POST /` pour sauvegarder au lieu de `PUT /` (non-REST) |
| `server/routes/uploads.js` | Messages d'erreur en français alors que les autres routes sont en anglais |
| `server/routes/profiles.js` | `GET /api/profiles` sans pagination, pas de `LIMIT` — fuite mémoire potentielle |
| `server/routes/profiles.js` | `POST` sans validation de la taille du payload `data` |

---

## 10. Accessibilité

| Fichier | Problème |
|---|---|
| `src/components/ui/Modal/composents/Modal.tsx` L158 | `aria-label='Fermer'` — lecture en FR pour tous les locales |
| `src/components/layout/PageTabs.tsx` | `role='button'` sans `aria-selected`, `aria-controls`, `tabindex` |
| `src/components/dashboard/EditButton.tsx` | Utilise `title` pour tooltip, pas d'`aria-label` |
| `src/components/cards/AlarmCard/AlarmCard.tsx` | Boutons PIN sans `aria-label` par chiffre |
| Toutes les cards | Conteneurs dans la grille sans `role` ni `aria-label` |
| Global | Pas de lien "skip to content" pour la navigation clavier |

---

## 11. ~~Performance~~ ✅ Corrigé

| Fichier | Problème | Statut |
|---|---|---|
| `src/context/DashboardLayoutContext.tsx` | `SIZE_PRESETS` (~200 lignes de constantes) défini inline dans le module du context | ✅ Extrait dans `src/config/size-presets.ts` — fix des presets `activity`/`greeting` (tous identiques) au passage |
| `src/components/layout/AddWidgetModal/widget-meta.ts` | Importait tout `WIDGET_CATALOG` depuis le context pour juste calculer des dimensions | ✅ Remplacé par une table locale `PREVIEW_LG_SIZES` — plus d'import du context |
| `src/components/layout/WidgetPickers.tsx` | Picker d'icônes Lucide sans virtualisation | ✅ Scroll virtuel maison : seules les lignes visibles sont dans le DOM, plus de limite à 120 icônes |
| `src/components/cards/VacuumCard/VacuumCard.tsx` | 4× le même cast `callService as any` | ✅ Wrapper `callVacuumSvc` (useCallback) + `callSvc` dans VacuumSelectControl |

---

## Récap chiffré

| Catégorie | Nb | Statut |
|---|---|---|
| Chaînes hardcodées (i18n) | ~30 | ⏳ À faire |
| `index.ts` barrel manquants | 10 | ⏳ À faire |
| Tests manquants | 3 cards + tous les modals + hooks | ⏳ À faire |
| Casts `as any` | 7 | ⏳ À faire |
| Gaps registre widgets | 6 | ✅ `pellet` corrigé — 5 restants |
| Problèmes sécurité | 4 (1 haut, 2 moyen, 1 faible) | ✅ CSP + token corrigés — 2 restants |
| `console.log` en prod | 3 | ⏳ À faire |
| Problèmes server API | 4 | ⏳ À faire |
| Accessibilité | 6 | ⏳ À faire |
| Performance | 4 | ✅ Corrigé |
