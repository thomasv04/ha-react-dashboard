# GEMINI.md — Instructions pour Gemini CLI

Ce fichier contient les mandats fondamentaux pour le projet HA Dashboard. Ces règles prévalent sur les comportements par défaut de l'agent.

## 🚀 RTK — Optimisation des Tokens
**Règle d'or :** Préfixer systématiquement les commandes shell par `rtk` pour filtrer et compresser la sortie.
```bash
rtk git status
rtk npm test
```

## 📦 Versioning & Release (MANDATOIRE)
Pour créer une nouvelle version ou un tag :
- **INTERDIT** de modifier manuellement `ha-react-dashboard/config.yaml`.
- **INTERDIT** de lancer les commandes git de release à la main.
- **ACTION :** Utiliser exclusivement `npm run create-tag`.

## 🌐 Internationalisation (i18n) (MANDATOIRE)
- **AUCUNE** chaîne de caractères en dur (Français ou Anglais) dans les composants TSX/TS.
- Utiliser le hook `useI18n()` : `const { t } = useI18n();`.
- Les clés doivent être ajoutées simultanément dans `src/i18n/locales/en/` et `fr/`.

## 🧩 Checklist Nouveau Widget (MANDATOIRE)
Lors de l'ajout d'un widget, TOUS ces fichiers doivent être mis à jour :
1. `src/components/cards/<Name>/<Name>.tsx` (Composant)
2. `src/components/cards/<Name>/index.ts` (Export)
3. `src/types/widget-types.ts` (Interface config + union `WidgetConfig`)
4. `src/types/widget-configs.ts` (Re-export)
5. `src/types/widget-fields.ts` (Champs par défaut)
6. `src/config/widget-dispositions.ts` (Entrée `WIDGET_DISPOSITIONS`)
7. `src/context/DashboardLayoutContext.tsx` (Unions + Catalog + Presets)
8. `src/config/widget-registry.ts` (Previews + Components)
9. `src/components/layout/AddWidgetModal/widget-meta.ts` (**CRUCIAL :** Sans cela, le widget est invisible dans le modal d'ajout)
10. `src/i18n/locales/{en,fr}/widgets.json` (Traductions)

## 🎨 Composants UI Spécifiques
- **Sélection de Panneau :** Toujours utiliser `PanelSelectField` au lieu d'un `<select>` natif pour lier un widget à un panneau (built-in ou custom).

## 🖥️ API Serveur
- `/api/config` (GET/PUT) : Layout du dashboard (limite 2 Mo).
- `/api/settings/current` : Paramètres par appareil.
- `/api/translations/overrides` : Surcharges de traduction utilisateur.
